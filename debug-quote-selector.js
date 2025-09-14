// Debug script to test quote maker price list selector
const http = require('http');

// Make a request to the local server
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('=== DEBUGGING QUOTE MAKER SELECTOR ===');
    
    // Check if embedded data exists
    const embeddedDataMatch = data.match(/<script type="application\/json" id="EMBEDDED_DATA"[^>]*>([\s\S]*?)<\/script>/);
    if (embeddedDataMatch) {
      try {
        const embeddedData = JSON.parse(embeddedDataMatch[1]);
        console.log('✅ Embedded data found:');
        console.log(`   - Products: ${embeddedData.products ? embeddedData.products.length : 'N/A'}`);
        console.log(`   - Salesmen: ${embeddedData.salesmen ? embeddedData.salesmen.length : 'N/A'}`);
        
        if (embeddedData.products && embeddedData.products.length > 0) {
          // Check unique price lists
          const priceLists = new Set();
          embeddedData.products.forEach(product => {
            if (product.PriceListName) priceLists.add(product.PriceListName);
            if (product.PriceList) priceLists.add(product.PriceList);
            if (product['Price List Name']) priceLists.add(product['Price List Name']);
          });
          console.log(`   - Unique price lists: ${priceLists.size}`);
          console.log(`   - Price list names: ${Array.from(priceLists).slice(0, 5).join(', ')}${priceLists.size > 5 ? '...' : ''}`);
        }
      } catch (error) {
        console.error('❌ Failed to parse embedded data:', error.message);
      }
    } else {
      console.log('❌ No embedded data found in HTML');
    }
    
    // Check if quote-price-list-selector exists
    const selectorMatch = data.match(/<select[^>]*id=["']quote-price-list-selector["'][^>]*>([\s\S]*?)<\/select>/);
    if (selectorMatch) {
      const selectorContent = selectorMatch[1];
      const optionMatches = selectorContent.match(/<option[^>]*>([\s\S]*?)<\/option>/g);
      console.log('\n📋 Quote price list selector found:');
      console.log(`   - Options count: ${optionMatches ? optionMatches.length : 0}`);
      if (optionMatches && optionMatches.length > 0) {
        console.log('   - Options:');
        optionMatches.slice(0, 5).forEach((option, index) => {
          const textMatch = option.match(/>([^<]*)</); 
          console.log(`     ${index + 1}. ${textMatch ? textMatch[1] : 'Unknown'}`);
        });
        if (optionMatches.length > 5) {
          console.log(`     ... and ${optionMatches.length - 5} more`);
        }
      }
    } else {
      console.log('❌ Quote price list selector not found in HTML');
    }
    
    // Check if initQuoteMakerPriceListSelector function exists
    const functionMatch = data.match(/function initQuoteMakerPriceListSelector\(\)[\s\S]*?console\.log\(['"]Debug: state\.allProducts length:['"], state\.allProducts\.length\);/);
    if (functionMatch) {
      console.log('\n🔧 initQuoteMakerPriceListSelector function found with debug logging');
    } else {
      console.log('\n❌ initQuoteMakerPriceListSelector function not found or missing debug logging');
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
});

req.end();