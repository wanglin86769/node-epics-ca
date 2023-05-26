# EPICS Channel Access client for Node.js

**node-epics-ca** is lightweight EPICS Channel Access client library for Node.js, it is a FFI (Foreign Function Interface) implementation that talks to the existing EPICS Channel Access shared libraries using a third-party Node.js FFI package called koffi.

This project borrows ideas, implementations and the shared libraries from the following projects,

https://github.com/RobbieClarken/node-epics

https://github.com/onichandame/epics-ioc-connection 

https://github.com/pyepics/pyepics 

# Requirements

## A recent Node.js version is required and the following versions have been tested,

* Node.js 12.22.12

* Node.js 14.21.3

* Node.js 15.14.0

* Node.js 16.19.0

* Node.js 17.9.1

* Node.js 18.13.0

# Supported platforms

* Windows x86_64

* Linux x86_64

* macOS x86_64

# Installation

```bash
npm install node-epics-ca
```

`NODE_EPICS_CA_LIBCA`, `NODE_EPICS_CA_PEND_IO_DELAY` or `NODE_EPICS_CA_PEND_EVENT_DELAY` can be set optionally, for example,

```bash
export NODE_EPICS_CA_LIBCA=/home/debian/epics/base-3.15.9/lib/linux-x86_64/libca.so
export NODE_EPICS_CA_PEND_IO_DELAY=1
export NODE_EPICS_CA_PEND_EVENT_DELAY=0.1
```

If `NODE_EPICS_CA_LIBCA` is not specified, the os-specific shared libraries in the clibs directory will be used, and which one to use depends on the operating system. 

# Usage

## Approach 1: Simple functions like caget, caput, camonitor and cainfo

### get

```javascript
const CA = require('node-epics-ca');
(async () => {
    try {
        console.log(await CA.get('calcExample'));
    } catch (error) {
        console.error(`get failed due to ${error}`)
    }
})()
```

### put

```javascript
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
```

### monitor

```javascript
const CA = require('node-epics-ca');
(async () => {
    let pv = await CA.monitor('calcExample');
    pv.on('value', function(data) {
        console.log('Current:', data);
    });
    // Test purpose only, prevent the node.js main thread from exiting
    setTimeout(function() {
        console.log("Done!!!");
    }, 3600 * 1000);
})()
```

simpler way for monitor


```javascript
const CA = require('node-epics-ca');
(async () => {
    CA.monitor('calcExample', function(data) {
        console.log('Current:', data);
    });
    setTimeout(function() {
        console.log("Done!!!");
    }, 3600 * 1000);
})()
```

### info

```javascript
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
```

## Approach 2: `Channel` class

### get

```javascript
const CA = require('node-epics-ca');
let pv = new CA.Channel('calcExample');
(async () => {
    try {
        await pv.connect();
        let value = await pv.get();
        console.log(value);
        await pv.disconnect()
    } catch (error) {
        console.log(error);
    }
})()
```

### put

```javascript
const CA = require('node-epics-ca');
(async () => {
    try {
        let value;
        const pv = new CA.Channel('calcExample');
        await pv.connect();
        value = await pv.get();
        console.log(value);
        await pv.put(10);
        value = await pv.get();
        console.log(value);
        await pv.disconnect()
    } catch (error) {
        console.log(error);
    }
})()
```

### monitor

```javascript
const CA = require('node-epics-ca');
let pv = new CA.Channel('calcExample');
pv.create();
pv.on('monitor', function() {
    pv.monitor();
});
pv.on('value', function(data) {
    console.log('Current:', data);
});
// Test purpose only, prevent the node.js main thread from exiting
setTimeout(function() {
    console.log("Done!!!");
}, 3600 * 1000);
```

### info

```javascript
const CA = require('node-epics-ca');
let pv = new CA.Channel('calcExample');
(async () => {
    try {
        await pv.connect();
        let result = pv.info();
        console.log(`name: ${result.name}`);
        console.log(`state: ${result.state}`);
        console.log(`host: ${result.host}`);
        console.log(`readAccess: ${result.readAccess}`);
        console.log(`writeAccess: ${result.writeAccess}`);
        console.log(`fieldType: ${result.fieldType}`);
        console.log(`elementCount: ${result.elementCount}`);
        await pv.disconnect()
    } catch (error) {
        console.log(error);
    }
})()
```

# License
MIT license