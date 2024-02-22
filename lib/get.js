const Channel = require('./channel');

const get = async (pvname, asString = false) => {
    const ca = new Channel(pvname);
    await ca.connect();
    const value = await ca.get(asString);
    await ca.disconnect();
    return value;
}

module.exports = get;
