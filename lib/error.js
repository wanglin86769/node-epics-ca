const DepError = new Error("Cannot find epics installation");
const ConError = new Error("Connection not established");
const GetError = new Error("Read request failed");
const PutError = new Error("Write request failed");

module.exports = { DepError, ConError, GetError, PutError };
