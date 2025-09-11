// Floating Save Quote Menu Functions
function toggleSaveQuoteMenu() {
    const menu = document.getElementById('saveQuoteMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('saveQuoteMenu');
    const button = event.target.closest('button[onclick="toggleSaveQuoteMenu()"]');
    
    if (menu && !menu.contains(event.target) && !button) {
        menu.classList.add('hidden');
    }
});

function deleteCurrentQuote() {
    const confirmed = confirm('Are you sure you want to delete this quote?');
    if (confirmed) {
        const menu = document.getElementById('saveQuoteMenu');
        if (menu) menu.classList.add('hidden');
        
        clearAllQuoteData();
        alert('Quote deleted successfully!');
    }
}

function convertToOrder() {
    const menu = document.getElementById('saveQuoteMenu');
    if (menu) menu.classList.add('hidden');
    
    // Get quote data
    const quoteData = {
        quoteName: document.getElementById('quote-number').value,
        customerName: document.getElementById('client-name').value,
        salesman: document.getElementById('salesman-name').value,
        currency: document.getElementById('quote-currency').value,
        priceList: document.getElementById('quote-price-list-selector').value,
        items: getQuoteItems(),
        notes: document.getElementById('notes-terms').value
    };
    
    if (!quoteData.quoteName || !quoteData.customerName) {
        alert('Please fill in quote name and customer name before converting to order.');
        return;
    }
    
    // Convert to order (placeholder - implement actual order conversion logic)
    alert('Quote converted to order successfully! Order ID: ORD-' + Date.now());
    console.log('Order created from quote:', quoteData);
}

function shareQuote() {
    const menu = document.getElementById('saveQuoteMenu');
    if (menu) menu.classList.add('hidden');
    
    generateQuoteImage();
}

function generateQuoteImage() {
    // Get quote data
    const quoteName = document.getElementById('quote-number').value || 'Untitled Quote';
    const customerName = document.getElementById('client-name').value || 'N/A';
    const salesman = document.getElementById('salesman-name').value || 'N/A';
    const currency = document.getElementById('quote-currency').value || 'INR';
    const priceList = document.getElementById('quote-price-list-selector').value || 'N/A';
    
    const notes = document.getElementById('notes-terms').value || 'No additional notes';
    const items = getQuoteItems();
    
    // Create canvas for image generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = Math.max(600, 400 + (items.length * 40));
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Header
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, canvas.width, 80);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('QUOTE DETAILS', 30, 50);
    
    // Quote info
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    let y = 120;
    
    ctx.fillText(`Quote Name: ${quoteName}`, 30, y);
    y += 30;
    ctx.fillText(`Customer: ${customerName}`, 30, y);
    y += 30;
    ctx.fillText(`Sales Representative: ${salesman}`, 30, y);
    y += 30;
    ctx.fillText(`Currency: ${currency}`, 30, y);
    y += 30;
    ctx.fillText(`Price List: ${priceList}`, 30, y);
    y += 30;
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 30, y);
    y += 50;
    
    // Items header
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('QUOTE ITEMS:', 30, y);
    y += 30;
    
    // Items
    ctx.font = '14px Arial';
    let total = 0;
    
    if (items.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.fillText('No items added to quote', 30, y);
        y += 30;
    } else {
        items.forEach((item, index) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            total += itemTotal;
            
            ctx.fillStyle = '#000000';
            ctx.fillText(`${index + 1}. ${item.name || 'Unnamed Item'}`, 30, y);
            ctx.fillText(`Qty: ${item.quantity || 1}`, 300, y);
            ctx.fillText(`Price: ${currency} ${(item.price || 0).toFixed(2)}`, 400, y);
            ctx.fillText(`Total: ${currency} ${itemTotal.toFixed(2)}`, 550, y);
            y += 25;
        });
    }
    
    // Total
    y += 20;
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`TOTAL: ${currency} ${total.toFixed(2)}`, 30, y);
    y += 50;
    
    // Notes
    if (notes && notes !== 'No additional notes') {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('NOTES:', 30, y);
        y += 25;
        
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        const words = notes.split(' ');
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > 740 && i > 0) {
                ctx.fillText(line, 30, y);
                line = words[i] + ' ';
                y += 20;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 30, y);
    }
    
    // Convert to blob and share
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        
        // Try Web Share API first
        if (navigator.share) {
            const file = new File([blob], `quote-${quoteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`, {
                type: 'image/png'
            });
            
            navigator.share({
                title: `Quote: ${quoteName}`,
                text: `Quote for ${customerName}`,
                files: [file]
            }).catch(err => {
                console.log('Error sharing:', err);
                downloadQuoteImage(url, quoteName);
            });
        } else {
            // Fallback to download
            downloadQuoteImage(url, quoteName);
        }
    }, 'image/png');
}

function downloadQuoteImage(url, quoteName) {
    const link = document.createElement('a');
    link.download = `quote-${quoteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Quote image downloaded successfully!');
}

function getQuoteItems() {
    const items = [];
    const quoteItemsContainer = document.getElementById('quote-items');
    
    if (quoteItemsContainer) {
        const itemElements = quoteItemsContainer.querySelectorAll('.quote-item');
        
        itemElements.forEach(item => {
            const nameEl = item.querySelector('.item-name');
            const qtyEl = item.querySelector('.item-quantity');
            const priceEl = item.querySelector('.item-price');
            
            if (nameEl) {
                items.push({
                    name: nameEl.textContent || nameEl.value || 'Unnamed Item',
                    quantity: qtyEl ? (parseFloat(qtyEl.textContent || qtyEl.value) || 1) : 1,
                    price: priceEl ? (parseFloat(priceEl.textContent || priceEl.value) || 0) : 0
                });
            }
        });
    }
    
    return items;
}