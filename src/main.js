var tenrec = require("./tenrec.js");
var util = require("util");
function main() {
    console.log(Object.getOwnPropertyNames(tenrec).sort());
}

main();


