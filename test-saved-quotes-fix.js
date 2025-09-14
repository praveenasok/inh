// Browser console test script to verify saved quotes loading fix
// Copy and paste this into browser console at http://localhost:3000

console.log('=== Testing Saved Quotes Loading Fix ===');

// Test 1: Check if renderSavedQuotesList function exists
if (typeof renderSavedQuotesList === 'function') {
    console.log('✅ renderSavedQuotesList function exists');
} else {
    console.log('❌ renderSavedQuotesList function not found');
}

// Test 2: Check if saved quotes container exists
const savedQuotesContainer = document.getElementById('saved-quotes-container');
if (savedQuotesContainer) {
    console.log('✅ Saved quotes container found');
    console.log(`📊 Current saved quotes displayed: ${savedQuotesContainer.children.length}`);
} else {
    console.log('❌ Saved quotes container not found');
}

// Test 3: Check if initQuoteMaker function exists
if (typeof initQuoteMaker === 'function') {
    console.log('✅ initQuoteMaker function exists');
} else {
    console.log('❌ initQuoteMaker function not found');
}

// Test 4: Manually call renderSavedQuotesList to see if it works
if (typeof renderSavedQuotesList === 'function') {
    console.log('🔄 Manually calling renderSavedQuotesList...');
    try {
        renderSavedQuotesList();
        console.log('✅ renderSavedQuotesList called successfully');
        
        // Check quotes after manual call
        setTimeout(() => {
            if (savedQuotesContainer) {
                console.log(`📊 Saved quotes after manual call: ${savedQuotesContainer.children.length}`);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error calling renderSavedQuotesList:', error);
    }
}

// Test 5: Test navigation to quote maker module
console.log('🔄 Testing navigation to quote maker module...');
const quoteNavBtn = document.getElementById('nav-quote-maker');
if (quoteNavBtn) {
    console.log('✅ Quote maker navigation button found');
    
    // Simulate click on quote maker nav button
    setTimeout(() => {
        console.log('🖱️  Clicking quote maker navigation button...');
        quoteNavBtn.click();
        
        // Check if quotes are loaded after navigation
        setTimeout(() => {
            if (savedQuotesContainer) {
                console.log(`📊 Saved quotes after navigation: ${savedQuotesContainer.children.length}`);
                
                if (savedQuotesContainer.children.length > 0) {
                    console.log('✅ SUCCESS: Saved quotes are loading when navigating to quote maker!');
                } else {
                    console.log('⚠️  No saved quotes displayed - checking if any quotes exist in Firebase...');
                    
                    // Try to check Firebase for saved quotes
                    if (window.firebaseDB && typeof window.firebaseDB.getQuotes === 'function') {
                        window.firebaseDB.getQuotes().then(quotes => {
                            console.log(`📊 Quotes in Firebase: ${quotes.length}`);
                            if (quotes.length > 0) {
                                console.log('✅ Quotes exist in Firebase, UI should be displaying them');
                            } else {
                                console.log('ℹ️  No quotes saved in Firebase yet');
                            }
                        }).catch(error => {
                            console.log('⚠️  Could not check Firebase:', error.message);
                        });
                    }
                }
            }
        }, 2000);
    }, 1000);
} else {
    console.log('❌ Quote maker navigation button not found');
}

console.log('=== Test Complete - Check results above ===');