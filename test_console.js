const fs = require('fs');
const http = require('http');

// Simple test to check if the page loads and what console messages might appear
http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Page loaded successfully');
    
    // Check if the selector exists in HTML
    const selectorMatch = data.match(/<select[^>]*id="quote-price-list-selector"[^>]*>([\s\S]*?)<\/select>/);
    if (selectorMatch) {
      console.log('Selector found in HTML:');
      console.log(selectorMatch[0]);
      
      // Count options
      const optionMatches = selectorMatch[1].match(/<option[^>]*>/g);
      console.log('Number of options:', optionMatches ? optionMatches.length : 0);
    } else {
      console.log('Selector not found in HTML');
    }
    
    // Check if embedded data exists
    const embeddedMatch = data.match(/<script id="EMBEDDED_DATA"[^>]*>([\s\S]*?)<\/script>/);
    if (embeddedMatch) {
      try {
        const embeddedData = JSON.parse(embeddedMatch[1]);
        console.log('Embedded data found:');
        if (embeddedData.products) {
          console.log('Products count:', embeddedData.products.length);
          if (embeddedData.products.length > 0) {
            const product = embeddedData.products[0];
            console.log('Sample product keys:', Object.keys(product));
            console.log('Price list field:', product.PriceListName || product.PriceList || product['Price List'] || 'Not found');
          }
        }
      } catch (e) {
        console.log('Error parsing embedded data:', e.message);
      }
    } else {
      console.log('No embedded data found');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
