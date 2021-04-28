var tenrec = new function () {
    ////////////////////////////////////////
    //UTILITY FUNCTIONS
    ////////////////////////////////////////
    //evil typescript hack
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    Array.prototype.failed = function () { return !!this[1]; }

    function parseInteger(v) {
        return Math.trunc(parseFloat(v));
    }

    
    ////////////////////////////////////////
    //ERRORS
    ////////////////////////////////////////
    function ParserError(pos) {
        this.pos = parseInteger(pos);
    }

    ParserError.prototype.offset = function (i) {
        return new ParserError(this.pos+i);
    }

    ////////////////////////////////////////
    //PARSER
    ////////////////////////////////////////
    function Parser() { }
    Parser.prototype.parse = function () {
        throw "Unimplemented";
    }


    ////////////////////////////////////////
    __extends(TextParser, Parser);
    function TextParser(text) {
        Parser.call(this);
        this.text = ""+text;
    }

    TextParser.prototype.parse = function (text) {
        text = ""+text;
        if (text === this.text) {
            return [text, null];
        } else {
            var i = 0;
            while (i < this.text.length && text.charAt(i) === this.text.charAt(i)) {
                i++;
            }

            return [null, new ParserError(i)];
        }
    }

    ////////////////////////////////////////
    __extends(EitherParser, Parser);
    function EitherParser(parser, parser2) {
        Parser.call(this);
        this.parser = parser;
        this.parser2 = parser2;
    }

    EitherParser.prototype.parse = function (text) {
        text = ""+text;

        var [result,error] = this.parser.parse(text);
        if(error) return this.parser2.parse(text);
        return [result,error];
    }

    /////////////////////////////////////////
    __extends(CharSetParser, Parser);
    //Returns a parser that expects one of the characters.
    function CharSetParser(chars) {
        Parser.call(this);
        this.chars = ""+chars;
    }

    CharSetParser.prototype.parse = function (text) { 
        text = ""+text;
        if(text.length === 0) return [null, new ParserError(0)];
        if(text.length >= 2) return [null, new ParserError(1)];
        
        if(this.chars.split("").includes(text)) {
            return [text, null];
        } else {
            return [null, new ParserError(0)];
        }
    }

    ////////////////////////////////////////
    __extends(NotParser, Parser);
    //Returns a new parser that succeeds only if the parser fails. 
    function NotParser(parser) {
        Parser.call(this);
        this.parser = parser;
    }

    NotParser.prototype.parse = function (text) {
        text = ""+text;
        var [_,error] = this.parser.parse(text);
        if(error) {
            return [text,null];
        } else {
            var i = 0;
            while(i < text.length
                  && this.parser.parse(text.substring(0,i)).failed()) {
                i++;
            }
    
            return [null,new ParserError(i-1)];
        }
    }

    ////////////////////////////////////////    
    __extends(SeqParser, Parser);

    //Creates a parser that matches a series of parsers in order.
    function SeqParser(parser, parser2) {
        Parser.call(this);
        this.parser = parser;
        this.parser2 = parser2;
    }

    SeqParser.prototype.parse = function (text) {
        text = ""+text;

        var i = 0;
        while(i < text.length 
             && this.parser.parse(text.substring(0,i)).failed()) {
            i++;
        }
        
        var a = text.substring(0,i), b = text.substring(i);

        var [result1, error1] = this.parser.parse(a);
        if(error1) return [null,error1];
        
        var [result2, error2] = this.parser2.parse(b);   
        if(error2) return [null,error2.offset(i)];
        
        if(this.parser instanceof SeqParser && Array.isArray(result1)) {
            return [result1.concat(result2),null];
        } else {
            return [[result1,result2],null];
        }
    }
    
    //////////////////////////////////////// 
    __extends(DelayParser,Parser);
    function DelayParser(f) {
        Parser.call(this);
        this.f = f;
    }   

    DelayParser.prototype.parse = function(text) {
        text = ""+text;
        return this.f().parse(text);
    }

    //////////////////////////////////////// 
    __extends(RepeatParser,Parser);
    //Consumes parser between min and max times inclusive.
    function RepeatParser(parser,min,max) {
        Parser.call(this);
        this.parser = parser;
        this.min = parseInteger(min);
        this.max = parseInteger(max);
    }

    RepeatParser.prototype.parse = function (text) {
        text = ""+text;

        if(this.min <= 0 && text === "") return [[],null];
        var accum = [];
        var i = 0;
        while(i < text.length 
                && this.parser.parse(text.substring(i)).failed()) {
            i++;
        }
        
        var offset = 0;
        var flag = false;
        var k = 0;


        while(true) {
            if(accum.length > this.max) return [null,new ParserError(offset)];
            var j = i;
            i = 0;
            while(i < j && this.parser.parse(text.substring(i,j)).failed()) {
                i++;
            }

            offset += i;

            var t = text.substring(i,j);
            if(t === "") {
                var k = 0;
                while(k < text.length && this.parser.parse(text.substring(k)).failed()) {
                    k++;
                }

                t = text.substring(k);
                flag = true;
            }

            var a = this.parser.parse(t);
            if(a.failed()) {
                if(offset === 0) {
                    return a;
                } else {
                    return [null,a[1].offset(offset-1)];
                }
            }


            accum.push(a[0]);
            if(flag === true) break;
        }
        

        if(accum.length > this.max) return [null,new ParserError(k)];
        if(accum.length < this.min) return [null,new ParserError(k)];
        return [accum,null];
    }


    //////////////////////////////////////// 
    __extends(ManyParser,RepeatParser);
    //Consumes parser zero or more times.
    function ManyParser(parser) {
        RepeatParser.call(this,parser,0,Infinity);
    }

    //////////////////////////////////////// 
    __extends(OptParser,EitherParser);
    //Consumes parser zero or one times.
    function OptParser(parser) {
        EitherParser.call(this,text(""),parser);
    }

    //////////////////////////////////////// 
    __extends(WithWsParser,TransformParser);
    //Expects optional whitespace after parser.
    function WithWsParser(parser) {
        TransformParser.call(this,new SeqParser(parser,tenrec.optWs), (c) => c[0]);
    }

    WithWsParser.prototype.parse = function (text) {
        return new TransformParser(this.parser, this.f).parse(text);
    }
    
    //////////////////////////////////////// 
    //Applies f to the output of parser.
    __extends(TransformParser,Parser);
    function TransformParser(parser,f) {
        Parser.call(this);
        this.parser = parser;
        this.f = f;
    }

    TransformParser.prototype.parse = function (text) {
        text = ""+text;

        var t = this.parser.parse(text);
        if(t.failed()) 
            return t;
        else
            return [this.f(t[0]),null];
    }

    ////////////////////////////////////////
    //CORE PARSERS
    ////////////////////////////////////////
    /**
     * Returns a parser that expects the text.
     * @param {string} text 
     */
    function text(text) {
        text = "" + text;
        return new TextParser(text);
    }

    /**
     * Returns a new parser that tries to match each parser in order until one succeeds. 
     * @param  {...Parser} parsers 
     */
    function either(...parsers) {
        return parsers.reduce((a,b) => new EitherParser(a, b));
    }


    /**
     * Returns a parser that expects one of the characters.
     * @param {string} chars 
     */
    function charSet(chars) {
        chars = ""+chars;
        return new CharSetParser(chars);
    }
    
    /**
     * Returns a new parser that succeeds only if `parser` fails. 
     * If it succeeds, it will return the input text.
     * @param  {Parser} parser 
     */
    function not(parser) {
        return new NotParser(parser);
    }

    /**
     * Creates a parser that matches a series of parsers in order.
     * @param  {...Parser} parsers 
     */
    function seq(...parsers) {
        return parsers.reduce((a,b) => new SeqParser(a, b));
    }
    
    /**
     * Consumes `parser` between `min` and `max` times inclusive.
     * @param {Parser} parser 
     * @param {number} min 
     * @param {number} [max]
     */
    function repeat(parser, min, max=null) {
        if(max === null) max = min;
        return new RepeatParser(parser, min, max);
    }

    /**
     * Consumes `parser` zero or more times.
     * @param {Parser} parser 
     */
    function many(parser) {
        return new ManyParser(parser);
    }    
    
    /**
     * Creates a parser from a function, which is evaluated the first time the parser is used. 
     * This allows for recursive parsers.
     * @param {function} f 
     */
    function delay(f) {
        var parser = new DelayParser(f);
        return parser;
    }

    /**
     * Applies `f` to the output of `parser`.
     * @param {Parser} parser 
     * @param {function} f 
     */
    function transform(parser,f) {
        return new TransformParser(parser,f);
    }

    /**
     * Consumes `parser` zero or one times.
     * @param {Parser} parser 
     */
    function opt(parser) {
        return new OptParser(parser);
    }

    /**
     * Expects optional whitespace after `parser`.
     * @param {Parser} parser
     */
    function withWs(parser) {
        return new WithWsParser(parser);
    }

    this.digit = charSet("0123456789");
    this.lowerCase = charSet("abcdefghijklmnopqrstuvwxyz");
    this.upperCase = charSet("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.letter = charSet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.alphaNumeric = charSet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    this.ws = transform(many(charSet("\t\n\x0B\f\r")), (c) => c.join(""));
    this.optWs = opt(this.ws);
    
    this.text = text;
    this.either = either;
    this.charSet = charSet;
    this.not = not;
    this.seq = seq;
    this.repeat = repeat;
    this.many = many;
    this.delay = delay;
    this.transform = transform;
    this.opt = opt;
    this.withWs = withWs;
}

if (typeof module === "object" && module.exports) {
    module.exports = tenrec;
} else if (typeof define === "function" && define.amd) {
    define([], function () { return tenrec; })
}