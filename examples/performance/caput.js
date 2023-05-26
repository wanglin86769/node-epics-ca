const CA = require('node-epics-ca');
(async () => {
    try {
		const start = Date.now();
        for(let i = 1; i <= 500; i++) {
        	await CA.put(`calcExample${i}`, 10);
        }
		const stop = Date.now();
		console.log(`Time Taken to execute = ${1.0*(stop - start)/1000} seconds`);
    } catch (error) {
        console.error(`put failed due to ${error}`)
    }
})()
