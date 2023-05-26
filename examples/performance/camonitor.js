const CA = require('node-epics-ca');
(async () => {
	const start = Date.now();
	for(let i = 1; i <= 500; i++) {
		CA.monitor(`calcExample${i}`, function(data) {
		    //console.log('PV:', `calcExample${i}`, 'Current:', data);
		});
	}
	const stop = Date.now();
	console.log(`Time Taken to execute = ${1.0*(stop - start)/1000} seconds`);
    // Test purpose only, prevent the node.js main thread from exiting
    setTimeout(function() {
        console.log("Done!!!");
    }, 3600 * 1000);
})()
