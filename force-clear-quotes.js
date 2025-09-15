// Emergency script to completely clear all saved quotes
// Run this in browser console: node force-clear-quotes.js
// Or copy the clearAllQuotes function and run in browser console

console.log('🧹 Emergency Quote Clearing Script');

// Function to completely clear all quotes from all sources
function clearAllQuotes() {
  console.log('🔄 Starting complete quote clearing...');
  
  // 1. Clear localStorage
  try {
    localStorage.removeItem('savedQuotes');
    localStorage.removeItem('quotes');
    localStorage.removeItem('firebaseQuotes');
    console.log('✅ localStorage cleared');
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
  }
  
  // 2. Clear Firebase if available
  if (typeof window !== 'undefined' && window.firebaseDB && window.firebaseDB.isAvailable()) {
    console.log('🔥 Clearing Firebase quotes...');
    window.firebaseDB.getQuotes().then(quotes => {
      console.log(`Found ${quotes.length} quotes in Firebase`);
      const deletePromises = quotes.map(quote => {
        return window.firebaseDB.deleteQuote(quote.id);
      });
      
      Promise.all(deletePromises).then(() => {
        console.log('✅ All Firebase quotes deleted');
        clearUI();
      }).catch(error => {
        console.error('❌ Error deleting Firebase quotes:', error);
        clearUI();
      });
    }).catch(error => {
      console.error('❌ Error getting Firebase quotes:', error);
      clearUI();
    });
  } else {
    console.log('🔥 Firebase not available, skipping Firebase clearing');
    clearUI();
  }
}

// Function to completely clear the UI
function clearUI() {
  console.log('🧹 Clearing UI elements...');
  
  // Clear saved quotes container in quote-maker-module
  const container = document.getElementById('saved-quotes-container');
  if (container) {
    console.log('📍 Found saved-quotes-container, clearing...');
    
    // Nuclear option - remove all children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Re-add the proper no-quotes message matching the original structure
    const noQuotesMessage = document.createElement('div');
    noQuotesMessage.id = 'no-quotes-message';
    noQuotesMessage.className = 'no-quotes-message';
    noQuotesMessage.textContent = 'No saved quotes yet. Save a quote to see it here.';
    container.appendChild(noQuotesMessage);
    
    console.log('✅ Quote maker container cleared and reset with proper message');
  } else {
    console.log('❌ Saved quotes container not found - checking if quote-maker module is active');
    
    // Check if quote-maker module exists but is hidden
    const quoteModule = document.getElementById('quote-maker-module');
    if (quoteModule) {
      console.log('📍 Quote maker module found but container missing');
    } else {
      console.log('❌ Quote maker module not found');
    }
  }
  
  // Clear any context menus
  const contextMenu = document.getElementById('quote-context-menu');
  if (contextMenu) {
    contextMenu.remove();
    console.log('✅ Context menu removed');
  }
  
  // Clear any selected radio buttons
  const radioButtons = document.querySelectorAll('.quote-radio');
  radioButtons.forEach(radio => {
    radio.checked = false;
  });
  console.log(`✅ Cleared ${radioButtons.length} radio buttons`);
  
  // Force refresh if function is available
  if (typeof window.forceRefreshQuotesList === 'function') {
    setTimeout(() => {
      window.forceRefreshQuotesList();
      console.log('✅ Force refresh completed');
    }, 500);
  }
  
  console.log('🎉 Complete quote clearing finished!');
}

// Browser console version
if (typeof window !== 'undefined') {
  // Make functions globally available
  window.clearAllQuotes = clearAllQuotes;
  window.clearUI = clearUI;
  
  console.log('🔧 Functions available in browser console:');
  console.log('- clearAllQuotes() - Clear everything');
  console.log('- clearUI() - Clear only UI elements');
  console.log('- window.forceRefreshQuotesList() - Force refresh list');
  
  // Auto-run if this script is loaded
  if (window.location && window.location.hostname === 'localhost') {
    console.log('🚀 Auto-running clearAllQuotes...');
    clearAllQuotes();
  }
} else {
  // Node.js version - just export the functions
  module.exports = { clearAllQuotes, clearUI };
}