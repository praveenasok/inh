const fs = require('fs');
const html = fs.readFileSync('/Users/praveenasok/Desktop/inhsuite/pricelists.html', 'utf8');

const regex = /function createProductPriceList\(productGroup\) \{[\s\S]*?\n      \`;\n    \}/;
const match = html.match(regex);
if (match) {
    fs.writeFileSync('/Users/praveenasok/Desktop/inhsuite/fn.js', match[0], 'utf8');
    console.log("Wrote fn.js");
} else {
    console.error("Function not found");
}
