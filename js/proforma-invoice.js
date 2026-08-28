// Proforma Invoice Generator Logic

// Initialize Firestore
if (typeof window.initializeFirebaseApp === 'function') {
    window.initializeFirebaseApp();
} else if (!firebase.apps.length && typeof firebaseConfig !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();

// Current invoice state
let currentCompanyConfig = {};
let currentOrderData = [];
let invoiceTotal = 0;
let invoiceDiscount = 0;
let invoiceAdvance = 0;
let invoiceShipping = 0;
let invoiceGST = 0;
let invoiceCurrency = 'INR';
window.proformaExchangeRates = { INR: 1 };

document.addEventListener('DOMContentLoaded', () => {
    // Setup listeners
    document.getElementById('btn-fetch-order').addEventListener('click', fetchOrderFromSheet);
    
    // Live update listeners
    ['inp-discount', 'inp-advance', 'inp-gst', 'inp-shipping', 'inp-unit-weight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateFinancials);
    });
    
    document.getElementById('inp-currency').addEventListener('change', (e) => {
        setInvoiceCurrency(e.target.value);
    });

    document.getElementById('inp-terms').addEventListener('input', (e) => {
        document.getElementById('prev-terms').innerText = "Payment Terms : " + e.target.value;
    });

    ['inp-invoice-no', 'inp-date', 'inp-delivery-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateMeta);
    });

    // Bill to / Ship to listeners
    ['bill', 'ship'].forEach(type => {
        ['name', 'address', 'phone'].forEach(field => {
            document.getElementById(`inp-${type}-${field}`).addEventListener('input', () => updateAddress(type));
        });
    });

    document.getElementById('btn-save-addresses').addEventListener('click', saveCurrentAddresses);
    document.getElementById('btn-save-quote').addEventListener('click', saveInvoiceToFirebase);
    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-export-img').addEventListener('click', exportToImage);
    document.getElementById('btn-export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('btn-share-link').addEventListener('click', generateShareableLink);
    
    // Auto-generate invoice number
    generateInvoiceNumber();
    document.getElementById('inp-date').valueAsDate = new Date();
    updateMeta();
    
    // Load Company Config
    loadCompanyDetails();
    
    // Setup Logo upload listener
    document.getElementById('inp-comp-logo').addEventListener('change', handleLogoPreview);
    
    // Fetch HairWise price lists for manual entry auto-pricing
    fetchHairwisePriceLists();

    // Initialize Shipping Calculator logic
    initShippingCalculator();

    // Fetch exchange rates
    fetchExchangeRates();
    // Initialize UI with default selected currency
    if (document.getElementById('inp-currency')) {
        setInvoiceCurrency(document.getElementById('inp-currency').value);
    }
});

async function fetchExchangeRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        if (response.ok) {
            const data = await response.json();
            window.proformaExchangeRates = data.rates || { INR: 1 };
        }
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
}

function setInvoiceCurrency(newCurrency) {
    newCurrency = newCurrency.toUpperCase();
    const currEl = document.getElementById('inp-currency');
    if (currEl && currEl.value !== newCurrency) currEl.value = newCurrency;
    
    if (invoiceCurrency === newCurrency) return;
    
    // Auto-convert existing items in the order table if rates are available
    if (window.proformaExchangeRates && window.proformaExchangeRates[invoiceCurrency] && window.proformaExchangeRates[newCurrency]) {
        const oldRate = window.proformaExchangeRates[invoiceCurrency];
        const targetRate = window.proformaExchangeRates[newCurrency];
        
        currentOrderData.forEach(item => {
            if (item.rate) {
                // Convert to INR first, then to the new currency
                const baseInr = item.rate / oldRate;
                item.rate = parseFloat((baseInr * targetRate).toFixed(2));
            }
        });
    }

    const elements = document.querySelectorAll('.prev-currency-label');
    elements.forEach(el => { el.innerText = newCurrency; });
    
    invoiceCurrency = newCurrency;
    updateItemsTable();
}

// ---------------------------------------------------------
// Company Settings Logic
// ---------------------------------------------------------
async function loadCompanyDetails() {
    try {
        const doc = await db.collection('config').doc('company_details').get();
        if (doc.exists) {
            currentCompanyConfig = doc.data();
            renderCompanyDetails();
        }
    } catch (e) {
        console.error("Error loading company details:", e);
    }
}

function renderCompanyDetails() {
    const config = currentCompanyConfig || {};
    
    document.getElementById('prev-company-name').innerText = config.name || "IND Natural Hair Pvt Ltd";
    document.getElementById('prev-company-address').innerText = config.address || "WZ 81/1-A, G/F Shop\nGuru Nanak Nagar\nNew Delhi 110018\nIndia";
    document.getElementById('prev-company-phone').innerText = config.phone || "+91-9871171978";
    document.getElementById('prev-company-email').innerText = config.email || "";
    document.getElementById('prev-company-gst').innerText = config.gstin ? `GSTIN: ${config.gstin}` : "GSTIN: 07AADCI5579A1ZN";
    
    const bankSelect = document.getElementById('inp-bank-select');
    if (bankSelect) {
        bankSelect.innerHTML = '';
        
        let accounts = config.bankAccounts || [];
        if (accounts.length === 0 && config.bankDetails) {
            accounts = [{ id: 'legacy', type: 'Legacy', details: config.bankDetails, isDefault: true }];
        }
        
        if (accounts.length > 0) {
            let defaultId = null;
            accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                opt.textContent = acc.name || `${acc.type || 'Account'}`;
                bankSelect.appendChild(opt);
                if (acc.isDefault) defaultId = acc.id;
            });
            
            if (defaultId) bankSelect.value = defaultId;
            else bankSelect.value = accounts[0].id;
            
            const updatePreview = () => {
                const selected = accounts.find(a => a.id === bankSelect.value);
                document.getElementById('prev-company-bank').innerText = selected ? selected.details : '';
            };
            
            bankSelect.removeEventListener('change', updatePreview);
            bankSelect.addEventListener('change', updatePreview);
            updatePreview();
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No Bank Account';
            bankSelect.appendChild(opt);
            document.getElementById('prev-company-bank').innerText = '';
        }
    } else {
        document.getElementById('prev-company-bank').innerText = config.bankDetails || "";
    }
    
    const logoImg = document.getElementById('prev-company-logo');
    const logoIcon = document.getElementById('prev-logo-icon');
    if (config.logoUrl) {
        logoImg.src = config.logoUrl;
        logoImg.style.display = 'block';
        if (logoIcon) logoIcon.style.display = 'none';
    } else {
        logoImg.src = 'images/logo-optimized.png';
        logoImg.style.display = 'block';
        if (logoIcon) logoIcon.style.display = 'none';
    }
}

function openCompanyModal() {
    const config = currentCompanyConfig;
    document.getElementById('inp-comp-name').value = config.name || "";
    document.getElementById('inp-comp-address').value = config.address || "";
    document.getElementById('inp-comp-phone').value = config.phone || "";
    document.getElementById('inp-comp-email').value = config.email || "";
    document.getElementById('inp-comp-web').value = config.website || "";
    document.getElementById('inp-comp-gst').value = config.gstin || "";
    
    // Render dynamic bank accounts
    const container = document.getElementById('bank-accounts-container');
    container.innerHTML = '';
    
    let accounts = config.bankAccounts || [];
    if (accounts.length === 0 && config.bankDetails) {
        accounts = [{ id: Date.now().toString(), type: 'Domestic', details: config.bankDetails, isDefault: true }];
    }
    
    if (accounts.length === 0) {
        addBankAccountRow();
    } else {
        accounts.forEach(acc => addBankAccountRow(acc));
    }
    
    const previewWrapper = document.getElementById('comp-logo-preview-wrapper');
    const previewImg = document.getElementById('comp-logo-preview');
    if (config.logoUrl) {
        previewImg.src = config.logoUrl;
        previewWrapper.classList.remove('hidden');
    } else {
        previewWrapper.classList.add('hidden');
    }
    
    document.getElementById('company-modal').classList.remove('hidden');
}

