const Channel = require('./channel');

const monitor = async (pvname) => {
    const ca = new Channel(pvname);
    await ca.connect(true);
    ca.on('monitor', () => {
        ca.monitor();
    });
    return ca;
}

module.exports = monitor;
