const koffi = require('koffi');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');
const dbr = require('./codes').dbr;
const mask = require('./codes').mask;
const state = require('./codes').state;
const nativeType = require('./codes').nativeType;
const { ConError, DepError, GetError, PutError } = require('./error');

let LIBCA_PATH = process.env.NODE_EPICS_CA_LIBCA;
if (!LIBCA_PATH) {
    switch(os.platform()) {
        case 'win32': 
            console.log("windows platform");
            LIBCA_PATH = path.join(__dirname, 'clibs', 'win64', 'ca.dll');
            break;
        case 'linux': 
            console.log("Linux Platform");
            LIBCA_PATH = path.join(__dirname, 'clibs', 'linux64', 'libca.so');
            break;
        case 'darwin': 
            console.log("Darwin platform(MacOS, IOS etc)");
            LIBCA_PATH = path.join(__dirname, 'clibs', 'darwin64', 'libca.dylib');
            break;
        default: 
            console.log("Unknown platform");
            break;
    }
}

if (!LIBCA_PATH) {
    throw DepError;
}

const MAX_STRING_SIZE = 40;

// const CA_REPEATER_PATH = path.join(__dirname, 'clibs', 'win64');
// process.env.PATH = `${process.env.PATH};${CA_REPEATER_PATH}`

const libca = koffi.load(LIBCA_PATH);

let pointer = koffi.pointer('pointer', koffi.opaque(), 2);
let chanId = koffi.pointer('chanId', koffi.opaque());
let evid = koffi.pointer('evid', koffi.opaque());
let chtype = koffi.types.long;

let pendDelay = Number(process.env.NODE_EPICS_CA_PENDDELAY) || 1;

const event_args_t = koffi.struct('event_args_t', {
  usr: 'void *',
  chid: chanId,
  type: 'long',
  count: 'long',
  dbr: 'void *',
  status: 'int'
});
const MonitorCallback = koffi.callback('MonitorCallback', 'void', [event_args_t]);

const GetCallback = koffi.callback('GetCallback', 'void', [event_args_t]);
const PutCallback = koffi.callback('PutCallback', 'void', [event_args_t]);

const connection_args_t = koffi.struct('connection_args_t', {
    chid: chanId,
    op: 'long'
  });
const ConnectionCallback = koffi.callback('ConnectionCallback', 'void', [connection_args_t]);

const ca_context_create = libca.func('ca_context_create', 'int', ['int']);
const ca_message = libca.func('ca_message', 'string', ['int']);
const ca_client_status = libca.func('ca_client_status', 'int', ['int']);
const ca_current_context = libca.func('ca_current_context', 'int', []);
const ca_pend_event = libca.func('ca_pend_event', 'int', ['double']);
const ca_pend_io = libca.func('ca_pend_io', 'int', ['double']);
const ca_test_io = libca.func('ca_test_io', 'int', []);
const ca_create_channel = libca.func('ca_create_channel', 'int', ['string',koffi.pointer(ConnectionCallback),'pointer','int',koffi.out(pointer)]);
const ca_host_name = libca.func('ca_host_name', 'string', [chanId]);
const ca_read_access = libca.func('ca_read_access', 'int', [chanId]);
const ca_write_access = libca.func('ca_write_access', 'int', [chanId]);
const ca_field_type = libca.func('ca_field_type', 'short', [chanId]);
const ca_state = libca.func('ca_state', 'short', [chanId]);
const ca_element_count = libca.func('ca_element_count', 'int', [chanId]);
const ca_name = libca.func('ca_name', 'string', [chanId]);
const ca_array_get = libca.func('ca_array_get', 'int', ['int', 'ulong', chanId, koffi.out('void *')]);
const ca_array_get_callback = libca.func('ca_array_get_callback', 'int', ['int','ulong',chanId,koffi.pointer(GetCallback),'pointer']);
const ca_array_put_callback = libca.func('ca_array_put_callback', 'int', [chtype, 'ulong', chanId, 'pointer', koffi.pointer(PutCallback), 'pointer']);
const ca_create_subscription = libca.func('ca_create_subscription', 'int', ['int','ulong',chanId,'long',koffi.pointer(MonitorCallback),'pointer',koffi.out(pointer)]);
const ca_clear_subscription = libca.func('ca_clear_subscription', 'int', [evid]);
const ca_clear_channel = libca.func('ca_clear_channel', 'int', [chanId]);

function getContext(){
    return ca_context_create(1);
};
  
const ccCode = getContext();
if (ccCode !== state.ECA_NORMAL) {
    throw new Error(message(ccCode));
}

function message(code) {
    return ca_message(code);
};

function pend() {
    let eventCode = ca_pend_event(pendDelay);
    let ioCode = ca_pend_io(pendDelay);
    if (eventCode !== state.ECA_TIMEOUT) {
        throw PutError;
    } else if (ioCode !== state.ECA_NORMAL) {
        throw GetError;
    }
}

function stringArrayToBuffer(array) {
    let count = array.length;
    let buf = Buffer.alloc(count * MAX_STRING_SIZE);
    for(let i = 0; i < count; i++) {
        buf.write(array[i], i * MAX_STRING_SIZE, MAX_STRING_SIZE);
    }
    return buf;
}

function decodeNativePointerToScriptType(ptr, dbrType, count) {
    let array = [];
    if(dbrType === dbr.STRING) {
        for(let i = 0; i < count; i++) {
            let str = koffi.decode(ptr, i * MAX_STRING_SIZE, 'char', MAX_STRING_SIZE);
            array.push(str);
        }
    } else {
        array = koffi.decode(ptr, nativeType[dbrType], count);
    }
    return count === 1 ? array[0] : array;
}

