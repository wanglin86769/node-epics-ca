# node-epics-ca: EPICS Channel Access client for Node.js

**node-epics-ca** is lightweight EPICS Channel Access client library, it is a FFI (Foreign Function Interface) implementation that talks to the existing EPICS Channel Access shared libraries using a third-party Node.js FFI package called koffi.

This project borrows ideas, implementations and the shared libraries from the following projects.

https://github.com/RobbieClarken/node-epics

https://github.com/onichandame/epics-ioc-connection 

https://github.com/pyepics/pyepics 

# Requirements

## Node.js

* Node.js 16

# Supported platforms

* Windows 64-bit

* Linux 64-bit

* macOS 64-bit

# Installation

```bash
npm install node-epics-ca
```

`NODE_EPICS_CA_LIBCA` or `NODE_EPICS_CA_PENDDELAY` can be set optionally.

```bash
export NODE_EPICS_LIBCA=/path/to/libca
export NODE_EPICS_CA_PENDDELAY=0.5
```

# Usage

```javascript
const CA = require('node-epics-ca');
(async () => {
    let pv = await CA.monitor('calcExample');
    pv.on('value', function(data) {
        console.log('Current:', data);
    });
    setTimeout(function() {
        console.log("Done!!!");
    }, 3600 * 1000);
})()
```

# License
The license of this project is the same as koffi (https://www.npmjs.com/package/koffi) as follows,

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Find more information here: https://www.gnu.org/licenses/
