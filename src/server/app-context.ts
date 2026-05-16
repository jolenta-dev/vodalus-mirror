// @ts-nocheck
let wss = null;
function setWss(server) { wss = server; }
function getWss() { return wss; }
module.exports = { setWss, getWss };
