const fs = require('fs');
const file = '/Users/praveenasok/Desktop/inhsuite/inh-ratio-mix/script.js';
let content = fs.readFileSync(file, 'utf8');

const target = "let displayHTML = `";
const inject = `
        const validLengths = ACTIVE_FINISHED_LENGTHS.map(len => {
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[len] !== undefined && appState.customPrices[len] !== '' && appState.customPrices[len] !== null) {
                displayPrice = appState.customPrices[len];
            } else {
                displayPrice = calculateColumn(len);
            }
            return { len, displayPrice };
        }).filter(item => item.displayPrice > 0 || (item.displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[item.len] !== undefined && appState.customPrices[item.len] !== ''));

        const headersHTML = validLengths.map((item, i) => {
            const borderRight = i < validLengths.length - 1 ? 'border-right: 2px solid #e2e8f0;' : '';
            return \\\`<th style="padding: 16px 15px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 14px; \\\${borderRight} position: static;">\\\${item.len}"</th>\\\`;
        }).join('');

        const pricesHTML = validLengths.map((item, i) => {
            const converted = parseFloat(item.displayPrice).toFixed(2);
            const borderRight = i < validLengths.length - 1 ? 'border-right: 1px solid #f1f5f9;' : '';
            return \\\`<td style="padding: 16px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; \\\${borderRight}">\\\${converted}</td>\\\`;
        }).join('');

        let displayHTML = \``;

if(content.includes(inject)) {
    console.log("Already injected.");
} else if(content.includes(target)) {
    // Only replace the FIRST occurrence which we know is at line 1015, but let's be careful.
    // Actually, let's replace "const _sharedHairBorder = _sharedHairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';\n\n        let displayHTML = `"
    
    const specificTarget = "const _sharedHairBorder = _sharedHairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';\n\n        let displayHTML = `";
    const specificInject = "const _sharedHairBorder = _sharedHairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';\n" + inject;
    
    content = content.replace(specificTarget, specificInject);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.log("Target not found.");
}