function closeCompanyModal() {
    document.getElementById('company-modal').classList.add('hidden');
}

function handleLogoPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('comp-logo-preview').src = e.target.result;
            document.getElementById('comp-logo-preview-wrapper').classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function addBankAccountRow(acc = null) {
    const container = document.getElementById('bank-accounts-container');
    const id = acc ? acc.id : Date.now().toString();
    const name = acc ? (acc.name || acc.type) : '';
    const details = acc ? acc.details : '';
    const isDefault = acc ? acc.isDefault : (container.children.length === 0);

    const row = document.createElement('div');
    row.className = 'bank-account-row border border-slate-200 rounded p-3 bg-slate-50 relative';
    row.dataset.id = id;
    
    row.innerHTML = `
        <button onclick="removeBankAccountRow(this)" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition" title="Remove Account">
            <i class="fas fa-times"></i>
        </button>
        <div class="flex items-center space-x-4 mb-2">
            <div class="flex-1">
                <input type="text" class="bank-name w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Account Name (e.g., Chase USD)" value="${name}">
            </div>
            <div class="flex items-center space-x-1.5 flex-1">
                <input type="radio" name="bank_default" value="${id}" class="bank-default w-3 h-3 text-indigo-600 border-slate-300 focus:ring-indigo-500" ${isDefault ? 'checked' : ''}>
                <label class="text-xs text-slate-600 font-medium">Set as Default</label>
            </div>
        </div>
        <textarea class="bank-details w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none" rows="3" placeholder="Bank Name: ...\nA/c Name: ...\nA/c Number: ...\nIFSC/SWIFT: ...">${details}</textarea>
    `;
    container.appendChild(row);
}

function removeBankAccountRow(btn) {
    const row = btn.closest('.bank-account-row');
    if (row) {
        row.remove();
        // Ensure at least one radio is checked if possible
        const radios = document.querySelectorAll('input[name="bank_default"]');
        let hasChecked = false;
        radios.forEach(r => { if(r.checked) hasChecked = true; });
        if (!hasChecked && radios.length > 0) {
            radios[0].checked = true;
        }
    }
}

