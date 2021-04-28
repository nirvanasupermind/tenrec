/*
 This parser supports basic math with +, -, *, /, unary negation and braces.
*/

//Import
var tenrec = require("../src/tenrec.js");
var util = require("util");

//Create a math grammar using a closure.
var math = new function () {
    //Some parsers are just text with optional whitespace afterwards.
    this.lbrace = tenrec.text("(").ws();
    this.rbrace = tenrec.text(")").ws();
    this.mul_op = tenrec.char("*/%").ws();
    this.add_op = tenrec.char("+-").ws();

    //An integer literal
    this.integer_literal = tenrec.digit.oneOrMore().map((c) => {
        var num_str = c.map((el) => el.value).join("");
        return tenrec.Token(["Number", num_str], 0, num_str.length);
    });

    //A floating-point literal
    this.floating_literal = this.integer_literal
        .or(this.integer_literal
            .then(tenrec.text(".").then(this.integer_literal))
            .map((c) => {
                //Convert the CST to AST
                var int_part = c[0].value[1];
                var frac_part = c[1][1].value[1];
                var num_str = int_part + "." + frac_part;
                return tenrec.Token(["Number", num_str], 0, num_str.length);
            })).ws();

    this.brace_expr = tenrec.delay(() => this.lbrace.then(this.expr).then(this.rbrace));

    //An unary negation.
    this.neg_expr = tenrec.delay(() => tenrec.char("-").then(this.atom));

    this.atom = this.floating_literal.or(this.brace_expr).or(this.neg_expr);

    //A multiplicative expression.
    this.mul_expr = this.atom.delimited(this.mul_op);

    //An additive expression.
    this.add_expr = this.mul_expr.delimited(this.add_op);

    this.expr = this.add_expr;
}

//Driver code
function main() {
    var parser = math.expr;
    var input = "(1+11)";
    var ast = parser.parse(input);

    var opts = { "colors": "auto", "depth": null };
    console.log(util.inspect(ast,opts));
}

main();