//takne from https://stackoverflow.com/questions/4810841/pretty-print-json-using-javascript
function prettyJ(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
      function (match) {
        let cls = "\x1b[36m";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "\x1b[34m";
          } else {
            cls = "\x1b[32m";
          }
        } else if (/true|false/.test(match)) {
          cls = "\x1b[35m"; 
        } else if (/null/.test(match)) {
          cls = "\x1b[31m";
        }
        return cls + match + "\x1b[0m";
      }
    );
}

module.exports = prettyJ;