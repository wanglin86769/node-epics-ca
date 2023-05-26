const Channel = require('./channel');

const info = async (pvname) => {
    const ca = new Channel(pvname);
    await ca.connect();
    const result = ca.info();
    await ca.disconnect();
    return result;
}

module.exports = info;
