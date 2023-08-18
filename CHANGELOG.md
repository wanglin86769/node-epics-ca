# Changelog

## Version history of node-epics-ca

### v0.2.2

- Fixed the 'TypeError: Unexpected <type_41> * value, expected evid' issue

### v0.2.1

- Replaced the deprecated callback() function with proto() function
- Fixed the 'TypeError: Unexpected <type_41> * value, expected chanId' issue

### v0.2.0

- Fixed the deadlock issue
- Removed ca_pend_event() to improve performance
- Added performance test for caget, caput, camonitor and cainfo

### v0.1.3

- Added a setTimeout() delay as a workaround to reduce the probability of deadlock when calling ca_clear_channel
- Added examples for basic usage and web service usage

### v0.1.2

- Fixed the issue that DLLs cannot be loaded on Windows
- Relicense under MIT license

### v0.1.1

- Simplified the usage of monitor

### v0.1.0

- Added create() function for monitor
- Removed unnecessary ca_pend_event() invocations
- Updated README file

### v0.0.1

**Initial version:**

- Implemented a EPICS Channel Access client using the existing EPICS shared libraries via koffi Node.js library
- Provided the Channel class to create, connect and access EPICS PVs



