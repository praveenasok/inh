const fs = require('fs');
const content = fs.readFileSync('page.js', 'utf8');

// Use a regex to extract the large declaration block
const match = content.match(/let n = \(e, a, t, i\)([\s\S]*?)];\n\s*function u\(e, a\)/);
if (match) {
  let jsCode = match[0].replace(/];\s*function u\(e, a\)/, '];');
  
  // It's a large comma separated `let` declaration.
  // We can just append a console.log to output `h` (the final array).
  jsCode += '\nconsole.log(JSON.stringify(h, null, 2));\n';
  fs.writeFileSync('eval_recipes.js', jsCode);
  console.log("Successfully created eval_recipes.js");
} else {
  console.log("No match found");
}
