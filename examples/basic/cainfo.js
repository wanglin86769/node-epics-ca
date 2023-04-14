const CA = require('node-epics-ca');
(async () => {
    try {
        let result = await CA.info('calcExample');
        console.log(`name: ${result.name}`);
        console.log(`state: ${result.state}`);
        console.log(`host: ${result.host}`);
        console.log(`readAccess: ${result.readAccess}`);
        console.log(`writeAccess: ${result.writeAccess}`);
        console.log(`fieldType: ${result.fieldType}`);
        console.log(`elementCount: ${result.elementCount}`);
    } catch (error) {
        console.log(error);
    }
})()