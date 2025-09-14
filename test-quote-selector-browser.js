// Test script to debug quote maker price list selector in browser
// Run this in browser console after page loads

console.log('=== Quote Maker Price List Selector Debug ===');

// Check if element exists
const selector = document.getElementById('quote-price-list-selector');
console.log('Quote selector element:', selector);
console.log('Quote selector options count:', selector ? selector.options.length : 'Element not found');

// Check if function exists
console.log('initQuoteMakerPriceListSelector function exists:', typeof initQuoteMakerPriceListSelector);

// Check state data
console.log('state.allProducts length:', state?.allProducts?.length || 'No state.allProducts');

// Check if data is loaded
if (state?.allProducts?.length > 0) {
    console.log('Sample product:', state.allProducts[0]);
    
    // Extract price lists manually
    const priceLists = new Set();
    state.allProducts.forEach(product => {
        if (product.priceList) {
            priceLists.add(product.priceList);
        }
    });
    console.log('Available price lists:', Array.from(priceLists));
} else {
    console.log('No product data available');
}

// Try to manually call the function
if (typeof initQuoteMakerPriceListSelector === 'function') {
    console.log('Attempting to call initQuoteMakerPriceListSelector...');
    try {
        initQuoteMakerPriceListSelector();
        console.log('Function called successfully');
        console.log('Quote selector options after call:', selector ? selector.options.length : 'Element not found');
    } catch (error) {
        console.error('Error calling function:', error);
    }
} else {
    console.log('Function not available');
}

// Check for any JavaScript errors
console.log('=== End Debug ===');