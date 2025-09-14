const fs = require('fs');
const path = require('path');

// Read the pricelists data
const pricelistsDataPath = path.join(__dirname, 'pricelists-data.json');
const dataJsonPath = path.join(__dirname, 'data.json');

try {
  // Read the pricelists data
  const pricelistsData = JSON.parse(fs.readFileSync(pricelistsDataPath, 'utf8'));
  console.log(`📊 Found ${pricelistsData.length} products in pricelists-data.json`);
  
  // Transform the data to match the expected format
  const transformedProducts = pricelistsData.map(product => {
    return {
      ...product,
      // Ensure PriceListName is set from "Price List Name"
      PriceListName: product['Price List Name'] || product.PriceListName || product.PriceList,
      // Ensure other fields are properly mapped
      PriceList: product['Price List Name'] || product.PriceListName || product.PriceList
    };
  });
  
  // Create the data structure expected by the application
  const dataJson = {
    products: transformedProducts
  };
  
  // Write to data.json
  fs.writeFileSync(dataJsonPath, JSON.stringify(dataJson, null, 2));
  
  console.log(`✅ Successfully populated data.json with ${transformedProducts.length} products`);
  
  // Show price list distribution
  const priceListCounts = {};
  transformedProducts.forEach(product => {
    const priceList = product.PriceListName || product.PriceList || product['Price List Name'];
    if (priceList) {
      priceListCounts[priceList] = (priceListCounts[priceList] || 0) + 1;
    }
  });
  
  console.log('\n📋 Price List Distribution:');
  Object.entries(priceListCounts).forEach(([priceList, count]) => {
    console.log(`  ${priceList}: ${count} products`);
  });
  
} catch (error) {
  console.error('❌ Error populating data.json:', error.message);
  process.exit(1);
}