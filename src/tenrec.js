//tenrec Library
//Usage permitted under terms of MIT License
var tenrec = new function () {
    /////////////////////////////////////////
    //TOKENS
    ////////////////////////////////////////
    /**
     * Token with position indices.
     * @param {*} value 
     * @param {number} pos_start 
     * @param {number} pos_end 
     */
    function Token(value, pos_start, pos_end) {
        if (!(this instanceof Token)) {
            return new Token(value, pos_start, pos_end);
        } else {
            this.value = value;
            this.pos_start = parseInteger(pos_start);
            this.pos_end = parseInteger(pos_end);
        }
    }

    ////////////////////////////////////////
    //HELPER FUNCTIONS
    ////////////////////////////////////////
    function parseInteger(a) { return Math.trunc(parseFloat(a)); }
    function isArray(a) {
        return Object.prototype.toString.call(a) === "[object Array]";
    }

    function pos_start(a) {
        if (isArray(a)) {
            return a.map(pos_start)[0];
        } else {
            return a.pos_start;
        }
    }

    function pos_end(a) {
        if (isArray(a)) {
            return a.map(pos_end).pop();
        } else {
            return a.pos_end;
        }
    }

    // function failed(n) { return n[1]; }

    ////////////////////////////////////////
    //PARSER ERROR
    ////////////////////////////////////////
    /**
     * Stores an error location.
     * @param {number} pos
     */
    function ParserError(pos) {
        this.pos = parseInt(pos);
    }

    ParserError.prototype.offset = function (i) {
        return new ParserError(this.pos + i);
    }


    ////////////////////////////////////////
    //PARSE RESULT
    ////////////////////////////////////////
    function ParseResult(text) {
        this.text = text;
        this.current_char = null;
        this.pos = -1;
        this.advance();

        this.ast = null;
        this.error = null;
    }


    ParseResult.prototype.advance = function () {
        this.pos++;
        this.current_char = this.pos < this.text.length
            ? this.text.charAt(this.pos)
            : null;
    }


    ParseResult.prototype.copy = function () {
        return { "ast": this.ast, "error": this.error, "__proto__": ParseResult.prototype }
    }

    ParseResult.prototype.register = function (res) {
        if (res instanceof ParseResult) {
            if (res.error) return this.failure(res.error);
            return res.ast;
        }
    }

    ParseResult.prototype.success = function (ast) {
        this.ast = ast;
        return this;
    }

    ParseResult.prototype.failure = function (error) {
        this.ast = null;
        this.error = error;
        return this;
    }


    ////////////////////////////////////////
    //PARSER 
    ////////////////////////////////////////
    /**
     * An internal parser class.
     * @param {function} run 
     */
    function Parser(run) {
        this.run = run;
    }

    Parser.prototype.parse = function (text) {
        var res = new ParseResult(text);
        this.run(res);

        if (res.pos < text.length) {
            return [null, new ParserError(res.pos)];
        }

        return [res.ast, res.error];
    }

    ////////////////////////////////////////
    //FACTORY 
    ////////////////////////////////////////
    /**
     * Returns a parser that expects the text.
     * @param {string} text 
     */
    function text(text) {
        text = "" + text;

        return new Parser(function (res) {
            var pos_start = res.pos;
            // var res = new ParseResult();
            var str = "";
            var i = 0;
            while (i < text.length) {
                if (res.current_char !== text.charAt(i)) {
                    return res.failure(new ParserError(i));
                }

                res.register(res.advance());
                i++;
            }


            return res.success(new Token(text, pos_start, pos_start + text.length));
        })
    }

    /**
     * Tries to match each parser in order until one succeeds.
     * 
     * If two parsers match the same prefix, the longer of the two must come first. 
     * @param  {...Parser} parsers 
     */
    function either(...parsers) {
        if (parsers.length > 2) {
            return either(parsers[0], either(...parsers.slice(1)));
        } else {
            var parser1 = parsers[0];
            var parser2 = parsers[1];
            return new Parser(function (res) {
                var t1 = res.register(parser1.run(res));
                if (res.error) {
                    res.error = null;
                    // this.set_text(this.text);
                    var t2 = res.register(parser2.run(res));
                    if (res.error) return res;
                    return res.success(t2);
                } else {
                    return res.success(t1);
                }
            });
        }
    }

    // /**
    //  * Returns a new parser that succeeds if `parser` fails.
    //  * @param {Parser} parser 
    //  */
    // function not(parser) {
    //     return new Parser(function (res) {
    //         var t = res.register(parser.run(res));
    //         if(res.error) {
    //             res.failure(null);
    //             var pos = t.pos;

    //             for(var i = 0; i <= pos; i++) {
    //                 res.register(res.advance());
    //             }

    //             return res.success(new Token(res.text,0,res.text.length));
    //         } else {
    //             res.success(null);
    //             return res.failure(new ParserError(pos_start(t)));
    //         }
    //     });
    // }

    /**
     * Expects a series of parsers in order.
     * @param  {...Parser} parsers 
     */
    function seq(...parsers) {
        return new Parser(function (res) {
            var accum = [];
            for (var i = 0; i < parsers.length; i++) {
                var tmp = res.register(parsers[i].run(res));
                if (res.error) return res;
                accum.push(tmp);
            }

            // console.log(res.pos,result)

            return res.success(accum);
        })
    }

    /**
     * Expects `parser` zero or more times.
     * @param  {Parser} parser 
    */
    function many(parser) {
        return new Parser(function (res) {
            var accum = [];

            while (true) {
                var result = res.register(parser.run(res));
                if (res.error) {
                    res.error = null;
                    return res.success(accum);
                } else {
                    accum.push(result);
                }
            }
        });
    }


    /**
     * Applies `f` to the output of `parser`.
     * @param {Parser} parser 
     * @param {function} f 
     */
    function transform(parser, f) {
        return new Parser(function (res) {
            var value = res.register(parser.run(res));
            if (res.error) return res;
            return res.success(f(value));
        });
    }

    /**
     * Returns a parser that expects one of the characters.
     * @param {string} chars 
     */
    function charSet(chars) {
        chars = "" + chars;
        return either(...chars.split("").map(text));
    }

    /**
     * Expects whitespace after `parser`.
     * @param {Parser} parser 
     */
    function word(parser) {
        return transform(seq(parser,tenrec.ws), (results) => results[0]);
    }

    /**
     * Creates a parser from a function that is evaluated 
     * the first time the parser is used.
     * This is useful for implementing recursive parsers.
     * @param {function} f 
     */
    function delay(f) {
        var parser = new Parser(function (res) {
            parser.run = f().run;
            return parser.run(res);
        });

        return parser;
    }


    this.digit = charSet("0123456789");
    this.lowerCase = charSet("abcdefghijklmnopqrstuvwxyz");
    this.upperCase = charSet("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.letter = charSet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.alphaNumeric = charSet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.ws = many(charSet(" \t\n\x0B\f\r"));
    
    this.any = new Parser(function (res) {
        return res.success(new Token(res.text, 0, res.text.length));
    });

    this.anyChar = new Parser(function (res) {
        if (res.text.length === 0) {
            return res.failure(new ParserError(0));
        } else if (res.text.length === 1) {
            return res.success(new Token(res.text, 0, res.text.length));
        } else {
            return res.failure(new ParserError(1));
        }
    });


    this.Token = Token;
    this.ParserError = ParserError;
    this.Parser = Parser;
    this.text = text;
    this.either = either;
    this.seq = seq;
    this.transform = transform;
    this.many = many;
    this.charSet = charSet;
    this.word = word;
    this.delay = delay;
}



//Module exports.
if (typeof module === "object" && module.exports) {
    module.exports = tenrec;
} else if (typeof define === "function" && define.amd) {
    define([], function () { return tenrec; })
}