async function saveCompanyDetails() {
    const btn = document.getElementById('btn-save-company');
    const ogText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    btn.disabled = true;

    try {
        const fileInput = document.getElementById('inp-comp-logo');
        let logoUrl = currentCompanyConfig.logoUrl || "";

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = storage.ref(`public_assets/company_logo_${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            logoUrl = await snapshot.ref.getDownloadURL();
        }

        const bankRows = document.querySelectorAll('.bank-account-row');
        const bankAccounts = [];
        bankRows.forEach(row => {
            const name = row.querySelector('.bank-name').value.trim() || 'Unnamed Account';
            const details = row.querySelector('.bank-details').value.trim();
            const isDefault = row.querySelector('.bank-default').checked;
            if (details) {
                bankAccounts.push({
                    id: row.dataset.id,
                    name,
                    details,
                    isDefault
                });
            }
        });

        // Ensure at least one default if accounts exist
        if (bankAccounts.length > 0 && !bankAccounts.some(a => a.isDefault)) {
            bankAccounts[0].isDefault = true;
        }

        const newConfig = {
            name: document.getElementById('inp-comp-name').value.trim(),
            address: document.getElementById('inp-comp-address').value.trim(),
            phone: document.getElementById('inp-comp-phone').value.trim(),
            email: document.getElementById('inp-comp-email').value.trim(),
            website: document.getElementById('inp-comp-web').value.trim(),
            gstin: document.getElementById('inp-comp-gst').value.trim(),
            bankAccounts: bankAccounts,
            bankDetails: bankAccounts.length > 0 ? bankAccounts.find(a => a.isDefault)?.details || bankAccounts[0].details : '', // Fallback for backwards compatibility
            logoUrl: logoUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('config').doc('company_details').set(newConfig, { merge: true });
        currentCompanyConfig = newConfig;
        renderCompanyDetails();
        closeCompanyModal();
        alert("Company details saved successfully!");
    } catch (error) {
        console.error("Error saving company details:", error);
        alert("Error saving details: " + error.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

function generateInvoiceNumber() {
    const date = new Date();
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(100 + Math.random() * 900);
    document.getElementById('inp-invoice-no').value = `INH${dd}${mm}${yy}-${random}`;
    updateMeta();
}

function updateMeta() {
    document.getElementById('prev-invoice-no').innerText = document.getElementById('inp-invoice-no').value;
    const dateVal = document.getElementById('inp-date').value;
    if(dateVal) {
        const parts = dateVal.split('-');
        document.getElementById('prev-date').innerText = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
        document.getElementById('prev-date').innerText = '';
    }
    
    const deliveryDateVal = document.getElementById('inp-delivery-date') ? document.getElementById('inp-delivery-date').value : '';
    const prevDeliveryDate = document.getElementById('prev-delivery-date');
    if(prevDeliveryDate) {
        if(deliveryDateVal) {
            const parts = deliveryDateVal.split('-');
            prevDeliveryDate.innerText = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
            prevDeliveryDate.innerText = '';
        }
    }
}

function updateAddress(type) {
    document.getElementById(`prev-${type}-name`).innerText = document.getElementById(`inp-${type}-name`).value;
    
    const country = document.getElementById(`inp-${type}-country`).value;
    const phone = document.getElementById(`inp-${type}-phone`).value;
    let contactLine = '';
    if (country) contactLine += country;
    if (phone) contactLine += (contactLine ? ' | ' : '') + phone;
    
    document.getElementById(`prev-${type}-phone`).innerText = contactLine;
    
    const lines = document.getElementById(`inp-${type}-address`).value.split('\n');
    document.getElementById(`prev-${type}-line1`).innerText = lines[0] || '';
    document.getElementById(`prev-${type}-line2`).innerText = lines[1] || '';
    document.getElementById(`prev-${type}-line3`).innerText = lines[2] || '';
}

function copyBillToShip() {
    document.getElementById('inp-ship-name').value = document.getElementById('inp-bill-name').value;
    document.getElementById('inp-ship-address').value = document.getElementById('inp-bill-address').value;
    document.getElementById('inp-ship-country').value = document.getElementById('inp-bill-country').value;
    document.getElementById('inp-ship-phone').value = document.getElementById('inp-bill-phone').value;
    updateAddress('ship');
}

// ---------------------------------------------------------
// CSV Parsing & Sheet Fetching
// ---------------------------------------------------------
function parseCSVRow(text) {
    let result = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        let c = text.charAt(i);
        if (inQuotes) {
            if (c === '"') {
                if (i + 1 < text.length && text.charAt(i + 1) === '"') {
                    curVal += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                curVal += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                result.push(curVal);
                curVal = '';
            } else {
                curVal += c;
            }
        }
    }
    result.push(curVal);
    return result;
}

// ---------------------------------------------------------
// Load Saved Quotes Logic
// ---------------------------------------------------------
let savedQuotesData = [];

async function openSavedQuotesModal() {
    document.getElementById('saved-quotes-modal').classList.remove('hidden');
    const listContainer = document.getElementById('saved-quotes-list');
    listContainer.innerHTML = `<div class="text-center text-slate-400 py-10"><i class="fas fa-spinner fa-spin text-2xl mb-3"></i><p>Loading quotes...</p></div>`;
    
    try {
        const snapshot = await db.collection('proforma_invoices')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
            
        savedQuotesData = [];
        const seenInvoices = new Set();
        
        if (snapshot.empty) {
            listContainer.innerHTML = `<div class="text-center text-slate-400 py-10"><p>No saved quotes found.</p></div>`;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const invNo = data.invoiceNo || 'Draft';
            
            // Only show the latest of each quote number
            if (seenInvoices.has(invNo) && invNo !== 'Draft') return;
            seenInvoices.add(invNo);
            
            data.id = doc.id;
            savedQuotesData.push(data);
            
            const dateStr = data.date || 'No Date';
            const billTo = data.billTo || 'Unknown Client';
            const total = parseFloat(data.payable || 0).toFixed(2);
            const currency = data.currency || 'INR';
            
            const shippingIndicator = data.shipping ? `<span class="text-[10px] text-emerald-600 ml-2 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"><i class="fas fa-truck mr-1"></i>+${parseFloat(data.shipping).toFixed(2)} Shipping</span>` : '';
            
            html += `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-indigo-300 hover:shadow transition cursor-pointer" onclick="loadQuoteIntoEditor('${doc.id}')">
                    <div>
                        <div class="font-bold text-slate-800">${invNo} <span class="font-normal text-xs text-slate-500 ml-2">${dateStr}</span>${shippingIndicator}</div>
                        <div class="text-sm text-slate-600 mt-1"><i class="far fa-user mr-1"></i> ${billTo}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-slate-500 font-bold uppercase">${currency}</div>
                        <div class="font-bold text-slate-900 text-lg">${total}</div>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (err) {
        console.error("Error loading quotes:", err);
        listContainer.innerHTML = `<div class="text-center text-red-500 py-10"><i class="fas fa-exclamation-triangle text-2xl mb-3"></i><p>Failed to load quotes.</p></div>`;
    }
}

function closeSavedQuotesModal() {
    document.getElementById('saved-quotes-modal').classList.add('hidden');
}

function loadQuoteIntoEditor(docId) {
    const quote = savedQuotesData.find(q => q.id === docId);
    if (!quote) return;
    
    // Repopulate Top Inputs
    document.getElementById('inp-invoice-no').value = quote.invoiceNo || '';
    document.getElementById('inp-date').value = quote.date || '';
    if (document.getElementById('inp-delivery-date')) document.getElementById('inp-delivery-date').value = quote.deliveryDate || '';
    document.getElementById('inp-bill-name').value = quote.billTo || '';
    document.getElementById('inp-ship-name').value = quote.shipTo || '';
    document.getElementById('inp-order-search').value = quote.orderNo || '';
    
    // Repopulate Items
    currentOrderData = quote.items || [];
    
    // Set Currency
    setInvoiceCurrency(quote.currency || 'INR');
    
    // Repopulate Financials (Fallback to 0 if older quote didn't save them explicitly)
    document.getElementById('inp-discount').value = quote.discount || 0;
    document.getElementById('inp-advance').value = quote.advance || 0;
    document.getElementById('inp-gst').value = quote.gst || 0;
    document.getElementById('inp-shipping').value = quote.shipping || 0;
    
    // Repopulate Previews
    document.getElementById('prev-invoice-no').innerText = quote.invoiceNo || '';
    document.getElementById('prev-date').innerText = quote.date ? quote.date.split('-').reverse().join('-') : '';
    if (document.getElementById('prev-delivery-date')) {
        document.getElementById('prev-delivery-date').innerText = quote.deliveryDate ? quote.deliveryDate.split('-').reverse().join('-') : '';
    }
    document.getElementById('prev-order-no').innerText = quote.orderNo || '';
    document.getElementById('prev-order-ref').innerText = quote.orderRef || quote.billTo || '';
    
    // Repopulate Bank Account
    if (quote.bankAccountId) {
        const bankSelect = document.getElementById('inp-bank-select');
        if (bankSelect) {
            bankSelect.value = quote.bankAccountId;
            bankSelect.dispatchEvent(new Event('change'));
        }
    }
    
    // Update Addresses
    updateAddress('bill');
    updateAddress('ship');
    
    // Close Modal and Refresh Table
    closeSavedQuotesModal();
    updateItemsTable(); // This will recalculate the totals using the loaded inputs and items
}

async function fetchOrderFromSheet() {
    const orderNo = document.getElementById('inp-order-search').value.trim();
    if (!orderNo) return alert("Please enter an Order Number");

    const statusEl = document.getElementById('fetch-status');
    const btn = document.getElementById('btn-fetch-order');
    statusEl.classList.remove('hidden', 'text-red-500');
    statusEl.classList.add('text-indigo-600');
    statusEl.innerText = "Fetching from Google Sheets...";
    btn.disabled = true;

    try {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU/gviz/tq?tqx=out:csv&gid=904261097";
        const response = await fetch(sheetUrl);
        const text = await response.text();
        
        const lines = text.split('\n');
        const headers = parseCSVRow(lines[0]);
        
        const orderItems = [];
        let orderRefName = "";
        let sheetDiscount = 0;
        let sheetAdvance = 0;
        let sheetCurrency = "INR";

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = parseCSVRow(lines[i]);
            const rowOrderNo = row[4]; // Order#
            
            if (rowOrderNo === orderNo) {
                // We found a match
                if (!orderRefName) orderRefName = row[5]; // Name
                if (row[16]) sheetCurrency = row[16]; // Currency
                
                // Parse discount from sheet if available
                if (row[18] && parseFloat(row[18])) sheetDiscount = parseFloat(row[18]);
                
                // Parse advance from Debit column (W) if negative
                if (row[23] && row[23].includes('-')) {
                    const adv = parseFloat(row[23].replace(/[^0-9.-]+/g,""));
                    if (!isNaN(adv)) sheetAdvance = Math.abs(adv);
                }

                // Push item
                orderItems.push({
                    length: row[9] || '',
                    product: row[10] || '',
                    type: row[11] || '',
                    style: row[12] || '',
                    color: row[13] || '',
                    remarks: row[14] || '',
                    qty: parseFloat(row[15]) || 0,
                    rate: parseFloat((row[19]||'').replace(/,/g, '')) || 0, // Fallback rate from sheet
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
        }

        if (orderItems.length === 0) {
            statusEl.innerText = "Order not found in sheet.";
            statusEl.classList.add('text-red-500');
        } else {
            statusEl.innerText = `Found ${orderItems.length} items!`;
            
            // Populate basic info
            document.getElementById('prev-order-no').innerText = orderNo;
            document.getElementById('prev-order-ref').innerText = orderRefName;
            document.getElementById('inp-bill-name').value = orderRefName;
            updateAddress('bill');

            document.getElementById('inp-discount').value = sheetDiscount;
            document.getElementById('inp-advance').value = sheetAdvance;
            if(sheetCurrency && sheetCurrency.length === 3) {
                setInvoiceCurrency(sheetCurrency);
            }

            // Try to lookup latest prices from Firebase
            await tryLookupPrices(orderItems);

            currentOrderData = orderItems;
            updateItemsTable();
            
            // Notify success
            setTimeout(() => { statusEl.classList.add('hidden'); }, 3000);
        }

    } catch (error) {
        console.error(error);
        statusEl.innerText = "Error fetching data: " + error.message;
        statusEl.classList.add('text-red-500');
    } finally {
        btn.disabled = false;
    }
}

async function tryLookupPrices(items) {
    try {
        const snapshot = await db.collection('pricelists').get();
        if (snapshot.empty) return;

        const allPrices = [];
        snapshot.forEach(doc => allPrices.push(doc.data()));

        // Simple fuzzy match logic
        items.forEach(item => {
            // Find best match in pricelists
            const match = allPrices.find(p => 
                (p.Length == item.length || p.length == item.length) &&
                (p.Product && p.Product.toLowerCase().includes((item.product || '').toLowerCase()))
            );
            if (match && match[invoiceCurrency]) {
                item.rate = parseFloat(match[invoiceCurrency]);
            } else if (match && match.Rate) {
                item.rate = parseFloat(match.Rate);
            }
        });
    } catch(err) {
        console.log("Price lookup failed silently, using sheet rates.", err);
    }
}

// ---------------------------------------------------------
// Rendering & Math
// ---------------------------------------------------------
function updateItemsTable() {
    const tbody = document.getElementById('prev-items-body');
    tbody.innerHTML = '';
    
    let totalQty = 0;
    invoiceTotal = 0;

    currentOrderData.forEach((item, index) => {
        const amount = item.qty * item.rate;
        totalQty += item.qty;
        invoiceTotal += amount;

        const tr = document.createElement('tr');
        tr.className = "cursor-pointer hover:bg-slate-50 group transition-colors relative";
        tr.onclick = () => openEditRateModal(index);
        tr.innerHTML = `
            <td class="py-1 px-2 text-center border border-slate-300 relative group-hover:bg-slate-50">
                ${item.length}
                <div class="absolute inset-0 items-center justify-center bg-black/5 hidden group-hover:flex text-indigo-600">
                    <i class="fas fa-edit"></i>
                </div>
            </td>
            <td class="py-1 px-2 border border-slate-300 text-slate-800 font-medium"><div class="line-clamp-2" title="${item.product}">${item.product}</div></td>
            <td class="py-1 px-2 text-center border border-slate-300"><div class="line-clamp-2" title="${item.type}">${item.type}</div></td>
            <td class="py-1 px-2 text-center border border-slate-300"><div class="line-clamp-2" title="${item.style}">${item.style}</div></td>
            <td class="py-1 px-2 text-center border border-slate-300"><div class="line-clamp-2" title="${item.color}">${item.color}</div></td>
            <td class="py-1 px-2 text-center border border-slate-300 font-medium text-slate-800">${item.qty}</td>
            <td class="py-1 px-2 text-right border border-slate-300 font-medium whitespace-nowrap"><span class="text-slate-400 text-[10px] mr-1">${getCurrencySymbol(invoiceCurrency)}</span>${item.rate.toFixed(2)}</td>
            <td class="py-1 px-2 text-right border border-slate-300 font-bold text-slate-900 relative whitespace-nowrap">
                <span class="text-slate-400 font-normal text-[10px] mr-1">${getCurrencySymbol(invoiceCurrency)}</span>${amount.toFixed(2)}
                <button onclick="event.stopPropagation(); removeManualItem('${item.id}')" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full text-red-500 hover:text-red-700 p-2 hidden group-hover:block no-print" title="Remove Item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('prev-total-qty').innerText = `${totalQty} pieces`;
    updateFinancials();
}

function updateFinancials() {
    invoiceDiscount = parseFloat(document.getElementById('inp-discount').value) || 0;
    invoiceAdvance = parseFloat(document.getElementById('inp-advance').value) || 0;
    invoiceShipping = parseFloat(document.getElementById('inp-shipping').value) || 0;
    invoiceGST = parseFloat(document.getElementById('inp-gst').value) || 0;

    document.getElementById('prev-total-amount').innerText = invoiceTotal.toFixed(2);
    document.getElementById('prev-discount').innerText = invoiceDiscount.toFixed(2);
    document.getElementById('prev-advance').innerText = invoiceAdvance.toFixed(2);
    document.getElementById('prev-shipping').innerText = invoiceShipping.toFixed(2);
    document.getElementById('prev-gst').innerText = invoiceGST.toFixed(2);

    const payable = (invoiceTotal - invoiceDiscount - invoiceAdvance) + invoiceShipping + invoiceGST;
    document.getElementById('prev-payable').innerText = payable.toFixed(2);

    document.getElementById('prev-amount-words').innerText = fullAmountInWords(payable, invoiceCurrency);
}

// ---------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------
let editingItemIndex = -1;
function openEditRateModal(index) {
    editingItemIndex = index;
    const item = currentOrderData[index];
    document.getElementById('rate-modal-item-desc').innerText = `${item.length}" ${item.product} (${item.type})`;
    document.getElementById('inp-modal-rate').value = item.rate;
    document.getElementById('rate-modal').classList.remove('hidden');
}

function closeRateModal() {
    document.getElementById('rate-modal').classList.add('hidden');
    editingItemIndex = -1;
}

window.saveModalRate = function() {
    if (editingItemIndex > -1) {
        currentOrderData[editingItemIndex].rate = parseFloat(document.getElementById('inp-modal-rate').value) || 0;
        updateItemsTable();
        closeRateModal();
    }
}

// ---------------------------------------------------------
// Address Book (Firestore)
// ---------------------------------------------------------
async function saveCurrentAddresses() {
    const btn = document.getElementById('btn-save-addresses');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Saving...`;
    
    try {
        const billAddress = {
            type: 'bill',
            name: document.getElementById('inp-bill-name').value,
            address: document.getElementById('inp-bill-address').value,
            phone: document.getElementById('inp-bill-phone').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const shipAddress = {
            type: 'ship',
            name: document.getElementById('inp-ship-name').value,
            address: document.getElementById('inp-ship-address').value,
            phone: document.getElementById('inp-ship-phone').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if(billAddress.name) await db.collection('address_book').add(billAddress);
        if(shipAddress.name && shipAddress.name !== billAddress.name) await db.collection('address_book').add(shipAddress);
        
        btn.innerHTML = `<i class="fas fa-check mr-1 text-emerald-600"></i> Saved!`;
        setTimeout(() => {
            btn.innerHTML = `<i class="fas fa-save mr-1"></i> Save to Address Book`;
        }, 2000);
    } catch(e) {
        console.error(e);
        btn.innerHTML = `Error saving`;
    }
}

window.loadAddress = async function(type) {
    window.currentAddressType = type;
    document.getElementById('address-modal').classList.remove('hidden');
    document.getElementById('modal-address-list').innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        let snapshot;
        try {
            snapshot = await db.collection('address_book').orderBy('updatedAt', 'desc').limit(20).get();
        } catch(err) {
            console.warn("Falling back to unordered query for address_book", err);
            snapshot = await db.collection('address_book').limit(20).get();
        }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const jsonStr = encodeURIComponent(JSON.stringify(data)).replace(/'/g, '%27');
            html += `
                <div class="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:border-indigo-500 hover:shadow-sm relative group" onclick="selectAddress('${type}', '${jsonStr}')">
                    <div class="font-bold text-sm pr-8">${data.name}</div>
                    <div class="text-xs text-slate-500 whitespace-pre-wrap">${data.address}</div>
                    <div class="text-xs text-blue-600 mt-1">${data.phone}</div>
                    <button onclick="event.stopPropagation(); editAddress('${doc.id}', '${jsonStr}')" class="absolute top-2 right-2 text-slate-400 hover:text-indigo-600 p-1 hidden group-hover:block" title="Edit Address">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            `;
        });
        document.getElementById('modal-address-list').innerHTML = html || '<div class="text-center p-4 text-slate-500">No saved addresses</div>';
    } catch(e) {
        console.error(e);
        document.getElementById('modal-address-list').innerHTML = 'Error loading addresses';
    }
}

window.closeAddressModal = function() {
    document.getElementById('address-modal').classList.add('hidden');
}

window.selectAddress = function(type, encodedStr) {
    try {
        const data = JSON.parse(decodeURIComponent(encodedStr));
        document.getElementById(`inp-${type}-name`).value = data.name || '';
        document.getElementById(`inp-${type}-address`).value = data.address || '';
        document.getElementById(`inp-${type}-phone`).value = data.phone || '';
        document.getElementById(`inp-${type}-country`).value = data.country || '';
        updateAddress(type);
        closeAddressModal();
    } catch(e) {
        console.error('Error parsing address', e);
        alert('Error loading address.');
    }
}

function populateCountryDropdown() {
    const select = document.getElementById('new-addr-country');
    if (select && select.options.length <= 1 && typeof countryISDCodes !== 'undefined') {
        countryISDCodes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.dataset.code = c.code;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    }
}

window.editAddress = function(docId, encodedStr) {
    const data = JSON.parse(decodeURIComponent(encodedStr));
    
    // Open the new address form
    const form = document.getElementById('new-address-form');
    form.classList.remove('hidden');
    
    // Ensure dropdown is populated
    populateCountryDropdown();
    
    // Populate fields
    document.getElementById('new-addr-name').value = data.name || '';
    document.getElementById('new-addr-address').value = data.address || '';
    document.getElementById('new-addr-country').value = data.country || '';
    document.getElementById('new-addr-phone').value = data.phone || '';
    
    // Set a hidden attribute for docId so we know we're editing
    document.getElementById('new-addr-name').dataset.editDocId = docId;
    
    // Change button text
    document.getElementById('btn-save-new-addr').innerText = "Update Address";
}

window.toggleAddNewAddressForm = function() {
    const form = document.getElementById('new-address-form');
    form.classList.toggle('hidden');
    
    // Populate countries if not already populated
    populateCountryDropdown();

    // Reset form state if we are closing it
    if (form.classList.contains('hidden')) {
        document.getElementById('new-addr-name').value = '';
        document.getElementById('new-addr-address').value = '';
        document.getElementById('new-addr-phone').value = '';
        document.getElementById('new-addr-country').value = '';
        delete document.getElementById('new-addr-name').dataset.editDocId;
        document.getElementById('btn-save-new-addr').innerText = "Save Address";
    }
}

window.onAddressCountryChange = function() {
    const select = document.getElementById('new-addr-country');
    const phoneInput = document.getElementById('new-addr-phone');
    if(select.selectedIndex > 0) {
        const code = select.options[select.selectedIndex].dataset.code;
        if(code) {
            // Simple logic to set or replace the dial code at the start of phone input
            let currentPhone = phoneInput.value.trim();
            // optionally remove old plus code if user changes country multiple times
            currentPhone = currentPhone.replace(/^\+\d+\s*/, '');
            phoneInput.value = code + ' ' + currentPhone;
        }
    }
}

window.onMainAddressCountryChange = function(type) {
    const select = document.getElementById(`inp-${type}-country`);
    const phoneInput = document.getElementById(`inp-${type}-phone`);
    if(select.selectedIndex > 0) {
        const code = select.options[select.selectedIndex].dataset.code;
        if(code) {
            let val = phoneInput.value.trim();
            if (val === '' || val.match(/^\+\d+\s*$/)) {
                phoneInput.value = code + ' ';
            } else if (!val.startsWith('+')) {
                phoneInput.value = code + ' ' + val;
            }
            updateAddress(type);
        }
    }
}

function initMainAddressCountries() {
    if (typeof countryISDCodes !== 'undefined') {
        ['bill', 'ship'].forEach(type => {
            const select = document.getElementById(`inp-${type}-country`);
            if (select && select.options.length <= 1) {
                countryISDCodes.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.name;
                    opt.dataset.code = c.code;
                    opt.textContent = c.name;
                    select.appendChild(opt);
                });
            }
        });
    }
}

// Call this early
initMainAddressCountries();
document.addEventListener('DOMContentLoaded', () => {
    initMainAddressCountries();
});

window.saveNewAddressFromModal = async function() {
    const name = document.getElementById('new-addr-name').value.trim();
    const address = document.getElementById('new-addr-address').value.trim();
    const phone = document.getElementById('new-addr-phone').value.trim();
    const country = document.getElementById('new-addr-country').value.trim();
    const btn = document.getElementById('btn-save-new-addr');
    const docId = document.getElementById('new-addr-name').dataset.editDocId;

    if (!name && !address) {
        alert("Please enter a name or address.");
        return;
    }

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        if (docId) {
            await db.collection('address_book').doc(docId).update({
                name: name,
                address: address,
                phone: phone,
                country: country,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection('address_book').add({
                type: 'manual',
                name: name,
                address: address,
                phone: phone,
                country: country,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // clear form state
        document.getElementById('new-addr-name').value = '';
        document.getElementById('new-addr-address').value = '';
        document.getElementById('new-addr-phone').value = '';
        document.getElementById('new-addr-country').value = '';
        delete document.getElementById('new-addr-name').dataset.editDocId;
        btn.innerText = "Save Address";
        
        toggleAddNewAddressForm();
        
        // Reload list
        loadAddress(window.currentAddressType || 'bill');
        
    } catch (e) {
        console.error(e);
        alert("Failed to save address.");
    } finally {
        btn.disabled = false;
        if(btn.innerHTML.includes('spin')) btn.innerText = "Save Address";
    }
}

// ---------------------------------------------------------
// Exports (PDF/Image)
// ---------------------------------------------------------
async function exportToImage() {
    const container = document.getElementById('invoice-preview-container');
    const btn = document.getElementById('btn-export-img');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Generating...`;
    
    try {
        const canvas = await html2canvas(container, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight
        });
        const link = document.createElement('a');
        link.download = `Proforma-Invoice-${document.getElementById('inp-invoice-no').value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch(e) {
        console.error(e);
        alert("Failed to export image");
    } finally {
        btn.innerHTML = ogHtml;
    }
}

async function exportToPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Preparing...`;
    
    // We use the browser's native print engine (Save as PDF) for perfect table pagination, 
    // selectable text, proper row colors, and vector-crisp rendering!
    setTimeout(() => {
        btn.innerHTML = ogHtml;
        alert("To generate a perfect multipage PDF:\n\n1. A Print dialog will open.\n2. Set the Destination to 'Save as PDF'.\n3. Ensure 'Background graphics' is turned ON to keep the colors and borders.\n4. Click Save.");
        window.print();
    }, 500);
}

// ---------------------------------------------------------
// Save & Share (Firebase Storage)
// ---------------------------------------------------------
async function saveInvoiceToFirebase() {
    const btn = document.getElementById('btn-save-quote');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Saving...`;
    
    try {
        const invoiceNo = document.getElementById('inp-invoice-no').value;
        const currentShipping = parseFloat(document.getElementById('inp-shipping').value) || 0;
        const bankSelect = document.getElementById('inp-bank-select');
        const bankAccountId = bankSelect ? bankSelect.value : null;

        const payload = {
            invoiceNo,
            date: document.getElementById('inp-date').value,
            deliveryDate: document.getElementById('inp-delivery-date') ? document.getElementById('inp-delivery-date').value : '',
            billTo: document.getElementById('inp-bill-name').value,
            shipTo: document.getElementById('inp-ship-name').value,
            orderNo: document.getElementById('inp-order-search').value,
            orderRef: document.getElementById('prev-order-ref').innerText,
            items: currentOrderData,
            discount: invoiceDiscount,
            advance: invoiceAdvance,
            gst: invoiceGST,
            payable: (invoiceTotal - invoiceDiscount - invoiceAdvance) + invoiceGST + currentShipping,
            shipping: currentShipping,
            currency: invoiceCurrency,
            bankAccountId: bankAccountId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (invoiceNo && invoiceNo.trim() !== '') {
            await db.collection('proforma_invoices').doc(invoiceNo).set(payload, { merge: true });
        } else {
            await db.collection('proforma_invoices').add(payload);
        }
        
        btn.innerHTML = `<i class="fas fa-check mr-2 text-emerald-700"></i> Saved!`;
        setTimeout(() => btn.innerHTML = ogHtml, 2000);
    } catch(e) {
        console.error(e);
        alert("Failed to save to database");
        btn.innerHTML = ogHtml;
    }
}

async function generateShareableLink() {
    const container = document.getElementById('invoice-preview-container');
    const btn = document.getElementById('btn-share-link');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Uploading...`;
    
    try {
        const invoiceNo = document.getElementById('inp-invoice-no').value || 'Draft';
        const canvas = await html2canvas(container, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight
        });
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
            const fileName = `Proforma-${invoiceNo}-${Date.now()}.png`;
            const ref = storage.ref(`proforma_exports/${fileName}`);
            
            await ref.put(blob);
            const url = await ref.getDownloadURL();
            
            // Copy to clipboard
            await navigator.clipboard.writeText(url);
            btn.innerHTML = `<i class="fas fa-check mr-2"></i> Link Copied!`;
            setTimeout(() => btn.innerHTML = ogHtml, 3000);
        }, 'image/png');
        
    } catch(e) {
        console.error(e);
        alert("Failed to generate link");
        btn.innerHTML = ogHtml;
    }
}

// ---------------------------------------------------------
// Utils
// ---------------------------------------------------------
function getCurrencySymbol(code) {
    const map = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'AUD': 'A$',
        'AED': 'AED',
        'CAD': 'C$',
        'NGN': '₦',
        'ZAR': 'R'
    };
    return map[code] || code;
}

function getCurrencyFractions(code) {
    const map = {
        'INR': { main: 'INDIAN RUPEES', frac: 'PAISA' },
        'USD': { main: 'US DOLLARS', frac: 'CENTS' },
        'EUR': { main: 'EUROS', frac: 'CENTS' },
        'GBP': { main: 'BRITISH POUNDS', frac: 'PENCE' },
        'AUD': { main: 'AUSTRALIAN DOLLARS', frac: 'CENTS' },
        'AED': { main: 'UAE DIRHAMS', frac: 'FILS' },
        'CAD': { main: 'CANADIAN DOLLARS', frac: 'CENTS' },
        'NGN': { main: 'NIGERIAN NAIRA', frac: 'KOBO' },
        'ZAR': { main: 'SOUTH AFRICAN RAND', frac: 'CENTS' }
    };
    return map[code] || { main: code, frac: 'CENTS' };
}

function getCurrencyFullName(code) {
    return getCurrencyFractions(code).main;
}

function numberToWords(num, currency = 'INR') {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    
    if (num === 0) return 'ZERO';

    if (currency === 'INR') {
        if ((num = num.toString()).length > 9) return 'OVERFLOW';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return ''; 
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim().toUpperCase();
    } else {
        if ((num = num.toString()).length > 15) return 'OVERFLOW';
        let n = ('000000000000000' + num).substr(-15).match(/^(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})$/);
        if (!n) return ''; 
        let str = '';
        
        function getHundreds(strNum) {
            let res = '';
            let parsed = Number(strNum);
            if (parsed === 0) return res;
            if (parsed > 99) {
                res += a[Math.floor(parsed / 100)] + 'Hundred ';
                parsed = parsed % 100;
            }
            if (parsed > 0) {
                if (res !== '') res += 'and ';
                if (parsed < 20) {
                    res += a[parsed];
                } else {
                    let tens = Math.floor(parsed / 10);
                    let ones = parsed % 10;
                    res += b[tens] + (ones ? ' ' + a[ones] : ' ');
                }
            }
            return res;
        }

        str += (Number(n[1]) !== 0) ? getHundreds(n[1]) + 'Trillion ' : '';
        str += (Number(n[2]) !== 0) ? getHundreds(n[2]) + 'Billion ' : '';
        str += (Number(n[3]) !== 0) ? getHundreds(n[3]) + 'Million ' : '';
        str += (Number(n[4]) !== 0) ? getHundreds(n[4]) + 'Thousand ' : '';
        str += (Number(n[5]) !== 0) ? getHundreds(n[5]) : '';
        
        return str.trim().toUpperCase();
    }
}

function fullAmountInWords(amount, currency) {
    const parts = getCurrencyFractions(currency);
    const integerPart = Math.floor(amount);
    const fractionalPart = Math.round((amount - integerPart) * 100);
    
    let words = numberToWords(integerPart, currency) + ' ' + parts.main;
    
    if (fractionalPart > 0) {
        words += ' AND ' + numberToWords(fractionalPart, currency) + ' ' + parts.frac;
    }
    
    return words + ' ONLY';
}

// ---------------------------------------------------------
// Shipping Calculator Logic
// ---------------------------------------------------------
let shipExchangeRates = { INR: 1 };
let shipCountryList = [];

function initShippingCalculator() {
    // Fetch rates
    fetch('https://api.exchangerate-api.com/v4/latest/INR')
        .then(res => res.json())
        .then(data => { shipExchangeRates = data.rates; })
        .catch(err => console.error(err));

    const providerSelect = document.getElementById('ship-provider-select');
    if(providerSelect && typeof shippingData !== 'undefined') {
        const providers = Object.keys(shippingData);
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider;
            providerSelect.appendChild(option);
        });
        providerSelect.addEventListener('change', () => {
            populateShipCountries();
            calculateShipModalRate();
        });
    }
    
    const countrySearch = document.getElementById('ship-country-search');
    if(countrySearch) {
        countrySearch.addEventListener('input', (e) => {
            handleShipCountrySearch(e);
            calculateShipModalRate();
        });
    }
    
    const fuelInput = document.getElementById('ship-fuel-input');
    if(fuelInput) {
        fuelInput.addEventListener('input', calculateShipModalRate);
    }
    
    const commCheck = document.getElementById('ship-commercial-check');
    if(commCheck) {
        commCheck.addEventListener('change', calculateShipModalRate);
    }
    
    const weightInput = document.getElementById('ship-weight-input');
    if(weightInput) {
        weightInput.addEventListener('input', calculateShipModalRate);
    }

    // Initial populate
    setTimeout(populateShipCountries, 500); // Give data.js time to load
}

