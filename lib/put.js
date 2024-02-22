const Channel = require('./channel');

const put = async (pvname, value, asString = false) => {
    const ca = new Channel(pvname);
    await ca.connect();
    await ca.put(value, asString);
    await ca.disconnect();
}

module.exports = put;
