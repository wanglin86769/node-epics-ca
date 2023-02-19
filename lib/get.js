const Channel = require('./channel');

const get = async (pvname) => {
    const ca = new Channel(pvname)
    await ca.connect();
    const value = await ca.get();
    await ca.disconnect();
    return value;
}

module.exports = get;