function openShippingModal() {
    document.getElementById('shipping-modal').classList.remove('hidden');
    
    // Auto-calculate weight
    const unitWt = parseFloat(document.getElementById('inp-unit-weight').value) || 0.1;
    let totalQty = 0;
    currentOrderData.forEach(i => totalQty += i.qty);
    const totalWt = totalQty * unitWt;
    
    document.getElementById('ship-weight-input').value = totalWt.toFixed(2);
    
    populateShipCountries();
    calculateShipModalRate();
}

function closeShippingModal() {
    document.getElementById('shipping-modal').classList.add('hidden');
}

function populateShipCountries() {
    const provider = document.getElementById('ship-provider-select').value;
    if (!provider || typeof shippingData === 'undefined' || !shippingData[provider]) return;

    const currentZones = shippingData[provider].zones || [];
    
    const countryAliases = {
        'United States Of America': ['usa', 'us', 'united states', 'america'],
        'United Kingdom': ['uk', 'great britain', 'britain', 'england', 'gb'],
        'United Arab Emirates': ['uae', 'dubai', 'emirates'],
        'Russia': ['russian federation'],
        'South Korea': ['korea south', 'republic of korea'],
        'North Korea': ['korea north'],
        'China, People\'s Republic': ['china', 'prc'],
        'Vietnam': ['viet nam'],
        'Taiwan': ['chinese taipei'],
        'Iran (Islamic Republic of)': ['iran'],
        'Syria': ['syrian arab republic'],
        'Bolivia': ['plurinational state'],
        'Venezuela': ['bolivarian republic']
    };

    shipCountryList = currentZones
        .filter(c => c['2025 Zone Guide'] && c['2025 Zone Guide'] !== 'Countries and Territories')
        .sort((a, b) => a['2025 Zone Guide'].localeCompare(b['2025 Zone Guide']))
        .map(c => {
            const name = c['2025 Zone Guide'];
            const aliases = countryAliases[name] || [];
            const searchKey = [name.toLowerCase(), ...aliases].join(' ');
            return {
                label: name,
                zone: c['Unnamed: 2'],
                searchKey: searchKey
            };
        });
}

