// Test script to manually call initQuoteMakerPriceListSelector
const http = require('http');
const { JSDOM } = require('jsdom');

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
    try {
      console.log('=== TESTING QUOTE MAKER FUNCTION ===');
      
      // Create a DOM environment
      const dom = new JSDOM(data, {
        runScripts: 'dangerously',
        resources: 'usable',
        beforeParse(window) {
          // Mock console.log to capture output
          const originalLog = console.log;
          window.console = {
            log: (...args) => {
              originalLog('BROWSER LOG:', ...args);
            },
            error: (...args) => {
              originalLog('BROWSER ERROR:', ...args);
            },
            warn: (...args) => {
              originalLog('BROWSER WARN:', ...args);
            }
          };
        }
      });
      
      const window = dom.window;
      const document = window.document;
      
      // Wait for scripts to load
      setTimeout(() => {
        console.log('\n--- Checking global state ---');
        console.log('window.state exists:', !!window.state);
        if (window.state) {
          console.log('state.allProducts length:', window.state.allProducts ? window.state.allProducts.length : 'undefined');
        }
        
        console.log('\n--- Checking function existence ---');
        console.log('initQuoteMakerPriceListSelector exists:', typeof window.initQuoteMakerPriceListSelector);
        
        console.log('\n--- Checking selector element ---');
        const selector = document.getElementById('quote-price-list-selector');
        console.log('Selector element exists:', !!selector);
        if (selector) {
          console.log('Selector options count:', selector.options.length);
        }
        
        // Try to manually call the function
        if (typeof window.initQuoteMakerPriceListSelector === 'function') {
          console.log('\n--- Manually calling initQuoteMakerPriceListSelector ---');
          try {
            window.initQuoteMakerPriceListSelector();
            
            // Check selector again after function call
            setTimeout(() => {
              const selectorAfter = document.getElementById('quote-price-list-selector');
              if (selectorAfter) {
                console.log('Selector options count after function call:', selectorAfter.options.length);
                for (let i = 0; i < Math.min(5, selectorAfter.options.length); i++) {
                  console.log(`  Option ${i + 1}: ${selectorAfter.options[i].text}`);
                }
              }
              console.log('\n=== TEST COMPLETE ===');
            }, 1000);
          } catch (error) {
            console.error('Error calling function:', error.message);
            console.log('\n=== TEST COMPLETE ===');
          }
        } else {
          console.log('Function not available for manual testing');
          console.log('\n=== TEST COMPLETE ===');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error in test:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
});

req.end();