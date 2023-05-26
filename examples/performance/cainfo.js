const CA = require('node-epics-ca');
(async () => {
    try {
		const start = Date.now();
		let info;
		for(let i = 1; i <= 500; i++) {
        	info = await CA.info(`calcExample${i}`);
		}
		const stop = Date.now();
		console.log(`Time Taken to execute = ${1.0*(stop - start)/1000} seconds`);
    } catch (error) {
        console.error(`get failed due to ${error}`)
    }
})()
