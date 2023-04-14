# Changelog

## Version history of node-epics-ca

### v0.1

#### v0.1.3

**Main changes:**

- Added a setTimeout() delay as a workaround to reduce the probability of deadlock when calling ca_clear_channel

**Other changes:**

- Added examples for basic usage and web service usage

#### v0.1.2

**Main changes:**

- Fixed the issue that DLLs cannot be loaded on Windows
- Relicense under MIT license

#### v0.1.1

**Main changes:**

- Simplified the usage of monitor

#### v0.1.0

**Main changes:**

- Added create() function for monitor
- Removed unnecessary ca_pend_event() invocations
- Updated README file

### v0.0

#### v0.0.1

**Initial version:**

- Implemented a EPICS Channel Access client using the existing EPICS shared libraries via koffi Node.js library
- Provided the Channel class to create, connect and access EPICS PVs



