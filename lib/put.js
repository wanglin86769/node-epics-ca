const Channel = require('./channel');

const put = async (pvname, value) => {
    const ca = new Channel(pvname)
    await ca.connect();
    await ca.put(value);
    await ca.disconnect();
}

module.exports = put;
