document.addEventListener('DOMContentLoaded', () => {
    const DB_KEY = 'inhQuotesDB';
    const RATIO_DB_KEY = 'inhRatioQuotesDB';
    
    // DOM Elements
    const headerRatioName = document.getElementById('headerRatioName');
    const quoteRef = document.getElementById('quoteRef');
    const quoteDate = document.getElementById('quoteDate');
    const clientName = document.getElementById('clientName');
    const quoteCurrency = document.getElementById('quoteCurrency');
    const quoteItemsBody = document.getElementById('quoteItemsBody');
    const quoteComments = document.getElementById('quoteComments');
    
    // Financials
    const totalQtyDisplay = document.getElementById('totalQtyDisplay');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const discountInput = document.getElementById('discountInput');
    const taxInput = document.getElementById('taxInput');
    const shippingInput = document.getElementById('shippingInput');
    const grandTotalDisplay = document.getElementById('grandTotalDisplay');
    
    // Buttons
    const saveQuoteBtn = document.getElementById('saveQuoteBtn');
    const downloadQuoteBtn = document.getElementById('downloadQuoteBtn');
    const openSavedPanelBtn = document.getElementById('openSavedPanelBtn');
    const closeSavedPanelBtn = document.getElementById('closeSavedPanelBtn');
    
    // Panel Elements
    const savedQuotesOverlay = document.getElementById('savedQuotesOverlay');
    const savedQuotesPanel = document.getElementById('savedQuotesPanel');
    const savedQuotesList = document.getElementById('savedQuotesList');
    const searchSavedQuotes = document.getElementById('searchSavedQuotes');
    
    // Modal
    const successModal = document.getElementById('successModal');
    const successModalContent = document.getElementById('successModalContent');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    
    // State
    let transferData = null;
    let savedRatioQuotes = [];

    // Initialize
    loadInitialData();
    loadSavedQuotesFromDB();

    function loadInitialData() {
        try {
            const rawData = localStorage.getItem('ratioQuoteTransfer');
            if (rawData) {
                transferData = JSON.parse(rawData);
            }
        } catch (e) {
            console.error("Failed to parse ratioQuoteTransfer", e);
        }

        if (!transferData || !transferData.items || transferData.items.length === 0) {
            alert("No ratio data found to quote. Redirecting back to Ratio Mixer.");
            window.location.href = 'inh-ratio-mix/index.html';
            return;
        }

        // Set default date and reference
        const today = new Date();
        const rnd = Math.floor(1000 + Math.random() * 9000);
        
        applyQuoteToForm({
            quoteRef: `RQ-${today.getFullYear().toString().substr(-2)}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}-${rnd}`,
            quoteDate: today.toISOString().split('T')[0],
            clientName: transferData.ratioName,
            ratioName: transferData.ratioName,
            currency: transferData.currency || 'INR',
            items: transferData.items.map(item => ({...item, qty: ''})), // empty qty
            discount: '', tax: '', shipping: '', comments: ''
        });
    }

    const tcCreatedDate = document.getElementById('tcCreatedDate');
    const tcSharedDate = document.getElementById('tcSharedDate');

    quoteDate.addEventListener('input', () => {
        if (tcCreatedDate) tcCreatedDate.textContent = quoteDate.value;
    });

    // Apply a quote object to the UI
    function applyQuoteToForm(quoteObj) {
        // Update transferData state to match the loaded quote
        transferData = {
            ratioName: quoteObj.ratioName,
            currency: quoteObj.currency,
            items: quoteObj.items
        };

        headerRatioName.textContent = quoteObj.ratioName;
        quoteRef.value = quoteObj.quoteRef;
        quoteDate.value = quoteObj.quoteDate;
        clientName.value = quoteObj.clientName;
        quoteCurrency.value = quoteObj.currency;
        quoteComments.value = quoteObj.comments || '';
        
        discountInput.value = quoteObj.discount || '';
        taxInput.value = quoteObj.tax || '';
        shippingInput.value = quoteObj.shipping || '';

        if (tcCreatedDate) tcCreatedDate.textContent = quoteObj.quoteDate;

        renderItems();
        calculateTotals();
    }

    // Render Table
    function renderItems() {
        quoteItemsBody.innerHTML = '';
        transferData.items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
            
            tr.innerHTML = `
                <td class="py-3 font-semibold text-slate-700">${item.length}"</td>
                <td class="py-3 text-right text-slate-500 font-medium rate-cell">${item.rate.toLocaleString()}</td>
                <td class="py-3 text-right">
                    <input type="number" step="0.01" min="0" class="qty-input input-ghost w-24 text-right font-medium text-slate-700 bg-white border-slate-200" placeholder="0.00" data-index="${index}" value="${item.qty || ''}">
                </td>
                <td class="py-3 text-right font-bold text-slate-700 row-total">0.00</td>
            `;
            quoteItemsBody.appendChild(tr);
        });

        // Add Listeners
        document.querySelectorAll('.qty-input').forEach(inp => {
            inp.addEventListener('input', calculateTotals);
        });
    }

    function calculateTotals() {
        let subtotal = 0;
        let totalQty = 0;
        
        document.querySelectorAll('.qty-input').forEach((inp, index) => {
            const qty = parseFloat(inp.value) || 0;
            const rate = transferData.items[index].rate;
            const rowTotal = qty * rate;
            
            // Sync qty back to state
            transferData.items[index].qty = inp.value;
            
            subtotal += rowTotal;
            totalQty += qty;
            
            const rowTotalEl = inp.closest('tr').querySelector('.row-total');
            rowTotalEl.textContent = rowTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            if (qty > 0) {
                rowTotalEl.classList.add('text-indigo-600');
            } else {
                rowTotalEl.classList.remove('text-indigo-600');
            }
        });

        if (totalQtyDisplay) totalQtyDisplay.textContent = totalQty.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        subtotalDisplay.textContent = subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const discount = parseFloat(discountInput.value) || 0;
        const tax = parseFloat(taxInput.value) || 0;
        const shipping = parseFloat(shippingInput.value) || 0;

        const grandTotal = subtotal - discount + tax + shipping;
        grandTotalDisplay.textContent = grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // Listeners for financials
    [discountInput, taxInput, shippingInput].forEach(inp => {
        inp.addEventListener('input', calculateTotals);
    });

    // Save Logic
    saveQuoteBtn.addEventListener('click', () => {
        let hasQty = false;
        document.querySelectorAll('.qty-input').forEach(inp => {
            if (parseFloat(inp.value) > 0) hasQty = true;
        });

        if (!hasQty) {
            alert("Please enter a quantity for at least one length to save the quote.");
            return;
        }

        // 1. Save to dedicated Ratio Quotes DB (for perfect recall)
        const fullQuoteData = {
            id: quoteRef.value, // use ref as ID
            quoteRef: quoteRef.value,
            quoteDate: quoteDate.value,
            clientName: clientName.value,
            ratioName: transferData.ratioName,
            currency: quoteCurrency.value,
            comments: quoteComments.value,
            discount: discountInput.value,
            tax: taxInput.value,
            shipping: shippingInput.value,
            grandTotal: parseFloat(grandTotalDisplay.textContent.replace(/,/g, '')),
            items: transferData.items, // includes lengths, rates, and input qtys
            savedAt: new Date().toISOString()
        };

        const existingIdx = savedRatioQuotes.findIndex(q => q.id === fullQuoteData.id);
        if (existingIdx >= 0) {
            savedRatioQuotes[existingIdx] = fullQuoteData;
        } else {
            savedRatioQuotes.push(fullQuoteData);
        }
        localStorage.setItem(RATIO_DB_KEY, JSON.stringify(savedRatioQuotes));

        // 2. Append to Global Quotes DB (for spreadsheet integration)
        saveToGlobalDB(fullQuoteData);
        
        loadSavedQuotesFromDB(); // refresh panel
        showSuccessModal();
    });

    function saveToGlobalDB(quoteData) {
        const itemsToSave = [];
        quoteData.items.forEach(item => {
            const qty = parseFloat(item.qty);
            if (qty > 0) {
                itemsToSave.push({
                    "Price List": quoteData.ratioName,
                    "Length": item.length + '"',
                    "Product": "Ratio Mix " + quoteData.ratioName,
                    "Product Type": "Bulk",
                    "Weight": "1000g",
                    "Quantity": qty,
                    "Rate": item.rate,
                    "Amount": (qty * item.rate).toFixed(2),
                    "Comment": ""
                });
            }
        });

        const headerData = {
            "Quote Date": quoteData.quoteDate,
            "Quote Number": quoteData.quoteRef,
            "Client Name": quoteData.clientName,
            "Currency": quoteData.currency,
            "Discount": quoteData.discount,
            "Tax": quoteData.tax,
            "Shipping": quoteData.shipping,
            "Comment": quoteData.comments
        };

        const finalRowsToInject = itemsToSave.map(item => ({ ...headerData, ...item }));

        try {
            let dbData = JSON.parse(localStorage.getItem(DB_KEY));
            if (!dbData || !dbData.rows) {
                const defaultCols = [
                    "Quote Date", "Quote Status", "Valid Until", "Quote Number", 
                    "Client Name", "Contact", "Country", "Price List", "Length", 
                    "Product", "Product Type", "Style", "Color", "Weight", "Comment", 
                    "Quantity", "Currency", "Rate", "Amount", "Exchange Rate", 
                    "Base Amount", "Assigned To", "Sales Person", "Discount", "Tax", "Shipping"
                ];
                dbData = { columns: [...defaultCols], rows: [] };
            }

            // Remove existing rows with same Quote Number before appending
            dbData.rows = dbData.rows.filter(row => row["Quote Number"] !== quoteData.quoteRef);
            dbData.rows = [...dbData.rows, ...finalRowsToInject];
            localStorage.setItem(DB_KEY, JSON.stringify(dbData));
        } catch (err) {
            console.error("Failed to save to global DB", err);
        }
    }

    // --- Saved Quotes Panel Logic ---
    function loadSavedQuotesFromDB() {
        try {
            const dbStr = localStorage.getItem(RATIO_DB_KEY);
            if (dbStr) {
                savedRatioQuotes = JSON.parse(dbStr);
            }
        } catch (e) {}
        renderSavedQuotesList();
    }

    function renderSavedQuotesList() {
        const query = searchSavedQuotes.value.toLowerCase();
        savedQuotesList.innerHTML = '';
        
        const filtered = savedRatioQuotes.filter(q => 
            q.clientName.toLowerCase().includes(query) || 
            q.quoteRef.toLowerCase().includes(query)
        ).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        if (filtered.length === 0) {
            savedQuotesList.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">No saved quotes found.</div>`;
            return;
        }

        filtered.forEach(q => {
            const card = document.createElement('div');
            card.className = "bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-all relative group";
            card.innerHTML = `
                <div class="cursor-pointer" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-start mb-1 pr-6">
                        <span class="font-bold text-slate-800 text-sm">${q.clientName}</span>
                        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${q.quoteDate}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-slate-500">${q.quoteRef}</span>
                        <span class="text-sm font-bold text-indigo-600">${q.currency} ${q.grandTotal.toLocaleString()}</span>
                    </div>
                </div>
                <button class="delete-quote-btn absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors" title="Delete Quote">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            `;
            
            // Click card to load
            card.querySelector('.cursor-pointer').addEventListener('click', () => {
                applyQuoteToForm(q);
                closeSavedPanel();
            });

            // Click delete button
            card.querySelector('.delete-quote-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete quote ${q.quoteRef}?`)) {
                    savedRatioQuotes = savedRatioQuotes.filter(item => item.id !== q.id);
                    localStorage.setItem(RATIO_DB_KEY, JSON.stringify(savedRatioQuotes));
                    
                    // Also attempt to remove from global quotes if present
                    try {
                        let dbData = JSON.parse(localStorage.getItem(DB_KEY));
                        if (dbData && dbData.rows) {
                            dbData.rows = dbData.rows.filter(row => row["Quote Number"] !== q.quoteRef);
                            localStorage.setItem(DB_KEY, JSON.stringify(dbData));
                        }
                    } catch(err) {}

                    renderSavedQuotesList();
                }
            });

            savedQuotesList.appendChild(card);
        });
    }

    searchSavedQuotes.addEventListener('input', renderSavedQuotesList);

    function openSavedPanel() {
        savedQuotesOverlay.classList.remove('hidden');
        // reflow
        void savedQuotesOverlay.offsetWidth;
        savedQuotesOverlay.classList.remove('opacity-0');
        savedQuotesPanel.classList.remove('translate-x-full');
    }

    function closeSavedPanel() {
        savedQuotesOverlay.classList.add('opacity-0');
        savedQuotesPanel.classList.add('translate-x-full');
        setTimeout(() => {
            savedQuotesOverlay.classList.add('hidden');
        }, 300);
    }

    openSavedPanelBtn.addEventListener('click', openSavedPanel);
    closeSavedPanelBtn.addEventListener('click', closeSavedPanel);
    savedQuotesOverlay.addEventListener('click', closeSavedPanel);

    // --- Modals ---
    function showSuccessModal() {
        successModal.classList.remove('hidden');
        void successModal.offsetWidth;
        successModalContent.classList.remove('scale-95', 'opacity-0');
        successModalContent.classList.add('scale-100', 'opacity-100');
    }

    modalCloseBtn.addEventListener('click', () => {
        successModalContent.classList.remove('scale-100', 'opacity-100');
        successModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            successModal.classList.add('hidden');
            // Do not redirect so they can continue editing or open panel
        }, 300);
    });

    // --- Download Logic (html2canvas) ---
    downloadQuoteBtn.addEventListener('click', () => {
        if (tcSharedDate) {
            tcSharedDate.textContent = new Date().toISOString().split('T')[0];
        }

        const doc = document.getElementById('quoteDocument');
        
        // Hide empty rows
        const emptyRows = [];
        document.querySelectorAll('.qty-input').forEach(inp => {
            if (!parseFloat(inp.value)) {
                const tr = inp.closest('tr');
                tr.style.display = 'none';
                emptyRows.push(tr);
            }
        });

        // Hide inputs, show text for clean capture
        const inputs = doc.querySelectorAll('input, textarea');
        const replacements = [];
        
        inputs.forEach(inp => {
            const span = document.createElement('span');
            span.className = inp.className.replace('input-ghost', '') + ' inline-block';
            if(inp.tagName === 'TEXTAREA') {
                span.innerHTML = inp.value.replace(/\\n/g, '<br>') || '-';
            } else {
                span.textContent = inp.value || '-';
            }
            inp.parentNode.insertBefore(span, inp);
            inp.style.display = 'none';
            replacements.push({inp, span});
        });

        setTimeout(() => {
            html2canvas(doc, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            }).then(canvas => {
                replacements.forEach(r => {
                    r.inp.style.display = '';
                    r.span.remove();
                });
                emptyRows.forEach(tr => tr.style.display = '');

                const link = document.createElement('a');
                link.download = `Quote_${quoteRef.value}_${clientName.value}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error("Capture failed", err);
                alert("Failed to generate image.");
                replacements.forEach(r => {
                    r.inp.style.display = '';
                    r.span.remove();
                });
                emptyRows.forEach(tr => tr.style.display = '');
            });
        }, 100);
    });

});
