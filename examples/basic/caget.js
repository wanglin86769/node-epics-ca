const CA = require('node-epics-ca');
(async () => {
    try {
        console.log(await CA.get('calcExample'));
    } catch (error) {
        console.error(`get failed due to ${error}`)
    }
})()