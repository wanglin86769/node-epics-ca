const CA = require('node-epics-ca');
(async () => {
    try {
        console.log(await CA.get('calcExample'));
        await CA.put("calcExample", 10);
        console.log(await CA.get('calcExample'));
    } catch (error) {
        console.error(`put failed due to ${error}`)
    }
})()