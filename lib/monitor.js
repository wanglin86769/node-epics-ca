const Channel = require('./channel');

const monitor = async (pvname, callback, asString = false) => {
    const ca = new Channel(pvname);
    await ca.create();
    ca.on('monitor', () => {
        ca.monitor(asString);
    });
    if(callback && typeof callback === 'function') {
        ca.on('value', callback);
    }
    return ca;
}

module.exports = monitor;
