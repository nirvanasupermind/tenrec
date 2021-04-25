"use strict";
var tenrec = new function () {
    ////////////////////////////////////////
    //HELPERS
    ////////////////////////////////////////
    function isArray(a) {
        return Object.prototype.toString.apply(a) === "[object Array]";
    }

    function offset(a, b) {
        if (!isArray(a)) {
            return new Token(a.value, a.pos_start + b, a.pos_end + b);
        } else {
            return a.map((el) => offset(el, b));
        }
    }

    function pos_start(a) {
        if (!isArray(a)) {
            return a.pos_start;
        } else {
            return a.map(pos_start)[0];
        }
    }

    function pos_end(a) {
        if (!isArray(a)) {
            return a.pos_end;
        } else {
            return a.map(pos_end)[0];
        }
    }


    ////////////////////////////////////////
    //PARSER ERROR
    ////////////////////////////////////////
    function ParserError(pos) {
        this.pos = parseFloat(pos);
    }


    ParserError.prototype.offset = function (offset) {
        return new ParserError(this.pos + offset);
    }



    ////////////////////////////////////////
    //TOKENS
    ////////////////////////////////////////
    function Token(value, pos_start, pos_end) {
        this.value = value;
        this.pos_start = parseInt(pos_start);
        this.pos_end = parseInt(pos_end);
    }

    ////////////////////////////////////////
    //PARSER
    ////////////////////////////////////////
    function Parser(parser) {
        this.parser = parser;
    }

    Parser.prototype.or = function (other) {
        var parser1 = this, parser2 = other;
        return new Parser(function (input) {
            var t1 = parser1.parser(input);
            if (!(t1 instanceof ParserError)) {
                return t1;
            } else {
                var temp = parser2.parser(input);
                if (temp instanceof ParserError) {
                    return new ParserError(Math.max(t1.pos, temp.pos));
                } else {
                    return temp;
                }
            }
        });
    }

    Parser.prototype.not = function () {
        var parser1 = this;
        return new Parser(function (input) {
            var t1 = parser1.parser(input);
            if (t1 instanceof ParserError) {
                return new DSLToken(input, 0, input.length);
            } else {
                return new ParserError(pos_end(t1));
            }
        });
    }

    Parser.prototype.then = function (other) {
        var parser1 = this, parser2 = other;
        var result = new Parser(function (input) {
            var m = parser1.parse(input);
            var i = parser1.parse(input).pos;
            if (i === undefined) i = pos_end(m);

            var a = parser1.parser(input.substring(0, i));
            if (a instanceof ParserError) return a;

            var b = parser2.parser(input.substring(i));

            if (b instanceof ParserError) return b.offset(i);

            if (isArray(a) && parser1._isThenParser) return a.concat(offset(b, i));
            // console.log(parser2);
            if (isArray(b)) {
                var tmp = offset(b, i)
                tmp.unshift(a)
                return tmp;
            }

            return [a, offset(b, i)];
        });

        result._isThenParser = true;
        return result;
    }

    Parser.prototype.repeat = function (count) {
        count = parseInt(count);
        if(count === 0) return text("");

        var result = this;
        for(var i = 1; i < count; i++) {
            result = result.then(this);
        }

        return result;
    }

    Parser.prototype.oneOrMore = function () {
        var result = delay(() => this.or(this.then(result)));
        return result;
    }
    
    Parser.prototype.zeroOrMore = function () {
        return text("").map(() => []).or(this.oneOrMore());
    }

    Parser.prototype.map = function (f) {
        var parser1 = this;
        return new Parser(function (input) {
            var t = parser1.evaluate(input);
            if (t instanceof ParserError) return t;
            return f(t);
        })
    }


    Parser.prototype.parse = function (text) {
        text = "" + text;
        return this.parser(text);
    }

    ////////////////////////////////////////
    //FACTORY METHODS
    ////////////////////////////////////////
    function text(text) {
        text = ""+text;
        return new Parser(function (input) {
            if(input === text) {
                return new Token(text, 0, text.length); 
            } else {
                var i = 0;
            }
        })
    }


    this.Token = Token;
    this.ParserError = ParserError;
    this.Parser = Parser;
    this.text = text;
};

if (typeof module === "object" && module.exports) { //CJS
    module.exports = tenrec;
} else if (typeof define === "function" && define.amd) { //RequireJS
    define([], function () { return tenrec; });
}