const Channel = require('./channel');

const monitor = async (pvname, callback) => {
    const ca = new Channel(pvname);
    await ca.create();
    ca.on('monitor', () => {
        ca.monitor();
    });
    if(callback && typeof callback === 'function') {
        ca.on('value', callback);
    }
    return ca;
}

module.exports = monitor;
