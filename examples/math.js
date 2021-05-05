/*
 This can parse and evaluate numerical expressions.
 Expressions consists of numbers, parentheses, and the operators +,-,*,/,%
 */
"use strict";
//Import tenrec
var tenrec = require("../src/tenrec.js");
var util = require("util");

var math = new function () {
    this.mul_op = tenrec.word(tenrec.charSet("*/%"));
    this.add_op = tenrec.word(tenrec.charSet("+-"));

    this.number = tenrec.transform(
        tenrec.seq(
            tenrec.digit,
            tenrec.many(tenrec.digit)
        ), (results) => {
            var firstDigit = results[0].value;
            var num_str = firstDigit + results[1].map((el) => el.value).join("");
            return tenrec.Token(
                ["number", num_str],
                results[0].pos_start,
                results[0].pos_start + num_str.length
            );
        });

    this.brace_expr = tenrec.delay(() => {
        return tenrec.transform(
            tenrec.seq(
                tenrec.text("("),
                this.add_expr,
                tenrec.text(")")
            ), (results) => results[1]
        );
    });

    this.atom = tenrec.either(
        this.brace_expr,
        tenrec.word(this.number)
    );

    this.mul_expr = tenrec.transform(
        tenrec.seq(
            this.number,
            tenrec.many(tenrec.seq(
                this.mul_op,
                this.atom
            ))
        ), (results) => [results[0]].concat(results[1])
    )


    this.add_expr = tenrec.transform(
        tenrec.seq(
            this.mul_expr,
            tenrec.many(tenrec.seq(
                this.add_op,
                this.mul_expr
            ))
        ), (results) => [results[0]].concat(results[1])
    );


}


function main() {
    var opts = { "depth": null, "colors": "auto" };
    console.log(util.inspect(math.mul_expr.parse("(1*2)"), opts));
}

main();