class Channel extends EventEmitter {
    pvName = null;
    chanId = null;
    fieldType = null;
    count = null;
    connectionStateChangePtr = null;
    getCallbackPtr = null;
    putCallbackPtr = null;
    monitorCallbackPtr = null;
    monitorEventId = null;

    constructor(pvName) {
        super();
        this.pvName = pvName;
    }

    state() {
        if (!this.chanId) {
            return state.CS_CLOSED;
        }
        return ca_state(this.chanId);
    }

    connected() {
        return this.state() === state.CS_CONN;
    }

    connect(monitor = false, timeout = 2000) {
        return new Promise((resolve, reject) => {
            let chidPtr = [null];
            let priority = 0;
            let initialCallbackDone = false;

            this.connectionStateChangePtr = koffi.register(args => {
                this.fieldType = ca_field_type(this.chanId);
                this.count = ca_element_count(this.chanId);
                this.emit("connection", args);
                // Ready to monitor
                if (args && args.op === state.OP_CONN_UP && !this.monitorEventId) {
                    this.emit("monitor", args);
                }
                if (!initialCallbackDone) {
                    initialCallbackDone = true;
                    if (args && args.op === state.OP_CONN_UP) {
                        resolve();
                    } else {
                        reject(ConError);
                    }
                }
            }, koffi.pointer(ConnectionCallback));

            let errCode = ca_create_channel(this.pvName, this.connectionStateChangePtr, null, priority, chidPtr);
            pend();
            this.chanId = chidPtr[0];
            if (errCode !== state.ECA_NORMAL) {
                initialCallbackDone = true;
                return reject(new Error(message(errCode)));
            }
            if(!monitor) {
                setTimeout(() => {
                    if (this.state() === state.CS_NEVER_CONN) {
                        initialCallbackDone = true;
                        reject(ConError);
                    }
                }, timeout);
            } else {
                resolve();
            }
        });
    }

    disconnect() {
        return new Promise((resolve, reject) => {
            if (this.monitorEventId) {
                let errCode = ca_clear_subscription(this.monitorEventId);
                pend();
                if (errCode !== state.ECA_NORMAL) {
                    reject(new Error(message(errCode)));
                }
            }
            if (this.chanId) {
                let errCode = ca_clear_channel(this.chanId);
                if (errCode !== state.ECA_NORMAL) {
                    reject(new Error(message(errCode)));
                }
            }
            pend();
            this.monitorEventId = null;
            this.chanId = null;
            resolve();
        });
    }

    get() {
        return new Promise((resolve, reject) => {
            this.getCallbackPtr = koffi.register(args => {
                if(state.ECA_NORMAL !== args.status) {
                    return reject(new Error(message(args.status)));
                }
                let value = decodeNativePointerToScriptType(args.dbr, args.type, this.count);
                resolve(value);
            }, koffi.pointer(GetCallback));
            let usrArg = null;
            let errCode = ca_array_get_callback(this.fieldType, this.count,
                                            this.chanId, this.getCallbackPtr, usrArg);
            pend();
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(message(errCode)));
            }
        });
    }

    put(value) {
        return new Promise((resolve, reject) => {
            this.putCallbackPtr = koffi.register(args => {
                if (args.status !== state.ECA_NORMAL) {
                    reject(PutError);
                } else {
                    resolve();
                }
            }, koffi.pointer(PutCallback));
            if (!Array.isArray(value)) {
                value = [ value ];
            }
            let count = value.length;
            let buf;
            if (this.fieldType === dbr.STRING) {
                buf = stringArrayToBuffer(value);
            } else {
                buf = koffi.as(value, `${nativeType[this.fieldType]}*`);
            }
            let usrArg = null;
            let errCode = ca_array_put_callback(this.fieldType, count,
                                                this.chanId, buf,
                                                this.putCallbackPtr, usrArg);
            pend();
            if (errCode !== state.ECA_NORMAL) {
                reject(new Error(message(errCode)));
            }
        });
    }

    monitor() {
        return new Promise((resolve, reject) => {
            let monitorEventIdPtr = [null];
            this.monitorCallbackPtr = koffi.register(args => {
                let value = decodeNativePointerToScriptType(args.dbr, args.type, this.count);
                this.emit('value', value);
            }, koffi.pointer(MonitorCallback));
            let usrArg = null;
            let errCode = ca_create_subscription(this.fieldType, this.count,
                                                this.chanId, mask.DBE_VALUE,
                                                this.monitorCallbackPtr, usrArg,
                                                monitorEventIdPtr);
            pend();
            this.monitorEventId = monitorEventIdPtr[0];
            if (errCode === state.ECA_NORMAL) {
                resolve();
            } else {
                reject(new Error(message(errCode)));
            }
        });
    }

    info() {
        function getObjectKey(obj, value) {
            return Object.keys(obj).find(key => obj[key] === value);
        }
        if(!this.chanId)  return null;
        let stateStrings = [ "never connected", "previously connected", "connected", "closed" ];
        let name = this.pvName;
        let state = stateStrings[ca_state(this.chanId)];
        let host = ca_host_name(this.chanId);
        let readAccess = ca_read_access(this.chanId) ? true : false;
        let writeAccess = ca_write_access(this.chanId) ? true : false;
        let fieldType = getObjectKey(dbr, ca_field_type(this.chanId));
        let elementCount = ca_element_count(this.chanId);
        let result = { name, state, host, readAccess, writeAccess, fieldType, elementCount };
        return result;
    }
}

module.exports = Channel;