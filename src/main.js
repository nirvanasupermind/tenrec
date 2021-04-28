var tenrec = require("./tenrec.js");
function main() {
    var parser = tenrec.withWs(tenrec.seq(
        tenrec.text("::"),
        tenrec.either(tenrec.alphaNumeric,tenrec.text("_")),
    ));

    console.log(parser.parse("::a "));
}

main();