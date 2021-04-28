"use strict";
var tenrec = new function () {
    ////////////////////////////////////////
    //HELPERS
    ////////////////////////////////////////
    function pos_start(a) {
        if (!Array.isArray(a)) {
            return a.pos_start;
        } else {
            return a.map(pos_start)[0];
        }
    }

    function pos_end(a) {
        if (!Array.isArray(a)) {
            return a.pos_end;
        } else {
            var tmp = a.map(pos_end);
            return tmp[tmp.length - 1];
        }
    }

    function offset_pos(a, offset) {
        offset = parseInt(offset);
        if (a instanceof Token) {
            return new Token(a.value, a.pos_start + offset, a.pos_end + offset);
        } else if (a instanceof ParserError) {
            return a.offset(offset);
        } else {
            return a.map((el) => offset_pos(el, offset));
        }
    }

    function listify(a) {
        if (!Array.isArray(a)) {
            return [a];
        } else {
            return a;
        }
    }

    ////////////////////////////////////////
    //TOKENS
    ////////////////////////////////////////
    /**
     * Stores the value, start position and end position of a parse result.
     * @param {*} value 
     * @param {number} pos_start 
     * @param {number} pos_end 
     */
    function Token(value, pos_start, pos_end) {
        if (!(this instanceof Token)) {
            return new Token(value, pos_start, pos_end);
        } else {
            this.value = value;
            this.pos_start = parseInt(pos_start);
            this.pos_end = parseInt(pos_end);
        }
    }

    ////////////////////////////////////////
    //PARSER ERROR
    ////////////////////////////////////////
    /**
     * A parser error class.
     * @param {number} pos 
     */
    function ParserError(pos) {
        if (!(this instanceof ParserError)) {
            return new ParserError(pos);
        } else {
            this.pos = parseInt(pos);
        }
    }

    ParserError.prototype.offset = function (offset) {
        offset = parseInt(offset);
        return new ParserError(this.pos + offset);
    }


    ////////////////////////////////////////
    //PARSER
    ////////////////////////////////////////
    /**
     * Creates a new parser from the function.
     * @param {function} run
     */
    function Parser(run) {
        if (!(this instanceof Parser)) {
            return new Parser(run);
        } else {
            this.run = run;
        }
    }

    /**
     * Returns a new parser that succeeds only if `this` fails.
     */
    Parser.prototype.not = function () {
        var parser1 = this;
        return new Parser(function (input) {
            var t = parser1.run(input);
            if (t instanceof ParserError) {
                return new Token(input, 0, input.length);
            } else {
                return new ParserError(pos_start(t));
            }
        });
    }


    /**
     * Returns a new parser which tries `this` and, if it fails, tries `other`.
     * @param {Parser} other
     */
    Parser.prototype.or = function (other) {
        var parser1 = this, parser2 = other;
        return new Parser(function (input) {
            var t = parser1.run(input);
            if (!(t instanceof ParserError)) return t;

            var u = parser2.run(input);
            if (u instanceof ParserError) return new ParserError(Math.max(t.pos, u.pos));
            return u;
        });
    }

    /**
     * Expects `other` after `this`.
     * @param {Parser} other 
     */
    Parser.prototype.then = function (other, opt = false) {
        var parser1 = this, parser2 = other;
        return Object.assign(new Parser(function (input) {
            var i = parser1.run(input).pos;
            if (i === undefined) {
                i = 0;
                while (i < input.length && parser1.run(input.substring(0, i)) instanceof ParserError) {
                    i++;
                }
            }


            var a = input.substring(0, i), b = input.substring(i);

            if (input === "(1+11)")
                console.log("owo", input, a, b, parser2.parse(")"));

            // console.log(i,a,b);
            var t1 = parser1.run(a);
            if (t1 instanceof ParserError) return t1;

            var t2 = parser2.run(b);
            if (t2 instanceof ParserError) return t2.offset(i);

            if (!opt && Array.isArray(t1) && parser1._isThenParser)
                return t1.concat(offset_pos(t2, i));

            return [t1, offset_pos(t2, i)];
        }), { "_isThenParser": true, parser1, parser2 });
    }

    /**
     * Expects optional whitespace after `this`.
     */
    Parser.prototype.ws = function () {
        return this.then(tenrec.optWs).map((c) => c[0]);
    }

    /**
     * Expects `this` zero or one times.
     */
    Parser.prototype.opt = function () {
        return text("").or(this);
    }

    /**
     * Expects `this` exactly `n` times.
     * @param {number} n 
     */
    Parser.prototype.repeat = function (n) {
        if (n === 0) return text("").map(() => [])
        var result = this;
        for (var i = 1; i < n; i++) {
            result = result.then(this);
        }

        return result;
    }
    /**
     * Expects `this` zero or more times.
     */
    Parser.prototype.zeroOrMore = function () {
        return text("").map(() => []).or(this.oneOrMore());
    }

    /**
     * Expects `this` one or more times.
     */
    Parser.prototype.oneOrMore = function () {
        var parser = delay(() => this.map((c) => [c]).or(
            this.then(parser, true).map((c) => [c[0]].concat(c[1]))
        ));

        return parser;
    }

    /**
     * Expects `this` zero or more times, with a delimiter between each one. 
     * @param {Parser} delimiter 
     */
    Parser.prototype.delimited = function (delimiter) {
        var pairs = delimiter.then(this);
        return this.or(this.then(pairs.oneOrMore())
            .map((c) => [c[0]].concat(c[1])));
    }

    /**
     * Applies `f` to the output of `this`.
     * @param {function} f 
     */
    Parser.prototype.map = function (f) {
        var parser1 = this;

        return new Parser(function (input) {
            var temp = parser1.run(input);
            if (temp instanceof ParserError) return temp;
            return f(temp);
        });
    }

    /**
     * Parses the text. It will return a `Token`, an array of `Token`s, or a `ParserError` object
     * by default.
     * @param {string} text
     */
    Parser.prototype.parse = function (text) {
        text = "" + text; //cast to string
        return this.run(text);
    }


    ////////////////////////////////////////
    //CORE PARSERS
    ////////////////////////////////////////
    /**
     * Create a parser that looks for the text.
     * @param {string} text 
     */
    function text(text) {
        text = "" + text; //cast to string
        return new Parser(function (input) {
            if (input === text) {
                return new Token(text, 0, text.length);
            } else {
                //Calculate the index where it faled
                var i = 0;
                while (i < input.length && input.charAt(i) === text.charAt(i)) {
                    i++;
                }

                return new ParserError(i);
            }
        });
    }


    /**
     * Returns a parser that expects a character from `chars`.
     * @param {string} chars 
     */
    function char(chars) {
        chars = "" + chars;
        return chars.split("")
            .map(text)
            .reduce((a, b) => a.or(b));
    }

    function delay(f) {
        var parser = new Parser(function (input) {
            parser.run = f().run;
            return parser.run(input);
        });

        return parser;
    }

    this.any = new Parser(function (input) {
        return new Token(input, 0, input.length);
    })

    this.anyChar = new Parser(function (input) {
        if (input === "") return new ParserError(0);
        if (input.length === 1) return new Token(input, 0, input.length);
        return new ParserError(1);
    });

    this.eof = text("");
    this.digit = char("0123456789");
    this.hexDigit = char("0123456789abcdefABCDEF");
    this.lowerCase = char("abcdefghijklmnopqrstuvwxyz");
    this.upperCase = char("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.letter = char("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.alphaNumeric = char("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.ws = char(" \t\r\n\u00A0\uFEFF").oneOrMore().map((c) => {
        var str = c.map((el) => el.value).join("")
        return new Token(str, 0, str.length);
    });

    this.optWs = this.ws.opt();

    this.Token = Token;
    this.ParserError = ParserError;
    this.Parser = Parser;
    this.text = text;
    this.char = char;
    this.delay = delay;
}


//Module exports.
if (typeof module === "object" && module.exports) { //CJS
    module.exports = tenrec;
} else if (typeof define === "function" && define.amd) { //RequireJS
    define([], function () { return tenrec; });
}