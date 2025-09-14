// Simple test to check console output from the browser
const http = require('http');
const fs = require('fs');

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
    console.log('=== ANALYZING HTML CONTENT ===');
    
    // Check if the function exists in the HTML
    const functionExists = data.includes('async function initQuoteMakerPriceListSelector()');
    console.log('✅ Function exists in HTML:', functionExists);
    
    // Check if the selector element exists
    const selectorExists = data.includes('id="quote-price-list-selector"');
    console.log('✅ Selector element exists in HTML:', selectorExists);
    
    // Check if state object is initialized
    const stateInitialized = data.includes('window.state = {') || data.includes('state = {');
    console.log('✅ State object initialized:', stateInitialized);
    
    // Check if the function is called in DOMContentLoaded
    const functionCalled = data.includes('initQuoteMakerPriceListSelector()');
    console.log('✅ Function called in code:', functionCalled);
    
    // Check for embedded data
    const embeddedDataExists = data.includes('id="EMBEDDED_DATA"');
    console.log('✅ Embedded data exists:', embeddedDataExists);
    
    // Look for any obvious JavaScript errors in the HTML
    const syntaxErrors = [];
    if (data.includes('SyntaxError')) syntaxErrors.push('SyntaxError found');
    if (data.includes('ReferenceError')) syntaxErrors.push('ReferenceError found');
    if (data.includes('TypeError')) syntaxErrors.push('TypeError found');
    
    if (syntaxErrors.length > 0) {
      console.log('❌ Potential JavaScript errors:', syntaxErrors);
    } else {
      console.log('✅ No obvious JavaScript errors found');
    }
    
    // Check the order of script execution
    const initFunctionPos = data.indexOf('async function init()');
    const quoteFunctionPos = data.indexOf('async function initQuoteMakerPriceListSelector()');
    const domContentPos = data.indexOf('DOMContentLoaded');
    
    console.log('\n--- Script Execution Order Analysis ---');
    console.log('init() function position:', initFunctionPos);
    console.log('initQuoteMakerPriceListSelector() function position:', quoteFunctionPos);
    console.log('DOMContentLoaded position:', domContentPos);
    
    if (initFunctionPos > 0 && quoteFunctionPos > 0 && domContentPos > 0) {
      if (initFunctionPos < quoteFunctionPos && quoteFunctionPos < domContentPos) {
        console.log('✅ Functions are defined before DOMContentLoaded');
      } else {
        console.log('❌ Function definition order might be problematic');
      }
    }
    
    console.log('\n=== ANALYSIS COMPLETE ===');
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
});

req.end();