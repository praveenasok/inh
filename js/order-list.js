document.addEventListener('DOMContentLoaded', () => {

    const DB_KEY = 'inhOrderListDB_v2';
    const CACHE_KEY = 'orderListCache';
    
    let table = null;

    let exchangeRates = {};
    async function fetchExchangeRates() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/INR');
            const data = await res.json();
            if(data && data.rates) {
                exchangeRates = data.rates;
            }
        } catch (e) {
            console.error("Failed to fetch exchange rates", e);
        }
    }
    fetchExchangeRates();

    let statusTimeout;
    function showStatus(text, colorClass = 'text-slate-500') {
        const statusText = document.getElementById('status-text');
        if (!statusText) return;
        statusText.textContent = text;
        statusText.className = colorClass;
        clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
            statusText.textContent = 'Ready.';
            statusText.className = 'text-slate-500';
        }, 3000);
    }

    const urgentFormatter = function(cell, formatterParams, onRendered) {
        let val = cell.getValue() || "";
        if(String(val).trim().toLowerCase() === "urgent") {
            cell.getElement().style.backgroundColor = "#fee2e2";
            cell.getElement().style.color = "#b91c1c";
            cell.getElement().style.fontWeight = "bold";
        }
        return val;
    };

    const createColDef = (title, type = "text") => {
        let editor = "input";
        if (type === "date") editor = "date";
        if (type === "number") editor = "number";
        
        return {
            title: title,
            field: title,
            editor: editor,
            headerFilter: "input",
            formatter: urgentFormatter,
            editorParams: type === "number" ? { step: "any" } : {}
        };
    };

    const columnsDef = [
        createColDef("Order Date", "date"),
        {
            title: "Order Status",
            field: "Order Status",
            editor: "list",
            headerFilter: "list",
            headerFilterParams: {
                values: ["CPend", "CPaid", "DonPend", "DonPaid", "AllClear", "Hold", "Replace"],
                clearable: true
            },
            formatter: urgentFormatter,
            editorParams: {
                values: ["CPend", "CPaid", "DonPend", "DonPaid", "AllClear", "Hold", "Replace"],
                clearable: true
            }
        },
        createColDef("Delivered Date", "date"),
        createColDef("Order Number"),
        createColDef("Client Name"),
        createColDef("Contact"),
        createColDef("Country"),
        createColDef("Price List"),
        createColDef("Length"),
        createColDef("Product"),
        createColDef("Product Type"),
        createColDef("Style"),
        createColDef("Color"),
        createColDef("Comment"),
        createColDef("Quantity", "number"),
        {
            title: "Currency",
            field: "Currency",
            editor: "list",
            headerFilter: "list",
            headerFilterParams: {
                values: ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "ZAR", "AED", "SGD"],
                clearable: true
            },
            formatter: urgentFormatter,
            editorParams: {
                values: ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "ZAR", "AED", "SGD"],
                clearable: true
            }
        },
        createColDef("Rate", "number"),
        createColDef("Amount", "number"),
        createColDef("Exchange Rate", "number"),
        createColDef("Base Amount", "number"),
        createColDef("Assigned To"),
        createColDef("Sales Person")
    ];

    async function loadDB() {
        showStatus('Checking cache...', 'text-blue-500');
        
        try {
            const cachedData = await localforage.getItem(CACHE_KEY);
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                showStatus('Loaded from local cache.', 'text-green-600');
                initTable(cachedData);
            } else {
                fetchFromFirestore();
            }
        } catch (e) {
            console.error("LocalForage error:", e);
            fetchFromFirestore();
        }
    }

    async function fetchFromFirestore() {
        showStatus('Loading from database...', 'text-blue-500');
        try {
            if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
                setTimeout(fetchFromFirestore, 500);
                return;
            }
            
            const snapshot = await firebase.firestore().collection('orderlist').orderBy('_originalRowIndex').get();
            const loadedRows = [];
            console.log('Fetched ' + snapshot.docs.length + ' docs from firestore');

            snapshot.forEach(doc => {
                const data = doc.data();
                loadedRows.push({
                    id: doc.id,
                    'Order Date': data.orderDate || '',
                    'Order Status': data.orderStatus || '',
                    'Delivered Date': data.deliveredDate || '',
                    'Order Number': data.orderNumber || '',
                    'Client Name': data.customerName || '',
                    'Contact': data.contactDetails || '',
                    'Country': data.country || '',
                    'Price List': data.priceList || '',
                    'Length': data.length || '',
                    'Product': data.productName || '',
                    'Product Type': data.productType || '',
                    'Style': data.style || '',
                    'Color': data.color || '',
                    'Comment': data.comment || '',
                    'Quantity': data.quantity || '',
                    'Currency': data.currency || '',
                    'Rate': data.rate || '',
                    'Amount': data.amount || '',
                    'Exchange Rate': data.currencyRate || '',
                    'Base Amount': data.amountInInr || '',
                    'Assigned To': data.productionAssignedTo || '',
                    'Sales Person': data.salesPerson || ''
                });
            });

            if (loadedRows.length === 0) {
                for (let i = 0; i < 50; i++) {
                    loadedRows.push({ id: firebase.firestore().collection('orderlist').doc().id });
                }
            }
            
            await localforage.setItem(CACHE_KEY, loadedRows);
            initTable(loadedRows);
            showStatus('Ready.', 'text-slate-500');
        } catch (e) {
            console.error("Could not load from DB", e);
            showStatus('Error loading database.', 'text-red-500');
        }
    }

    function initTable(data) {
        if (table) {
            table.replaceData(data);
            return;
        }
        
        table = new Tabulator("#order-grid", {
            data: data,
            layout: "fitData",
            height: "calc(100vh - 160px)",
            columns: columnsDef,
            clipboard: true, // Enables copy-pasting
            history: true,   // Enables undo/redo
            cellEdited: function(cell) {
                const row = cell.getRow();
                const rowData = row.getData();
                const colName = cell.getColumn().getField();
                
                // Handle Currency Change for Auto Exchange Rate
                if (colName === 'Currency') {
                    const curr = rowData['Currency'];
                    if (curr === 'INR' || !curr) {
                        rowData['Exchange Rate'] = 1;
                    } else if (exchangeRates[curr]) {
                        rowData['Exchange Rate'] = (1 / exchangeRates[curr]).toFixed(4);
                    }
                }

                // Auto calculate amount
                if (['Rate', 'Quantity'].includes(colName)) {
                    const qty = parseFloat(rowData['Quantity']) || 0;
                    const rate = parseFloat(rowData['Rate']) || 0;
                    if (qty && rate) {
                        rowData['Amount'] = (qty * rate).toFixed(2);
                    }
                }

                // Auto calculate base amount (Rate * Qty * Exchange Rate)
                if (['Amount', 'Exchange Rate', 'Rate', 'Quantity', 'Currency'].includes(colName)) {
                    const qty = parseFloat(rowData['Quantity']) || 0;
                    const rate = parseFloat(rowData['Rate']) || 0;
                    const ex = parseFloat(rowData['Exchange Rate']) || 1;
                    
                    if (qty && rate) {
                        rowData['Base Amount'] = (rate * qty * ex).toFixed(2);
                    } else {
                        const amt = parseFloat(rowData['Amount']) || 0;
                        if (amt) {
                            rowData['Base Amount'] = (amt * ex).toFixed(2);
                        }
                    }
                }
                
                row.update(rowData);
                updateRowInFirebase(rowData);
                
                // Update cache asynchronously
                localforage.setItem(CACHE_KEY, table.getData());
            }
        });
    }

    const rowSaveTimeouts = {};
    function updateRowInFirebase(row) {
        if (typeof firebase === 'undefined' || !row.id) return;

        clearTimeout(rowSaveTimeouts[row.id]);
        rowSaveTimeouts[row.id] = setTimeout(async () => {
            showStatus('Saving...', 'text-blue-500');
            try {
                const dataToSave = {
                    orderDate: row['Order Date'] || '',
                    orderStatus: row['Order Status'] || '',
                    deliveredDate: row['Delivered Date'] || '',
                    orderNumber: row['Order Number'] || '',
                    customerName: row['Client Name'] || '',
                    contactDetails: row['Contact'] || '',
                    country: row['Country'] || '',
                    priceList: row['Price List'] || '',
                    length: row['Length'] || '',
                    productName: row['Product'] || '',
                    productType: row['Product Type'] || '',
                    style: row['Style'] || '',
                    color: row['Color'] || '',
                    comment: row['Comment'] || '',
                    quantity: row['Quantity'] || '',
                    currency: row['Currency'] || '',
                    rate: row['Rate'] || '',
                    amount: row['Amount'] || '',
                    currencyRate: row['Exchange Rate'] || '',
                    amountInInr: row['Base Amount'] || '',
                    productionAssignedTo: row['Assigned To'] || '',
                    salesPerson: row['Sales Person'] || ''
                };
                await firebase.firestore().collection('orderlist').doc(row.id).set(dataToSave, { merge: true });
                showStatus('Saved.', 'text-green-600');
            } catch (e) {
                console.error("Error saving to Firebase", e);
                showStatus('Error saving.', 'text-red-500');
            }
        }, 1000); // 1s debounce
    }

    document.getElementById('resyncBtn').addEventListener('click', async () => {
        const btn = document.getElementById('resyncBtn');
        btn.disabled = true;
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        showStatus('Syncing with Google Sheets...', 'text-blue-500');
        
        try {
            const response = await fetch('/api/sync/orderlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Synced ${result.count} records successfully.`, 'text-green-600');
                // Clear local cache and re-fetch from Firebase
                await localforage.removeItem(CACHE_KEY);
                fetchFromFirestore();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Sync failed:', error);
            showStatus('Sync failed: ' + error.message, 'text-red-500');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    });

    document.getElementById('addColBtn').addEventListener('click', () => {
        const newCol = prompt("Enter new column name:");
        if (newCol && newCol.trim()) {
            table.addColumn(createColDef(newCol.trim()));
            showStatus('Column added locally.', 'text-green-600');
        }
    });

    document.getElementById('addRowBtn').addEventListener('click', () => {
        if (table) {
            for (let i = 0; i < 10; i++) {
                const newId = typeof firebase !== 'undefined' ? firebase.firestore().collection('orderlist').doc().id : 'temp_' + Date.now() + '_' + i;
                table.addRow({ id: newId }, false);
            }
            localforage.setItem(CACHE_KEY, table.getData());
            showStatus('Added 10 empty rows.', 'text-green-600');
        }
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        if (table) {
            table.download("csv", "INHsuite_Orders.csv");
        }
    });

    // Start
    loadDB();
});
