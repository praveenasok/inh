const http = require('http');
const { JSDOM } = require('jsdom');

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
      const dom = new JSDOM(data, {
        runScripts: 'dangerously',
        resources: 'usable'
      });
      
      // Wait for scripts to execute
      setTimeout(() => {
        const selector = dom.window.document.getElementById('quote-price-list-selector');
        console.log('Selector found:', !!selector);
        
        if (selector) {
          console.log('Number of options:', selector.options.length);
          for (let i = 0; i < Math.min(5, selector.options.length); i++) {
            console.log(`Option ${i + 1}:`, selector.options[i].text);
          }
        }
        
        const embeddedData = dom.window.document.getElementById('EMBEDDED_DATA');
        if (embeddedData) {
          try {
            const data = JSON.parse(embeddedData.textContent);
            console.log('Embedded products count:', data.products ? data.products.length : 0);
            
            // Check if state.allProducts is populated
            if (dom.window.state && dom.window.state.allProducts) {
              console.log('state.allProducts count:', dom.window.state.allProducts.length);
            } else {
              console.log('state.allProducts not found or empty');
            }
          } catch (e) {
            console.log('Error parsing embedded data:', e.message);
          }
        } else {
          console.log('No embedded data found');
        }
        
        dom.window.close();
        process.exit(0);
      }, 3000);
    } catch (error) {
      console.error('Error creating DOM:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.end();