const fs = require('fs');
const html = fs.readFileSync('/Users/praveenasok/Desktop/inhsuite/pricelists.html', 'utf8');

const regex = /function createProductPriceList\(productGroup\) \{[\s\S]*?\n      \`;\n    \}/;
const match = html.match(regex);
if (match) {
    const fnStr = match[0];
    const testCode = `
        const state = { currency: 'INR' };
        ${fnStr}
        const html = createProductPriceList({
            category: 'Category',
            product: 'Product',
            density: '100%',
            colors: 'Black',
            items: [{
                Length: '10',
                calculatedPrice: 100,
                currencySymbol: '₹'
            }]
        });
        console.log("Success, HTML length:", html.length);
    `;
    try {
        eval(testCode);
    } catch(e) {
        console.error("Error evaluating:", e);
    }
} else {
    console.error("Function not found");
}
