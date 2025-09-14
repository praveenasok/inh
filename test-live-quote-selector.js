// Test script to run in browser console after main page loads
// Copy and paste this into browser console at http://localhost:3000

console.log('=== Testing Quote Maker Price List Selector ===');

// Wait for page to be fully loaded
setTimeout(() => {
    console.log('Starting test...');
    
    // Check if selector exists
    const selector = document.getElementById('quote-price-list-selector');
    console.log('Quote selector found:', !!selector);
    
    if (selector) {
        console.log('Current options count:', selector.options.length);
        
        // List current options
        for (let i = 0; i < selector.options.length; i++) {
            console.log(`Option ${i}: "${selector.options[i].value}" - "${selector.options[i].text}"`);
        }
    }
    
    // Check if function exists
    console.log('Function exists:', typeof initQuoteMakerPriceListSelector);
    
    // Check state data
    if (typeof state !== 'undefined' && state.allProducts) {
        console.log('State products count:', state.allProducts.length);
        
        if (state.allProducts.length > 0) {
            const firstProduct = state.allProducts[0];
            console.log('First product keys:', Object.keys(firstProduct));
            console.log('Price list property:', firstProduct['Price List Name']);
            
            // Extract price lists manually
            const priceLists = new Set();
            state.allProducts.forEach(product => {
                if (product['Price List Name']) {
                    priceLists.add(product['Price List Name']);
                }
            });
            console.log('Available price lists:', Array.from(priceLists));
        }
    } else {
        console.log('No state data found');
    }
    
    // Try to call the function manually
    if (typeof initQuoteMakerPriceListSelector === 'function') {
        console.log('Calling initQuoteMakerPriceListSelector...');
        try {
            initQuoteMakerPriceListSelector();
            console.log('Function called successfully');
            
            // Check options after call
            setTimeout(() => {
                if (selector) {
                    console.log('Options after function call:', selector.options.length);
                    for (let i = 0; i < selector.options.length; i++) {
                        console.log(`New Option ${i}: "${selector.options[i].value}" - "${selector.options[i].text}"`);
                    }
                }
            }, 500);
            
        } catch (error) {
            console.error('Error calling function:', error);
        }
    } else {
        console.log('Function not available');
    }
    
}, 3000);

console.log('Test script loaded. Results will appear in 3 seconds...');