function handleShipCountrySearch(e) {
    const query = e.target.value.toLowerCase();
    const suggestionsEl = document.getElementById('ship-country-suggestions');
    suggestionsEl.innerHTML = '';
    
    if (!query) {
        suggestionsEl.classList.add('hidden');
        return;
    }

    const filtered = shipCountryList.filter(c => c.searchKey.includes(query));
    if (filtered.length > 0) {
        suggestionsEl.classList.remove('hidden');
        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = "px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm";
            li.textContent = item.label;
            li.onclick = () => {
                document.getElementById('ship-country-search').value = item.label;
                document.getElementById('ship-country-select').value = item.zone;
                suggestionsEl.classList.add('hidden');
                calculateShipModalRate();
            };
            suggestionsEl.appendChild(li);
        });
    } else {
        suggestionsEl.classList.add('hidden');
    }
}

function calculateShipModalRate() {
    const provider = document.getElementById('ship-provider-select').value;
    let zone = document.getElementById('ship-country-select').value;

    const countrySearch = document.getElementById('ship-country-search');
    if (!zone && countrySearch && countrySearch.value && typeof shipCountryList !== 'undefined') {
        const val = countrySearch.value.trim().toLowerCase();
        const match = shipCountryList.find(c => c.label.toLowerCase() === val || c.searchKey.includes(val));
        if (match) {
            zone = match.zone;
            document.getElementById('ship-country-select').value = zone;
            countrySearch.value = match.label;
        }
    }
    const weight = parseFloat(document.getElementById('ship-weight-input').value);
    const fuelPercent = parseFloat(document.getElementById('ship-fuel-input').value) || 0;
    const isCommercial = document.getElementById('ship-commercial-check').checked;

    const resultContainer = document.getElementById('ship-result-container');
    const applyBtn = document.getElementById('btn-apply-shipping');

    if (!provider || !zone || isNaN(weight) || weight <= 0) {
        resultContainer.classList.add('hidden');
        applyBtn.disabled = true;
        return;
    }

    const result = calcShipLogic(provider, zone, weight, fuelPercent, isCommercial);
    
    if (result.error) {
        // Soft error or hide
        resultContainer.classList.add('hidden');
        applyBtn.disabled = true;
        return;
    }

    // Format display
    document.getElementById('ship-base-display').innerText = "₹" + result.baseRate.toFixed(2);
    document.getElementById('ship-fuel-display').innerText = "₹" + result.fuelSurcharge.toFixed(2);
    
    const commRow = document.getElementById('ship-commercial-row');
    if (isCommercial) {
        commRow.classList.remove('hidden');
        document.getElementById('ship-commercial-display').innerText = "₹" + result.commercialCharge.toFixed(2);
    } else {
        commRow.classList.add('hidden');
    }

    document.getElementById('ship-total-display').innerText = "₹" + result.total.toFixed(2);
    
    // Convert to target currency
    const rate = shipExchangeRates[invoiceCurrency] || 1;
    const converted = result.total * rate;
    
    document.getElementById('ship-currency-note').innerText = `≈ ${converted.toFixed(2)} ${invoiceCurrency}`;
    
    // Attach to button
    applyBtn.dataset.amount = converted.toFixed(2);
    applyBtn.disabled = false;
    resultContainer.classList.remove('hidden');
}

