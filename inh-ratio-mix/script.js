document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const RAW_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    const FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

    // Initial Starter Data
    const DEFAULT_PRICES = {
        4: 5000, 6: 6750, 8: 7650, 10: 9450, 12: 13500, 14: 15300,
        16: 18000, 18: 29250, 20: 40500, 22: 50400, 24: 54000,
        26: 65250, 28: 69750, 30: 76500, 32: 80000, 34: 90000
    };

    // State Variables
    let appState = {
        currentSupplierId: null, // "default" or uuid
        currentClientName: "",
        matrix: {},
        prices: { ...DEFAULT_PRICES },
        // New Pricing Factors
        marginPercent: 0,
        wastagePercent: 0,
        machineCharge: 2500, // Default charge
        weftingWastagePercent: 0, // New
        weftingCharge: 0,        // New
        currency: 'INR',
        exchangeRate: 1,
        customPricesEnabled: false,
        customPrices: {}
    };

    // Database (Local Storage)
    let db = {
        suppliers: [], // Array of { id, name, prices }
        clients: [],    // Array of { name, matrix, raw_supplier_id }
        priceLists: []  // Array of price list objects
    };

    // --- DOM Elements ---
    // Tabs
    const tabButtons = document.querySelectorAll('button.nav-tab');
    const views = document.querySelectorAll('.view-section');

    // Mixer Inputs
    const supplierSelect = document.getElementById('supplierSelect');
    const clientNameInput = document.getElementById('clientName');
    const clientSelect = document.getElementById('clientSelect');
    const saveClientBtn = document.getElementById('saveClientBtn');
    const deleteClientBtn = document.getElementById('deleteClientBtn');

    // Price List Management Inputs (New)
    const priceListSelect = document.getElementById('priceListSelect');
    const priceListNameInput = document.getElementById('priceListName');
    const savePriceListBtn = document.getElementById('savePriceListBtn');
    const deletePriceListBtn = document.getElementById('deletePriceListBtn');
    const customizePricesCheckbox = document.getElementById('customizePricesCheckbox');
    const customPriceRow = document.getElementById('custom-price-row');

    const resetMixerBtn = document.getElementById('resetMixerBtn');

    const wastageInput = document.getElementById('wastageInput');
    const marginInput = document.getElementById('marginInput');
    const machineRemyInput = document.getElementById('machineRemyInput');
    const weftingWastageInput = document.getElementById('weftingWastageInput');
    const weftingChargeInput = document.getElementById('weftingChargeInput');
    const currencySelect = document.getElementById('currencySelect');
    const exchangeRateInput = document.getElementById('exchangeRateInput');
    const currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
    const downloadBtn = document.getElementById('downloadBtn');
    const multiExportBtn = document.getElementById('multiExportBtn');
    const multiExportModal = document.getElementById('multiExportModal');
    const closeMultiExportBtn = document.getElementById('closeMultiExportBtn');
    const generateMultiExportBtn = document.getElementById('generateMultiExportBtn');
    const multiExportList = document.getElementById('multiExportList');

    // Matrix Table
    const ratioTable = document.getElementById('ratioTable');
    const tableBody = document.getElementById('tableBody');
    const tableFooter = document.getElementById('tableFooter');

    // Supplier Editor
    const supplierListEl = document.getElementById('supplierList');
    const newSupplierBtn = document.getElementById('newSupplierBtn');
    const editSupplierName = document.getElementById('editSupplierName');
    const saveSupplierBtn = document.getElementById('saveSupplierBtn');
    const deleteSupplierBtn = document.getElementById('deleteSupplierBtn');
    const supplierPriceBody = document.getElementById('supplierPriceBody');

    // Editor State
    let editingSupplierId = null;

    // --- Initialization ---
    initTable();
    initSupplierGrid();

    // Fix: Wait for DB to load before checking for default supplier
    loadDB().then(() => {
        // If no suppliers, create default one
        if (db.suppliers.length === 0) {
            createSupplier('SONALI 2/2', DEFAULT_PRICES); // Ensure we have one
        }

        refreshSupplierDropdowns();
        refreshRatioDropdown();
        refreshPriceListDropdown();

        // Load initial state (last active or default)
        loadAppState();
    });

    // --- Event Listeners ---

    // Paste handler for Supplier Price Grid (allows copying a column from Google Sheets and pasting into the inputs)
    supplierPriceBody.addEventListener('paste', (e) => {
        const target = e.target;
        if (!target.classList.contains('supplier-price-edit')) return;

        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        if (!pasteData) return;

        // Split by newlines, carriage returns, or tabs
        const values = pasteData.split(/[\r\n\t]+/).map(v => v.trim()).filter(v => v !== '');
        
        // If it's a single value, let default paste happen
        if (values.length <= 1) return;

        e.preventDefault();

        const inputs = Array.from(supplierPriceBody.querySelectorAll('.supplier-price-edit'));
        const startIndex = inputs.indexOf(target);

        if (startIndex === -1) return;

        // Populate inputs starting from focused one
        for (let i = 0; i < values.length && i + startIndex < inputs.length; i++) {
            const cleanStr = values[i].replace(/[^\d.]/g, ''); // Extract numerical parts
            if (cleanStr !== '') {
                const numVal = parseFloat(cleanStr);
                if (!isNaN(numVal)) {
                    const input = inputs[i + startIndex];
                    input.value = numVal;
                    // Dispatch input event to trigger any reactive behavior if needed (optional here since we only grab values on save)
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });

    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Mixer Actions
    supplierSelect.addEventListener('change', (e) => loadSupplierPricesIntoMixer(e.target.value));

    resetMixerBtn.addEventListener('click', () => {
        if (confirm("Clear current matrix?")) {
            appState.matrix = {};
            refreshTableInputs();
            calculateAll();
            saveAppState();
        }
    });

    saveClientBtn.addEventListener('click', saveRatioConfig);
    deleteClientBtn.addEventListener('click', deleteRatioConfig);

    clientSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadRatioConfig(e.target.value);
        } else {
            deleteClientBtn.classList.add('hidden');
            clientNameInput.value = '';
        }
    });

    // Price List Management Events
    savePriceListBtn.addEventListener('click', savePriceListConfig);
    deletePriceListBtn.addEventListener('click', deletePriceListConfig);

    priceListSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPriceListConfig(e.target.value);
        } else {
            deletePriceListBtn.classList.add('hidden');
            priceListNameInput.value = '';
        }
    });

    // Custom Prices Checkbox
    customizePricesCheckbox.addEventListener('change', (e) => {
        appState.customPricesEnabled = e.target.checked;
        if(appState.customPricesEnabled) {
            customPriceRow.classList.remove('hidden');
        } else {
            customPriceRow.classList.add('hidden');
        }
        calculateAll();
        saveAppState();
    });

    // Pricing Factors Events
    wastageInput.addEventListener('input', (e) => {
        appState.wastagePercent = parseFloat(e.target.value) || 0;
        calculateAll();
        saveAppState();
    });

    marginInput.addEventListener('input', (e) => {
        appState.marginPercent = parseFloat(e.target.value) || 0;
        calculateAll();
        saveAppState();
    });

    machineRemyInput.addEventListener('input', (e) => {
        appState.machineCharge = parseFloat(e.target.value) || 0;
        calculateAll();
        saveAppState();
    });

    weftingWastageInput.addEventListener('input', (e) => {
        const val = e.target.value;
        appState.weftingWastagePercent = val === '' ? 0 : parseFloat(val);
        toggleWeftingRows(appState.weftingWastagePercent > 0);
        calculateAll();
        saveAppState();
    });

    weftingChargeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        appState.weftingCharge = val === '' ? 0 : parseFloat(val);
        calculateAll();
        saveAppState();
    });

    currencySelect.addEventListener('change', async (e) => {
        const newCurrency = e.target.value;
        appState.currency = newCurrency;
        currencyCodeDisplay.textContent = newCurrency;

        // Fetch rate
        if (newCurrency === 'INR') {
            appState.exchangeRate = 1;
            exchangeRateInput.value = 1;
        } else {
            await fetchExchangeRate(newCurrency);
        }

        calculateAll();
        saveAppState();
    });

    exchangeRateInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        appState.exchangeRate = val > 0 ? val : 1;
        calculateAll();
        saveAppState();
    });

    // Download
    downloadBtn.addEventListener('click', downloadPriceList);

    // Multi-Export
    multiExportBtn.addEventListener('click', openMultiExportModal);
    closeMultiExportBtn.addEventListener('click', () => multiExportModal.classList.add('hidden'));
    generateMultiExportBtn.addEventListener('click', generateMultiExport);

    // Supplier Management Actions
    newSupplierBtn.addEventListener('click', startNewSupplier);
    saveSupplierBtn.addEventListener('click', saveSupplier);
    deleteSupplierBtn.addEventListener('click', deleteSupplier);


    // --- Core Logic ---

    function switchTab(tabName) {
        try {
            // Update Buttons
            tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
            // Update Include Views
            views.forEach(v => v.classList.toggle('active', v.id === `${tabName}-view`));

            if (tabName === 'suppliers') {
                renderSupplierList();
                if (!editingSupplierId) startNewSupplier();
            } else if (tabName === 'ratios') {
                renderSavedRatios();
            } else if (tabName === 'pricelists') {
                renderSavedPriceLists();
            } else {
                // Returning to mixer, ensure dropdown reflects current reality
                refreshSupplierDropdowns();
                if (appState.currentSupplierId) {
                    supplierSelect.value = appState.currentSupplierId;
                }
            }
        } catch (e) {
            console.error("Switch Tab Error", e);
            alert("Tab error: " + e.message);
        }
    }

    // --- Saved Ratios Tab ---
    function renderSavedRatios() {
        const tbody = document.getElementById('savedRatiosTableBody');
        const countSpan = document.getElementById('savedRatioCount');
        if (!tbody || !countSpan) return;

        tbody.innerHTML = '';
        const clients = db.clients || [];
        countSpan.textContent = clients.length + (clients.length === 1 ? ' Preset' : ' Presets');

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-slate-500">No saved presets found.</td></tr>';
            return;
        }

        clients.forEach(client => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition-colors";
            tr.innerHTML = `
                <td class="p-4">
                    <div class="font-bold text-slate-800">${client.name}</div>
                    <div class="text-xs text-slate-500 mt-1">Currency: ${client.currency || 'INR'}, Margin: ${client.marginPercent || 0}%</div>
                </td>
                <td class="p-4 text-sm text-slate-600">${new Date().toLocaleDateString('en-IN')}</td>
                <td class="p-4 text-right space-x-2">
                    <button class="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 font-medium rounded text-sm transition" onclick="shareRatioFromTab('${client.name}')"><i class="fa-solid fa-image"></i> Share</button>
                    <button class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium rounded text-sm transition" onclick="loadRatioFromTab('${client.name}')">Load & Edit</button>
                    <button class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded text-sm transition" onclick="deleteRatioFromTab('${client.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Since these functions are called from inline onclick handlers in the new tab, define them on window
    window.loadRatioFromTab = function (clientName) {
        if (!clientName) return;
        switchTab('mixer');
        loadRatioConfig(clientName);
    };

    window.deleteRatioFromTab = function (clientName) {
        if (!clientName) return;
        if (confirm(`Are you sure you want to delete "${clientName}"?`)) {
            db.clients = db.clients.filter(c => c.name !== clientName);
            saveDB();
            refreshRatioDropdown();
            renderSavedRatios();
        }
    };

    window.shareRatioFromTab = function (clientName) {
        if (!clientName) return;

        // Remove any existing expanded preview rows
        document.querySelectorAll('.ratio-preview-row').forEach(row => row.remove());

        // Get the ratio config
        const client = (db.clients || []).find(c => c.name === clientName);
        if (!client || !client.matrix) return;

        // Find which Finished Length columns actually have any percentages
        let activeCols = [];
        FINISHED_LENGTHS.forEach((len, idx) => {
            if (client.matrix[idx]) {
                const hasValue = Object.values(client.matrix[idx]).some(val => val > 0);
                if (hasValue) activeCols.push({ len, idx });
            }
        });

        if (activeCols.length === 0) {
            alert("This ratio matrix is empty and cannot be shared.");
            return;
        }

        // Find which Raw Length rows contain percentages in those active columns
        let activeRows = new Set();
        activeCols.forEach(col => {
            Object.keys(client.matrix[col.idx]).forEach(rowIdx => {
                if (client.matrix[col.idx][rowIdx] > 0) {
                    activeRows.add(parseInt(rowIdx));
                }
            });
        });
        let sortedRows = Array.from(activeRows).sort((a,b)=>a-b);

        let displayHTML = `
            <div id="export-preview-ratio-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" style="background: white; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px auto; max-width: 600px; color: #334155; box-shadow: inset 0 0 0 1px #f1f5f9;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">${clientName}</h2>
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                        <span><i class="fa-solid fa-layer-group" style="margin-right: 4px;"></i> Ratio Matrix Snapshot</span>
                    </div>
                </div>
                
                <div style="overflow-x: auto; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; color: #334155;">
                        <thead>
                            <tr>
                                <th style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; color: #475569; border-radius: 8px 0 0 0;">Len \\ Wght</th>
                                ${activeCols.map(c => `<th style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${c.len}"</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedRows.map(rIdx => `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #475569;">${rIdx}"</td>
                                    ${activeCols.map(c => {
                                        const val = client.matrix[c.idx] && client.matrix[c.idx][rIdx] ? client.matrix[c.idx][rIdx] : '';
                                        return `<td style="padding: 10px; border: 1px solid #e2e8f0; font-variant-numeric: tabular-nums;">${val ? val + '%' : '-'}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-top: 30px;">Generated by Ratio Mixer</div>
            </div>
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 10px;">
                <button id="downloadRatioPreviewBtn" class="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition shadow-md flex items-center justify-center mx-auto gap-2">
                    <i class="fa-solid fa-download"></i> Download Image
                </button>
            </div>
        `;

        // Find the tr of this item
        const tbody = document.getElementById('savedRatiosTableBody');
        const trs = Array.from(tbody.querySelectorAll('tr'));
        const targetTr = trs.find(tr => tr.innerHTML.includes(`'${clientName}'`));
        
        if (targetTr) {
            const previewRow = document.createElement('tr');
            previewRow.className = 'ratio-preview-row';
            previewRow.innerHTML = `<td colspan="3" style="padding: 0; background: #f8fafc; border-top: none; box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.05);">${displayHTML}</td>`;
            targetTr.after(previewRow);
            
            document.getElementById('downloadRatioPreviewBtn').addEventListener('click', () => {
                const node = document.getElementById(`export-preview-ratio-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}`);
                html2canvas(node, {
                    backgroundColor: '#ffffff',
                    scale: 3 // High resolution export
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `${clientName.replace(/\s+/g, '_')}_Matrix.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                });
            });
        }
    };

    // --- Saved Price Lists Tab ---

    function renderSavedPriceLists() {
        const tbody = document.getElementById('savedPriceListsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const plLists = db.priceLists || [];

        if (plLists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-slate-500">No saved price lists found.</td></tr>';
            return;
        }

        plLists.forEach(pl => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition-colors";
            tr.innerHTML = `
                <td class="p-4">
                    <div class="font-bold text-slate-800">${pl.name}</div>
                    <div class="text-xs text-slate-500 mt-1">Saved: ${new Date(pl.savedAt || Date.now()).toLocaleDateString('en-IN')}</div>
                </td>
                <td class="p-4 text-sm text-slate-600">
                    Currency: ${pl.currency || 'INR'} <br>
                    Margin: ${pl.marginPercent || 0}% 
                </td>
                <td class="p-4 text-right space-x-2">
                    <button class="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 font-medium rounded text-sm transition" onclick="sharePriceListFromTab('${pl.name}')"><i class="fa-solid fa-image"></i> Share</button>
                    <button class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium rounded text-sm transition" onclick="loadPriceListFromTab('${pl.name}')">Edit</button>
                    <button class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded text-sm transition" onclick="deletePriceListFromTab('${pl.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.loadPriceListFromTab = function (plName) {
        if (!plName) return;
        switchTab('mixer');
        loadPriceListConfig(plName);
    };

    window.sharePriceListFromTab = async function (plName) {
        if (!plName) return;
        
        // Remove any existing expanded preview rows
        document.querySelectorAll('.preview-row').forEach(row => row.remove());

        // Get the price list config
        const pl = (db.priceLists || []).find(p => p.name === plName);
        if (!pl) return;

        // Load config silently to appState so calculateColumn uses it correctly
        await loadPriceListConfig(plName);

        let displayHTML = `
            <div id="export-preview-${plName.replace(/[^a-zA-Z0-9]/g,'_')}" style="background: white; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px auto; max-width: 500px; color: #334155; box-shadow: inset 0 0 0 1px #f1f5f9;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">${plName}</h2>
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                        <span style="display:inline-block; margin-right: 12px;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Created: ${new Date(pl.savedAt || Date.now()).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                        <span style="display:inline-block;"><i class="fa-solid fa-share-nodes" style="margin-right: 4px;"></i> Shared: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: left; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; border-radius: 8px 0 0 0;">Finished Length</th>
                            <th style="padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; text-align: right; border-radius: 0 8px 0 0;">Price / kg (${appState.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        FINISHED_LENGTHS.forEach((len, idx) => {
            let displayPrice = 0;
            if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                displayPrice = appState.customPrices[idx];
            } else {
                displayPrice = calculateColumn(idx);
            }
            if (displayPrice > 0) {
                displayHTML += `
                    <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #334155;">${len}"</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-variant-numeric: tabular-nums;">${parseFloat(displayPrice).toFixed(2)}</td>
                    </tr>
                `;
            }
        });
        
        displayHTML += `
                    </tbody>
                </table>
        `;
        
        // --- Inject Ratio Snapshot ---
        // Find which Finished Length columns actually have any percentages
        let activeCols = [];
        FINISHED_LENGTHS.forEach((len, idx) => {
            if (appState.matrix[idx]) {
                const hasValue = Object.values(appState.matrix[idx]).some(val => val > 0);
                if (hasValue) activeCols.push({ len, idx });
            }
        });

        if (activeCols.length > 0) {
            // Find which Raw Length rows contain percentages in those active columns
            let activeRows = new Set();
            activeCols.forEach(col => {
                Object.keys(appState.matrix[col.idx]).forEach(rowIdx => {
                    if (appState.matrix[col.idx][rowIdx] > 0) {
                        activeRows.add(parseInt(rowIdx));
                    }
                });
            });
            let sortedRows = Array.from(activeRows).sort((a,b)=>a-b);

            displayHTML += `
                <div style="margin-bottom: 25px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
                    <h3 style="font-size: 14px; color: #475569; margin: 0 0 10px 0; text-align: center;">Base Ratio Material Snapshot</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; color: #334155;">
                            <thead>
                                <tr>
                                    <th style="padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Len \\ Wght</th>
                                    ${activeCols.map(c => `<th style="padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">${c.len}"</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedRows.map(rIdx => `
                                    <tr>
                                        <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #64748b;">${rIdx}"</td>
                                        ${activeCols.map(c => {
                                            const val = appState.matrix[c.idx] && appState.matrix[c.idx][rIdx] ? appState.matrix[c.idx][rIdx] : '';
                                            return `<td style="padding: 6px; border: 1px solid #e2e8f0;">${val ? val + '%' : '-'}</td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        displayHTML += `
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Generated by Ratio Mixer</div>
            </div>
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 10px;">
                <button id="downloadPreviewBtn" class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition shadow-md flex items-center justify-center mx-auto gap-2">
                    <i class="fa-solid fa-download"></i> Download Image
                </button>
            </div>
        `;

        // Find the tr of this item
        const tbody = document.getElementById('savedPriceListsTableBody');
        const trs = Array.from(tbody.querySelectorAll('tr'));
        const targetTr = trs.find(tr => tr.innerHTML.includes(plName));
        
        if (targetTr) {
            const previewRow = document.createElement('tr');
            previewRow.className = 'preview-row';
            // Smooth expand animation class could go here if tailwind allows it easily on tr
            previewRow.innerHTML = `<td colspan="3" style="padding: 0; background: #f8fafc; border-top: none; box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.05);">${displayHTML}</td>`;
            targetTr.after(previewRow);
            
            document.getElementById('downloadPreviewBtn').addEventListener('click', () => {
                const node = document.getElementById(`export-preview-${plName.replace(/[^a-zA-Z0-9]/g,'_')}`);
                html2canvas(node, {
                    backgroundColor: '#ffffff',
                    scale: 3 // High resolution export
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `${plName.replace(/\s+/g, '_')}_PriceList.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                });
            });
        }
    };

    window.deletePriceListFromTab = function (plName) {
        if (!plName) return;
        if (confirm(`Are you sure you want to delete "${plName}"?`)) {
            db.priceLists = db.priceLists.filter(p => p.name !== plName);
            saveDB();
            refreshPriceListDropdown();
            renderSavedPriceLists();
        }
    };

    // --- Mixer Section ---

    function initTable() {
        const tableHeadRow = ratioTable.querySelector('thead tr');
        // Clear existing dynamic headers if any (for safety on reload)
        // Keep first two headers

        // Ensure Headers are set
        // (Assuming HTML structure is static for first 2 cols, dynamic for rest)
        // Check if headers already appended
        if (tableHeadRow.children.length === 2) {
            FINISHED_LENGTHS.forEach(len => {
                const th = document.createElement('th');
                th.textContent = len;
                tableHeadRow.appendChild(th);
            });
        }

        // Setup Footer Rows
        // We expect: Total %, Wastage, Machine, Wefting Wastage, Wefting Charge, Margin, Price
        // Use classes to find rows
        const rowTypes = ['total-row', 'wastage-row', 'machine-row', 'wefting-wastage-row', 'wefting-charge-row', 'margin-row', 'price-row', 'rounded-price-row', 'converted-price-row'];
        const rowPrefixes = ['total', 'wastage', 'machine', 'wefting-wastage', 'wefting-charge', 'margin', 'price', 'rounded-price', 'converted-price'];

        rowTypes.forEach((cls, rIdx) => {
            const tr = tableFooter.querySelector(`.${cls}`);
            if (tr && tr.children.length === 1) { // Only sticky col exists
                FINISHED_LENGTHS.forEach((len, cIdx) => {
                    const td = document.createElement('td');
                    td.id = `${rowPrefixes[rIdx]} - ${cIdx}`;
                    td.textContent = rIdx === 0 ? '0%' : '0';
                    tr.appendChild(td);
                });
            }
        });

        // Initialize Custom Price Row Inputs
        if (customPriceRow && customPriceRow.children.length === 1) {
            FINISHED_LENGTHS.forEach((len, cIdx) => {
                const td = document.createElement('td');
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'cell-input';
                inp.placeholder = '-';
                inp.dataset.customColIdx = cIdx;
                inp.addEventListener('input', (e) => {
                    const val = e.target.value;
                    appState.customPrices[cIdx] = val === '' ? '' : parseFloat(val);
                    saveAppState();
                });
                td.appendChild(inp);
                customPriceRow.appendChild(td);
            });
        }

        // 3. Body
        // Clear body first to be safe
        tableBody.innerHTML = '';
        RAW_LENGTHS.forEach(rawLen => {
            const tr = document.createElement('tr');

            const tdPrice = document.createElement('td');
            tdPrice.className = 'sticky-col-1';
            const priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.className = 'price-input';
            priceInput.dataset.rawLen = rawLen;
            priceInput.disabled = true;
            tdPrice.appendChild(priceInput);
            tr.appendChild(tdPrice);

            const tdLen = document.createElement('td');
            tdLen.className = 'sticky-col-2';
            tdLen.textContent = rawLen;
            tr.appendChild(tdLen);

            FINISHED_LENGTHS.forEach((finLen, colIndex) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'cell-input';
                input.placeholder = '-';
                input.dataset.rowRaw = rawLen;
                input.dataset.colIdx = colIndex;
                input.addEventListener('input', handleMatrixChange);
                input.addEventListener('keydown', handleNavigation);
                td.appendChild(input);
                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    }

    function handleMatrixChange(e) {
        const row = e.target.dataset.rowRaw;
        const col = e.target.dataset.colIdx;
        const val = e.target.value;

        if (!appState.matrix[col]) appState.matrix[col] = {};

        if (val === '') {
            delete appState.matrix[col][row];
        } else {
            appState.matrix[col][row] = parseFloat(val);
        }

        calculateColumn(col);
        saveAppState();
    }

    function calculateAll() {
        FINISHED_LENGTHS.forEach((_, idx) => calculateColumn(idx));
    }

    function calculateColumn(colIdx) {
        const colData = appState.matrix[colIdx] || {};
        let totalPercent = 0;
        let weightedRawCost = 0;

        RAW_LENGTHS.forEach(rawLen => {
            const percent = colData[rawLen] || 0;
            const price = appState.prices[rawLen] || 0;

            totalPercent += percent;
            weightedRawCost += (percent / 100) * price;
        });

        // Validation - Strict 100% Check
        const isValid = Math.abs(totalPercent - 100) < 0.1 && totalPercent !== 0;

        let wastageCost = 0;
        let machineCharge = 0;
        let weftingWastageCost = 0;
        let weftingCharge = 0;
        let marginValue = 0;
        let finalPrice = 0;

        if (isValid) {
            // 1. Base Cost (Weighted Raw) + BulkToMR Wastage
            wastageCost = weightedRawCost * (appState.wastagePercent / 100);
            let currentCost = weightedRawCost + wastageCost;

            // 2. Add MR + Washing Charge
            machineCharge = appState.machineCharge || 0;
            currentCost += machineCharge;

            // 3. Add Wefting Logic (Conditional)
            if (appState.weftingWastagePercent > 0) {
                // Wefting Wastage is on TOP of current cost
                weftingWastageCost = currentCost * (appState.weftingWastagePercent / 100);
                currentCost += weftingWastageCost;

                // Wefting Charge
                weftingCharge = appState.weftingCharge || 0;
                currentCost += weftingCharge;
            }

            // 4. Margin
            marginValue = currentCost * (appState.marginPercent / 100);
            finalPrice = currentCost + marginValue;
        }

        const roundedPrice = Math.round(finalPrice / 50) * 50;

        // Converted Price
        const rate = appState.exchangeRate || 1;
        const convertedPrice = Math.round(roundedPrice * rate);

        // UI Updates
        const ids = ['total', 'wastage', 'machine', 'wefting-wastage', 'wefting-charge', 'margin', 'price', 'rounded-price', 'converted-price'];
        const values = [
            Math.round(totalPercent) + '%',
            Math.round(wastageCost),
            Math.round(machineCharge),
            Math.round(weftingWastageCost),
            Math.round(weftingCharge),
            Math.round(marginValue),
            Math.round(finalPrice),
            roundedPrice,
            convertedPrice
        ];

        ids.forEach((id, i) => {
            const el = document.getElementById(`${id} - ${colIdx}`);
            if (el) {
                el.textContent = values[i];
                if (id === 'total') {
                    if (isValid) el.className = 'total-valid';
                    else if (totalPercent !== 0) el.className = 'total-invalid';
                    else el.className = '';
                }
            }
        });

        // Update custom price row placeholder
        const customPriceInp = document.querySelector(`.cell-input[data-custom-col-idx="${colIdx}"]`);
        if (customPriceInp) {
            customPriceInp.placeholder = isValid && finalPrice > 0 ? convertedPrice : '-';
        }

        // Return appropriate price for export
        if(appState.customPricesEnabled && appState.customPrices[colIdx] > 0) {
            return appState.customPrices[colIdx];
        }

        return convertedPrice;
    }

    function loadSupplierPricesIntoMixer(supplierId) {
        appState.currentSupplierId = supplierId;
        const supplier = db.suppliers.find(s => s.id === supplierId);

        if (supplier) {
            appState.prices = { ...supplier.prices };
            // Update UI
            document.querySelectorAll('.price-input').forEach(inp => {
                const len = inp.dataset.rawLen;
                inp.value = appState.prices[len] || 0;
            });
            calculateAll(); // Recalc with new prices
            saveAppState();
        }
    }

    function refreshTableInputs() {
        // Clear all
        document.querySelectorAll('.cell-input').forEach(i => i.value = '');

        // Fill from matrix
        Object.keys(appState.matrix).forEach(colIdx => {
            const colData = appState.matrix[colIdx];
            Object.keys(colData).forEach(rawLen => {
                const val = colData[rawLen];
                const inp = document.querySelector(`.cell-input[data-row-raw="${rawLen}"][data-col-idx="${colIdx}"]`);
                if (inp) inp.value = val;
            });
        });

        // Fill custom prices
        document.querySelectorAll(`.cell-input[data-custom-col-idx]`).forEach(inp => inp.value = '');
        if (appState.customPrices) {
            Object.keys(appState.customPrices).forEach(colIdx => {
                const inp = document.querySelector(`.cell-input[data-custom-col-idx="${colIdx}"]`);
                if(inp && appState.customPrices[colIdx] !== undefined && appState.customPrices[colIdx] !== '' && appState.customPrices[colIdx] !== 0) {
                    inp.value = appState.customPrices[colIdx];
                }
            });
        }
    }

    // --- Export Logic ---

    function downloadPriceList() {
        if (!appState.currentClientName) {
            alert('Please enter a Price List Name before downloading.');
            document.getElementById('clientName').focus();
            return;
        }

        // Create hidden structure
        const container = document.createElement('div');
        container.id = 'export-container';

        container.innerHTML = `
        < h2 > ${appState.currentClientName}</h2 >
            <div style="flex: 1; width: 100%; display: flex; justify-content: center; align-items: flex-start;">
                <table class="export-table">
                    <thead>
                        <tr>
                            <th>Finished Length</th>
                            <th>Prices per kg (${appState.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${FINISHED_LENGTHS.map((len, idx) => {
            // Only include row if total pct is valid/near 100? Or always?
            // Screenshot implies always showing the columns.
            
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                displayPrice = appState.customPrices[idx];
            } else {
                const price = calculateColumn(idx); // Get computed convertedPrice directly (we changed the return above)
                displayPrice = price; // Wait, actually `calculateColumn` returns `convertedPrice` now instead of `finalPrice`
            }
            
            // Only include valid prices (non-zero)
            if (displayPrice <= 0) return '';
            const converted = parseFloat(displayPrice).toFixed(2);

            return `
                                <tr>
                                    <td>${len}"</td>
                                    <td>${converted}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="export-footer">Generated on ${new Date().toLocaleDateString()}</div>
        `;

        document.body.appendChild(container);

        // Generate Image
        html2canvas(container, {
            backgroundColor: '#0f172a', // Ensure bg is captured
            scale: 2 // Higher resolution
        }).then(canvas => {
            // Download
            const link = document.createElement('a');
            link.download = `${appState.currentClientName.replace(/\s+/g, '_')}_PriceList.png`;
            link.href = canvas.toDataURL();
            link.click();

            // Cleanup
            document.body.removeChild(container);
        }).catch(err => {
            console.error(err);
            alert('Failed to generate image');
            if (document.body.contains(container)) document.body.removeChild(container);
        });
    }

    // --- Supplier Management ---

    function initSupplierGrid() {
        supplierPriceBody.innerHTML = '';
        RAW_LENGTHS.forEach(len => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${len}"</td>
                <td>
                    <input type="number" class="supplier-price-edit" data-len="${len}" placeholder="0">
                </td>
            `;
            supplierPriceBody.appendChild(tr);
        });
    }

    // --- Multi-Client Export Logic ---

    async function openMultiExportModal() {
        console.log("Opening Multi-Export Modal");
        try {
            const priceLists = db.priceLists || [];
            if (priceLists.length === 0) {
                return alert("No saved price lists to export.");
            }

            multiExportList.innerHTML = '';
            priceLists.forEach(pl => {
                const displayName = pl.name;
                const div = document.createElement('div');
                div.className = 'checkbox-item';
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.id = `chk_${pl.name} `;
                chk.value = pl.name;

                const lbl = document.createElement('label');
                lbl.htmlFor = `chk_${pl.name} `;
                lbl.textContent = displayName;

                div.appendChild(chk);
                div.appendChild(lbl);
                multiExportList.appendChild(div);
            });

            multiExportModal.classList.remove('hidden');
        } catch (e) {
            console.error("Multi export list error", e);
            alert("Failed to load price lists");
        }
    }

    function calculatePriceForClient(client, lenIdx) {
        if (!client.matrix) return 0;
        // Core calculation logic extracted for a specific client config
        // Verify matrix structure exists
        const colKeys = Object.keys(client.matrix);
        if (colKeys.length === 0) return 0;

        // Simplification: We iterate FINISHED_LENGTHS (0..19), matching colIdx 0..19.

        // Get Raw Price
        // Finding supplier:
        let rawPrice = 0;
        let supplier = db.suppliers.find(s => s.id === client.supplierId);
        // Fallback or data inside client? Client data only stores IDs.
        // We need the supplier references.

        // Matrix stores RAW PRICES directly? No, matrix stores RAW COST (after mixing).
        // Let's check appState.matrix.
        const colData = client.matrix[lenIdx]; // This is the column for this length
        if (!colData) return 0;

        // Calculate Weighted Raw Cost
        let totalCost = 0;
        let totalPct = 0;
        Object.keys(colData).forEach(rawLenKey => {
            // We need price for this raw length from supplier
            const pct = colData[rawLenKey];
            if (pct > 0 && supplier) {
                const p = supplier.prices[rawLenKey] || 0;
                totalCost += (p * (pct / 100));
                totalPct += pct;
            }
        });

        if (Math.round(totalPct) !== 100) return 0; // Skip invalid columns

        // 1. Base Cost + Wastage
        const wastageCost = totalCost * ((client.wastagePercent || 0) / 100);
        let currentCost = totalCost + wastageCost;

        // 2. Machine
        currentCost += (client.machineCharge !== undefined ? client.machineCharge : 2500);

        // 3. Wefting
        if ((client.weftingWastagePercent || 0) > 0) {
            currentCost += currentCost * (client.weftingWastagePercent / 100);
            currentCost += (client.weftingCharge || 0);
        }

        // 4. Margin
        const marginValue = currentCost * ((client.marginPercent || 0) / 100);
        const finalPrice = currentCost + marginValue;

        // 5. Rounding & Currency
        const roundedInr = Math.round(finalPrice / 50) * 50;
        const rate = client.exchangeRate || 1;
        const converted = parseFloat((roundedInr * rate)).toFixed(2);

        // If customPrices are enabled in this saved client config, override
        if(client.customPricesEnabled && client.customPrices && client.customPrices[lenIdx] > 0) {
            return parseFloat(client.customPrices[lenIdx]).toFixed(2);
        }

        return converted;
    }

    async function generateMultiExport() {
        console.log("Generate Multi-Export Clicked");

        if (typeof html2canvas === 'undefined') {
            alert("Error: html2canvas library not loaded. Please check your internet connection.");
            return;
        }

        try {
            // Get selected clients
            const checkboxes = multiExportList.querySelectorAll('input[type="checkbox"]:checked');
            console.log("Selected Checkboxes:", checkboxes.length);
            const selectedFilenames = Array.from(checkboxes).map(c => c.value);

            if (selectedFilenames.length === 0) return alert("Select at least one price list.");

            // Fetch all selected clients
            const selectedClients = (db.priceLists || []).filter(pl => selectedFilenames.includes(pl.name));

            // Create Container
            const container = document.createElement('div');
            container.id = 'export-container';

            // Build Header Row
            let headerHtml = `< th > Finished Length</th > `;
            selectedClients.forEach(c => {
                headerHtml += `< th > ${c.name} (${c.currency || 'INR'})</th > `;
            });

            // Build Body
            let bodyHtml = '';
            FINISHED_LENGTHS.forEach((len, idx) => {
                let rowHtml = `< td > ${len} "</td>`;
                let hasData = false;

                selectedClients.forEach(client => {
                    const price = calculatePriceForClient(client, idx);
                    rowHtml += `<td>${price > 0 ? price : '-'}</td>`;
                    if (price > 0) hasData = true;
                });

                if (hasData) {
                    bodyHtml += `<tr>${rowHtml}</tr>`;
                }
            });

            container.innerHTML = `
            <h2>Comparison Price List</h2>
            <div style="flex: 1; width: 100%; display: flex; justify-content: center; align-items: flex-start;">
                <table class="export-table">
                    <thead>
                        <tr>${headerHtml}</tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
            <div class="export-footer">Generated via InhSuite Ratio Mixer</div>
        `;

            document.body.appendChild(container);
            multiExportModal.classList.add('hidden'); // Close modal

            // Capture
            html2canvas(container).then(canvas => {
                const link = document.createElement('a');
                link.download = `Comparison-Price-List.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                document.body.removeChild(container);
            }).catch(err => {
                console.error(err);
                alert("Export failed");
                if (document.body.contains(container)) document.body.removeChild(container);
            });
        } catch (e) {
            console.error(e);
            alert("An error occurred: " + e.message);
        }
    }

    function renderSupplierList() {
        supplierListEl.innerHTML = '';
        db.suppliers.forEach(s => {
            const li = document.createElement('li');
            li.className = `supplier-item ${editingSupplierId === s.id ? 'active' : ''}`;
            li.textContent = s.name;
            li.addEventListener('click', () => loadSupplierForEditing(s.id));
            supplierListEl.appendChild(li);
        });
    }

    function startNewSupplier() {
        editingSupplierId = null;
        editSupplierName.value = '';
        // clear inputs
        document.querySelectorAll('.supplier-price-edit').forEach(inp => inp.value = '');

        // Update UI state
        renderSupplierList(); // To remove active class
        deleteSupplierBtn.classList.add('hidden');
    }

    function loadSupplierForEditing(id) {
        const supplier = db.suppliers.find(s => s.id === id);
        if (!supplier) return;

        editingSupplierId = id;
        editSupplierName.value = supplier.name;

        // Fill inputs
        document.querySelectorAll('.supplier-price-edit').forEach(inp => {
            const len = inp.dataset.len;
            inp.value = supplier.prices[len] || '';
        });

        renderSupplierList(); // update active state
        deleteSupplierBtn.classList.remove('hidden');
    }

    async function saveSupplier() {
        const name = editSupplierName.value.trim();
        if (!name) return alert("Please enter a supplier name");

        const prices = {};
        document.querySelectorAll('.supplier-price-edit').forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val)) prices[inp.dataset.len] = val;
        });

        let supplierData = {};

        if (editingSupplierId) {
            // Update local state first for responsiveness
            const idx = db.suppliers.findIndex(s => s.id === editingSupplierId);
            if (idx !== -1) {
                db.suppliers[idx].name = name;
                db.suppliers[idx].prices = prices;
                supplierData = db.suppliers[idx];
            }
        } else {
            // Create
            const id = 'sup_' + Date.now();
            supplierData = { id, name, prices };
            db.suppliers.push(supplierData);
            editingSupplierId = id;
        }

        // Save locally
        try {
            saveDB();
        } catch (e) {
            console.error("Failed to save supplier", e);
            alert("Error saving supplier");
        }

        renderSupplierList();
        refreshSupplierDropdowns();

        // If this was the active supplier in mixer, update it
        if (appState.currentSupplierId === editingSupplierId) {
            loadSupplierPricesIntoMixer(editingSupplierId);
        }

        alert("Supplier saved!");
    }

    function createSupplier(name, prices) {
        // Check for existing supplier with same name
        const existing = db.suppliers.find(s => s.name === name);
        if (existing) {
            console.log(`Supplier ${name} already exists, returning id.`);
            return existing.id;
        }

        // Helper mainly for default creation now, or called internally
        const id = 'sup_' + Date.now();
        const s = { id, name, prices };
        db.suppliers.push(s);
        editingSupplierId = id;

        // Save it immediately
        saveDB();

        return id;
    }

    async function deleteSupplier() {
        if (!editingSupplierId) return;

        const btn = document.getElementById('deleteSupplierBtn');
        if (btn.innerText !== 'Confirm Delete?') {
            btn.innerText = 'Confirm Delete?';
            btn.style.backgroundColor = 'rgba(248, 113, 113, 0.2)';
            btn.style.color = '#f87171';
            btn.style.borderColor = '#f87171';

            // Revert after 3s
            setTimeout(() => {
                if (document.body.contains(btn) && btn.innerText === 'Confirm Delete?') {
                    btn.innerText = 'Delete';
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }
            }, 3000);
            return;
        }

        // Action confirmed
        try {
            // Track deleted supplier globally so it doesn't get re-fetched from static JSON
            const deletedGlobal = JSON.parse(localStorage.getItem('deleted_suppliers') || '[]');
            if (!deletedGlobal.includes(editingSupplierId)) {
                deletedGlobal.push(editingSupplierId);
                localStorage.setItem('deleted_suppliers', JSON.stringify(deletedGlobal));
            }

            db.suppliers = db.suppliers.filter(s => s.id !== editingSupplierId);
            saveDB();
        } catch (e) {
            alert("Error deleting supplier");
            console.error(e);
            return;
        }

        db.suppliers = db.suppliers.filter(s => s.id !== editingSupplierId);

        if (appState.currentSupplierId === editingSupplierId) {
            appState.currentSupplierId = null;
            appState.prices = {};
        }

        startNewSupplier();
        refreshSupplierDropdowns();

        // Reset button state
        btn.innerText = 'Delete';
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }

    // --- Ratio Management (Formerly Client) ---
    // User requested "Rename Saved Price Lists to Load Ratios"

    async function saveRatioConfig() {
        const name = clientNameInput.value.trim();
        if (!name) return alert("Please enter a Ratio Name to save configuration.");

        // Requirement: "This will only save the ratios matrix to the jason file."
        const ratioData = {
            name,
            matrix: appState.matrix,
            currency: appState.currency || 'INR',
            marginPercent: appState.marginPercent || 0,
            supplierId: appState.currentSupplierId || null,
            created: new Date().toISOString()
        };

        try {
            if (!db.clients) db.clients = [];
            const existingIdx = db.clients.findIndex(c => c.name === name);
            if (existingIdx >= 0) {
                db.clients[existingIdx] = ratioData;
            } else {
                db.clients.push(ratioData);
            }

            saveDB();
            alert(`Ratio "${name}" saved.`);
            refreshRatioDropdown();

            // Re-render if tab function exists
            if (typeof renderSavedRatios === 'function') renderSavedRatios();

        } catch (e) {
            console.error(e);
            alert("Error saving ratio: " + e.message);
        }
    }

    async function loadRatioConfig(filename) {
        if (!filename) return;

        try {
            const data = db.clients.find(c => c.name === filename);
            if (!data) throw new Error("Ratio Configuration not found");

            clientNameInput.value = data.name;
            appState.matrix = JSON.parse(JSON.stringify(data.matrix || {})); // Deep copy

            // Restore supplier if available
            if (data.supplierId && db.suppliers.find(s => s.id === data.supplierId)) {
                supplierSelect.value = data.supplierId;
                loadSupplierPricesIntoMixer(data.supplierId);
            }

            refreshTableInputs();
            calculateAll();
            saveAppState();

            deleteClientBtn.classList.remove('hidden');
        } catch (e) {
            console.error(e);
            alert("Failed to load ratio: " + e.message);
        }
    }



    async function deleteRatioConfig() {
        const filename = clientSelect.value;
        const displayName = clientSelect.options[clientSelect.selectedIndex]?.text;

        if (!filename) return alert("No ratio selected to delete.");

        if (!confirm(`Are you sure you want to delete ratio "${displayName}"?`)) return;

        try {
            db.clients = db.clients.filter(c => c.name !== filename);
            saveDB();

            alert(`Ratio "${displayName}" deleted.`);
            refreshRatioDropdown();
            deleteClientBtn.classList.add('hidden');
            clientNameInput.value = '';

            if (typeof renderSavedRatios === 'function') renderSavedRatios();
        } catch (e) {
            console.error(e);
            alert("Error deleting ratio.");
        }
    }

    // --- Price List Management (Full Config) ---

    async function savePriceListConfig() {
        const name = priceListNameInput.value.trim();
        if (!name) return alert("Please enter a Price List Name.");

        const fullConfig = {
            name,
            matrix: appState.matrix,
            supplierId: appState.currentSupplierId,
            prices: appState.prices,
            marginPercent: appState.marginPercent,
            wastagePercent: appState.wastagePercent,
            machineCharge: appState.machineCharge,
            weftingWastagePercent: appState.weftingWastagePercent,
            weftingCharge: appState.weftingCharge,
            currency: appState.currency,
            exchangeRate: appState.exchangeRate,
            customPricesEnabled: appState.customPricesEnabled,
            customPrices: appState.customPrices,
            savedAt: new Date().toISOString()
        };

        try {
            if (!db.priceLists) db.priceLists = [];
            const existingIdx = db.priceLists.findIndex(p => p.name === name);
            if (existingIdx >= 0) {
                db.priceLists[existingIdx] = fullConfig;
            } else {
                db.priceLists.push(fullConfig);
            }
            saveDB();
            
            alert(`Price List "${name}" saved.`);
            refreshPriceListDropdown();
        } catch (e) {
            console.error(e);
            alert("Error saving price list: " + e.message);
        }
    }

    async function loadPriceListConfig(filename) {
        if (!filename) return;

        try {
            const data = (db.priceLists || []).find(p => p.name === filename);
            if (!data) throw new Error("Price list not found");

            priceListNameInput.value = data.name;
            appState.matrix = JSON.parse(JSON.stringify(data.matrix));

            // Restore Supplier
            if (data.supplierId && db.suppliers.find(s => s.id === data.supplierId)) {
                supplierSelect.value = data.supplierId;
                loadSupplierPricesIntoMixer(data.supplierId);
            }

            // Restore Modifiers
            appState.marginPercent = data.marginPercent || 0;
            appState.wastagePercent = data.wastagePercent || 0;
            appState.machineCharge = data.machineCharge !== undefined ? data.machineCharge : 2500;
            appState.weftingWastagePercent = data.weftingWastagePercent || 0;
            appState.weftingCharge = data.weftingCharge || 0;
            appState.currency = data.currency || 'INR';
            appState.exchangeRate = data.exchangeRate || 1;
            appState.customPricesEnabled = data.customPricesEnabled || false;
            appState.customPrices = JSON.parse(JSON.stringify(data.customPrices || {}));

            // UI Updates
            marginInput.value = appState.marginPercent;
            wastageInput.value = appState.wastagePercent;
            machineRemyInput.value = appState.machineCharge;
            weftingWastageInput.value = appState.weftingWastagePercent || '';
            weftingChargeInput.value = appState.weftingCharge || '';
            currencySelect.value = appState.currency;
            exchangeRateInput.value = appState.exchangeRate;
            currencyCodeDisplay.textContent = appState.currency;
            customizePricesCheckbox.checked = appState.customPricesEnabled;
            
            if(appState.customPricesEnabled) {
                customPriceRow.classList.remove('hidden');
            } else {
                customPriceRow.classList.add('hidden');
            }

            toggleWeftingRows(appState.weftingWastagePercent > 0);

            refreshTableInputs();
            calculateAll();
            saveAppState();

            deletePriceListBtn.classList.remove('hidden');

        } catch (e) {
            console.error(e);
            alert("Failed to load price list: " + e.message);
        }
    }

    async function deletePriceListConfig() {
        const filename = priceListSelect.value;
        const displayName = priceListSelect.options[priceListSelect.selectedIndex]?.text;

        if (!filename) return alert("No price list selected.");
        if (!confirm(`Delete price list "${displayName}"?`)) return;

        try {
            if (!db.priceLists) db.priceLists = [];
            db.priceLists = db.priceLists.filter(p => p.name !== filename);
            saveDB();
            
            alert(`Price List deleted.`);
            refreshPriceListDropdown();
            deletePriceListBtn.classList.add('hidden');
            priceListNameInput.value = '';
        } catch (e) {
            console.error(e);
            alert("Error deleting price list.");
        }
    }

    // --- Helpers ---

    function refreshSupplierDropdowns() {
        supplierSelect.innerHTML = '<option value="">Select a Supplier</option>';
        db.suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            supplierSelect.appendChild(opt);
        });
        if (appState.currentSupplierId) supplierSelect.value = appState.currentSupplierId;
    }

    async function refreshRatioDropdown() {
        clientSelect.innerHTML = '<option value="">-- Load Ratio --</option>';
        try {
            const clients = db.clients || [];
            clients.forEach(client => {
                const opt = document.createElement('option');
                opt.value = client.name;
                opt.textContent = client.name;
                clientSelect.appendChild(opt);
            });
        } catch (e) {
            console.error("Failed to list ratios", e);
        }
    }

    async function refreshPriceListDropdown() {
        priceListSelect.innerHTML = '<option value="">-- Load Price List --</option>';
        try {
            const plLists = db.priceLists || [];
            plLists.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl.name;
                opt.textContent = pl.name;
                priceListSelect.appendChild(opt);
            });
        } catch (e) {
            console.error("Failed to list price lists", e);
        }
    }

    function toggleWeftingRows(show) {
        const rows = document.querySelectorAll('.wefting-wastage-row, .wefting-charge-row');
        rows.forEach(r => {
            if (show) r.classList.remove('hidden');
            else r.classList.add('hidden');
        });
    }

    async function fetchExchangeRate(targetCurrency) {
        if (targetCurrency === 'INR') return 1;

        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/INR`);
            const data = await res.json();
            const rate = data.rates[targetCurrency];

            if (rate) {
                appState.exchangeRate = rate;
                exchangeRateInput.value = rate;
            } else {
                alert(`Could not fetch rate for ${targetCurrency}`);
            }
        } catch (e) {
            console.error("Rate fetch error:", e);
            alert("Failed to fetch exchange rate. Please enter manually.");
        }
    }

    // --- Persistence ---

    // --- Firebase Sync Helpers ---
    let firebaseSyncActive = false;
    async function syncToFirebase(dbData) {
        if (firebaseSyncActive) return; // Prevent loop
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const firestoreDB = firebase.firestore();
                await firestoreDB.collection('ratioMixer').doc('sharedSettings').set(dbData);
            } catch (e) {
                console.error("Firebase sync failed:", e);
            }
        }
    }

    function setupFirebaseListener() {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const firestoreDB = firebase.firestore();
                firestoreDB.collection('ratioMixer').doc('sharedSettings')
                    .onSnapshot((doc) => {
                        if (doc.exists) {
                            const cloudDB = doc.data();
                            let updated = false;

                            const localString = JSON.stringify(db);
                            const cloudString = JSON.stringify(cloudDB);

                            if (localString !== cloudString) {
                                firebaseSyncActive = true;
                                if (cloudDB.clients) {
                                    db.clients = cloudDB.clients;
                                    updated = true;
                                }
                                if (cloudDB.suppliers) {
                                    db.suppliers = cloudDB.suppliers;
                                    updated = true;
                                }
                                if (cloudDB.priceLists) {
                                    db.priceLists = cloudDB.priceLists;
                                    updated = true;
                                }

                                if (updated) {
                                    localStorage.setItem('hairRatioDB', JSON.stringify(db));
                                    refreshSupplierDropdowns();
                                    renderSupplierList();
                                    refreshRatioDropdown();
                                    refreshPriceListDropdown();
                                    if (typeof renderSavedRatios === 'function') renderSavedRatios();
                                    if (typeof renderSavedPriceLists === 'function') renderSavedPriceLists();
                                }
                                firebaseSyncActive = false;
                            }
                        }
                    });
            } catch (e) {
                console.error("Firebase listener setup failed:", e);
            }
        }
    }

    function saveDB() {
        try {
            localStorage.setItem('hairRatioDB', JSON.stringify(db));
            syncToFirebase(db);
        } catch (e) {
            console.error("Error saving DB to local storage", e);
        }
    }

    async function loadDB() {
        // Check LocalStorage for DB
        const saved = localStorage.getItem('hairRatioDB');
        if (saved) {
            try {
                const localDB = JSON.parse(saved);

                if (localDB.clients && localDB.clients.length > 0) {
                    db.clients = localDB.clients;
                }

                if (localDB.suppliers && localDB.suppliers.length > 0) {
                    db.suppliers = localDB.suppliers;
                }
                
                if (localDB.priceLists && localDB.priceLists.length > 0) {
                    db.priceLists = localDB.priceLists;
                }
            } catch (e) { console.error(e); }
        }

        if (!db.suppliers) db.suppliers = [];
        if (!db.clients) db.clients = [];
        if (!db.priceLists) db.priceLists = [];

        // Optional Check: Create default if absolutely empty
        if (db.suppliers.length === 0) {
            console.log("No suppliers loaded. Creating default.");
            // We can create a default supplier here if needed
            createSupplier('SONALI 2/2', DEFAULT_PRICES);
        }

        try {
            const res = await fetch('/data/suppliers.json');
            if (res.ok) {
                let serverSuppliers = await res.json();
                if (serverSuppliers && serverSuppliers.length > 0) {
                    // Filter out any globally deleted suppliers
                    const deletedGlobal = JSON.parse(localStorage.getItem('deleted_suppliers') || '[]');
                    serverSuppliers = serverSuppliers.filter(s => !deletedGlobal.includes(s.id));

                    // Merge logic: Add suppliers from server that aren't already locally present
                    const localIds = new Set(db.suppliers.map(s => s.id));
                    serverSuppliers.forEach(s => {
                        if (!localIds.has(s.id)) {
                            db.suppliers.push(s);
                        } else {
                            // Update local supplier if server supplier is newer or we prefer server state on load
                            const idx = db.suppliers.findIndex(ls => ls.id === s.id);
                            db.suppliers[idx] = s;
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch static suppliers:", e);
        }

        try {
            const res = await fetch('/data/clients.json');
            if (res.ok) {
                let serverClients = await res.json();
                if (serverClients && serverClients.length > 0) {
                    const localNames = new Set(db.clients.map(c => c.name));
                    serverClients.forEach(c => {
                        if (!localNames.has(c.name)) {
                            db.clients.push(c);
                        } else {
                            // Optionally overwrite local with server state
                            const idx = db.clients.findIndex(lc => lc.name === c.name);
                            db.clients[idx] = c;
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch static clients:", e);
        }

        refreshSupplierDropdowns();
        renderSupplierList();

        // If appState has a supplierId, try to load it
        if (appState.currentSupplierId) {
            loadSupplierPricesIntoMixer(appState.currentSupplierId);
        }

        // Initialize Firebase Sync
        if (typeof window.initializeFirebaseApp === 'function') {
            try {
                const initResult = window.initializeFirebaseApp();
                if (initResult instanceof Promise) {
                    initResult.then(() => setupFirebaseListener()).catch(e => console.warn(e));
                } else {
                    setupFirebaseListener();
                }
            } catch (e) {
                console.warn('Firebase sync not available', e);
            }
        }
    }

    async function migrateLegacySuppliers(suppliers) {
        let count = 0;
        for (const s of suppliers) {
            try {
                await fetch('/api/save-supplier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(s)
                });
                count++;
            } catch (e) { console.error(e); }
        }
        alert(`Migrated ${count} suppliers.`);
        // Reload from server
        loadDB();
    }

    // --- Legacy Migration ---

    const migrateLegacyBtn = document.getElementById('migrateLegacyBtn');
    if (migrateLegacyBtn) {
        migrateLegacyBtn.addEventListener('click', migrateLegacyClients);
    }

    // Check on load if we have legacy data but no file data?
    // Actually, we just check if db.clients (from localstorage) has items.
    // And if so, show the button.
    setTimeout(checkLegacyData, 1000); // Small delay to let everything load

    function checkLegacyData() {
        // db is loaded from localStorage in init
        if (db.clients && db.clients.length > 0) {
            console.log("Legacy clients found:", db.clients.length);
            migrateLegacyBtn.classList.remove('hidden');
        }
    }

    async function migrateLegacyClients() {
        if (!confirm(`Found ${db.clients.length} price lists in local storage. Migrate them to server files?`)) return;

        let successCount = 0;
        let failCount = 0;

        migrateLegacyBtn.disabled = true;
        migrateLegacyBtn.innerText = "Migrating...";

        for (const client of db.clients) {
            try {
                // Ensure client has name
                if (!client.name) continue;

                const res = await fetch('/api/save-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(client)
                });
                const result = await res.json();
                if (result.success) successCount++;
                else failCount++;
            } catch (e) {
                console.error("Migration error for " + client.name, e);
                failCount++;
            }
        }

        alert(`Migration Complete.\nSaved: ${successCount}\nFailed: ${failCount}`);

        // Refresh dropdown to show new server files
        refreshRatioDropdown();

        // Hide button if all successful? or just reload to flush?
        // Let's hide it if we had mostly success
        if (successCount > 0) {
            migrateLegacyBtn.classList.add('hidden');
            // Optional: Clear local storage clients to prevent showing again?
            // db.clients = [];
            // saveDB(); 
            // Better to keep backup in local storage for now until user confirms.
        }

        migrateLegacyBtn.disabled = false;
        migrateLegacyBtn.innerText = "Migrate Legacy Data";
    }

    function saveAppState() {
        appState.currentClientName = clientNameInput.value;
        localStorage.setItem('hairRatioAppState', JSON.stringify(appState));
    }

    function loadAppState() {
        const saved = localStorage.getItem('hairRatioAppState');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                appState = loaded;

                // Restore UI
                if (appState.currentSupplierId) {
                    supplierSelect.value = appState.currentSupplierId;
                    loadSupplierPricesIntoMixer(appState.currentSupplierId);
                }
                if (appState.currentClientName) clientNameInput.value = appState.currentClientName;

                // Restore inputs
                marginInput.value = appState.marginPercent || 0;
                wastageInput.value = appState.wastagePercent || 0;
                machineRemyInput.value = appState.machineCharge !== undefined ? appState.machineCharge : 2500;
                weftingWastageInput.value = appState.weftingWastagePercent || '';
                weftingChargeInput.value = appState.weftingCharge || '';

                if (appState.currency) {
                    currencySelect.value = appState.currency;
                    currencyCodeDisplay.textContent = appState.currency;
                }
                if (appState.exchangeRate) exchangeRateInput.value = appState.exchangeRate;
                
                if (appState.customPricesEnabled) {
                    customizePricesCheckbox.checked = true;
                    customPriceRow.classList.remove('hidden');
                } else {
                    customizePricesCheckbox.checked = false;
                    customPriceRow.classList.add('hidden');
                }

                toggleWeftingRows(appState.weftingWastagePercent > 0);

                refreshTableInputs();
                calculateAll();
            } catch (e) { console.error(e); }
        } else {
            // No app state, check if we have a default supplier to load
            if (db.suppliers.length > 0) {
                const firstSup = db.suppliers[0];
                loadSupplierPricesIntoMixer(firstSup.id);
            }
        }
    }

    // Navigation support for arrow keys (Re-added)
    function handleNavigation(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;

        const currentInput = e.target;
        const currentRow = currentInput.closest('tr');
        const allRows = Array.from(tableBody.querySelectorAll('tr'));
        const currentRowIdx = allRows.indexOf(currentRow);
        const colCells = Array.from(currentRow.children);
        const currentCell = currentInput.closest('td');
        const currentColIdx = colCells.indexOf(currentCell);

        let nextInput = null;

        if (e.key === 'ArrowUp') {
            if (currentRowIdx > 0) nextInput = allRows[currentRowIdx - 1].children[currentColIdx].querySelector('input');
        } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
            // Tab or ArrowDown -> Go Down
            if (e.key === 'Tab') e.preventDefault();
            if (currentRowIdx < allRows.length - 1) {
                nextInput = allRows[currentRowIdx + 1].children[currentColIdx].querySelector('input');
            }
        } else if (e.key === 'ArrowLeft') {
            if (currentColIdx > 2) nextInput = currentRow.children[currentColIdx - 1].querySelector('input');
        } else if (e.key === 'ArrowRight') {
            if (currentColIdx < colCells.length - 1) nextInput = currentRow.children[currentColIdx + 1].querySelector('input');
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            if (currentRowIdx > 0) nextInput = allRows[currentRowIdx - 1].children[currentColIdx].querySelector('input');
        }

        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    }
});
