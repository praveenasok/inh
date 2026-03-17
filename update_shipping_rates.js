const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'shipping-calculator', 'data.js');

try {
    let fileContent = fs.readFileSync(dataFilePath, 'utf8');

    // Extract the JSON-like object part. 
    const startIndex = fileContent.indexOf('{');
    const endIndex = fileContent.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        throw new Error('Could not find object in data.js');
    }

    let jsonString = fileContent.substring(startIndex, endIndex + 1);

    // Replace NaN with "NaN_PLACEHOLDER" to make it valid JSON
    // Note: NaN is not quoted in JS object, so we look for : NaN
    jsonString = jsonString.replace(/:\s*NaN/g, ': "NaN_PLACEHOLDER"');

    const data = JSON.parse(jsonString);

    let updatedCount = 0;

    for (const providerKey in data) {
        if (data.hasOwnProperty(providerKey)) {
            const providerData = data[providerKey];
            if (providerData.rates) {
                const rates = providerData.rates;
                for (const weightKey in rates) {
                    if (rates.hasOwnProperty(weightKey)) {
                        const zoneRates = rates[weightKey];
                        for (const zoneKey in zoneRates) {
                            if (zoneRates.hasOwnProperty(zoneKey)) {
                                const originalRate = zoneRates[zoneKey];

                                // Check if it's a number and not our placeholder
                                if (typeof originalRate === 'number' && !isNaN(originalRate)) {
                                    // Increase by 10% (multiply by 1.10)
                                    // Round to 3 decimal places to match existing precision if needed, 
                                    // or just let it float. Original data has 3 decimals (e.g., 2234.925)
                                    // let's keep precision reasonable
                                    let newRate = originalRate * 1.10;

                                    // Optional: Round to nearest whole number or keep decimals?
                                    // Existing data has decimals, let's keep them but maybe fix floating point errors
                                    newRate = parseFloat(newRate.toFixed(3));

                                    zoneRates[zoneKey] = newRate;
                                    updatedCount++;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    console.log(`Updated ${updatedCount} rates.`);

    // Reconstruct the file content
    let newJsonString = JSON.stringify(data, null, 4);

    // Restore NaN keys: "key": "NaN_PLACEHOLDER" -> "key": NaN
    newJsonString = newJsonString.replace(/: "NaN_PLACEHOLDER"/g, ': NaN');

    const newFileContent = `const shippingData = ${newJsonString};\nwindow.shippingData = shippingData;`;

    fs.writeFileSync(dataFilePath, newFileContent, 'utf8');
    console.log('Successfully updated shipping-calculator/data.js');

} catch (error) {
    console.error('Error updating rates:', error);
    process.exit(1);
}
