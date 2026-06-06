const fs = require('fs');
const file = '/Users/praveenasok/Desktop/inhsuite/pricelists.html';
let content = fs.readFileSync(file, 'utf8');

// Find the function
const regex = /function createProductPriceList\(productGroup\) \{[\s\S]*?\n      \`;\n    \}/;
const match = content.match(regex);
if (match) {
    let fnStr = match[0];
    
    // Replace \` with `
    fnStr = fnStr.replace(/\\`/g, '`');
    // Replace \${ with ${
    fnStr = fnStr.replace(/\\\${/g, '${');

    content = content.replace(regex, fnStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully fixed escapes.");
} else {
    console.error("Function not found");
}
