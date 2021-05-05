var tenrec = require("./tenrec.js");
var util = require("util");
function main() {
    var opts = { "depth": null, "colors": "auto" }
    var parser = tenrec.word(tenrec.digit);

    console.log(util.inspect(parser.parse("8 "), opts));
}

main();