function calcShipLogic(provider, zone, weight, fuelPercent, isCommercial) {
    const roundedWeight = Math.ceil(weight * 2) / 2;
    let weightKey = roundedWeight.toFixed(1);

    if (provider === "India Domestic - Free (3-5 Days)") {
        return { baseRate: 0, fuelSurcharge: 0, commercialCharge: 0, total: 0 };
    }

    if (provider === "India Domestic - Express (2-3 Days)") {
        const total = Math.ceil(weight) * 600;
        return { baseRate: total, fuelSurcharge: 0, commercialCharge: 0, total: total };
    }

    if (!shippingData[provider] || !shippingData[provider].rates) {
        return { error: 'Rates not available for this provider' };
    }

    const providerRates = shippingData[provider].rates;
    if (!providerRates[weightKey]) {
        return { error: 'Weight limit exceeded or rate not found' };
    }

    const baseRate = providerRates[weightKey][zone];
    if (baseRate === undefined || baseRate === null) return { error: 'Rate not available for this zone' };

    const demandCharge = 350;
    const fuelSurcharge = (baseRate + demandCharge) * (fuelPercent / 100);
    const commercialCharge = isCommercial ? 3500 : 0;

    const subtotal = baseRate + demandCharge + fuelSurcharge + commercialCharge;
    const gst = subtotal * 0.18;
    const total = subtotal + gst + 500;

    return { baseRate: baseRate + demandCharge, fuelSurcharge, commercialCharge, total };
}

