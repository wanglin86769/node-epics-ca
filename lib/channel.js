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
            // console.log("windows platform");
            LIBCA_PATH = path.join(__dirname, 'clibs', 'win64', 'ca.dll');
            break;
        case 'linux': 
            // console.log("Linux Platform");
            LIBCA_PATH = path.join(__dirname, 'clibs', 'linux64', 'libca.so');
            break;
        case 'darwin': 
            // console.log("Darwin platform(MacOS, IOS etc)");
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

// Add the path of libca to *PATH* so that koffi can load shared libraries
let dirname = path.dirname(LIBCA_PATH);
let delimiter = path.delimiter;
if (process.env.PATH) {
    process.env.PATH += `${delimiter}${dirname}`;
} else {
    process.env.PATH = dirname;
}

const libca = koffi.load(LIBCA_PATH);

let pointer = koffi.pointer('pointer', koffi.opaque(), 2);
let chanId = koffi.pointer('chanId', koffi.opaque());
let evid = koffi.pointer('evid', koffi.opaque());
let chtype = koffi.types.long;

let pendIODelay = Number(process.env.NODE_EPICS_CA_PEND_IO_DELAY) || 1;
let pendEventDelay = Number(process.env.NODE_EPICS_CA_PEND_EVENT_DELAY) || 0.1;

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
const ca_flush_io = libca.func('ca_flush_io', 'int', []);
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
const ca_array_get_callback = libca.func('ca_array_get_callback', 'int', [chtype, 'ulong', chanId, koffi.pointer(GetCallback), 'pointer']);
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
    let eventCode = ca_pend_event(pendEventDelay);
    let ioCode = ca_pend_io(pendIODelay);
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

    create(monitor = true) {
        let chidPtr = [null];
        let priority = 0;

        this.connectionStateChangePtr = koffi.register(args => {
            this.fieldType = ca_field_type(this.chanId);
            this.count = ca_element_count(this.chanId);
            this.emit("connection", args);
            // Ready to monitor
            if (args && args.op === state.OP_CONN_UP && !this.monitorEventId) {
                this.emit("monitor", args);
            }
        }, koffi.pointer(ConnectionCallback));

        let callback = monitor ? this.connectionStateChangePtr : null;
        let errCode = ca_create_channel(this.pvName, callback, null, priority, chidPtr);
        this.chanId = chidPtr[0];
        return errCode;
    }

    connect() {
        return new Promise((resolve, reject) => {
            let errCode;
            errCode = this.create(false);
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(`ca_create_channel() failed due to ${message(errCode)}`));
            }
            errCode = ca_pend_io(pendIODelay);
            this.fieldType = ca_field_type(this.chanId);
            this.count = ca_element_count(this.chanId);
            if (errCode === state.ECA_NORMAL) {
                resolve();
            } else {
                reject(ConError);
            }
        });
    }

    /** 
     * A deadlock occurs when calling ca_clear_channel() or ca_clear_subscription() in this function.
     * 
     * Root cause:
     * A lock (mutex) for ca_clear_channel() or ca_clear_subscription() is held by callbacks, which have not completely finished.
     * 
     * Solution:
     * setTimeout with time 0 is used to take the current execution outside of the Node.js flow and run it once after the call stack is free,
     * in order to wait callbacks to finish and release the lock.
     *
     */
    disconnect(timeout = 0) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.monitorEventId) {
                    let errCode = ca_clear_subscription(this.monitorEventId);
                    if (errCode !== state.ECA_NORMAL) {
                        return reject(new Error(`ca_clear_subscription() failed due to ${message(errCode)}`));
                    }
                }
                if (this.chanId) {
                    let errCode = ca_clear_channel(this.chanId);
                    if (errCode !== state.ECA_NORMAL) {
                        return reject(new Error(`ca_clear_channel() failed due to ${message(errCode)}`));
                    }
                }
                this.monitorEventId = null;
                this.chanId = null;
                resolve();
            }, timeout)
        });
    }

    get() {
        return new Promise((resolve, reject) => {
            this.getCallbackPtr = koffi.register(args => {
                if(state.ECA_NORMAL !== args.status) {
                    return reject(GetError);
                }
                let value = decodeNativePointerToScriptType(args.dbr, args.type, this.count);
                resolve(value);
            }, koffi.pointer(GetCallback));

            let usrArg = null;
            let errCode;
            errCode = ca_array_get_callback(this.fieldType, this.count,
                                            this.chanId, this.getCallbackPtr, usrArg);
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(`ca_array_get_callback() failed due to ${message(errCode)}`));
            }

            errCode = ca_pend_io(pendIODelay);
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(`I/O for ca_array_get_callback() failed due to ${message(errCode)}`));
            }

            errCode = ca_pend_event(pendEventDelay);
            if (errCode !== state.ECA_TIMEOUT) {
                return reject(new Error(`callback for ca_array_get_callback() failed to execute due to ${message(errCode)}`));
            }

            // Wait for the callback to execute, otherwise node.js may crash
            setTimeout(function() {
                // console.log("get() Done!");
                resolve();
            }, 2000);
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
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(`ca_array_put_callback() failed due to ${message(errCode)}`));
            }

            errCode = ca_pend_io(pendIODelay);
            if (errCode !== state.ECA_NORMAL) {
                return reject(new Error(`I/O for ca_array_put_callback() failed due to ${message(errCode)}`));
            }

            errCode = ca_pend_event(pendEventDelay);
            if (errCode !== state.ECA_TIMEOUT) {
                return reject(new Error(`callback for ca_array_put_callback() failed to execute due to ${message(errCode)}`));
            }

            // Wait for the callback to execute, otherwise node.js may crash
            setTimeout(function() {
                // console.log("put() Done!");
                resolve();
            }, 2000);
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
            this.monitorEventId = monitorEventIdPtr[0];
            if (errCode === state.ECA_NORMAL) {
                resolve();
            } else {
                return reject(new Error(`ca_create_subscription() failed due to ${message(errCode)}`));
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