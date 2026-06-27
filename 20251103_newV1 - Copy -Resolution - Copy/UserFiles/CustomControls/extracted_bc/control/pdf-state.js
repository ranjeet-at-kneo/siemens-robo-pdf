let enblDbg = false;
let docs = [];          // pool of doc objects
let streams = [];       // pool of steams tied to doc objects
let count = 0;          // progressive doc counter instances

/* debug functions ******************************************************/

// this is called in the code to log debug messages
function dbglog(txt) {
  let tmp = txt + " || " + (new Date());
  WebCC.Events.fire("trace", tmp);
}

// this function sets dynamically dbglog, easier than attaching to property event...
function setTraceMode(enable) {
    dbglog("SetTraceMode = " + enable);
    enblDbg = enable ? true : false;
}
