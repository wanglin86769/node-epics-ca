const Channel = require('./channel');

const monitor = async (pvname) => {
    const ca = new Channel(pvname);
    await ca.create();
    ca.on('monitor', () => {
        ca.monitor();
    });
    return ca;
}

module.exports = monitor;
