// Radio button selector functionality for saved quotes

// Handle quote selection with radio buttons
function handleQuoteSelection(radioElement, quoteIndex) {
    // Hide any existing context menu
    hideQuoteContextMenu();
    
    // Show the floating menu above the selected quote
    showQuoteContextMenuAbove(radioElement, quoteIndex);
}

// Wrapper function for Convert to Order with proper async handling
async function handleConvertToOrder(quoteIndex) {
    try {
        hideQuoteContextMenu();
        await convertQuoteToOrder(quoteIndex);
    } catch (error) {
        hideQuoteContextMenu();
    }
}

// Wrapper function for Delete Quote with proper async handling
async function handleDeleteQuote(quoteIndex) {
    try {
        hideQuoteContextMenu();
        await deleteQuote(quoteIndex);
    } catch (error) {
        hideQuoteContextMenu();
    }
}

// Modified function to show context menu above the selected quote
function showQuoteContextMenuAbove(radioElement, quoteIndex) {
    // Remove any existing context menu
    hideQuoteContextMenu();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'quote-context-menu fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-48';
    contextMenu.id = 'quote-context-menu';
    
    // Get the quote row element (parent of the radio button)
    const quoteRow = radioElement.closest('.quote-item');
    const rect = quoteRow.getBoundingClientRect();
    
    const menuWidth = 192; // min-w-48 = 12rem = 192px
    const menuHeight = 160; // Approximate height for 4 buttons
    
    // Position menu above the selected quote row
    let left = rect.left;
    let top = rect.top - menuHeight - 10; // 10px gap above the row
    
    // Check left boundary - ensure menu doesn't go off left edge
    if (left < 10) {
        left = 10;
    }
    
    // Check right boundary - if menu would go off screen, adjust position
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
    }
    
    // Check top boundary - if menu would go above viewport, position below instead
    if (top < 10) {
        top = rect.bottom + 10; // Position below the row
    }
    
    contextMenu.style.left = left + 'px';
    contextMenu.style.top = top + 'px';
    
    contextMenu.innerHTML = `
        <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center" onclick="recallQuote(${quoteIndex}); hideQuoteContextMenu();">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            Recall Quote
        </button>
        <button class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center" onclick="shareQuoteFromContext(${quoteIndex}); hideQuoteContextMenu();">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
            </svg>
            Share Quote
        </button>
        <button class="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center" onclick="handleConvertToOrder(${quoteIndex});">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Convert2Order
        </button>
        <button class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center" onclick="handleDeleteQuote(${quoteIndex});">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete Quote
        </button>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Store the current quote index for reference
    contextMenu.dataset.quoteIndex = quoteIndex;
    
    // Set up click-outside behavior
    setTimeout(() => {
        document.addEventListener('click', handleContextMenuClickOutsideRadio);
    }, 0);
}

// Updated click outside handler for radio buttons
function handleContextMenuClickOutsideRadio(e) {
    const contextMenu = document.getElementById('quote-context-menu');
    const radioButtons = document.querySelectorAll('.quote-radio');
    
    // Check if click is outside the context menu and not on any radio button
    let clickedOnRadio = false;
    radioButtons.forEach(radio => {
        if (radio.contains(e.target) || radio === e.target) {
            clickedOnRadio = true;
        }
    });
    
    if (contextMenu && !contextMenu.contains(e.target) && !clickedOnRadio) {
        hideQuoteContextMenu();
        // Clear radio selection
        const selectedRadio = document.querySelector('.quote-radio:checked');
        if (selectedRadio) {
            selectedRadio.checked = false;
        }
    }
}