function applyShippingToInvoice() {
    const applyBtn = document.getElementById('btn-apply-shipping');
    const val = applyBtn.dataset.amount;
    if (val) {
        document.getElementById('inp-shipping').value = val;
        updateFinancials();
    }
    closeShippingModal();
}

// ---------------------------------------------------------
// HairWise Auto-Pricing & Manual Item Entry
// ---------------------------------------------------------
window.hairwisePrices = {};

async function fetchHairwisePriceLists() {
    try {
        const doc = await db.collection('ratioMixer').doc('sharedSettings').get();
        if (!doc.exists) return;
        const data = doc.data();
        const clients = data.clients || [];

        const selectEl = document.getElementById('inp-hairwise-pricelist');
        if (!selectEl) return;
        
        clients.forEach(c => {
            if (c.tag && c.tag.toUpperCase() === 'HAIRWISE' && c.name) {
                // Precomputed prices for these are stored in customPrices
                window.hairwisePrices[c.name] = {
                    prices: c.customPrices || {},
                    currency: c.currency || 'INR'
                };
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name;
                selectEl.appendChild(opt);
            }
        });
        
        // Add listener if not inline
        selectEl.addEventListener('change', () => {
            onHairwiseListChange();
            onManualLengthChange();
        });
        
    } catch (e) {
        console.error("Error fetching HairWise price lists:", e);
    }
}

