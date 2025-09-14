const fs = require('fs');

try {
    // Read the pricelists data
    const data = JSON.parse(fs.readFileSync('./pricelists-data.json', 'utf8'));
    
    console.log('📊 PRICE LIST ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`Total records: ${data.length}`);
    
    // Get unique price lists
    const priceListNames = new Set();
    const priceListCounts = {};
    
    data.forEach(record => {
        const priceListName = record['Price List Name'];
        if (priceListName) {
            priceListNames.add(priceListName);
            priceListCounts[priceListName] = (priceListCounts[priceListName] || 0) + 1;
        }
    });
    
    console.log(`\n📋 UNIQUE PRICE LISTS: ${priceListNames.size}`);
    console.log('-'.repeat(30));
    
    Array.from(priceListNames).sort().forEach(name => {
        const count = priceListCounts[name];
        const percentage = ((count / data.length) * 100).toFixed(1);
        console.log(`${name}: ${count} records (${percentage}%)`);
    });
    
    console.log('\n✅ Analysis completed successfully');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}