const CA = require('node-epics-ca');
(async () => {
    CA.monitor('calcExample', function(data) {
        console.log('Current:', data);
    });
    // Test purpose only, prevent the node.js main thread from exiting
    setTimeout(function() {
        console.log("Done!!!");
    }, 3600 * 1000);
})()