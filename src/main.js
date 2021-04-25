var tenrec = require("./tenrec.js");
function main() {
    var parser = tenrec.optWs;
    console.log(tenrec.digit.parse("0"));
}

main();