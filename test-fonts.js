const fs = require('fs');
const content = fs.readFileSync('fonts.js', 'utf8');
try {
  eval(content);
  console.log("Success! No syntax errors.");
} catch(e) {
  console.error("Syntax Error in fonts.js:", e.message);
}
