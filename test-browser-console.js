// Test script to check browser console for initQuoteMakerPriceListSelector function
const puppeteer = require('puppeteer');

async function testBrowserConsole() {
  console.log('🔍 Testing browser console for initQuoteMakerPriceListSelector...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to the page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait a bit for the page to fully load
    await page.waitForTimeout(3000);
    
    // Check if the function exists and call it
    const result = await page.evaluate(() => {
      console.log('=== BROWSER CONSOLE TEST ===');
      
      // Check if function exists
      if (typeof initQuoteMakerPriceListSelector === 'function') {
        console.log('✅ initQuoteMakerPriceListSelector function found');
        
        // Check selector element
        const selector = document.getElementById('quote-price-list-selector');
        if (selector) {
          console.log('✅ Quote price list selector element found');
          console.log('Current options count:', selector.options.length);
          
          // Try calling the function
          try {
            initQuoteMakerPriceListSelector();
            console.log('✅ Function called successfully');
            
            // Check options after calling
            setTimeout(() => {
              console.log('Options after function call:', selector.options.length);
              for (let i = 0; i < selector.options.length; i++) {
                console.log(`Option ${i}: ${selector.options[i].value} - ${selector.options[i].text}`);
              }
            }, 1000);
            
            return { success: true, message: 'Function called successfully' };
          } catch (error) {
            console.error('❌ Error calling function:', error);
            return { success: false, message: 'Error calling function: ' + error.message };
          }
        } else {
          console.log('❌ Quote price list selector element not found');
          return { success: false, message: 'Selector element not found' };
        }
      } else {
        console.log('❌ initQuoteMakerPriceListSelector function not found');
        return { success: false, message: 'Function not found' };
      }
    });
    
    console.log('Browser test result:', result);
    
    // Get console logs
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    if (logs.length > 0) {
      console.log('Console logs:', logs);
    }
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  testBrowserConsole();
}

module.exports = testBrowserConsole;