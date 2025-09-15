// IMMEDIATE QUOTE CLEARING SCRIPT
// Copy and paste this entire script into browser console and press Enter
// This will forcibly clear all saved quotes from the UI immediately

console.log('🚨 IMMEDIATE QUOTE CLEARING SCRIPT ACTIVATED');
console.log('🎯 Target: saved-quotes-container in quote-maker-module');

// Function to immediately clear all quotes
function immediateQuoteClear() {
  console.log('🔥 Starting immediate quote clearing...');
  
  // Step 1: Clear localStorage completely
  try {
    localStorage.removeItem('savedQuotes');
    localStorage.removeItem('quotes');
    localStorage.removeItem('firebaseQuotes');
    localStorage.removeItem('cachedQuotes');
    console.log('✅ localStorage cleared');
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
  }
  
  // Step 2: Find and clear the saved quotes container
  const container = document.getElementById('saved-quotes-container');
  if (container) {
    console.log('📍 Found saved-quotes-container');
    console.log('📊 Current children count:', container.children.length);
    
    // Nuclear clearing - remove everything
    container.innerHTML = '';
    console.log('🧹 Container innerHTML cleared');
    
    // Add the proper no-quotes message
    const noQuotesDiv = document.createElement('div');
    noQuotesDiv.id = 'no-quotes-message';
    noQuotesDiv.className = 'no-quotes-message';
    noQuotesDiv.textContent = 'No saved quotes yet. Save a quote to see it here.';
    container.appendChild(noQuotesDiv);
    
    console.log('✅ Container cleared and reset with no-quotes message');
    console.log('📊 New children count:', container.children.length);
  } else {
    console.log('❌ saved-quotes-container not found');
    
    // Try to find any quote-related elements and remove them
    const quoteItems = document.querySelectorAll('.quote-item, [data-quote-index], .quote-radio');
    if (quoteItems.length > 0) {
      console.log(`🔍 Found ${quoteItems.length} quote-related elements, removing...`);
      quoteItems.forEach(item => item.remove());
      console.log('✅ Quote-related elements removed');
    }
  }
  
  // Step 3: Clear any context menus
  const contextMenu = document.getElementById('quote-context-menu');
  if (contextMenu) {
    contextMenu.remove();
    console.log('✅ Context menu removed');
  }
  
  // Step 4: Clear any selected radio buttons
  const radioButtons = document.querySelectorAll('.quote-radio');
  radioButtons.forEach(radio => {
    radio.checked = false;
  });
  console.log(`✅ Cleared ${radioButtons.length} radio buttons`);
  
  // Step 5: Force refresh the quotes list if function exists
  if (typeof window.forceRefreshQuotesList === 'function') {
    console.log('🔄 Calling forceRefreshQuotesList...');
    window.forceRefreshQuotesList();
  } else if (typeof window.renderSavedQuotesList === 'function') {
    console.log('🔄 Calling renderSavedQuotesList...');
    window.renderSavedQuotesList();
  }
  
  // Step 6: Clear Firebase if available
  if (window.firebaseDB && window.firebaseDB.isAvailable()) {
    console.log('🔥 Attempting to clear Firebase quotes...');
    window.firebaseDB.getQuotes().then(quotes => {
      if (quotes.length > 0) {
        console.log(`🔥 Found ${quotes.length} quotes in Firebase, deleting...`);
        const deletePromises = quotes.map(quote => {
          return window.firebaseDB.deleteQuote(quote.id);
        });
        
        Promise.all(deletePromises).then(() => {
          console.log('✅ All Firebase quotes deleted');
          // Force refresh again after Firebase clearing
          setTimeout(() => {
            if (typeof window.forceRefreshQuotesList === 'function') {
              window.forceRefreshQuotesList();
            }
          }, 500);
        }).catch(error => {
          console.error('❌ Error deleting Firebase quotes:', error);
        });
      } else {
        console.log('✅ No quotes found in Firebase');
      }
    }).catch(error => {
      console.error('❌ Error getting Firebase quotes:', error);
    });
  } else {
    console.log('🔥 Firebase not available');
  }
  
  console.log('🎉 IMMEDIATE QUOTE CLEARING COMPLETED!');
  console.log('📋 Summary:');
  console.log('   - localStorage cleared');
  console.log('   - UI container reset');
  console.log('   - Context menus removed');
  console.log('   - Radio buttons cleared');
  console.log('   - Firebase clearing initiated');
}

// Execute immediately
immediateQuoteClear();

// Also make it available globally for repeated use
window.immediateQuoteClear = immediateQuoteClear;

console.log('💡 TIP: You can run immediateQuoteClear() again if needed');
console.log('💡 TIP: Refresh the page after running this script for best results');