function onHairwiseListChange() {
    const listName = document.getElementById('inp-hairwise-pricelist').value;
    const container = document.getElementById('container-manual-length');
    const manualBaseContainer = document.getElementById('container-manual-base-price');
    
    if (listName === 'manual_pricing') {
        if(manualBaseContainer) manualBaseContainer.style.display = 'block';
        container.innerHTML = `<input type="number" id="inp-manual-length" class="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. 18" oninput="onManualLengthChange()">`;
    } else if (listName && window.hairwisePrices[listName]) {
        if(manualBaseContainer) manualBaseContainer.style.display = 'none';
        const priceData = window.hairwisePrices[listName];
        
        // Auto-update currency to match the selected price list
        if (priceData.currency) {
            setInvoiceCurrency(priceData.currency);
        }
        
        // Swap to select
        const priceMap = priceData.prices;
        const lengths = Object.keys(priceMap).sort((a,b) => parseInt(a) - parseInt(b));
        
        const select = document.createElement('select');
        select.id = 'inp-manual-length';
        select.className = 'w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none';
        select.onchange = onManualLengthChange;
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select Length';
        select.appendChild(defaultOpt);
        
        lengths.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = l;
            select.appendChild(opt);
        });
        
        container.innerHTML = '';
        container.appendChild(select);
    } else {
        if(manualBaseContainer) manualBaseContainer.style.display = 'none';
        // Swap to input
        container.innerHTML = `<input type="number" id="inp-manual-length" class="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. 18" oninput="onManualLengthChange()">`;
    }
}

function onManualLengthChange() {
    const listName = document.getElementById('inp-hairwise-pricelist').value;
    const lengthVal = document.getElementById('inp-manual-length') ? document.getElementById('inp-manual-length').value : '';
    const rateEl = document.getElementById('inp-manual-rate');
    const unitDivisor = parseFloat(document.getElementById('inp-manual-unit').value) || 1;
    
    if (listName === 'manual_pricing') {
        const basePrice = parseFloat(document.getElementById('inp-manual-base-price').value) || 0;
        let baseRate = basePrice / unitDivisor;
        
        // Apply margin
        const marginType = document.getElementById('inp-manual-margin-type') ? document.getElementById('inp-manual-margin-type').value : 'none';
        const marginValue = parseFloat(document.getElementById('inp-manual-margin-value') ? document.getElementById('inp-manual-margin-value').value : 0) || 0;
        
        if (marginType === 'percentage') {
            baseRate = baseRate + (baseRate * (marginValue / 100));
        } else if (marginType === 'amount') {
            baseRate = baseRate + marginValue;
        }
        
        rateEl.value = baseRate.toFixed(2);
    } else if (listName && lengthVal && window.hairwisePrices[listName]) {
        const priceData = window.hairwisePrices[listName];
        const listCurrency = priceData.currency || 'INR';
        const priceMap = priceData.prices;
        
        if (priceMap[lengthVal] !== undefined) {
            let baseRate = parseFloat(priceMap[lengthVal]);
            baseRate = baseRate / unitDivisor;
            
            // Auto convert if list currency differs from invoice currency
            if (window.proformaExchangeRates && listCurrency !== invoiceCurrency) {
                const listExRate = window.proformaExchangeRates[listCurrency] || 1;
                const invExRate = window.proformaExchangeRates[invoiceCurrency] || 1;
                
                // Convert list base to INR, then to invoice currency
                const inrVal = baseRate / listExRate;
                baseRate = inrVal * invExRate;
            }
            
            // Apply margin
            const marginType = document.getElementById('inp-manual-margin-type') ? document.getElementById('inp-manual-margin-type').value : 'none';
            const marginValue = parseFloat(document.getElementById('inp-manual-margin-value') ? document.getElementById('inp-manual-margin-value').value : 0) || 0;
            
            if (marginType === 'percentage') {
                baseRate = baseRate + (baseRate * (marginValue / 100));
            } else if (marginType === 'amount') {
                baseRate = baseRate + marginValue;
            }
            
            rateEl.value = baseRate.toFixed(2);
        }
    }
}

function addManualItem() {
    const length = document.getElementById('inp-manual-length').value;
    const product = document.getElementById('inp-manual-product').value;
    const type = document.getElementById('inp-manual-type').value;
    const style = document.getElementById('inp-manual-style').value;
    const color = document.getElementById('inp-manual-color').value;
    const remarks = document.getElementById('inp-manual-remarks').value;
    const qty = parseFloat(document.getElementById('inp-manual-qty').value) || 0;
    const rate = parseFloat(document.getElementById('inp-manual-rate').value) || 0;

    if (!length && !product) {
        alert("Please enter at least a Product Name or Length.");
        return;
    }

    currentOrderData.push({
        id: Math.random().toString(36).substr(2, 9),
        length: length || '',
        product: product || '',
        type: type || '',
        style: style || '',
        color: color || '',
        remarks: remarks || '',
        qty: qty,
        rate: rate
    });

    updateItemsTable();

    // Clear inputs (keep defaults like qty=1)
    document.getElementById('inp-manual-length').value = '';
    document.getElementById('inp-manual-product').value = '';
    document.getElementById('inp-manual-type').value = '';
    document.getElementById('inp-manual-style').value = '';
    document.getElementById('inp-manual-color').value = '';
    document.getElementById('inp-manual-remarks').value = '';
    document.getElementById('inp-manual-qty').value = '1';
    document.getElementById('inp-manual-rate').value = '';
    if (document.getElementById('inp-manual-base-price')) document.getElementById('inp-manual-base-price').value = '';
}

function removeManualItem(id) {
    currentOrderData = currentOrderData.filter(item => item.id !== id);
    updateItemsTable();
}

// ---------------------------------------------------------
// Column Resizer Initialization
// ---------------------------------------------------------
function initTableResizers() {
    const table = document.querySelector('table');
    if (!table) return;

    const cols = table.querySelectorAll('th');
    cols.forEach((col) => {
        // Check if handle already exists to avoid duplicate handles
        if (col.querySelector('.resize-handle')) return;

        // Create the drag handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        col.appendChild(handle);

        let startX = 0;
        let startWidth = 0;

        function onMouseDown(e) {
            e.preventDefault();
            e.stopPropagation();
            
            startX = e.clientX;
            // Get bounding rect for more accurate width than offsetWidth
            startWidth = col.getBoundingClientRect().width;
            
            handle.classList.add('resizing');
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) {
            const deltaX = e.clientX - startX;
            // Convert width back to percentage might be complex, but pixel width works fine.
            // When resizer is dragged, we set hard pixel widths to override percentages.
            const newWidth = Math.max(30, startWidth + deltaX);
            col.style.width = `${newWidth}px`;
        }

        function onMouseUp() {
            handle.classList.remove('resizing');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        handle.addEventListener('mousedown', onMouseDown);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTableResizers();
});
