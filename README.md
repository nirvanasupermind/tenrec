# tenrec
[![npm version](https://badge.fury.io/js/tenrec.svg)](https://badge.fury.io/js/tenrec)<br>
**tenrec** is an efficient parser combinator library for JavaScript. It is an API, not a code generation tool.
<br><br>
tenrec has no runtime dependencies.

# Examples
There are several examples of using tenrec that can be found in [examples](./examples) folder. 

# Documentation
## `Parser`
Base parser class. All tenrec parsers are instances of this object.


## `Parser::parse(text)`
Parses the text, and outputs an array.<br><br>
If the parse was successful, the first of element of array will be the parsed result, and the second element will be `null`.<br><br>
If the parse failed, the first of element of array will be `null`, and the second element will be an error object.

```js
console.log(tenrec.alphaNumeric.parse("s")); 
/* -> [ Token { value: "s", pos_start: 0, pos_end: 1 }, null ] */

console.log(tenrec.alphaNumeric.parse("_")); 
/* -> [ null, ParserError { pos: 0 } ] */
```


## `ParserError(pos)`
Class that stores an error location.

```js
console.log(tenrec.ParserError(8)); //-> ParserError { pos: 8 }
```

## `Token(value,pos_start,pos_end)`
Class that stores a value and it's position in the text.

```js
console.log(tenrec.Token("a",0,1)); 
//-> Token { value: "a", pos_start: 0, pos_end: 1 }
```

## `alphaNumeric`
Parser that expects a character from the set `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.

```js
console.log(tenrec.alphaNumeric.parse("s")); 
// -> [ Token { value: "s", pos_start: 0, pos_end: 1 }, null ]

console.log(tenrec.alphaNumeric.parse("_")); 
// -> [ null, ParserError { pos: 0 } ]
```

## `any`
Parser that always succeeds with the input text and consumes it. 

```js
console.log(tenrec.any.parse("foo")); 
/* -> [ Token { value: "foo", pos_start: 0, pos_end: 3 }, null ] */

console.log(tenrec.any.parse("bar")); 
/* -> [ Token { value: "bar", pos_start: 0, pos_end: 3 }, null ] */
```


## `anyChar`
Parser that succeeds if the input text is a single character.
```js
console.log(tenrec.anyChar.parse("q")); 
/* -> [ Token { value: "q", pos_start: 0, pos_end: 1 }, null ] */

console.log(tenrec.anyChar.parse("qq"));  //-> [ null, ParserError { pos: 1 } ]
```

## `charSet(chars)`
Returns a parser that expects one of the characters.
```js
var parser = tenrec.charSet("0123456789abc");
console.log(parser.parse("0"))
/* -> [ Token { value: "0", pos_start: 0, pos_end: 1 }, null ] */

console.log(parser.parse("1"))
/* -> [ Token { value: "0", pos_start: 0, pos_end: 1 }, null ] */

console.log(parser.parse("d")) //-> [ null, ParserError { pos: 0 } ]
```

## `delay(f)`
Creates a parser from a function that is evaluated the first time the parser is used. This is useful for implementing recursive parsers.
```js
var parser = tenrec.delay(() => {
    return tenrec.either(
        tenrec.text("b"),
        tenrec.seq(
            tenrec.text("a"),
            parser
        )
    );
});

console.log(parser.parse("b"));
//-> [ Token { value: "b", pos_start: 0, pos_end: 1 }, null ]

console.log(parser.parse("ab"));
/* -> [ [ Token { value: "a", pos_start: 0, pos_end: 1 },
          Token { value: "b", pos_start: 1, pos_end: 2 } ], null ] */

console.log(parser.parse("aab"));
/* -> [ [ Token { value: "a", pos_start: 0, pos_end: 1 },
          [   Token { value: "a", pos_start: 1, pos_end: 2 },
              Token { value: "b", pos_start: 2, pos_end: 3 }] ], null ] */

console.log(parser.parse("foo"));
// -> [ null, ParserError { pos: 0 } ]
```

## `digit`
Parser that expects a character from the set `0123456789`.
```js
console.log(tenrec.digit.parse("0")); 
// ->  [ Token { value: "0", pos_start: 0, pos_end: 1 }, null ]

console.log(tenrec.digit.parse("z")); 
// ->  [ null, ParserError { pos: 0 } ]
```

# License
tenrec is licensed under the MIT License.