/*
 This can parse and evaluate numerical expressions.
 Expressions consists of numbers, parentheses, and the operators +,-,*,/,%
 */
"use strict";

//Import
var tenrec = require("../src/tenrec.js");
var util = require("util");

//Create a grammar with closure
var math = new function () {
    this.lbrace = tenrec.word(tenrec.text("("));
    this.rbrace = tenrec.word(tenrec.text(")"));
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
                this.lbrace,
                this.expr,
                this.rbrace
            ), (results) => results[1]
        );
    });

    this.neg_expr = tenrec.delay(() => {
        return tenrec.seq(
            this.add_op,
            this.atom
        );
    });


    this.atom = tenrec.either(
        this.brace_expr,
        this.neg_expr,
        tenrec.word(this.number)
    );

    this.mul_expr = tenrec.transform(
        tenrec.seq(
            this.atom,
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
        ), (results) => results[1].length
            ? [results[0][0]].concat(results[1].map((el) => [el[0], el[1][0]]))
            : results[0]
    );

    this.expr = this.add_expr;
}

//Driver code
function main() {
    var opts = { "depth": null, "colors": "auto" };
    var input = "(1 + 2) * 3";
    var [ast, error] = math.expr.parse(input);

    console.log("ast: " + util.inspect(ast, opts)
        + "\n" + new Array(40).join("="));
    console.log("error: " + util.inspect(error, opts));
}

main();