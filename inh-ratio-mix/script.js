document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const EVEN_RAW_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
    const ALL_RAW_LENGTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    let ACTIVE_RAW_LENGTHS = [...EVEN_RAW_LENGTHS];
    const EVEN_FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
    const ALL_FINISHED_LENGTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    let ACTIVE_FINISHED_LENGTHS = [...EVEN_FINISHED_LENGTHS];

    // Initial Starter Data
    const DEFAULT_PRICES = {
        4: 5000, 6: 6750, 8: 7650, 10: 9450, 12: 13500, 14: 15300,
        16: 18000, 18: 29250, 20: 40500, 22: 50400, 24: 54000,
        26: 65250, 28: 69750, 30: 76500, 32: 80000, 34: 90000,
        36: 100000, 38: 110000, 40: 120000
    };

    // State Variables
    let appState = {
        currentSupplierId: null, // "default" or uuid
        currentClientName: "",
        matrix: {},
        prices: { ...DEFAULT_PRICES },
        marginType: 'percent',
        marginPercent: 30, // Default to 30
        marginAmount: 0,
        wastagePercent: 10, // Default to 10
        machineCharge: 2500, // Default charge
        machineChargeName: 'MR/Wash Charge', // Default name
        currency: 'INR',
        exchangeRate: 1,
        roundingFactor: 50,
        customPricesEnabled: false,
        customPrices: {},
        individualMargins: {},
        accentColor: '#4f46e5' // Export background accent color
    };

    // Database (Local Storage)
    let db = {
        suppliers: [], // Array of { id, name, prices }
        clients: [],    // Array of { name, matrix, raw_supplier_id }
        priceLists: []  // Array of price list objects
    };

    function formatPriceWithSymbol(price, currencyCode) {
        if (!price || isNaN(parseFloat(price))) return '-';
        const code = currencyCode || 'INR';
        const fractionDigits = code.toUpperCase() === 'INR' ? 0 : 2;
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: code,
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits
            }).format(parseFloat(price));
        } catch(e) {
            return code + ' ' + parseFloat(price).toFixed(fractionDigits);
        }
    }

    window.renderNameWithLogo = function(name, height = '24px') {
        if (!name) return '';
        return name.replace(/Hairwise\s*/gi, '').trim();
    };

    const AVAILABLE_PRODUCT_IMAGES = [
        "Bulk Double Drawn.png",
        "Bulk Single Drawn.png",
        "Bulk Super Double Drawn.png",
        "Bun.png",
        "Butterfly Weft.png",
        "ClipOn Set.png",
        "Clutch Bun.png",
        "Clutch Ponytail.png",
        "Flatclip Ponytail.png",
        "Frontline Patch.png",
        "Genius Weft.png",
        "Seamless Clip On.png",
        "Tape.png",
        "Tip.png",
        "Weft Double Drawn.png",
        "Weft Single Drawn.png",
        "Weft Super Double Drawn.png",
        "Wig Closure.png",
        "Wig Fringe.png",
        "Wig Frontal.png",
        "highlights.png"
    ];

    window.getProductImageHTML = function(name, height = '120px') {
        if (!name) return '';
        
        const words = name.trim().split(/\s+/);
        const searchWords = words.length >= 3 ? words.slice(2) : words;
        const searchString = searchWords.join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, '');
        
        let bestMatch = null;
        let highestScore = 0;

        AVAILABLE_PRODUCT_IMAGES.forEach(img => {
            const cleanImgName = img.replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
            let score = 0;
            
            if (searchString.includes(cleanImgName)) {
                score += 100;
            } else if (cleanImgName.includes(searchString)) {
                score += 50;
            }
            
            const imgWords = cleanImgName.split(/\s+/);
            imgWords.forEach(w => {
                if (w.length > 1 && searchString.includes(w)) {
                    score += 10;
                }
            });
            
            const fullStr = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
            if (fullStr.includes(cleanImgName)) {
                score += 5;
            }

            if (score > 0 && score > highestScore) {
                highestScore = score;
                bestMatch = img;
            }
        });

        if (bestMatch) {
            return `<img src="../images/Products/${bestMatch}?v=9" style="height: ${height}; object-fit: contain;" />`;
        }
        return '';
    };

    // --- DOM Elements ---
    // Tabs
    const tabButtons = document.querySelectorAll('button.nav-tab');
    const views = document.querySelectorAll('.view-section');

    // Mixer Inputs
    const supplierSelect = document.getElementById('supplierSelect');
    const clientNameInput = document.getElementById('clientName');
    const clientTagInput = document.getElementById('clientTag');
    const clientSelect = document.getElementById('clientSelect');
    const saveClientBtn = document.getElementById('saveClientBtn');
    const deleteClientBtn = document.getElementById('deleteClientBtn');

    // Price List Management Inputs (Removed)
    const customizePricesCheckbox = document.getElementById('customizePricesCheckbox');
    const customPriceRow = document.getElementById('custom-price-row');

    const resetMixerBtn = document.getElementById('resetMixerBtn');

    const machineRemyInput = document.getElementById('machineRemyInput');
    const machineChargeNameInput = document.getElementById('machineChargeNameInput');
    const marginInput = document.getElementById('marginInput');
    const marginTypeSelect = document.getElementById('marginTypeSelect');
    const marginInputLabel = document.getElementById('marginInputLabel');
    const wastageInput = document.getElementById('wastageInput');
    const machineRowLabel = document.getElementById('machineRowLabel');
    const currencySelect = document.getElementById('currencySelect');
    const exchangeRateInput = document.getElementById('exchangeRateInput');
    const roundingFactorInput = document.getElementById('roundingFactorInput');
    const accentColorInput = document.getElementById('accentColorInput');
    const currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyPriceListBtn = document.getElementById('copyPriceListBtn');
    const prepareQuoteBtn = document.getElementById('prepareQuoteBtn');

    // Matrix Table
    const ratioTable = document.getElementById('ratioTable');
    const tableBody = document.getElementById('tableBody');
    const tableFooter = document.getElementById('tableFooter');

    // Supplier Editor
    const supplierListEl = document.getElementById('supplierList');
    const newSupplierBtn = document.getElementById('newSupplierBtn');
    const editSupplierName = document.getElementById('editSupplierName');
    const editSupplierHairType = document.getElementById('editSupplierHairType');
    const saveSupplierBtn = document.getElementById('saveSupplierBtn');
    const deleteSupplierBtn = document.getElementById('deleteSupplierBtn');
    const supplierPriceBody = document.getElementById('supplierPriceBody');

    // Editor State
    let editingSupplierId = null;

    // --- Initialization ---
    initTable();
    initSupplierGrid();

    // --- Cost Summary Collapse Toggle ---
    (function() {
        const toggleRow = document.getElementById('summary-toggle-row');
        const icon = document.getElementById('summaryToggleIcon');
        if (!toggleRow || !icon) return;

        let isCollapsed = true;
        document.querySelectorAll('.collapsible-summary-row').forEach(row => {
            row.style.display = 'none';
        });
        if (icon) icon.style.transform = 'rotate(-90deg)';

        toggleRow.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            document.querySelectorAll('.collapsible-summary-row').forEach(row => {
                row.style.display = isCollapsed ? 'none' : '';
            });
            icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    })();

    // --- Raw Material Prices Column Collapse Toggle ---
    (function() {
        const toggleBar = document.getElementById('raw-material-toggle-bar');
        const icon = document.getElementById('rawMatToggleIcon');
        if (!toggleBar || !icon) return;

        let isCollapsed = true;
        const table = document.getElementById('ratioTable');
        
        const updateFooterColspan = (collapsed) => {
            document.querySelectorAll('#tableFooter .sticky-col-1').forEach(td => {
                if (td.hasAttribute('colspan')) {
                    td.setAttribute('colspan', collapsed ? '1' : '2');
                }
            });
        };

        if (table) {
            table.classList.add('raw-price-hidden');
            updateFooterColspan(true);
        }
        if (icon) icon.style.transform = 'rotate(-90deg)';

        toggleBar.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (table) {
                table.classList.toggle('raw-price-hidden', isCollapsed);
                updateFooterColspan(isCollapsed);
            }
            icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    })();


    // Fix: Wait for DB to load before checking for default supplier
    loadDB().then(() => {
        // If no suppliers, create default one
        if (db.suppliers.length === 0) {
            createSupplier('SONALI 2/2', DEFAULT_PRICES); // Ensure we have one
        }

        refreshSupplierDropdowns();
        refreshRatioDropdown();

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
            applyRawLengthsVisibility();
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
            if (clientTagInput) clientTagInput.value = '';
            if (typeof updateRatioDisplay === 'function') updateRatioDisplay();
        }
    });

    if (clientNameInput) clientNameInput.addEventListener('input', () => { if (typeof updateRatioDisplay === 'function') updateRatioDisplay(); });
    if (clientTagInput) clientTagInput.addEventListener('input', () => { if (typeof updateRatioDisplay === 'function') updateRatioDisplay(); });

    // Price List Management Events (Removed)

    function clearCustomPrices() {
        appState.customPrices = {};
        document.querySelectorAll('.cell-input[data-custom-col-idx]').forEach(inp => {
            inp.value = '';
        });
    }

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
        clearCustomPrices();
        calculateAll();
        saveAppState();
    });

    if (marginTypeSelect) {
        marginTypeSelect.addEventListener('change', (e) => {
            appState.marginType = e.target.value;
            if (marginInputLabel) {
                marginInputLabel.innerText = appState.marginType === 'percent' ? 'Margin %' : 'Margin Amt';
            }
            if (appState.marginType === 'amount') {
                marginInput.value = appState.marginAmount || 0;
            } else {
                marginInput.value = appState.marginPercent || 0;
            }
            clearCustomPrices();
            calculateAll();
            saveAppState();
        });
    }

    marginInput.addEventListener('input', (e) => {
        if (appState.marginType === 'amount') {
            appState.marginAmount = parseFloat(e.target.value) || 0;
        } else {
            appState.marginPercent = parseFloat(e.target.value) || 0;
        }
        clearCustomPrices();
        calculateAll();
        saveAppState();
    });



    machineRemyInput.addEventListener('input', (e) => {
        appState.machineCharge = parseFloat(e.target.value) || 0;
        clearCustomPrices();
        calculateAll();
        saveAppState();
    });

    if (machineChargeNameInput) {
        machineChargeNameInput.addEventListener('input', (e) => {
            appState.machineChargeName = e.target.value || 'MR/Wash Charge';
            if (machineRowLabel) {
                machineRowLabel.textContent = appState.machineChargeName;
            }
            saveAppState();
        });
    }

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

        clearCustomPrices();
        calculateAll();
        saveAppState();
    });

    if (accentColorInput) {
        accentColorInput.addEventListener('input', (e) => {
            appState.accentColor = e.target.value;
            saveAppState();
        });
    }

    exchangeRateInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        appState.exchangeRate = val > 0 ? val : 1;
        clearCustomPrices();
        calculateAll();
        saveAppState();
    });

    if (roundingFactorInput) {
        roundingFactorInput.addEventListener('input', (e) => {
            appState.roundingFactor = e.target.value === '' ? '' : parseFloat(e.target.value);
            clearCustomPrices();
            updateRoundingLabel();
            calculateAll();
            saveAppState();
        });
    }

    // Download
    downloadBtn.addEventListener('click', () => exportPriceList('download'));
    if (copyPriceListBtn) {
        copyPriceListBtn.addEventListener('click', () => exportPriceList('copy'));
    }
    
    // Prepare Quote
    if (prepareQuoteBtn) {
        prepareQuoteBtn.addEventListener('click', () => {
            const ratioName = clientNameInput ? clientNameInput.value.trim() : '';
            if (!ratioName) {
                alert("Please enter a Ratio Name or load a ratio first.");
                return;
            }

            // Extract the active lengths and their final prices from the UI
            const quoteItems = [];
            if (typeof ACTIVE_FINISHED_LENGTHS !== 'undefined') {
                ACTIVE_FINISHED_LENGTHS.forEach(len => {
                    const totalEl = document.getElementById(`total - ${len}`);
                    const priceEl = document.getElementById(`converted-price - ${len}`);
                    
                    if (totalEl && priceEl) {
                        const totalText = totalEl.textContent.trim();
                        // Only include lengths that have a valid 100% ratio configuration
                        if (totalText === '100%') {
                            const rate = parseInt(priceEl.textContent.replace(/[^0-9]/g, '')) || 0;
                            if (rate > 0) {
                                quoteItems.push({
                                    length: len,
                                    rate: rate
                                });
                            }
                        }
                    }
                });
            }

            if (quoteItems.length === 0) {
                alert("There are no fully configured lengths (100% matrix) to quote.");
                return;
            }

            const transferData = {
                ratioName: ratioName,
                currency: appState.currency || 'INR',
                items: quoteItems,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('ratioQuoteTransfer', JSON.stringify(transferData));
            window.location.href = `../ratio-quote.html`;
        });
    }

    // Saved Ratios Search & Advanced Filters
    const ratioSearchInput = document.getElementById('ratioSearchInput');
    const toggleFiltersBtn = document.getElementById('toggleRatioFiltersBtn');
    const advancedFiltersPanel = document.getElementById('ratioAdvancedFiltersPanel');
    const filterCurrency = document.getElementById('filterRatioCurrency');
    const filterMinMargin = document.getElementById('filterRatioMinMargin');
    const filterHairType = document.getElementById('filterRatioHairType');
    const resetFiltersBtn = document.getElementById('resetRatioFiltersBtn');

    const triggerRender = () => { if (typeof renderSavedRatios === 'function') renderSavedRatios(); };

    if (ratioSearchInput) ratioSearchInput.addEventListener('input', triggerRender);
    if (filterCurrency) filterCurrency.addEventListener('change', triggerRender);
    if (filterMinMargin) filterMinMargin.addEventListener('input', triggerRender);
    if (filterHairType) filterHairType.addEventListener('change', triggerRender);

    if (toggleFiltersBtn && advancedFiltersPanel) {
        toggleFiltersBtn.addEventListener('click', () => {
            advancedFiltersPanel.classList.toggle('hidden');
            advancedFiltersPanel.classList.toggle('flex');
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (filterCurrency) filterCurrency.value = '';
            if (filterMinMargin) filterMinMargin.value = '';
            if (filterHairType) filterHairType.value = '';
            triggerRender();
        });
    }

    // Supplier Management Actions
    const duplicateSupplierBtn = document.getElementById('duplicateSupplierBtn');
    newSupplierBtn.addEventListener('click', startNewSupplier);
    saveSupplierBtn.addEventListener('click', saveSupplier);
    deleteSupplierBtn.addEventListener('click', deleteSupplier);
    if (duplicateSupplierBtn) duplicateSupplierBtn.addEventListener('click', duplicateSupplier);


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
    // Tracks which ratio names are currently selected in the table
    let _selectedRatioNames = new Set();

    function _updateRatioSelectionUI() {
        const toolbar = document.getElementById('ratioExportToolbar');
        const countLabel = document.getElementById('ratioSelectedCount');
        const selectAllCb = document.getElementById('selectAllRatios');
        const count = _selectedRatioNames.size;

        if (toolbar) toolbar.style.display = count > 0 ? 'flex' : 'none';
        if (countLabel) countLabel.innerHTML = `<i class="fa-solid fa-check-square" style="margin-right:5px;"></i>${count} selected`;

        // Update select-all indeterminate state
        if (selectAllCb) {
            const allCheckboxes = document.querySelectorAll('.ratio-row-checkbox');
            const total = allCheckboxes.length;
            selectAllCb.checked = total > 0 && count === total;
            selectAllCb.indeterminate = count > 0 && count < total;
        }
    }

    function renderSavedRatios() {
        const tbody = document.getElementById('savedRatiosTableBody');
        const countSpan = document.getElementById('savedRatioCount');
        if (!tbody || !countSpan) return;

        tbody.innerHTML = '';
        let clients = db.clients || [];
        if (window.location.pathname.includes('hairwise.html')) {
            clients = clients.filter(c => c.tag && c.tag.toLowerCase().includes('hairwise'));
        }
        
        // Search Filter
        const searchInput = document.getElementById('ratioSearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            clients = clients.filter(c => 
                c.name.toLowerCase().includes(query) || 
                (c.tag && c.tag.toLowerCase().includes(query))
            );
        }

        // Advanced Filters
        const currencyFilter = document.getElementById('filterRatioCurrency')?.value;
        if (currencyFilter) {
            clients = clients.filter(c => (c.currency || 'INR') === currencyFilter);
        }

        const minMarginFilter = document.getElementById('filterRatioMinMargin')?.value;
        if (minMarginFilter !== undefined && minMarginFilter !== '') {
            const minMargin = parseFloat(minMarginFilter);
            clients = clients.filter(c => (c.marginPercent || 0) >= minMargin);
        }

        const hairTypeFilter = document.getElementById('filterRatioHairType')?.value;
        if (hairTypeFilter) {
            clients = clients.filter(c => {
                const supId = c.raw_supplier_id || c.supplierId || (c.matrix ? null : null);
                if (!supId) return false;
                const sup = (db.suppliers || []).find(s => s.id === supId);
                const ht = sup ? (sup.hairType || 'Regular') : 'Regular';
                return ht === hairTypeFilter;
            });
        }
        
        countSpan.textContent = clients.length + (clients.length === 1 ? ' Preset' : ' Presets');

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500">No saved presets found.</td></tr>';
            _updateRatioSelectionUI();
            return;
        }

        // Group clients by tag
        const groupedClients = {};
        clients.forEach(c => {
            let tagStr = (c.tag && c.tag.trim() !== '') ? c.tag.toUpperCase() : 'UNTAGGED';
            let tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
            if (tags.length === 0) tags = ['UNTAGGED'];

            tags.forEach(t => {
                let tag = t;
                if (window.location.pathname.includes('hairwise.html')) {
                    const supId = c.raw_supplier_id || c.supplierId || null;
                    const sup = (db.suppliers || []).find(s => s.id === supId);
                    const ht = sup ? (sup.hairType || 'Regular') : 'Regular';
                    tag = `${ht} - ${tag}`;
                }
                if (!groupedClients[tag]) groupedClients[tag] = [];
                groupedClients[tag].push(c);
            });
        });

        // Sort tags (push UNTAGGED to end, alphabetize others)
        const sortedTags = Object.keys(groupedClients).sort((a, b) => {
            if (a === 'UNTAGGED') return 1;
            if (b === 'UNTAGGED') return -1;
            return a.localeCompare(b);
        });

        // Array to manage accordion behavior across all groups
        const accordionControllers = [];

        sortedTags.forEach((tag, index) => {
            // Sort presets within the group by currency, then name
            groupedClients[tag].sort((a, b) => {
                const currencyA = a.currency || 'INR';
                const currencyB = b.currency || 'INR';
                if (currencyA !== currencyB) {
                    return currencyA.localeCompare(currencyB);
                }
                return a.name.localeCompare(b.name);
            });

            // Create Group Header Row
            const headerTr = document.createElement('tr');
            headerTr.className = 'group-header-row bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors border-y border-slate-200';
            headerTr.innerHTML = `
                <td colspan="4" class="p-3">
                    <div class="flex items-center gap-2 font-bold text-slate-700 text-sm">
                        <i class="fa-solid fa-chevron-down transition-transform duration-200 group-icon" style="font-size: 10px;"></i>
                        <span class="tracking-wide">${tag}</span> 
                        <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-1">${groupedClients[tag].length}</span>
                    </div>
                </td>
            `;
            tbody.appendChild(headerTr);

            // Default accordion state: first group expanded, rest collapsed
            let isCollapsed = index !== 0; 
            const rowElements = [];

            groupedClients[tag].forEach(client => {
                const isChecked = _selectedRatioNames.has(client.name);
                const tr = document.createElement('tr');
                tr.className = `hover:bg-slate-50 transition-colors relative z-10 hover:z-50${isChecked ? ' bg-indigo-50' : ''}`;
                tr.dataset.ratioName = client.name;
                tr.innerHTML = `
                    <td class="p-4" style="vertical-align: middle;">
                        <input type="checkbox" class="ratio-row-checkbox" data-ratio-name="${client.name.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #4f46e5;">
                    </td>
                    <td class="p-4" data-label="Ratio Name / Client">
                        <div class="font-bold text-slate-800">
                            ${client.name}
                            ${client.tag ? client.tag.split(',').map(t => '<span class="px-2 py-0.5 ml-2 bg-indigo-100 text-indigo-700 text-xs rounded-full uppercase tracking-wider">' + t.trim() + '</span>').join('') : ''}
                        </div>
                        ${window.location.pathname.includes('hairwise.html') ? '' : `<div class="text-xs text-slate-500 mt-1">
                            Currency: ${client.currency || 'INR'} | Margin: ${client.marginType === 'amount' ? client.marginAmount : (client.marginPercent || 0) + '%'} | Wastage: ${client.wastagePercent || 0}% | Wash: ${client.machineCharge || 0} | Weft Wastage: ${client.weftingWastagePercent || 0}% | Weft Charge: ${client.weftingCharge || 0}
                            ${client.customPricesEnabled ? ' | Custom Prices Enabled' : ''}
                        </div>`}
                    </td>
                    <td class="p-4 text-sm text-slate-600" data-label="Date">${new Date().toLocaleDateString('en-IN')}</td>
                    <td class="p-4 text-right space-x-2 relative" data-label="Actions">
                        <!-- Share Dropdown -->
                        <div class="relative group inline-block text-left z-20">
                            <button class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded text-sm transition flex items-center gap-1">
                                <i class="fa-solid fa-share-nodes"></i> Share <i class="fa-solid fa-chevron-down text-[10px]"></i>
                            </button>
                            <div class="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden action-dropdown">
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 transition w-full border-b border-slate-100" onclick="sharePriceListFromRatioTab('${client.name.replace(/'/g, "\\'")}')" >Price Lists</button>
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 transition w-full" onclick="shareRatioFromTab('${client.name.replace(/'/g, "\\'")}')" >Ratio</button>
                            </div>
                        </div>
                        
                        ${window.location.pathname.includes('hairwise.html') ? '' : `
                        <!-- Edit/Delete Dropdown -->
                        <div class="relative group inline-block text-left z-20">
                            <button class="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded text-sm transition flex items-center gap-1">
                                <i class="fa-solid fa-ellipsis"></i> Manage <i class="fa-solid fa-chevron-down text-[10px]"></i>
                            </button>
                            <div class="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden action-dropdown">
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 transition w-full border-b border-slate-100 flex items-center gap-2" onclick="loadRatioFromTab('${client.name.replace(/'/g, "\'")}')" ><i class="fa-solid fa-pen-to-square w-4"></i> Edit</button>
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 transition w-full border-b border-slate-100 flex items-center gap-2" onclick="editTagsFromTab('${client.name.replace(/'/g, "\'")}')" ><i class="fa-solid fa-tags w-4"></i> Edit Tags</button>
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 transition w-full border-b border-slate-100 flex items-center gap-2" onclick="renameRatioFromTab('${client.name.replace(/'/g, "\'")}')" ><i class="fa-solid fa-i-cursor w-4"></i> Rename</button>
                                <button class="px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 transition w-full flex items-center gap-2" onclick="deleteRatioFromTab('${client.name.replace(/'/g, "\'")}')" ><i class="fa-solid fa-trash w-4"></i> Delete</button>
                            </div>
                        </div>`}
                    </td>
                `;
                
                // Set initial display based on collapse state
                tr.style.display = isCollapsed ? 'none' : '';
                rowElements.push(tr);
                tbody.appendChild(tr);
            });

            const icon = headerTr.querySelector('.group-icon');
            if (icon && isCollapsed) icon.style.transform = 'rotate(-90deg)';

            const collapseGroup = () => {
                if (!isCollapsed) {
                    isCollapsed = true;
                    if (icon) icon.style.transform = 'rotate(-90deg)';
                    rowElements.forEach(r => r.style.display = 'none');
                }
            };

            const expandGroup = () => {
                if (isCollapsed) {
                    isCollapsed = false;
                    if (icon) icon.style.transform = 'rotate(0deg)';
                    rowElements.forEach(r => r.style.display = '');
                }
            };

            accordionControllers.push({ tag, collapseGroup, expandGroup });

            // Group Toggle Logic
            headerTr.addEventListener('click', () => {
                if (isCollapsed) {
                    expandGroup();
                } else {
                    // Allow toggling closed manually too
                    collapseGroup();
                }
            });
        });

        // Wire checkbox events
        tbody.querySelectorAll('.ratio-row-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const name = cb.dataset.ratioName;
                if (cb.checked) {
                    _selectedRatioNames.add(name);
                    cb.closest('tr').classList.add('bg-indigo-50');
                } else {
                    _selectedRatioNames.delete(name);
                    cb.closest('tr').classList.remove('bg-indigo-50');
                }
                _updateRatioSelectionUI();
            });
        });

        _updateRatioSelectionUI();
    }

    // Since these functions are called from inline onclick handlers in the new tab, define them on window
    window.toggleSelectAllRatios = function(checked) {
        document.querySelectorAll('.ratio-row-checkbox').forEach(cb => {
            cb.checked = checked;
            const name = cb.dataset.ratioName;
            if (checked) {
                _selectedRatioNames.add(name);
                cb.closest('tr').classList.add('bg-indigo-50');
            } else {
                _selectedRatioNames.delete(name);
                cb.closest('tr').classList.remove('bg-indigo-50');
            }
        });
        _updateRatioSelectionUI();
    };

    window.clearRatioSelection = function() {
        _selectedRatioNames.clear();
        document.querySelectorAll('.ratio-row-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('tr').classList.remove('bg-indigo-50');
        });
        const selectAll = document.getElementById('selectAllRatios');
        if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
        _updateRatioSelectionUI();
    };

    window._exportCurrencyCode = '';
    window._exportExchangeRate = 1;

    window.handleExportCurrencyChange = async function(currency) {
        window._exportCurrencyCode = currency;
        const rateContainer = document.getElementById('exportExchangeRateContainer');
        const rateInput = document.getElementById('exportExchangeRateInput');

        if (!currency || currency === 'INR') {
            window._exportExchangeRate = 1;
            if (rateContainer) rateContainer.style.display = 'none';
            if (rateInput) rateInput.value = '';
            return;
        }
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/INR`);
            const data = await res.json();
            const rate = data.rates[currency];
            if (rate) {
                window._exportExchangeRate = rate;
                if (rateContainer) rateContainer.style.display = 'flex';
                if (rateInput) rateInput.value = (1 / rate).toFixed(2);
            } else {
                alert(`Could not fetch rate for ${currency}`);
                document.getElementById('exportCurrencySelect').value = '';
                window._exportCurrencyCode = '';
                window._exportExchangeRate = 1;
                if (rateContainer) rateContainer.style.display = 'none';
            }
        } catch (e) {
            console.error("Rate fetch error:", e);
            alert("Failed to fetch exchange rate.");
            document.getElementById('exportCurrencySelect').value = '';
            window._exportCurrencyCode = '';
            window._exportExchangeRate = 1;
            if (rateContainer) rateContainer.style.display = 'none';
        }
    };

    window.handleExportRateChange = function(val) {
        const rate = parseFloat(val);
        if (!isNaN(rate) && rate > 0) {
            window._exportExchangeRate = 1 / rate;
        }
    };

    // Export selected ratios as a TSV comparison sheet
    window.exportSelectedRatiosToSheet = async function() {
        const exportUnit = document.getElementById('exportMultiUnitSelect') ? document.getElementById('exportMultiUnitSelect').value : 'kg';
        const exportGramsInputs = document.querySelectorAll('#exportMultiGramsList .gram-val-input');
        const exportGramsArray = Array.from(exportGramsInputs).map(i => parseFloat(i.value)).filter(n => !isNaN(n) && n > 0);
        if (exportGramsArray.length === 0) exportGramsArray.push(100);

        if (_selectedRatioNames.size === 0) return alert('Please select at least one ratio to export.');

        const selectedNames = Array.from(_selectedRatioNames);
        // Save current appState snapshot to restore later
        const savedState = JSON.parse(JSON.stringify(appState));

        // For each ratio, compute prices for all FINISHED_LENGTHS
        const ratioResults = []; // [ { name, currency, prices: { len: price } } ]

        for (const name of selectedNames) {
            const client = (db.clients || []).find(c => c.name === name);
            if (!client) continue;

            // Temporarily apply this client's config to appState for calculateColumn to work
            appState.matrix = JSON.parse(JSON.stringify(client.matrix || {}));
            appState.discountPercent = parseFloat(document.getElementById('exportDiscountPercentInput').value) || 0;
            appState.discountAmount = parseFloat(document.getElementById('exportDiscountAmountInput').value) || 0;
            appState.marginPercent = client.marginPercent !== undefined ? client.marginPercent : 30;

            appState.wastagePercent = client.wastagePercent !== undefined ? client.wastagePercent : 10;
            appState.machineCharge = client.machineCharge !== undefined ? client.machineCharge : 2500;
            appState.weftingWastagePercent = client.weftingWastagePercent || 0;
            appState.weftingCharge = client.weftingCharge || 0;
            appState.exchangeRate = client.exchangeRate || 1;
            appState.customPricesEnabled = client.customPricesEnabled || false;
            appState.customPrices = JSON.parse(JSON.stringify(client.customPrices || {}));
            appState.individualMargins = JSON.parse(JSON.stringify(client.individualMargins || {}));

            const currentRatioCurrency = client.currency || 'INR';
            const currentRatioRate = client.exchangeRate || 1;
            
            const targetCurrency = window._exportCurrencyCode || currentRatioCurrency;
            const targetRate = window._exportExchangeRate || currentRatioRate;
            
            appState.exchangeRate = targetRate;

            // Load supplier prices if available
            if (client.supplierId && db.suppliers.find(s => s.id === client.supplierId)) {
                const sup = db.suppliers.find(s => s.id === client.supplierId);
                appState.prices = { ...(sup.prices || {}) };
                appState.currentSupplierId = client.supplierId;
            }

            const prices = {};
            ALL_FINISHED_LENGTHS.forEach((len) => {
            const idx = len;
                let displayPrice = 0;
                if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                    let baseINR = appState.customPrices[idx] / currentRatioRate;
                    displayPrice = Math.round(baseINR * targetRate);
                } else {
                    displayPrice = calculateColumn(idx);
                }
                if (displayPrice && displayPrice > 0) prices[len] = displayPrice;
            });

            ratioResults.push({
                name: client.name,
                tag: client.tag || '',
                currency: targetCurrency,
                marginType: client.marginType || 'percent',
                marginAmount: client.marginAmount || 0,
                marginPercent: client.marginPercent || 0,
                discountPercent: parseFloat(document.getElementById('exportDiscountPercentInput').value) || 0,
                discountAmount: parseFloat(document.getElementById('exportDiscountAmountInput').value) || 0,
                wastagePercent: client.wastagePercent || 0,
                machineCharge: client.machineCharge || 0,
                prices,
                clientExportUnit: client.exportUnit || 'kg',
                clientExportGrams: (client.exportGrams && client.exportGrams.length) ? client.exportGrams : [100],
                outputUnit: client.outputUnit || null // For composite products
            });
        }

        // Restore original appState (non-destructive)
        Object.assign(appState, savedState);

        if (ratioResults.length === 0) return alert('No data could be computed for the selected ratios.');

        // Determine which lengths have data in at least one ratio
        const activeLengths = ALL_FINISHED_LENGTHS.filter(len =>
            ratioResults.some(r => r.prices[len] && r.prices[len] > 0)
        );

        // Build TSV: first row = headers, subsequent rows = lengths + prices
        const headerRow = ['Length (")'];
        ratioResults.forEach(r => {
            const baseName = r.name + (r.tag ? ` [${r.tag}]` : '');
            let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
            let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
            // Composite products might have outputUnit='pc'
            if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
            if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

            if (rExportUnit === 'kg') {
                headerRow.push(baseName + ' per kg');
            } else {
                let isPieces = rExportUnit === 'pieces';
                rExportGrams.forEach(g => headerRow.push(`${baseName} per ${isPieces ? '1 pc (' + g + 'g)' : g + 'g'}`));
            }
        });
        const rows = [headerRow];

        // Second row: metadata (currency + margin)
        const metaRow = ['Settings'];
        ratioResults.forEach(r => {
            const marginStr = r.marginType === 'amount' ? r.marginAmount : `${r.marginPercent}%`;
            const meta = `${r.currency} | Margin:${marginStr} | Disc:${r.discountPercent || 0}%/-${r.discountAmount || 0} | Wastage:${r.wastagePercent}% | Wash:${r.machineCharge}`;
            let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
            let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
            if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
            if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

            if (rExportUnit === 'kg') {
                metaRow.push(meta);
            } else {
                rExportGrams.forEach(g => metaRow.push(meta));
            }
        });
        rows.push(metaRow);

        activeLengths.forEach(len => {
            const row = [len + '"'];
            ratioResults.forEach(r => {
                const price = r.prices[len];
                let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

                if (rExportUnit === 'kg' || r.outputUnit === 'pc') {
                    // if it's already a composite product with outputUnit 'pc', it's essentially per piece already (at whatever its total weight is).
                    // We'll treat composite 'pc' like 'kg' for column count (1 column), but we won't divide it further. 
                    row.push(price != null && price > 0 ? price : '-');
                } else {
                    rExportGrams.forEach(g => {
                        if (price != null && price > 0) {
                            row.push(((price / 1000) * g).toFixed(2));
                        } else {
                            row.push('-');
                        }
                    });
                }
            });
            rows.push(row);
        });

        const tsv = rows.map(r => r.join('\t')).join('\n');

        // Try copying to clipboard; fallback to CSV download
        try {
            await navigator.clipboard.writeText(tsv);
            // Show success toast
            _showExportSuccess(`✓ Copied! ${ratioResults.length} ratios × ${activeLengths.length} lengths — paste into Google Sheets`);
        } catch(e) {
            // Fallback: download as CSV
            const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0,10);
            link.href = url;
            link.download = `ratio_comparison_${date}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            _showExportSuccess(`✓ Downloaded CSV — ${ratioResults.length} ratios × ${activeLengths.length} lengths`);
        }
    };

    window.exportSelectedRatiosToImage = async function(mode = 'download') {
        const exportUnit = document.getElementById('exportMultiUnitSelect') ? document.getElementById('exportMultiUnitSelect').value : 'kg';
        const exportGramsInputs = document.querySelectorAll('#exportMultiGramsList .gram-val-input');
        const exportGramsArray = Array.from(exportGramsInputs).map(i => parseFloat(i.value)).filter(n => !isNaN(n) && n > 0);
        if (exportGramsArray.length === 0) exportGramsArray.push(100);

        const isGrams = exportUnit === 'grams';
        const isPieces = exportUnit === 'pieces';
        const isOriginal = exportUnit === 'original';

        if (_selectedRatioNames.size === 0) return alert('Please select at least one ratio to export.');

        const selectedNames = Array.from(_selectedRatioNames);
        const savedState = JSON.parse(JSON.stringify(appState));
        const ratioResults = [];

        for (const name of selectedNames) {
            const client = (db.clients || []).find(c => c.name === name);
            if (!client) continue;

            appState.matrix = JSON.parse(JSON.stringify(client.matrix || {}));
            appState.discountPercent = parseFloat(document.getElementById('exportDiscountPercentInput').value) || 0;
            appState.discountAmount = parseFloat(document.getElementById('exportDiscountAmountInput').value) || 0;
            appState.marginPercent = client.marginPercent !== undefined ? client.marginPercent : 30;

            appState.wastagePercent = client.wastagePercent !== undefined ? client.wastagePercent : 10;
            appState.machineCharge = client.machineCharge !== undefined ? client.machineCharge : 2500;
            appState.weftingWastagePercent = client.weftingWastagePercent || 0;
            appState.weftingCharge = client.weftingCharge || 0;
            appState.exchangeRate = client.exchangeRate || 1;
            appState.customPricesEnabled = client.customPricesEnabled || false;
            appState.customPrices = JSON.parse(JSON.stringify(client.customPrices || {}));
            appState.individualMargins = JSON.parse(JSON.stringify(client.individualMargins || {}));

            const currentRatioCurrency = client.currency || 'INR';
            const currentRatioRate = client.exchangeRate || 1;
            
            const targetCurrency = window._exportCurrencyCode || currentRatioCurrency;
            const targetRate = window._exportExchangeRate || currentRatioRate;
            
            appState.exchangeRate = targetRate;

            if (client.supplierId && db.suppliers.find(s => s.id === client.supplierId)) {
                const sup = db.suppliers.find(s => s.id === client.supplierId);
                appState.prices = { ...(sup.prices || {}) };
                appState.currentSupplierId = client.supplierId;
            }

            const prices = {};
            ALL_FINISHED_LENGTHS.forEach((len) => {
                const idx = len;
                let displayPrice = 0;
                if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                    let baseINR = appState.customPrices[idx] / currentRatioRate;
                    displayPrice = Math.round(baseINR * targetRate);
                } else {
                    displayPrice = calculateColumn(idx);
                }
                if (displayPrice && displayPrice > 0) prices[len] = displayPrice;
            });

            ratioResults.push({
                name: client.name,
                tag: client.tag || '',
                currency: targetCurrency,
                marginPercent: client.marginPercent || 0,
                discountPercent: parseFloat(document.getElementById('exportDiscountPercentInput').value) || 0,
                discountAmount: parseFloat(document.getElementById('exportDiscountAmountInput').value) || 0,
                wastagePercent: client.wastagePercent || 0,
                machineCharge: client.machineCharge || 0,
                prices,
                clientExportUnit: client.exportUnit || 'kg',
                clientExportGrams: (client.exportGrams && client.exportGrams.length) ? client.exportGrams : [100],
                outputUnit: client.outputUnit || null
            });
        }

        Object.assign(appState, savedState);

        if (ratioResults.length === 0) return alert('No data could be computed for the selected ratios.');

        // Sort by drawn type
        ratioResults.sort((a, b) => {
            const getRank = (name) => {
                const n = name.toLowerCase();
                if (n.includes('super double drawn')) return 3;
                if (n.includes('double drawn')) return 2;
                if (n.includes('single drawn')) return 1;
                return 4;
            };
            return getRank(a.name) - getRank(b.name);
        });

        const activeLengths = ALL_FINISHED_LENGTHS.filter(len =>
            ratioResults.some(r => r.prices[len] && r.prices[len] > 0)
        );

        // Extract common first word
        let globalFirstWord = '';
        if (ratioResults.length > 0) {
            const potentialFirstWord = ratioResults[0].name.trim().split(/\s+/)[0];
            const isCommonFirstWord = ratioResults.every(r => r.name.trim().split(/\s+/)[0].toLowerCase() === potentialFirstWord.toLowerCase());
            if (isCommonFirstWord && potentialFirstWord) {
                globalFirstWord = potentialFirstWord.toUpperCase();
                ratioResults.forEach(r => {
                    r.originalName = r.name; // Save for image matching
                    r.name = r.name.trim().split(/\s+/).slice(1).join(' ');
                });
            }
        }

        // Find common word prefix (up to 3 words)
        let commonWords = [];
        if (ratioResults.length > 0) {
            const firstWords = ratioResults[0].name.trim().split(/\s+/);
            for (let i = 0; i < Math.min(3, firstWords.length); i++) {
                const word = firstWords[i];
                const isCommon = ratioResults.every(r => {
                    const rWords = r.name.trim().split(/\s+/);
                    return rWords[i] && rWords[i].toLowerCase() === word.toLowerCase();
                });
                if (isCommon) {
                    commonWords.push(word);
                } else {
                    break;
                }
            }
        }
        const commonTitle = commonWords.length > 0 ? commonWords.join(' ') : 'Combined Price List Comparison';

        ratioResults.forEach(r => {
            r.displayName = r.name.replace(/\bINR\b/gi, '').replace(new RegExp('\\b' + r.currency + '\\b', 'gi'), '').trim();
        });

        // Generate HTML table for image
        const _hex = appState.accentColor || '#4f46e5';
        const _r = parseInt(_hex.slice(1,3),16), _g = parseInt(_hex.slice(3,5),16), _b = parseInt(_hex.slice(5,7),16);
        const _bg = `rgba(${_r},${_g},${_b},0.10)`;

        const isBleachable = selectedNames.every(name => {
            const c = (db.clients || []).find(cl => cl.name === name);
            if (!c) return false;
            const sup = db.suppliers.find(s => s.id === (c.supplierId || c.raw_supplier_id || appState.currentSupplierId));
            return sup && sup.hairType === 'Bleachable';
        });

        let imagesHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                <img src="../images/hw/hwstraightlogo.png" style="height: 45px;" />
                <div style="font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 1.5px; text-transform: uppercase;">
                    NEW DELHI <span style="color: #cbd5e1; margin: 0 4px;">|</span> NEW JERSEY <span style="color: #cbd5e1; margin: 0 4px;">|</span> FLORIDA
                </div>
            </div>
        `;

        let footerInfoHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 500;">
                    <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Generated: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}
                </div>
                ${globalFirstWord ? `<div style="font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">${globalFirstWord}</div>` : ''}
                <div style="font-size: 12px; color: #94a3b8; font-weight: 700;">
                    ${(function() {
                        const __d = new Date();
                        const __dd = String(__d.getDate()).padStart(2, '0');
                        const __mm = String(__d.getMonth() + 1).padStart(2, '0');
                        const __yy = String(__d.getFullYear()).slice(-2);
                        let _discVal = 0;
                        const inputEl = document.getElementById('exportDiscountPercentInput');
                        if (inputEl && inputEl.value) {
                            _discVal = parseFloat(inputEl.value) || 0;
                        } else if (typeof appState !== 'undefined' && appState.discountPercent) {
                            _discVal = appState.discountPercent;
                        }
                        _discVal = Math.round(_discVal);
                        const _discStr = _discVal < 0 ? '-' + String(Math.abs(_discVal)).padStart(3, '0') : String(Math.abs(_discVal)).padStart(3, '0');
                        return `${__dd}${__mm}${__yy}/${_discStr}`;
                    })()}
                </div>
            </div>
        `;

        let footerHTML = footerInfoHTML;
        const isVirgin = commonTitle.toLowerCase().includes('virgin') || ratioResults.some(r => r.name.toLowerCase().includes('virgin'));
        const isRemy = commonTitle.toLowerCase().includes('remy') || ratioResults.some(r => r.name.toLowerCase().includes('remy'));
        if (isVirgin || isRemy) {
            const bleachableTo = isVirgin ? '#613/60' : '#22/27';
            footerHTML = `
                <div style="margin-top: 15px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;">
                    <div style="font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: inline-block;">Important Information</div>
                    <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-weight: 500; font-size: 12px;">
                        <tr>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</td>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</td>
                        </tr>
                        <tr>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${isOriginal ? 'original unit' : (isPieces ? 'piece' : (isGrams ? `${exportGramsArray.join(', ')} grams` : 'kilogram'))}</td>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</td>
                        </tr>
                        <tr>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</td>
                            <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</td>
                        </tr>
                    </table>
                </div>
                ${footerInfoHTML}
            `;
        }

        const includeImagesEl = document.getElementById('exportIncludeImageToggle');
        const includeImages = includeImagesEl ? includeImagesEl.checked : true;
        
        let containerContentHTML = '';
        if (includeImages) {
            containerContentHTML = `
                <div style="width: max-content; min-width: 100%; max-width: none; margin: 0 auto 12px auto; display: flex; justify-content: center; align-items: stretch; gap: 20px;">
                    ${ratioResults.map(r => {
                        let rowsHTML = '';
                        activeLengths.forEach((len, i) => {
                            const bgStr = i % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
                            const cmLen = len * 2.5;
                            const rawPrice = r.prices[len];
                            
                            rowsHTML += `<tr style="${bgStr}">
                                <td style="padding: 8px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                                <td style="padding: 8px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen} cm</td>`;
                            
                            let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                            let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                            if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                            if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

                            if (rExportUnit === 'kg' || r.outputUnit === 'pc') {
                                let formattedPrice = '-';
                                if (rawPrice && parseFloat(rawPrice) > 0) {
                                    const priceWithSymbol = formatPriceWithSymbol(parseFloat(rawPrice), r.currency);
                                    let suffix = r.outputUnit === 'pc' ? '/pc' : '/kg';
                                    formattedPrice = `${priceWithSymbol} <span style="font-size:11px; font-weight:500; color:#64748b;">${suffix}</span>`;
                                }
                                rowsHTML += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a;">${formattedPrice}</td>`;
                            } else {
                                let isPieces = rExportUnit === 'pieces';
                                rExportGrams.forEach((g, gIdx) => {
                                    let formattedPrice = '-';
                                    if (rawPrice && parseFloat(rawPrice) > 0) {
                                        let finalPrice = (parseFloat(rawPrice) / 1000) * g;
                                        const priceWithSymbol = formatPriceWithSymbol(finalPrice, r.currency);
                                        let unitSuffix = isPieces ? `/pc` : `/${g}g`;
                                        formattedPrice = `${priceWithSymbol} <span style="font-size:11px; font-weight:500; color:#64748b;">${unitSuffix}</span>`;
                                    }
                                    const bRight = gIdx === rExportGrams.length - 1 ? '' : 'border-right: 1px solid #f1f5f9;';
                                    rowsHTML += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; ${bRight}">${formattedPrice}</td>`;
                                });
                            }
                            rowsHTML += `</tr>`;
                        });
                        
                        let isRVirgin = r.name.toLowerCase().includes('virgin');
                        let isRRemy = r.name.toLowerCase().includes('remy');
                        if (r.bundleComponents && r.bundleComponents.length > 1) {
                            isRVirgin = false;
                            isRRemy = false;
                            const secondC = r.bundleComponents[1];
                            const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
                            if (cname.includes('virgin')) isRVirgin = true;
                            if (cname.includes('remy')) isRRemy = true;
                        }
                        let stampInfo = '';
                        if (isRVirgin) {
                            stampInfo = `<img src="../images/hw/bleachable.png?v=3" style="height: 120px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
                        } else if (isRRemy) {
                            stampInfo = `<img src="../images/hw/bleachable27.png?v=3" style="height: 120px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
                        }
                        
                        let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                        let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                        if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                        if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

                        let priceHeaders = '';
                        if (rExportUnit === 'kg' || r.outputUnit === 'pc') {
                            let suffix = r.outputUnit === 'pc' ? '/pc' : '/kg';
                            priceHeaders = `<th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${r.currency} ${suffix}</span></th>`;
                        } else {
                            let isPieces = rExportUnit === 'pieces';
                            priceHeaders = rExportGrams.map((g, gIdx) => {
                                const bRight = gIdx === rExportGrams.length - 1 ? '' : 'border-right: 1px solid #e2e8f0;';
                                return `<th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap; ${bRight}">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${r.currency} (${isPieces ? `1 pc - ${g}g` : `${g}g`})</span></th>`;
                            }).join('');
                        }
                        
                        let numPriceCols = (rExportUnit === 'kg' || r.outputUnit === 'pc') ? 1 : rExportGrams.length;
                        const imgHTML = window.getProductImageHTML(r.originalName || r.name, 'auto');
                        
                        return `
                        <div style="display: flex; flex-direction: column; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white; width: max-content;">
                            <div style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; width: 100%;">
                                    <img src="../images/hw/100percent.png?v=3" style="height: 120px; width: auto; max-width: 100%; object-fit: contain;" alt="100% Authentic Human Hair" />
                                    ${stampInfo}
                                </div>
                                <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    ${renderNameWithLogo(r.displayName, '14px')}
                                    <span style="color: #16a34a;">(${({'USD':'$','EUR':'€','GBP':'£','INR':'₹'})[r.currency] || r.currency})</span>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: center; align-items: stretch; flex-grow: 1;">
                                <div style="flex-grow: 1;">
                                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 14px; background: transparent;">
                                        <thead>
                                            <tr>
                                                <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in inches</span></th>
                                                <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in cm</span></th>
                                                ${priceHeaders}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rowsHTML}
                                        </tbody>
                                    </table>
                                </div>
                                ${imgHTML ? `<div style="flex: 0 0 250px; display: flex; align-items: stretch; justify-content: center; padding: 0; background: #ffffff; border-left: 2px solid #e2e8f0;">
                                    ${imgHTML.replace(/style="[^"]*"/, 'style="width: 100%; height: 100%; max-height: none; object-fit: contain;"')}
                                </div>` : ''}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            let singleTableRows = '';
            activeLengths.forEach((len, i) => {
                const bgStr = i % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
                const cmLen = len * 2.5;
                singleTableRows += `<tr style="${bgStr}">
                    <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen} cm</td>`;
                
                ratioResults.forEach(r => {
                    const rawPrice = r.prices[len];
                    let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                    let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                    if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                    if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

                    if (rExportUnit === 'kg' || r.outputUnit === 'pc') {
                        let formattedPrice = '-';
                        if (rawPrice && parseFloat(rawPrice) > 0) {
                            const priceWithSymbol = formatPriceWithSymbol(parseFloat(rawPrice), r.currency);
                            let suffix = r.outputUnit === 'pc' ? '/pc' : '/kg';
                            formattedPrice = `${priceWithSymbol} <span style="font-size:11px; font-weight:500; color:#64748b;">${suffix}</span>`;
                        }
                        singleTableRows += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; border-right: 1px solid #e2e8f0;">${formattedPrice}</td>`;
                    } else {
                        let isPieces = rExportUnit === 'pieces';
                        rExportGrams.forEach(g => {
                            let formattedPrice = '-';
                            if (rawPrice && parseFloat(rawPrice) > 0) {
                                let finalPrice = (parseFloat(rawPrice) / 1000) * g;
                                const priceWithSymbol = formatPriceWithSymbol(finalPrice, r.currency);
                                let unitSuffix = isPieces ? `/pc` : `/${g}g`;
                                formattedPrice = `${priceWithSymbol} <span style="font-size:11px; font-weight:500; color:#64748b;">${unitSuffix}</span>`;
                            }
                            singleTableRows += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; border-right: 1px solid #e2e8f0;">${formattedPrice}</td>`;
                        });
                    }
                });
                singleTableRows += `</tr>`;
            });
            
            containerContentHTML = `
                <div style="display: flex; justify-content: center; align-items: stretch; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white; width: max-content; margin: 0 auto; margin-bottom: 12px;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 14px; background: transparent;">
                        <thead>
                            <tr>
                                <th colspan="2" rowspan="2" style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: middle; text-transform: uppercase;">
                                    Finished<br>Length
                                </th>
                                ${ratioResults.map(r => {
                                    let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                                    let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                                    if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                                    if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';
                                    let numPriceCols = (rExportUnit === 'kg' || r.outputUnit === 'pc') ? 1 : rExportGrams.length;
                                    let isRVirgin = r.name.toLowerCase().includes('virgin');
                                    let isRRemy = r.name.toLowerCase().includes('remy');
                                    if (r.bundleComponents && r.bundleComponents.length > 1) {
                                        isRVirgin = false;
                                        isRRemy = false;
                                        const secondC = r.bundleComponents[1];
                                        const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
                                        if (cname.includes('virgin')) isRVirgin = true;
                                        if (cname.includes('remy')) isRRemy = true;
                                    }
                                    let stampInfo = '';
                                    if (isRVirgin) {
                                        stampInfo = `<img src="../images/hw/bleachable.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
                                    } else if (isRRemy) {
                                        stampInfo = `<img src="../images/hw/bleachable27.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
                                    }
                                    return `<th colspan="${numPriceCols}" style="padding: 16px 10px; background: #faf0e6; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; width: 100%;">
                                            <img src="../images/hw/100percent.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="100% Authentic Human Hair" />
                                            ${stampInfo}
                                        </div>
                                        <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                            ${renderNameWithLogo(r.displayName, '14px')}
                                            <span style="color: #16a34a;">(${({'USD':'$','EUR':'€','GBP':'£','INR':'₹'})[r.currency] || r.currency})</span>
                                        </div>
                                    </th>`;
                                }).join('')}
                            </tr>
                            <tr>
                                ${ratioResults.map(r => {
                                    let rExportUnit = exportUnit === 'original' ? r.clientExportUnit : exportUnit;
                                    let rExportGrams = exportUnit === 'original' ? r.clientExportGrams : exportGramsArray;
                                    if (exportUnit === 'original' && r.outputUnit === 'pc') rExportUnit = 'pieces';
                                    if (exportUnit === 'original' && r.outputUnit === 'kg') rExportUnit = 'kg';

                                    if (rExportUnit === 'kg' || r.outputUnit === 'pc') {
                                        let suffix = r.outputUnit === 'pc' ? '/pc' : '/kg';
                                        return `<th style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${r.currency} ${suffix}</span></th>`;
                                    } else {
                                        let isPieces = rExportUnit === 'pieces';
                                        return rExportGrams.map((g, gIdx) => {
                                            return `<th style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${r.currency} (${isPieces ? `1 pc - ${g}g` : `${g}g`})</span></th>`;
                                        }).join('');
                                    }
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${singleTableRows}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const displayHTML = `
            <div id="export-combined-preview" style="position: relative; background: ${_bg}; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; min-width: ${300 + ratioResults.length * 150}px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                ${imagesHTML}

                
                ${containerContentHTML}
                
                ${footerHTML}
            </div>
        `;

        if (mode === 'preview') {
            const previewContainer = document.getElementById('multiExportPreviewContainer');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="font-size: 16px; font-weight: 700; color: #1e293b;">Preview Comparison</h3>
                            <button onclick="document.getElementById('multiExportPreviewContainer').style.display='none'" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; transition: color 0.2s;" onmouseover="this.style.color='#f43f5e'" onmouseout="this.style.color='#94a3b8'"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style="margin: 0 auto; width: max-content; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
                            ${displayHTML}
                        </div>
                        <div style="text-align: center; margin-top: 20px; display: flex; justify-content: center; gap: 10px;">
                            <button onclick="exportSelectedRatiosToImage('download')" style="display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(16,185,129,0.25);"><i class="fa-solid fa-download"></i> Share / Download</button>
                            <button onclick="exportSelectedRatiosToImage('copy')" style="display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; background: #eab308; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(234,179,8,0.25);"><i class="fa-solid fa-copy"></i> Copy to Clipboard</button>
                        </div>
                    </div>
                `;
                previewContainer.style.display = 'block';
            }
            return;
        }

        // Temporarily append to body to render and capture
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.innerHTML = displayHTML;
        document.body.appendChild(tempContainer);

        const node = document.getElementById('export-combined-preview');
        _showExportSuccess('Generating combined image... please wait.');
        
        try {
            const canvas = await html2canvas(node, {
                backgroundColor: '#ffffff',
                scale: 3
            });
            // Generate Intelligent Title
            const ratioNames = selectedNames.map(name => name.trim());
            let generatedTitle = 'Combined_PriceList';
            if (ratioNames.length === 1) {
                generatedTitle = ratioNames[0];
            } else if (ratioNames.length === 2) {
                generatedTitle = `${ratioNames[0]} & ${ratioNames[1]}`;
            } else if (ratioNames.length > 2) {
                generatedTitle = `${ratioNames[0]}, ${ratioNames[1]} & ${ratioNames.length - 2} More`;
            }

            if (mode === 'copy') {
                canvas.toBlob(async (blob) => {
                    try {
                        if (navigator.clipboard && window.ClipboardItem) {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            _showExportSuccess('✓ Copied Image to Clipboard!');
                        } else {
                            throw new Error('Clipboard API not supported');
                        }
                    } catch (err) {
                        console.error('Clipboard copy failed:', err);
                        alert('Failed to copy to clipboard. ' + err.message);
                    }
                });
            } else {
                const link = document.createElement('a');
                link.download = `${generatedTitle}.png`;
                link.href = canvas.toDataURL();
                link.click();
                _showExportSuccess('✓ Downloaded Combined Image Successfully!');
            }
        } catch (e) {
            console.error('Image generation failed', e);
            alert('Failed to generate image. ' + e.message);
        } finally {
            document.body.removeChild(tempContainer);
        }
    };

    function _showExportSuccess(msg) {
        const existing = document.getElementById('_ratioExportToast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = '_ratioExportToast';
        toast.style.cssText = `
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: white; padding: 12px 22px; border-radius: 10px;
            font-size: 14px; font-weight: 600; z-index: 9999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 10px;
            animation: _fadeInUp 0.3s ease;
        `;
        toast.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#4ade80;"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    window.loadRatioFromTab = function (clientName) {
        if (!clientName) return;
        const pl = (db.clients || []).find(c => c.name === clientName);
        if (pl && pl.tag === 'Composite') {
            window.openComposeProductModalForEdit(clientName);
            return;
        }
        switchTab('mixer');
        loadRatioConfig(clientName);
    };

    window.editTagsFromTab = function (clientName) {
        if (!clientName) return;
        const client = (db.clients || []).find(c => c.name === clientName);
        if (!client) return;

        const currentTags = client.tag || '';
        const newTags = prompt(`Enter tags for "${clientName}" (comma separated):`, currentTags);
        
        if (newTags === null) return;
        
        client.tag = newTags.trim();

        try {
            saveDB();
            try {
                const safeName = client.name.replace(/[^a-z0-9_\-\. ]/gi, '_');
                fetch('/api/save-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(client)
                }).catch(e => console.warn("Could not save to local server", e));
            } catch(e){}
            
            _showExportSuccess(`Tags updated for "${client.name}"`);
            if (typeof renderSavedRatios === 'function') renderSavedRatios();
            refreshRatioDropdown();
        } catch (e) {
            console.error("Failed to update tags:", e);
            alert("Error updating tags.");
        }
    };

    window.renameRatioFromTab = function (oldName) {
        if (!oldName) return;
        const newName = prompt(`Enter new name for "${oldName}":`, oldName);
        if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

        const trimmedName = newName.trim();
        
        // Check if name already exists
        if (db.clients.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`A ratio named "${trimmedName}" already exists.`);
            return;
        }

        // Find the client
        const client = db.clients.find(c => c.name === oldName);
        if (!client) return;

        // Delete old from server/local
        try {
            const safeOldName = oldName.replace(/[^a-z0-9_\-\. ]/gi, '_');
            fetch('/api/delete-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: `${safeOldName}.json` })
            }).catch(e => {});
        } catch(e) {}

        // Mark old as deleted for Firebase sync
        if (!db.deletedClients) db.deletedClients = [];
        db.deletedClients.push(oldName);

        // Update name
        client.name = trimmedName;

        // Remove from deleted array if exists (just in case)
        db.deletedClients = db.deletedClients.filter(n => n !== trimmedName);

        saveDB();

        // Save new to server/local
        try {
            const safeNewName = trimmedName.replace(/[^a-z0-9_\-\. ]/gi, '_');
            fetch('/api/save-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(client)
            }).catch(e => {});
        } catch(e) {}

        refreshRatioDropdown();
        renderSavedRatios();
    };

    window.deleteRatioFromTab = function (clientName) {
        if (!clientName) return;
        if (confirm(`Are you sure you want to delete "${clientName}"?`)) {
            db.clients = db.clients.filter(c => c.name !== clientName);
            if (!db.deletedClients) db.deletedClients = [];
            db.deletedClients.push(clientName);
            saveDB();

            try {
                // Key sanitization exactly like save-client
                const safeName = clientName.replace(/[^a-z0-9_\-\. ]/gi, '_');
                const filename = `${safeName}.json`;
                fetch('/api/delete-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                }).catch(e => console.warn("Could not delete from server", e));
            } catch(e) {}

            refreshRatioDropdown();
            renderSavedRatios();
        }
    };

    window.shareRatioFromTab = async function (clientName) {
        if (!clientName) return;

        // Remove any existing expanded preview rows
        document.querySelectorAll('.ratio-preview-row').forEach(row => row.remove());

        // Get the ratio config
        const client = (db.clients || []).find(c => c.name === clientName);
        if (!client || !client.matrix) return;

        // Load config into appState so calculateColumn works
        await loadRatioConfig(clientName);

        // Find which Finished Length columns actually have any percentages
        let activeCols = [];
        ACTIVE_FINISHED_LENGTHS.forEach((len) => {
            const idx = len;
            if (client.matrix[idx]) {
                const hasValue = Object.values(client.matrix[idx]).some(val => val > 0);
                if (hasValue) activeCols.push({ len, idx });
            }
        });

        if (activeCols.length === 0) {
            alert("This ratio matrix is empty and cannot be shared.");
            return;
        }

        // Find active raw length rows
        let activeRows = new Set();
        activeCols.forEach(col => {
            Object.keys(client.matrix[col.idx]).forEach(rowIdx => {
                if (client.matrix[col.idx][rowIdx] > 0) activeRows.add(parseInt(rowIdx));
            });
        });
        let sortedRows = Array.from(activeRows).sort((a, b) => a - b);

        // Accent background
        const _hex1 = appState.accentColor || '#4f46e5';
        const _r1 = parseInt(_hex1.slice(1,3),16), _g1 = parseInt(_hex1.slice(3,5),16), _b1 = parseInt(_hex1.slice(5,7),16);
        const _bg1 = `rgba(${_r1},${_g1},${_b1},0.10)`;

        // Hair type badge
        const _ratioSupplier = db.suppliers.find(s => s.id === (client.raw_supplier_id || appState.currentSupplierId));
        const _ratioHairType = _ratioSupplier ? (_ratioSupplier.hairType || 'Regular') : 'Regular';
        const _ratioHairLabel = _ratioHairType === 'Bleachable'
            ? 'Bleachable Hair · Bleachable to Color #613/60'
            : 'Regular Hair · Bleachable to Color #22/27';
        const _ratioHairBg = _ratioHairType === 'Bleachable' ? '#ede9fe' : '#fef3c7';
        const _ratioHairColor = _ratioHairType === 'Bleachable' ? '#7c3aed' : '#92400e';
        const _ratioHairBorder = _ratioHairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';

        const isRatioBleachable = _ratioHairType === 'Bleachable';
        let imagesHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                <img src="../images/hw/hwstraightlogo.png" style="height: 45px;" />
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="../images/hw/100percent.png?v=3" style="height: 100px; border-radius: 8px;" />
                    ${isRatioBleachable ? `<img src="../images/hw/bleachable.png?v=3" style="height: 100px; border-radius: 8px;" />` : ''}
                </div>
            </div>
        `;

        let displayHTML = `
            <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;">
                <div id="export-preview-ratio-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" class="preview-card-inner" style="background: ${_bg1}; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 600px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
                    ${imagesHTML}
                    <div style="text-align: center; margin-bottom: 12px;">
                        <h2 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.5px;">${renderNameWithLogo(clientName, '22px')}</h2>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 8px;">
                            <span><i class="fa-regular fa-calendar" style="margin-right:4px;"></i> Shared: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                        </div>
                        <span style="background: ${_ratioHairBg}; color: ${_ratioHairColor}; border: 1px solid ${_ratioHairBorder}; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">${_ratioHairLabel}</span>
                    </div>

                    <div style="display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap; justify-content: center;">

                        <!-- Ratio Matrix Only -->
                        <div>
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; text-align: center;">Ratio Matrix</div>
                            <table style="border-collapse: collapse; text-align: center; font-size: 13px; color: #334155;">
                                <thead>
                                    <tr>
                                        <th style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; color: #475569; position: static;">Len \\ Wght</th>
                                        ${activeCols.map(c => `<th style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; color: #475569; position: static;">${c.len}"</th>`).join('')}
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

                    </div>
                    <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px;">Generated by Ratio Mixer</div>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px;">
                <button id="downloadRatioPreviewBtn" class="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition shadow-md flex items-center justify-center mx-auto gap-2">
                    <i class="fa-solid fa-download"></i> Download Image
                </button>
            </div>
        `;

        // Find the tr of this item and insert preview row
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
                    scale: 3
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `${clientName}.png`;
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
                    Margin: ${pl.marginType === 'amount' ? pl.marginAmount : (pl.marginPercent || 0) + '%'} 
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


    let compositeComponentCounter = 0;
    
    window.createCompositeComponentHTML = function(name) {
        compositeComponentCounter++;
        let availableLengths = new Set();
        const client = (db.clients || []).find(c => c.name === name);
        if (!client) return '';
        
        if (client.matrix) {
            Object.keys(client.matrix).forEach(l => {
                const col = client.matrix[l];
                if (col && Object.values(col).some(v => v > 0)) {
                    availableLengths.add(Number(l));
                }
            });
        }
        if (client.customPricesEnabled && client.customPrices) {
            Object.keys(client.customPrices).forEach(l => {
                if (client.customPrices[l] > 0) {
                    availableLengths.add(Number(l));
                }
            });
        }
        availableLengths = Array.from(availableLengths).sort((a, b) => a - b);

        let optionsHTML = '';
        if (availableLengths.length === 0) {
            optionsHTML = '<option value="">N/A</option>';
        } else {
            availableLengths.forEach(len => {
                optionsHTML += `<option value="${len}">${len}"</option>`;
            });
        }

        let defaultWeight = 100;
        if (client && client.exportGrams && client.exportGrams.length > 0) {
            defaultWeight = client.exportGrams[0];
        }

        return `
            <div class="flex flex-col gap-3 p-4 border border-slate-200 rounded-lg bg-white relative" data-ratio-name="${name.replace(/"/g, '&quot;')}" id="composite-component-${compositeComponentCounter}">
                <div class="flex justify-between items-start">
                    <span class="text-sm font-bold text-slate-700">${name}</span>
                    <button type="button" onclick="window.removeCompositeComponent(${compositeComponentCounter})" class="text-slate-400 hover:text-red-500 transition" title="Remove Component">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <label class="text-[10px] font-bold text-slate-500 uppercase" title="Length of this component used in the prototype">Length:</label>
                        <select class="composite-absolute-length w-20 px-2 py-1.5 border border-slate-300 rounded text-sm outline-none bg-white">
                            ${optionsHTML}
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-[10px] font-bold text-slate-500 uppercase" title="Total weight used in the product">Weight (grams):</label>
                        <input type="number" class="composite-weight w-20 px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500" value="${defaultWeight}" min="0" step="5">
                    </div>
                </div>
            </div>
        `;
    };

    window.addRatioToComposite = function() {
        const select = document.getElementById('compositeAddRatioSelect');
        const selectedName = select.value;
        if (!selectedName) return alert('Please select a ratio to add.');
        
        const listDiv = document.getElementById('compositeComponentsList');
        const itemHTML = window.createCompositeComponentHTML(selectedName);
        if (itemHTML) {
            listDiv.insertAdjacentHTML('beforeend', itemHTML);
        }
    };

    window.removeCompositeComponent = function(id) {
        const el = document.getElementById('composite-component-' + id);
        if (el) el.remove();
    };

    window.openCompositeBuilderModal = function() {
        if (_selectedRatioNames.size < 1) {
            return alert('Please select at least one ratio to start building a composite product.');
        }

        const targetLengthSelect = document.getElementById('compositeTargetLength');
        if (targetLengthSelect) {
            targetLengthSelect.innerHTML = '';
            ALL_FINISHED_LENGTHS.forEach(len => {
                targetLengthSelect.innerHTML += `<option value="${len}" ${len === 20 ? 'selected' : ''}>${len}"</option>`;
            });
        }

        const listDiv = document.getElementById('compositeComponentsList');
        if (!listDiv) return;

        listDiv.innerHTML = '';
        _selectedRatioNames.forEach(name => {
            const itemHTML = window.createCompositeComponentHTML(name);
            if (itemHTML) listDiv.innerHTML += itemHTML;
        });

        // Populate dropdown
        const addRatioSelect = document.getElementById('compositeAddRatioSelect');
        if (addRatioSelect) {
            addRatioSelect.innerHTML = '<option value="">-- Select Ratio --</option>';
            
            const ratios = (db.clients || []).filter(c => !c.isBundle);
            const groupedRatios = {};
            
            ratios.forEach(c => {
                const tagStr = (c.tag && c.tag.trim() !== '') ? c.tag : 'Other';
                let tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
                if (tags.length === 0) tags = ['Other'];
                
                tags.forEach(tag => {
                    if (!groupedRatios[tag]) {
                        groupedRatios[tag] = [];
                    }
                    groupedRatios[tag].push(c);
                });
            });
            
            const sortedTags = Object.keys(groupedRatios).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return a.localeCompare(b);
            });
            
            sortedTags.forEach(tag => {
                let groupHTML = `<optgroup label="${tag}">`;
                groupedRatios[tag].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                    groupHTML += `<option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>`;
                });
                groupHTML += `</optgroup>`;
                addRatioSelect.innerHTML += groupHTML;
            });
        }

        document.getElementById('compositeProductName').value = '';
        document.getElementById('compositeBuilderModal').classList.remove('hidden');
    };

    window.saveCompositeProduct = async function() {
        const nameInput = document.getElementById('compositeProductName').value.trim();
        if (!nameInput) return alert('Please enter a product name.');
        
        if ((db.clients || []).find(c => c.name.toLowerCase() === nameInput.toLowerCase())) {
            return alert('A saved ratio/product with this name already exists.');
        }

        const targetLength = parseInt(document.getElementById('compositeTargetLength').value) || 20;
        const outputUnit = document.getElementById('compositeOutputUnit') ? document.getElementById('compositeOutputUnit').value : 'kg';

        const listDiv = document.getElementById('compositeComponentsList');
        const rows = listDiv.querySelectorAll('[data-ratio-name]');
        
        const components = [];
        rows.forEach(row => {
            const name = row.getAttribute('data-ratio-name');
            const weightGrams = parseFloat(row.querySelector('.composite-weight').value) || 0;
            const absoluteLen = parseInt(row.querySelector('.composite-absolute-length').value) || 0;
            const offset = absoluteLen - targetLength;
            components.push({ name, weightGrams, offset });
        });

        const savedState = JSON.parse(JSON.stringify(appState));
        const customPrices = {};
        let success = true;

        const productWastagePercent = parseFloat(document.getElementById('compositeWastagePercent').value) || 0;
        const productLaborCost = parseFloat(document.getElementById('compositeLaborCost').value) || 0;
        const productMaterialCost = parseFloat(document.getElementById('compositeMaterialCost').value) || 0;

        try {
            ALL_FINISHED_LENGTHS.forEach(len => { customPrices[len] = 0; });
            const invalidLengths = new Set();
            
            // For each component, calculate prices per length and multiply by qty
            for (const comp of components) {
                const client = (db.clients || []).find(c => c.name === comp.name);
                if (!client) continue;

                appState.matrix = JSON.parse(JSON.stringify(client.matrix || {}));
                appState.marginPercent = client.marginPercent !== undefined ? client.marginPercent : 30;
                appState.wastagePercent = client.wastagePercent !== undefined ? client.wastagePercent : 10;
                appState.machineCharge = client.machineCharge !== undefined ? client.machineCharge : 2500;
                appState.exchangeRate = client.exchangeRate || 1;
                appState.customPricesEnabled = client.customPricesEnabled || false;
                appState.customPrices = JSON.parse(JSON.stringify(client.customPrices || {}));

                if (client.supplierId && db.suppliers.find(s => s.id === client.supplierId)) {
                    const sup = db.suppliers.find(s => s.id === client.supplierId);
                    appState.prices = { ...(sup.prices || {}) };
                    appState.currentSupplierId = client.supplierId;
                }

                let validTargetLengths = [];
                ALL_FINISHED_LENGTHS.forEach(l => {
                    if (appState.customPricesEnabled && appState.customPrices[l] > 0) {
                        validTargetLengths.push(l);
                    } else {
                        let p = calculateColumn(l);
                        if (p && p > 0 && !isNaN(p)) validTargetLengths.push(l);
                    }
                });
                
                let minValid = validTargetLengths.length > 0 ? Math.min(...validTargetLengths) : 8;
                let maxValid = validTargetLengths.length > 0 ? Math.max(...validTargetLengths) : 32;

                ALL_FINISHED_LENGTHS.forEach(len => {
                    let displayPrice = 0;
                    let targetLen = len + comp.offset;
                    targetLen = Math.max(minValid, Math.min(maxValid, targetLen));
                    
                    if (appState.customPricesEnabled && appState.customPrices[targetLen] > 0) {
                        displayPrice = appState.customPrices[targetLen];
                    } else {
                        displayPrice = calculateColumn(targetLen);
                    }
                    if (displayPrice && displayPrice > 0 && !isNaN(displayPrice)) {
                        customPrices[len] += (displayPrice * (comp.weightGrams / 1000));
                    } else {
                        invalidLengths.add(len);
                    }
                });
            }
            
            // Round all final prices
            let totalWeightGrams = components.reduce((sum, comp) => sum + comp.weightGrams, 0);
            if (totalWeightGrams <= 0) totalWeightGrams = 1; // Prevent division by zero

            ALL_FINISHED_LENGTHS.forEach(len => { 
                if (invalidLengths.has(len)) {
                    customPrices[len] = 0;
                } else if (customPrices[len] > 0) {
                    if (outputUnit === 'kg') {
                        customPrices[len] = customPrices[len] * (1000 / totalWeightGrams);
                    }
                    
                    if (productWastagePercent > 0) {
                        customPrices[len] += customPrices[len] * (productWastagePercent / 100);
                    }
                    
                    customPrices[len] += productLaborCost + productMaterialCost;
                    customPrices[len] = Math.round(customPrices[len]);
                }
            });

        } catch(e) {
            console.error(e);
            success = false;
        } finally {
            Object.assign(appState, savedState);
        }

        if (!success) return alert("Error calculating composite prices.");

        Object.keys(customPrices).forEach(k => {
            if (isNaN(customPrices[k]) || customPrices[k] === null) customPrices[k] = 0;
        });

        const newClient = {
            name: nameInput,
            tag: 'Composite',
            currency: 'INR',
            exchangeRate: 1,
            marginPercent: 0, 
            wastagePercent: productWastagePercent,
            machineCharge: productLaborCost,
            materialCost: productMaterialCost,
            matrix: {},
            customPricesEnabled: true,
            customPrices: customPrices,
            supplierId: '',
            isBundle: true,
            bundleComponents: components,
            outputUnit: outputUnit
        };

        db.clients = db.clients || [];
        db.clients.push(newClient);

        try {
            document.getElementById('modalSaveProductBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            
            db.clients = JSON.parse(JSON.stringify(db.clients, (key, value) => {
                if (typeof value === 'number' && (!isFinite(value) || isNaN(value))) return 0;
                return value;
            }));

            saveDB();
            document.getElementById('compositeBuilderModal').classList.add('hidden');
            renderSavedRatios();
            if (typeof renderSavedPriceLists === 'function') renderSavedPriceLists();
            alert('Composite Product saved successfully!');
        } catch (e) {
            console.error('Save error', e);
            db.clients = db.clients.filter(c => c !== newClient);
            alert('Error saving to cloud. Please try again.');
        } finally {
            document.getElementById('modalSaveProductBtn').innerHTML = '<i class="fa-solid fa-save"></i> Save Product';
        }
    };

        // ----- COMPOSE PRODUCT FEATURE -----
    window.COMPOSE_TARGET_LENGTHS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    window.composeComponents = []; // Array of component objects: { id, name }
    window.composeMatrixData = {}; // { [targetLen]: { [ratioName]: { len, weight } } }

    window.openComposeProductModal = function() {
        if (_selectedRatioNames.length < 1) return alert('Please select at least one ratio to compose a product.');

        window.editingCompositeProduct = null;
        window.composeComponents = [];
        window.composeMatrixData = {};
        window.composeFinalPrices = {};

        // Reset fields
        document.getElementById('composeProductName').value = '';
        document.getElementById('composeWastagePercent').value = '0';
        document.getElementById('composeLaborCost').value = '0';
        document.getElementById('composeMaterialCost').value = '0';
        document.getElementById('composeOutputUnit').value = 'kg';
        if (document.getElementById('composeMarginType')) document.getElementById('composeMarginType').value = 'percent';
        if (document.getElementById('composeMarginValue')) document.getElementById('composeMarginValue').value = '0';
        if (document.getElementById('composeMarginLabel')) document.getElementById('composeMarginLabel').innerText = 'Margin %';

        // Populate selected components
        _selectedRatioNames.forEach(name => {
            window.addRatioToComposeProduct(name);
        });

        // Populate dropdown with tags
        const addRatioSelect = document.getElementById('composeAddRatioSelect');
        if (addRatioSelect) {
            addRatioSelect.innerHTML = '<option value="">-- Select Ratio --</option>';
            const ratios = (db.clients || []).filter(c => !c.isBundle);
            const groupedRatios = {};
            
            ratios.forEach(c => {
                const tagStr = (c.tag && c.tag.trim() !== '') ? c.tag : 'Other';
                let tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
                if (tags.length === 0) tags = ['Other'];
                
                tags.forEach(tag => {
                    if (!groupedRatios[tag]) groupedRatios[tag] = [];
                    groupedRatios[tag].push(c);
                });
            });
            
            const sortedTags = Object.keys(groupedRatios).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return a.localeCompare(b);
            });
            
            sortedTags.forEach(tag => {
                let groupHTML = `<optgroup label="${tag}">`;
                groupedRatios[tag].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                    groupHTML += `<option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>`;
                });
                groupHTML += `</optgroup>`;
                addRatioSelect.innerHTML += groupHTML;
            });
        }

        document.getElementById('composeProductModal').classList.remove('hidden');
    };

    window.openComposeProductModalForEdit = function(clientName) {
        const client = (db.clients || []).find(c => c.name === clientName);
        if (!client || client.tag !== 'Composite') return;

        window.editingCompositeProduct = clientName;

        window.composeComponents = (client.bundleComponents || []).map(c => ({ id: c.id || c.name, name: c.name }));
        window.composeMatrixData = client.composeMatrix ? JSON.parse(JSON.stringify(client.composeMatrix)) : {};
        window.composeFinalPrices = client.composeOverrides ? JSON.parse(JSON.stringify(client.composeOverrides)) : {};

        document.getElementById('composeProductName').value = client.name || '';
        document.getElementById('composeWastagePercent').value = client.wastagePercent || '0';
        document.getElementById('composeLaborCost').value = client.machineCharge || '0';
        document.getElementById('composeMaterialCost').value = client.materialCost || '0';
        document.getElementById('composeOutputUnit').value = client.outputUnit || 'kg';
        if (document.getElementById('composeMarginType')) document.getElementById('composeMarginType').value = client.marginType || 'percent';
        if (document.getElementById('composeMarginValue')) document.getElementById('composeMarginValue').value = client.marginType === 'amount' ? (client.marginAmount || 0) : (client.marginPercent || 0);
        if (document.getElementById('composeMarginLabel')) document.getElementById('composeMarginLabel').innerText = client.marginType === 'amount' ? 'Margin Amt' : 'Margin %';

        // Populate dropdown with tags
        const addRatioSelect = document.getElementById('composeAddRatioSelect');
        if (addRatioSelect) {
            addRatioSelect.innerHTML = '<option value="">-- Select Ratio --</option>';
            const ratios = (db.clients || []).filter(c => !c.isBundle);
            const groupedRatios = {};
            
            ratios.forEach(c => {
                const tag = c.tag ? c.tag.trim() : 'Other';
                if (!groupedRatios[tag]) groupedRatios[tag] = [];
                groupedRatios[tag].push(c);
            });
            
            const sortedTags = Object.keys(groupedRatios).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return a.localeCompare(b);
            });
            
            sortedTags.forEach(tag => {
                let groupHTML = `<optgroup label="${tag}">`;
                groupedRatios[tag].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                    groupHTML += `<option value="${c.name.replace(/"/g, '&quot;')}">${c.name}</option>`;
                });
                groupHTML += `</optgroup>`;
                addRatioSelect.innerHTML += groupHTML;
            });
        }

        renderComposeMatrix();
        document.getElementById('composeProductModal').classList.remove('hidden');
    };


    window.addRatioToComposeProduct = function(ratioNameOverride) {
        const select = document.getElementById('composeAddRatioSelect');
        const ratioName = ratioNameOverride || (select ? select.value : '');
        if (!ratioName) return alert('Please select a ratio to add.');

        const compId = ratioNameOverride ? ratioName : (ratioName + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
        window.composeComponents.push({ id: compId, name: ratioName });
        
        // Initialize defaults for this new component
        let defaultWeight = 100;
        const client = (db.clients || []).find(c => c.name === ratioName);
        if (client && client.exportGrams && client.exportGrams.length > 0) {
            defaultWeight = client.exportGrams[0];
        }
        
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            if (!window.composeMatrixData[tLen]) window.composeMatrixData[tLen] = {};
            window.composeMatrixData[tLen][compId] = { len: tLen, weight: defaultWeight };
        });

        if (!ratioNameOverride && select) select.value = '';
        window.renderComposeMatrix();
    };

    window.removeComposeComponent = function(compId) {
        window.composeComponents = window.composeComponents.filter(c => c.id !== compId);
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            if (window.composeMatrixData[tLen]) {
                delete window.composeMatrixData[tLen][compId];
            }
        });
        window.renderComposeMatrix();
    };

    window.updateComposeMatrixValue = function(tLen, ratioName, field, value) {
        if (!window.composeMatrixData[tLen]) return;
        if (!window.composeMatrixData[tLen][ratioName]) return;
        window.composeMatrixData[tLen][ratioName][field] = parseFloat(value) || 0;
        if (window.updateComposeMatrixUI) {
            window.updateComposeMatrixUI();
        }
    };

    window.calculateComposePrices = function() {
        const prices = {};
        const outputUnit = document.getElementById('composeOutputUnit') ? document.getElementById('composeOutputUnit').value : 'kg';
        const productWastagePercent = parseFloat(document.getElementById('composeWastagePercent').value) || 0;
        const productLaborCost = parseFloat(document.getElementById('composeLaborCost').value) || 0;
        const productMaterialCost = parseFloat(document.getElementById('composeMaterialCost').value) || 0;
        
        const savedState = JSON.parse(JSON.stringify(appState));
        try {
            const clientConfigs = {};
            window.composeComponents.forEach(comp => {
                const client = (db.clients || []).find(c => c.name === comp.name);
                if (client) clientConfigs[comp.id] = client;
            });

            window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
                let rowPrice = 0;
                let rowWeight = 0;
                let isValidLength = true;

                window.composeComponents.forEach(comp => {
                    const data = window.composeMatrixData[tLen]?.[comp.id];
                    if (!data || data.weight <= 0) return;
                    
                    rowWeight += data.weight;
                    const client = clientConfigs[comp.id];
                    if (!client) { isValidLength = false; return; }

                    appState.matrix = JSON.parse(JSON.stringify(client.matrix || {}));
                    appState.marginPercent = client.marginPercent !== undefined ? client.marginPercent : 30;
                    appState.wastagePercent = client.wastagePercent !== undefined ? client.wastagePercent : 10;
                    appState.machineCharge = client.machineCharge !== undefined ? client.machineCharge : 2500;
                    appState.exchangeRate = client.exchangeRate || 1;
                    appState.customPricesEnabled = client.customPricesEnabled || false;
                    appState.customPrices = JSON.parse(JSON.stringify(client.customPrices || {}));

                    if (client.supplierId && db.suppliers.find(s => s.id === client.supplierId)) {
                        const sup = db.suppliers.find(s => s.id === client.supplierId);
                        appState.prices = { ...(sup.prices || {}) };
                        appState.currentSupplierId = client.supplierId;
                    }

                    let displayPrice = 0;
                    if (appState.customPricesEnabled && appState.customPrices[data.len] > 0) {
                        displayPrice = appState.customPrices[data.len];
                    } else {
                        displayPrice = calculateColumn(data.len);
                    }

                    if (displayPrice && displayPrice > 0 && !isNaN(displayPrice)) {
                        rowPrice += (displayPrice * (data.weight / 1000));
                    } else {
                        isValidLength = false;
                    }
                });

                if (isValidLength && rowWeight > 0) {
                    if (outputUnit === 'kg') {
                        rowPrice = rowPrice * (1000 / rowWeight);
                    }
                    if (productWastagePercent > 0) {
                        rowPrice += rowPrice * (productWastagePercent / 100);
                    }
                    rowPrice += productLaborCost + productMaterialCost;
                    
                    const marginType = document.getElementById('composeMarginType') ? document.getElementById('composeMarginType').value : 'percent';
                    const marginValue = parseFloat(document.getElementById('composeMarginValue') ? document.getElementById('composeMarginValue').value : 0) || 0;
                    if (marginType === 'amount') {
                        rowPrice += marginValue;
                    } else {
                        rowPrice += rowPrice * (marginValue / 100);
                    }

                    prices[tLen] = Math.round(rowPrice);
                } else {
                    prices[tLen] = 0;
                }
            });
        } catch(e) {
            console.error("Price calc error", e);
        } finally {
            Object.assign(appState, savedState);
        }
        return prices;
    };

    window.updateComposeFinalPrice = function(tLen, val) {
        if (!window.composeFinalPrices) window.composeFinalPrices = {};
        const parsed = parseFloat(val);
        if (isNaN(parsed) || val.trim() === '') {
            window.composeFinalPrices[tLen] = null;
        } else {
            window.composeFinalPrices[tLen] = parsed;
        }
    };

    window.renderComposeMatrix = function() {
        const thead = document.getElementById('composeMatrixThead');
        const tbody = document.getElementById('composeMatrixTbody');
        if (!thead || !tbody) return;

        if (window.composeComponents.length === 0) {
            thead.innerHTML = `
                <tr>
                    <th class="p-3 text-xs font-bold text-slate-500 uppercase w-32 sticky left-0 bg-slate-50 z-20">Target Length</th>
                    <th class="p-3 text-xs font-bold text-slate-500 uppercase text-right w-32">Total Weight</th>
                </tr>
            `;
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" class="p-8 text-center text-slate-400 text-sm">
                        No components added yet. Select a ratio above and click "Add Component".
                    </td>
                </tr>
            `;
            return;
        }

        // Build thead
        let theadHTML = `<tr><th class="p-3 text-xs font-bold text-slate-500 uppercase w-32 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Target Length</th>`;
        window.composeComponents.forEach(comp => {
            theadHTML += `
                <th class="p-3 text-xs font-bold text-slate-500 uppercase min-w-[180px] border-r border-slate-200">
                    <div class="flex justify-between items-center">
                        <span>${comp.name}</span>
                        <button type="button" onclick="window.removeComposeComponent('${comp.id.replace(/'/g, "\\\\'")}')" class="text-slate-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50 ml-2">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </th>
            `;
        });
        theadHTML += `<th class="p-3 text-xs font-bold text-slate-500 uppercase text-right w-24 border-r border-slate-200">Total Weight</th>`;
        theadHTML += `<th class="p-3 text-xs font-bold text-slate-500 uppercase text-right w-24 border-r border-slate-200">Calc Price</th>`;
        theadHTML += `<th class="p-3 text-xs font-bold text-slate-500 uppercase text-right w-32 bg-slate-50 sticky right-0 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Final Price</th></tr>`;
        thead.innerHTML = theadHTML;

        const calculatedPrices = window.calculateComposePrices ? window.calculateComposePrices() : {};

        // Build tbody
        let tbodyHTML = '';
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            let rowHTML = `<tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">`;
            rowHTML += `<td class="p-3 font-bold text-slate-800 text-sm sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">${tLen}"</td>`;
            
            let rowWeight = 0;
            
            window.composeComponents.forEach(comp => {
                const data = window.composeMatrixData[tLen]?.[comp.id] || { len: tLen, weight: 0 };
                rowWeight += data.weight;
                
                // Length select
                let selectHTML = `<select onchange="window.updateComposeMatrixValue(${tLen}, '${comp.id.replace(/'/g, "\\\\'")}', 'len', this.value)" class="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-500 mr-2">`;
                ALL_FINISHED_LENGTHS.forEach(l => {
                    selectHTML += `<option value="${l}" ${l === data.len ? 'selected' : ''}>${l}"</option>`;
                });
                selectHTML += `</select>`;
                
                // Weight input
                let weightInput = `<div class="relative flex-1"><input type="number" oninput="window.updateComposeMatrixValue(${tLen}, '${comp.id.replace(/'/g, "\\\\'")}', 'weight', this.value)" class="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-500 pr-6" value="${data.weight}" min="0"><span class="absolute right-2 top-1.5 text-slate-400 text-xs">g</span></div>`;
                
                rowHTML += `<td class="p-2 border-r border-slate-200"><div class="flex items-center">${selectHTML}${weightInput}</div></td>`;
            });
            
            rowHTML += `<td class="p-3 font-bold text-slate-700 text-right border-r border-slate-200" id="compose-row-weight-${tLen}">${rowWeight} g</td>`;
            
            const calcPrice = calculatedPrices[tLen] || 0;
            rowHTML += `<td class="p-3 font-bold text-slate-500 text-right border-r border-slate-200" id="compose-row-calcprice-${tLen}">${calcPrice}</td>`;
            
            const finalVal = window.composeFinalPrices?.[tLen];
            const finalInput = `<input type="number" oninput="window.updateComposeFinalPrice(${tLen}, this.value)" class="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-500 text-right" value="${finalVal != null ? finalVal : ''}" placeholder="${calcPrice}">`;
            rowHTML += `<td class="p-2 sticky right-0 bg-white shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">${finalInput}</td>`;
            
            rowHTML += `</tr>`;
            tbodyHTML += rowHTML;
        });
        
        tbody.innerHTML = tbodyHTML;
    };

    window.updateComposeMatrixUI = function() {
        const calculatedPrices = window.calculateComposePrices ? window.calculateComposePrices() : {};
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            let rowWeight = 0;
            window.composeComponents.forEach(comp => {
                rowWeight += window.composeMatrixData[tLen]?.[comp.id]?.weight || 0;
            });
            const weightCell = document.getElementById(`compose-row-weight-${tLen}`);
            if (weightCell) weightCell.textContent = rowWeight + ' g';
            
            const calcPriceCell = document.getElementById(`compose-row-calcprice-${tLen}`);
            const calcPrice = calculatedPrices[tLen] || 0;
            if (calcPriceCell) calcPriceCell.textContent = calcPrice;
            
            const finalInput = document.querySelector(`input[oninput="window.updateComposeFinalPrice(${tLen}, this.value)"]`);
            if (finalInput && finalInput.value === '') {
                finalInput.placeholder = calcPrice;
            }
        });
    };

    window.saveComposeProduct = async function() {
        const nameInput = document.getElementById('composeProductName').value.trim();
        if (!nameInput) return alert('Please enter a product name.');
        
        if (window.editingCompositeProduct !== nameInput && (db.clients || []).find(c => c.name.toLowerCase() === nameInput.toLowerCase())) {
            return alert('A saved ratio/product with this name already exists.');
        }

        const outputUnit = document.getElementById('composeOutputUnit') ? document.getElementById('composeOutputUnit').value : 'kg';
        const productWastagePercent = parseFloat(document.getElementById('composeWastagePercent').value) || 0;
        const productLaborCost = parseFloat(document.getElementById('composeLaborCost').value) || 0;
        const productMaterialCost = parseFloat(document.getElementById('composeMaterialCost').value) || 0;

        if (window.composeComponents.length === 0) return alert('Please add at least one component.');

        let customPrices = {};
        ALL_FINISHED_LENGTHS.forEach(len => customPrices[len] = 0);
        
        const calculatedPrices = window.calculateComposePrices();
        
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            if (window.composeFinalPrices && window.composeFinalPrices[tLen] != null) {
                customPrices[tLen] = window.composeFinalPrices[tLen];
            } else {
                customPrices[tLen] = calculatedPrices[tLen] || 0;
            }
        });

        Object.keys(customPrices).forEach(k => {
            if (isNaN(customPrices[k]) || customPrices[k] === null) customPrices[k] = 0;
        });

        // Save legacy bundleComponents structure for UI reference if needed
        const legacyComponents = window.composeComponents.map(comp => ({ id: comp.id, name: comp.name, offset: 0, weightGrams: 0 }));

        const marginType = document.getElementById('composeMarginType') ? document.getElementById('composeMarginType').value : 'percent';
        const marginValue = parseFloat(document.getElementById('composeMarginValue') ? document.getElementById('composeMarginValue').value : 0) || 0;

        const newClient = {
            name: nameInput,
            tag: 'Composite',
            currency: 'INR',
            exchangeRate: 1,
            marginType: marginType,
            marginAmount: marginType === 'amount' ? marginValue : 0,
            marginPercent: marginType === 'percent' ? marginValue : 0, 
            wastagePercent: productWastagePercent,
            machineCharge: productLaborCost,
            materialCost: productMaterialCost,
            matrix: {},
            customPricesEnabled: true,
            customPrices: customPrices,
            composeOverrides: window.composeFinalPrices ? JSON.parse(JSON.stringify(window.composeFinalPrices)) : {},
            supplierId: '',
            isBundle: true,
            bundleComponents: legacyComponents,
            composeMatrix: JSON.parse(JSON.stringify(window.composeMatrixData)),
            outputUnit: outputUnit
        };

        db.clients = db.clients || [];
        if (window.editingCompositeProduct) {
            const index = db.clients.findIndex(c => c.name === window.editingCompositeProduct);
            if (index !== -1) {
                db.clients[index] = newClient;
            } else {
                db.clients.push(newClient);
            }
        } else {
            db.clients.push(newClient);
        }

        try {
            document.getElementById('modalSaveComposeProductBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            
            db.clients = JSON.parse(JSON.stringify(db.clients, (key, value) => {
                if (typeof value === 'number' && (!isFinite(value) || isNaN(value))) return 0;
                return value;
            }));

            saveDB();
            document.getElementById('composeProductModal').classList.add('hidden');
            renderSavedRatios();
            if (typeof renderSavedPriceLists === 'function') renderSavedPriceLists();
            alert('Composed Product saved successfully!');
        } catch (e) {
            console.error('Save error', e);
            db.clients = db.clients.filter(c => c !== newClient);
            alert('Error saving to cloud. Please try again.');
        } finally {
            document.getElementById('modalSaveComposeProductBtn').innerHTML = '<i class="fa-solid fa-save"></i> Save Product';
        }
    };

    window.sharePriceListFromRatioTab = async function (clientName) {
        if (!clientName) return;
        
        // Remove any existing expanded preview rows
        document.querySelectorAll('.preview-row').forEach(row => row.remove());

        // Get the client config
        const pl = (db.clients || []).find(c => c.name === clientName);
        if (!pl) return;

        // Load config silently to appState so calculateColumn uses it correctly
        await loadRatioConfig(clientName);

        const _hex2 = appState.accentColor || '#4f46e5';
        const _r2 = parseInt(_hex2.slice(1,3),16), _g2 = parseInt(_hex2.slice(3,5),16), _b2 = parseInt(_hex2.slice(5,7),16);
        const _bg2 = `rgba(${_r2},${_g2},${_b2},0.10)`;

        // Hair type for this shared ratio
        const _sharedSupplier = db.suppliers.find(s => s.id === (pl.raw_supplier_id || appState.currentSupplierId));
        const _sharedHairType = _sharedSupplier ? (_sharedSupplier.hairType || 'Regular') : 'Regular';
        const _sharedHairLabel = _sharedHairType === 'Bleachable'
            ? 'Bleachable Hair · Bleachable to Color #613/60'
            : 'Regular Hair · Bleachable to Color #22/27';
        const _sharedHairBg = _sharedHairType === 'Bleachable' ? '#ede9fe' : '#fef3c7';
        const _sharedHairColor = _sharedHairType === 'Bleachable' ? '#7c3aed' : '#92400e';
        const _sharedHairBorder = _sharedHairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';

        let validItemCount = 0;
        const rowsHTML = ACTIVE_FINISHED_LENGTHS.map((len) => {
            const idx = len;
            let displayPrice = 0;
            if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                displayPrice = appState.customPrices[idx];
            } else {
                displayPrice = calculateColumn(idx);
            }
            if (pl && pl.tag === 'Composite' && displayPrice <= 0) return '';
            
            if (displayPrice > 0 || (displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[idx] !== undefined && appState.customPrices[idx] !== '')) {
                const bgStr = validItemCount % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
                const cmLen = len * 2.5;
                validItemCount++;
                return `
                    <tr style="${bgStr}">
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen} cm</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; border-right: 1px solid #e2e8f0;">${formatPriceWithSymbol(displayPrice, appState.currency || 'INR')} <span style="font-size:11px; font-weight:500; color:#64748b;">/${pl.outputUnit === 'pc' ? 'pc' : 'kg'}</span></td>
                    </tr>
                `;
            }
            return '';
        }).join('');

        let isVirgin = clientName.toLowerCase().includes('virgin');
        let isRemy = clientName.toLowerCase().includes('remy');
        if (pl.bundleComponents && pl.bundleComponents.length > 1) {
            isVirgin = false;
            isRemy = false;
            const secondC = pl.bundleComponents[1];
            const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
            if (cname.includes('virgin')) isVirgin = true;
            if (cname.includes('remy')) isRemy = true;
        }
        let stampInfo = '';
        if (isVirgin) {
            stampInfo = `<img src="../images/hw/bleachable.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
        } else if (isRemy) {
            stampInfo = `<img src="../images/hw/bleachable27.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
        }

        const imgHTML = window.getProductImageHTML(clientName, 'auto');

        let footerHTML = `
            <div style="margin-top: 15px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;">
                <div style="font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: inline-block;">Important Information</div>
                <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-weight: 500; font-size: 12px;">
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'kilogram'}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</td>
                    </tr>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                <div><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Generated: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>
                <div>HAIRWISE</div>
                <div>${(function() {
                    const __d = new Date();
                    const __dd = String(__d.getDate()).padStart(2, '0');
                    const __mm = String(__d.getMonth() + 1).padStart(2, '0');
                    const __yy = String(__d.getFullYear()).slice(-2);
                    let _discVal = 0;
                    const inputEl = document.getElementById('exportDiscountPercentInput');
                    if (inputEl && inputEl.value) {
                        _discVal = parseFloat(inputEl.value) || 0;
                    } else if (typeof appState !== 'undefined' && appState.discountPercent) {
                        _discVal = appState.discountPercent;
                    }
                    _discVal = Math.round(_discVal);
                    const _discStr = _discVal < 0 ? '-' + String(Math.abs(_discVal)).padStart(3, '0') : String(Math.abs(_discVal)).padStart(3, '0');
                    return `${__dd}${__mm}${__yy}/${_discStr}`;
                })()}</div>
            </div>
        `;

        let displayHTML = `
            <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;">
                <div id="export-preview-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" class="preview-card-inner" style="position: relative; background: ${_bg2}; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 700px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                        <img src="../images/hw/hwstraightlogo.png" style="height: 45px;" />
                        <div style="text-align: right; font-size: 10px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">
                            NEW DELHI <span style="margin: 0 6px; color: #cbd5e1;">|</span> NEW JERSEY <span style="margin: 0 6px; color: #cbd5e1;">|</span> FLORIDA
                        </div>
                    </div>
                    
                    <div style="width: 100%; max-width: 1100px; margin: 0 auto 12px auto; display: flex; justify-content: center; align-items: stretch; gap: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white;">
                        
                        <div style="flex-grow: 1;">
                            <div style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; width: 100%;">
                                    <img src="../images/hw/100percent.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="100% Authentic Human Hair" />
                                    ${stampInfo}
                                </div>
                                <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    ${renderNameWithLogo(clientName, '14px')}
                                    <span style="color: #16a34a;">(${appState.currency || 'INR'})</span>
                                </div>
                            </div>
                            
                            <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 14px; background: transparent;">
                                <thead>
                                    <tr>
                                        <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in inches</span></th>
                                        <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in cm</span></th>
                                        <th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${appState.currency || 'INR'} /${pl.outputUnit === 'pc' ? 'pc' : 'kg'}</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHTML}
                                </tbody>
                            </table>
                        </div>
                        ${imgHTML ? `<div style="flex: 0 0 250px; display: flex; align-items: stretch; justify-content: center; padding: 0; background: #ffffff; border-left: 2px solid #e2e8f0;">
                            ${imgHTML.replace(/style="[^"]*"/, 'style="width: 100%; height: 100%; max-height: none; object-fit: contain;"')}
                        </div>` : ''}
                    </div>
                    ${footerHTML}
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px;">
                <button id="downloadPreviewBtn" class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition shadow-md flex items-center justify-center mx-auto gap-2">
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
            previewRow.className = 'preview-row';
            previewRow.innerHTML = `<td colspan="3" style="padding: 0; background: #f8fafc; border-top: none; box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.05);">${displayHTML}</td>`;
            targetTr.after(previewRow);
            
            document.getElementById('downloadPreviewBtn').addEventListener('click', () => {
                const node = document.getElementById(`export-preview-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}`);
                html2canvas(node, {
                    backgroundColor: '#ffffff',
                    scale: 3 // High resolution export
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `${clientName}.png`;
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
            if (!db.deletedPriceLists) db.deletedPriceLists = [];
            db.deletedPriceLists.push(plName);
            saveDB();
            // refreshPriceListDropdown();
            renderSavedPriceLists();
        }
    };

    // --- Mixer Section ---

    function initTable() {
        const tableHeadRow = ratioTable.querySelector('thead tr');
        // 1. Clear existing dynamic headers and footers to allow resizing
        while (tableHeadRow.children.length > 2) tableHeadRow.lastChild.remove();
        
        ACTIVE_FINISHED_LENGTHS.forEach((len) => {
            const colIdx = len;
            const th = document.createElement('th');
            th.dataset.colHeader = colIdx;
            th.textContent = len;
            tableHeadRow.appendChild(th);
        });

        const rowTypes = ['total-row', 'wastage-row', 'machine-row', 'wefting-wastage-row', 'wefting-charge-row', 'margin-row', 'price-row', 'rounded-price-row', 'converted-price-row'];
        const rowPrefixes = ['total', 'wastage', 'machine', 'wefting-wastage', 'wefting-charge', 'margin', 'price', 'rounded-price', 'converted-price'];

        rowTypes.forEach((cls, rIdx) => {
            const tr = tableFooter.querySelector(`.${cls}`);
            if (tr) {
                while (tr.children.length > 1) tr.lastChild.remove();
                ACTIVE_FINISHED_LENGTHS.forEach((len) => {
                    const cIdx = len;
                    const td = document.createElement('td');
                    td.id = `${rowPrefixes[rIdx]} - ${cIdx}`;
                    td.textContent = rIdx === 0 ? '0%' : '0';
                    tr.appendChild(td);
                });
            }
        });

        const individualMarginRow = document.getElementById('individual-margin-row');
        if (individualMarginRow) {
            while (individualMarginRow.children.length > 1) individualMarginRow.lastChild.remove();
            ACTIVE_FINISHED_LENGTHS.forEach((len) => {
                const cIdx = len;
                const td = document.createElement('td');
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'cell-input individual-margin-input';
                inp.placeholder = '0';
                inp.dataset.indMarginColIdx = cIdx;
                if(appState.individualMargins && appState.individualMargins[cIdx] !== undefined) {
                    inp.value = appState.individualMargins[cIdx];
                }
                inp.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if(!appState.individualMargins) appState.individualMargins = {};
                    appState.individualMargins[cIdx] = val === '' ? 0 : parseFloat(val);
                    clearCustomPrices();
                    calculateColumn(cIdx);
                    saveAppState();
                });
                td.appendChild(inp);
                individualMarginRow.appendChild(td);
            });
        }

        if (customPriceRow) {
            while (customPriceRow.children.length > 1) customPriceRow.lastChild.remove();
            ACTIVE_FINISHED_LENGTHS.forEach((len) => {
                const cIdx = len;
                const td = document.createElement('td');
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'cell-input custom-price-input';
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
        ACTIVE_RAW_LENGTHS.forEach(rawLen => {
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

            ACTIVE_FINISHED_LENGTHS.forEach((finLen) => {
            const colIndex = finLen;
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'cell-input';
                input.placeholder = '-';
                input.dataset.rowRaw = rawLen;
                input.dataset.colIdx = colIndex;
                
                // CRITICAL FIX: Hydrate visual DOM from memory state
                if (appState.matrix && appState.matrix[colIndex] && appState.matrix[colIndex][rawLen]) {
                    input.value = appState.matrix[colIndex][rawLen];
                }

                input.addEventListener('input', handleMatrixChange);
                input.addEventListener('keydown', handleNavigation);
                td.appendChild(input);
                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    }

    // --- Column Copy / Paste via Ctrl+C / Ctrl+V ---
    let _copiedColData = null; // { colIdx, data: { rawLen: pct } }

    function _showColToast(msg, color) {
        let toast = document.getElementById('col-clipboard-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'col-clipboard-toast';
            toast.style.cssText = 'position:fixed; bottom:22px; left:50%; transform:translateX(-50%); padding:8px 20px; border-radius:8px; font-size:13px; font-weight:600; color:#fff; z-index:9999; pointer-events:none; opacity:0; transition:opacity 0.2s;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.background = color || '#4f46e5';
        toast.style.opacity = '1';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    }

    function _copyColumnByIdx(colIdx) {
        const srcData = appState.matrix[colIdx];
        if (!srcData || Object.values(srcData).every(v => !v || v === 0)) {
            _showColToast('Column is empty — nothing to copy', '#ef4444');
            return;
        }
        _copiedColData = { colIdx, data: JSON.parse(JSON.stringify(srcData)) };

        // Flash source header blue
        const srcTh = ratioTable.querySelector(`th[data-col-header="${colIdx}"]`);
        if (srcTh) {
            srcTh.style.background = '#c7d2fe';
            setTimeout(() => { srcTh.style.background = ''; }, 800);
        }
        _showColToast(`✓ Column ${colIdx}" copied — Ctrl+V to paste`, '#4f46e5');
    }

    function _pasteColumnByIdx(toColIdx) {
        if (!_copiedColData) {
            _showColToast('Nothing copied yet — Ctrl+C on a column first', '#ef4444');
            return;
        }
        if (_copiedColData.colIdx === toColIdx) {
            _showColToast('Source and destination are the same column', '#f59e0b');
            return;
        }

        const dstData = appState.matrix[toColIdx];
        const dstHasValues = dstData && Object.values(dstData).some(v => v > 0);
        if (dstHasValues) {
            if (!confirm(`Column "${toColIdx}" already has values. Overwrite?`)) return;
        }

        appState.matrix[toColIdx] = JSON.parse(JSON.stringify(_copiedColData.data));

        if (appState.customPrices && appState.customPrices[toColIdx] !== undefined) {
            delete appState.customPrices[toColIdx];
        }

        ACTIVE_RAW_LENGTHS.forEach(rawLen => {
            const inp = document.querySelector(`.cell-input[data-row-raw="${rawLen}"][data-col-idx="${toColIdx}"]`);
            if (inp) inp.value = appState.matrix[toColIdx][rawLen] || '';
        });

        calculateColumn(toColIdx);
        saveAppState();

        // Flash destination header green
        const destTh = ratioTable.querySelector(`th[data-col-header="${toColIdx}"]`);
        if (destTh) {
            destTh.style.background = '#d1fae5';
            setTimeout(() => { destTh.style.background = ''; }, 800);
        }
        _showColToast(`✓ Pasted into column ${toColIdx}"`, '#16a34a');
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

        if(appState.customPrices && appState.customPrices[col] !== undefined) {
            delete appState.customPrices[col];
            const inp = document.querySelector(`.cell-input[data-custom-col-idx="${col}"]`);
            if(inp) inp.value = '';
        }

        calculateColumn(col);
        saveAppState();
    }

    function updateRoundingLabel() {
        const factor = (appState.roundingFactor !== undefined && appState.roundingFactor !== '') ? parseFloat(appState.roundingFactor) : 50;
        const labelCell = document.querySelector('.rounded-price-row td.sticky-col-1');
        if (labelCell) {
            if (factor > 0) {
                labelCell.textContent = `Rounded Total (to ${factor})`;
            } else {
                labelCell.textContent = 'Rounded Total';
            }
        }
    }

    function calculateAll() {
        ACTIVE_FINISHED_LENGTHS.forEach(len => calculateColumn(len));
    }

    function calculateColumn(colIdx) {
        const colData = appState.matrix[colIdx] || {};
        let totalPercent = 0;
        let weightedRawCost = 0;

        ALL_RAW_LENGTHS.forEach(rawLen => {
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
            const indMargin = appState.individualMargins ? (appState.individualMargins[colIdx] || 0) : 0;
            if (appState.marginType === 'amount') {
                marginValue = (appState.marginAmount || 0) + indMargin;
            } else {
                marginValue = currentCost * ((appState.marginPercent + indMargin) / 100);
            }
            let baseFinal = currentCost + marginValue;
            
            // 5. Discount
            let discountPercentVal = baseFinal * ((appState.discountPercent || 0) / 100);
            let discountAmountVal = appState.discountAmount || 0;
            finalPrice = baseFinal - discountPercentVal - discountAmountVal;
            if (finalPrice < 0) finalPrice = 0;
        }

        const factor = (appState.roundingFactor !== undefined && appState.roundingFactor !== '') ? parseFloat(appState.roundingFactor) : 50;
        const roundedPrice = (factor > 0) ? (Math.round(finalPrice / factor) * factor) : Math.round(finalPrice * 100) / 100;

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

    function applyRawLengthsVisibility() {
        let activeRawSet = new Set();
        
        if (appState.prices) {
            Object.entries(appState.prices).forEach(([len, price]) => {
                if (price > 0 && ALL_RAW_LENGTHS.includes(parseInt(len))) {
                    activeRawSet.add(parseInt(len));
                }
            });
        }
        
        if (appState.matrix) {
            Object.values(appState.matrix).forEach(colData => {
                Object.entries(colData).forEach(([len, pct]) => {
                    if (pct > 0 && ALL_RAW_LENGTHS.includes(parseInt(len))) {
                        activeRawSet.add(parseInt(len));
                    }
                });
            });
        }

        let newLengths = Array.from(activeRawSet).sort((a,b) => a - b);
        
        if (newLengths.length === 0) {
            newLengths = EVEN_RAW_LENGTHS;
        }

        let hasOdd = newLengths.some(l => l % 2 !== 0);
        let newFinished = hasOdd ? ALL_FINISHED_LENGTHS : EVEN_FINISHED_LENGTHS;

        const rawChanged = ACTIVE_RAW_LENGTHS.length !== newLengths.length || 
                           ACTIVE_RAW_LENGTHS.some((val, i) => val !== newLengths[i]);
                           
        const finChanged = ACTIVE_FINISHED_LENGTHS.length !== newFinished.length || 
                           ACTIVE_FINISHED_LENGTHS.some((val, i) => val !== newFinished[i]);

        if (rawChanged || finChanged) {
            ACTIVE_RAW_LENGTHS = newLengths;
            ACTIVE_FINISHED_LENGTHS = newFinished;
            initTable();
            refreshTableInputs();
        }
    }

    function loadSupplierPricesIntoMixer(supplierId) {
        appState.currentSupplierId = supplierId;
        const supplier = db.suppliers.find(s => s.id === supplierId);

        if (supplier) {
            appState.prices = { ...supplier.prices };
        } else {
            appState.prices = { ...DEFAULT_PRICES };
        }

        applyRawLengthsVisibility();

        // Update UI
        document.querySelectorAll('.price-input').forEach(inp => {
            const len = inp.dataset.rawLen;
            inp.value = appState.prices[len] || 0;
        });
        clearCustomPrices();
        calculateAll(); // Recalc with new prices
        saveAppState();
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
                // CRITICAL FIX: Retain valid '0' values for custom price overrides and correct zero culling behavior tests
                if(inp && appState.customPrices[colIdx] !== undefined && appState.customPrices[colIdx] !== '' && appState.customPrices[colIdx] !== null) {
                    inp.value = appState.customPrices[colIdx];
                }
            });
        }

        // Fill individual margins
        document.querySelectorAll(`.individual-margin-input`).forEach(inp => inp.value = '');
        if (appState.individualMargins) {
            Object.keys(appState. individualMargins).forEach(colIdx => {
                const inp = document.querySelector(`.individual-margin-input[data-ind-margin-col-idx="${colIdx}"]`);
                if(inp && appState.individualMargins[colIdx] !== undefined) {
                    inp.value = appState.individualMargins[colIdx];
                }
            });
        }
    }

    // --- Export Logic ---

    function exportPriceList(mode = 'download') {
        if (!appState.currentClientName) {
            alert('Please enter a Price List Name before exporting.');
            document.getElementById('clientName').focus();
            return;
        }

        const originalBtnHtml = mode === 'download' ? downloadBtn.innerHTML : copyPriceListBtn.innerHTML;
        if (mode === 'download') downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        else copyPriceListBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Create hidden structure
        const container = document.createElement('div');
        container.id = 'export-container';
        // Add styling for aesthetic export
        const _hex = appState.accentColor || '#4f46e5';
        const _r = parseInt(_hex.slice(1,3),16), _g = parseInt(_hex.slice(3,5),16), _b = parseInt(_hex.slice(5,7),16);
        const exportBgColor = `rgba(${_r},${_g},${_b},0.10)`;
        container.style.cssText = `background: ${exportBgColor}; padding: 100px 120px; border-radius: 30px; width: max-content; min-width: 1400px; max-width: 2000px; margin: 20px auto; font-family: 'Inter', sans-serif; box-sizing: border-box;`;

        // Find active ratio columns
        let activeCols = [];
        ACTIVE_FINISHED_LENGTHS.forEach((len) => {
            const idx = len;
            if (appState.matrix[idx]) {
                const hasValue = Object.values(appState.matrix[idx]).some(val => val > 0);
                if (hasValue) activeCols.push({ len, idx });
            }
        });

        let activeRows = new Set();
        activeCols.forEach(col => {
            Object.keys(appState.matrix[col.idx]).forEach(rowIdx => {
                if (appState.matrix[col.idx][rowIdx] > 0) {
                    activeRows.add(parseInt(rowIdx));
                }
            });
        });
        let sortedRows = Array.from(activeRows).sort((a,b)=>a-b);

        let matrixHTML = '';
        if (activeCols.length > 0) {
            matrixHTML = `
            <div style="margin-top: 30px; padding-top: 60px; border-top: 3px dashed #e2e8f0; width: 100%;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background: #e0e7ff; color: #4338ca; padding: 10px 24px; border-radius: 30px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">Technical Specification</div>
                    <h3 style="color: #0f172a; font-size: 34px; font-weight: 800; margin: 0;">Ratio Configuration Matrix</h3>
                    <p style="color: #64748b; font-size: 18px; margin: 12px 0 0 0;">Table shows the percentage of raw material length used for each finished length.</p>
                </div>
                
                <div style="width: 100%; display: flex; justify-content: center;">
                    <table style="border-collapse: separate; border-spacing: 0; box-shadow: 0 6px 12px -2px rgba(0,0,0,0.05); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; text-align: center; font-size: 18px; color: #334155;">
                        <thead>
                            <tr>
                                <th style="padding: 22px 28px; background: #4f46e5; color: white; border-bottom: 2px solid #e2e8f0; font-weight: 700; border-right: 2px solid #4338ca;">Raw \\ Finished</th>
                                ${activeCols.map(c => `<th style="padding: 22px 28px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #1e293b; border-right: 1px solid #f1f5f9;">${c.len}"</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedRows.map((rIdx, i) => {
                                const bgRowStr = i % 2 === 0 ? "background: #ffffff;" : "background: #f8fafc;";
                                return `
                                <tr style="${bgRowStr}">
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 700; background: #f1f5f9; color: #475569; border-right: 2px solid #e2e8f0;">${rIdx}"</td>
                                    ${activeCols.map(c => {
                                        const val = appState.matrix[c.idx] && appState.matrix[c.idx][rIdx] ? appState.matrix[c.idx][rIdx] : '';
                                        if (val) {
                                            return `<td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; font-weight: 800; color: #10b981; background: #ecfdf5;">${val}%</td>`;
                                        } else {
                                            return `<td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; font-weight: 400; color: #cbd5e1;">-</td>`;
                                        }
                                    }).join('')}
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            `;
        }

        let ratioMadeDateStr = 'Not Saved';
        if (appState.currentClientName && db && db.clients) {
            const clientInfo = db.clients.find(c => c.name === appState.currentClientName);
            if (clientInfo && clientInfo.created) {
                ratioMadeDateStr = new Date(clientInfo.created).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            }
        }
        const sharedDateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        // Hair type badge
        const _supplier = db.suppliers.find(s => s.id === appState.currentSupplierId);
        const _hairType = _supplier ? (_supplier.hairType || 'Regular') : 'Regular';
        const _hairLabel = _hairType === 'Bleachable'
            ? 'Bleachable Hair &nbsp;·&nbsp; Bleachable to Color #613/60'
            : 'Regular Hair &nbsp;·&nbsp; Bleachable to Color #22/27';
        const _hairBadgeBg = _hairType === 'Bleachable' ? '#ede9fe' : '#fef3c7';
        const _hairBadgeColor = _hairType === 'Bleachable' ? '#7c3aed' : '#92400e';
        const _hairBadgeBorder = _hairType === 'Bleachable' ? '#ddd6fe' : '#fde68a';

        const exportUnit = document.getElementById('exportUnitSelect') ? document.getElementById('exportUnitSelect').value : 'kg';
        const exportGramsInputs = document.querySelectorAll('#exportGramsList .gram-val-input');
        const exportGramsArray = Array.from(exportGramsInputs).map(i => parseFloat(i.value)).filter(n => !isNaN(n) && n > 0);
        if (exportGramsArray.length === 0) exportGramsArray.push(100);
        const isGrams = exportUnit === 'grams';
        const isPieces = exportUnit === 'pieces';

        const rowsHTML = ACTIVE_FINISHED_LENGTHS.map((len, idxArray) => {
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[len] !== undefined && appState.customPrices[len] !== '' && appState.customPrices[len] !== null) {
                displayPrice = appState.customPrices[len];
            } else {
                displayPrice = calculateColumn(len);
            }
            if (displayPrice < 0 || (displayPrice === 0 && (!appState.customPricesEnabled || appState.customPrices[len] === undefined || appState.customPrices[len] === ''))) return '';
            
            let isComposite = false;
            if (appState.currentClientName && db && db.clients) {
                const clientInfo = db.clients.find(c => c.name === appState.currentClientName);
                if (clientInfo && clientInfo.tag === 'Composite') isComposite = true;
            }
            if (isComposite && displayPrice <= 0) return '';
            
            const bgStr = idxArray % 2 === 0 ? "background: #ffffff;" : "background: #f8fafc;";
            
            let cellsHTML = '';
            if (exportUnit === 'kg') {
                const converted = formatPriceWithSymbol(displayPrice, appState.currency || 'INR');
                cellsHTML = `<td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums;">${converted}</td>`;
            } else {
                cellsHTML = exportGramsArray.map(g => {
                    let finalPrice = displayPrice;
                    if (finalPrice > 0) finalPrice = (finalPrice / 1000) * g;
                    const converted = formatPriceWithSymbol(finalPrice, appState.currency || 'INR');
                    return `<td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums;">${converted}</td>`;
                }).join('');
            }

            return `
                                <tr style="${bgStr}">
                                    <td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 20px; font-weight: 800; border-right: 1px solid #e2e8f0;">${len}"</td>
                                    ${cellsHTML}
                                </tr>
                            `;
        }).join('');

        const _currentSupplier = db.suppliers.find(s => s.id === appState.currentSupplierId);
        const isBleachable = _currentSupplier && _currentSupplier.hairType === 'Bleachable';

        let productImgHTML = window.getProductImageHTML(appState.currentClientName, '120px');
        let imagesHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; width: 100%;">
                <img src="../images/hw/hwstraightlogo.png" style="height: 55px;" />
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="../images/hw/100percent.png?v=3" style="height: 120px; border-radius: 8px;" />
                    ${isBleachable ? `<img src="../images/hw/bleachable.png?v=3" style="height: 120px; border-radius: 8px;" />` : ''}
                </div>
            </div>
        `;

        container.innerHTML = `
            ${imagesHTML}
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 35px; border-bottom: 3px solid #f1f5f9;">
                <div style="color: #6366f1; font-weight: 700; font-size: 18px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">Official Price List &amp; Config</div>
                <h2 style="color: #0f172a; font-size: 56px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -1.5px;">${renderNameWithLogo(appState.currentClientName, '48px')}</h2>
                <div style="display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <span style="background: #f1f5f9; color: #475569; padding: 10px 24px; border-radius: 30px; font-size: 18px; font-weight: 700;">Pricing in ${appState.currency}</span>
                    <span style="background: ${_hairBadgeBg}; color: ${_hairBadgeColor}; border: 2px solid ${_hairBadgeBorder}; padding: 10px 24px; border-radius: 30px; font-size: 16px; font-weight: 700;">${_hairLabel}</span>
                </div>
            </div>
            
            <div style="width: 100%; max-width: 1100px; margin: 0 auto; display: flex; justify-content: center; align-items: stretch; gap: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white;">
                <div style="flex-grow: 1;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: center; background: transparent;">
                        <thead>
                        <tr>
                            <th style="padding: 16px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px; border-right: 2px solid #334155; width: 50%; position: static;">Finished Length</th>
                            ${exportUnit === 'kg' ? `<th style="padding: 16px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px; width: 50%; position: static;">Prices per kg</th>` : exportGramsArray.map(g => `<th style="padding: 16px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px; position: static;">Prices per ${isPieces ? `1 pc (${g}g)` : `${g}g`}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                        </tbody>
                    </table>
                </div>
                ${(() => {
                    const sideImgHTML = window.getProductImageHTML(appState.currentClientName, 'auto');
                    if (sideImgHTML) {
                        return `<div style="flex: 0 0 350px; display: flex; align-items: center; justify-content: center; padding: 20px; background: #faf0e6; border-left: 2px solid #e2e8f0;">
                            ${sideImgHTML.replace('height: auto;', 'width: 100%; max-height: 80%; height: auto;')}
                        </div>`;
                    }
                    return '';
                })()}
            </div>
            </div>
            ${matrixHTML}
            <div style="display: flex; justify-content: center; gap: 60px; color: #94a3b8; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-top: 30px;">
                <span>Ratio Made: <span style="font-weight: 800; color: #64748b;">${ratioMadeDateStr}</span></span>
                <span>Shared On: <span style="font-weight: 800; color: #64748b;">${sharedDateStr}</span></span>
            </div>
        `;

        document.body.appendChild(container);

        // Generate Image
        html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 3 // Higher resolution
        }).then(canvas => {
            if (mode === 'download') {
                const link = document.createElement('a');
                link.download = `${appState.currentClientName}.png`;
                link.href = canvas.toDataURL();
                link.click();
                
                downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
                setTimeout(() => downloadBtn.innerHTML = originalBtnHtml, 2000);
            } else if (mode === 'copy') {
                canvas.toBlob(async (blob) => {
                    try {
                        if (navigator.clipboard && window.ClipboardItem) {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            copyPriceListBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            setTimeout(() => copyPriceListBtn.innerHTML = originalBtnHtml, 2000);
                        } else {
                            throw new Error('Clipboard API not supported');
                        }
                    } catch (err) {
                        console.error("Copy failed", err);
                        copyPriceListBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
                        setTimeout(() => copyPriceListBtn.innerHTML = originalBtnHtml, 2000);
                    }
                }, "image/png");
            }

            // Cleanup
            document.body.removeChild(container);
        }).catch(err => {
            console.error(err);
            alert('Failed to generate image');
            if (document.body.contains(container)) document.body.removeChild(container);
            
            if (mode === 'download') downloadBtn.innerHTML = originalBtnHtml;
            else copyPriceListBtn.innerHTML = originalBtnHtml;
        });
    }

    // --- Supplier Management ---

    function initSupplierGrid() {
        supplierPriceBody.innerHTML = '';
        ALL_RAW_LENGTHS.forEach(len => {
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

        const legacyMap = [4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40];
        const legacyIdx = legacyMap.indexOf(parseInt(lenIdx));

        // Matrix stores RAW COST (after mixing).
        // Let's check client.matrix.
        const colData = client.matrix[lenIdx] || (legacyIdx !== -1 ? client.matrix[legacyIdx] : null); // This is the column for this length
        if (!colData) return 0;

        // Calculate Weighted Raw Cost
        let totalCost = 0;
        let totalPct = 0;
        Object.keys(colData).forEach(rawLenKey => {
            // We need price for this raw length from supplier
            const pct = colData[rawLenKey];
            if (pct > 0) {
                let p = 0;
                if (supplier) {
                    p = supplier.prices[rawLenKey] || 0;
                } else {
                    p = appState.prices[rawLenKey] || 0;
                }
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
        let marginValue = 0;
        if (client.marginType === 'amount') {
            marginValue = client.marginAmount || 0;
        } else {
            marginValue = currentCost * ((client.marginPercent || 0) / 100);
        }
        const finalPrice = currentCost + marginValue;

        // 5. Rounding & Currency
        const factor = (client.roundingFactor !== undefined && client.roundingFactor !== '') ? parseFloat(client.roundingFactor) : 50;
        const roundedInr = (factor > 0) ? (Math.round(finalPrice / factor) * factor) : Math.round(finalPrice * 100) / 100;
        const rate = client.exchangeRate || 1;
        const converted = parseFloat((roundedInr * rate)).toFixed(2);

        // If customPrices are enabled in this saved client config, override
        if(client.customPricesEnabled && client.customPrices) {
            const customVal = client.customPrices[lenIdx] || (legacyIdx !== -1 ? client.customPrices[legacyIdx] : null);
            if (customVal > 0) {
                return parseFloat(customVal).toFixed(2);
            }
        }

        return converted;
    }

    async function generateMultiExport(mode = 'download') {
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

            // Generate Intelligent Title
            const ratioNames = selectedFilenames.map(name => name.trim());
            let generatedTitle = 'Multiple Price Lists';
            if (ratioNames.length === 1) {
                generatedTitle = ratioNames[0];
            } else if (ratioNames.length === 2) {
                generatedTitle = `${ratioNames[0]} & ${ratioNames[1]}`;
            } else if (ratioNames.length > 2) {
                generatedTitle = `${ratioNames[0]}, ${ratioNames[1]} & ${ratioNames.length - 2} More`;
            }

            // Create Container
            const container = document.createElement('div');
            container.id = 'export-container';
            container.style.cssText = "background: white; padding: 24px; border-radius: 16px; width: max-content; min-width: 800px; margin: 20px auto; font-family: 'Inter', sans-serif; box-sizing: border-box;";

            // Build Header Row
            let headerHtml = `<th style="padding: 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; border-right: 1px solid #e2e8f0; position: static;">Finished Length</th>`;
            selectedClients.forEach(c => {
                headerHtml += `<th style="padding: 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; border-right: 1px solid #e2e8f0; position: static;">${renderNameWithLogo(c.name, '11px')} (${c.currency || 'INR'})</th>`;
            });

            // Build Body
            let bodyHtml = '';
            let validRows = 0;
            ACTIVE_FINISHED_LENGTHS.forEach((len) => {
            const idx = len;
                let rowHtml = `<td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 600; border-right: 1px solid #f1f5f9;">${len}"</td>`;
                let hasData = false;

                selectedClients.forEach(client => {
                    const price = calculatePriceForClient(client, idx);
                    const formattedPrice = price > 0 ? formatPriceWithSymbol(price, client.currency || 'INR') : '-';
                    rowHtml += `<td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; font-variant-numeric: tabular-nums; border-right: 1px solid #f1f5f9;">${formattedPrice}</td>`;
                    if (price > 0) hasData = true;
                });

                if (hasData) {
                    const bgStr = validRows % 2 === 0 ? "background: #ffffff;" : "background: #f8fafc;";
                    bodyHtml += `<tr style="${bgStr}">${rowHtml}</tr>`;
                    validRows++;
                }
            });

            const isMultiBleachable = selectedClients.every(c => {
                const sup = db.suppliers.find(s => s.id === (c.raw_supplier_id || c.supplierId));
                return sup && sup.hairType === 'Bleachable';
            });

            let multiProductImgs = [];
            selectedClients.forEach(c => {
                const imgHTML = window.getProductImageHTML(c.name, '100px');
                if (imgHTML && !multiProductImgs.includes(imgHTML)) {
                    multiProductImgs.push(imgHTML);
                }
            });

            let imagesHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                    <img src="../images/hw/hwstraightlogo.png" style="height: 45px;" />
                    <div style="display: flex; gap: 15px; align-items: center;">
                        ${multiProductImgs.join('')}
                        <img src="../images/hw/100percent.png?v=3" style="height: 100px; border-radius: 8px;" />
                        ${isMultiBleachable ? `<img src="../images/hw/bleachable.png?v=3" style="height: 100px; border-radius: 8px;" />` : ''}
                    </div>
                </div>
            `;

            container.innerHTML = `
            ${imagesHTML}
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
                <div style="color: #6366f1; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Comparison Price List</div>
                <h2 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.5px;">${generatedTitle}</h2>
            </div>
            <div style="width: 100%; display: flex; justify-content: center; align-items: flex-start;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; text-align: center;">
                    <thead>
                        <tr>${headerHtml}</tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
            <div style="text-align: center; color: #94a3b8; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px;">
                Generated on ${new Date().toLocaleDateString()}
            </div>
        `;

            document.body.appendChild(container);
            multiExportModal.classList.add('hidden'); // Close modal

            // Capture
            html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 3
            }).then(canvas => {
                if (mode === 'download') {
                    const link = document.createElement('a');
                    link.download = `${generatedTitle}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    document.body.removeChild(container);
                } else if (mode === 'copy') {
                    canvas.toBlob(async (blob) => {
                        try {
                            if (navigator.clipboard && window.ClipboardItem) {
                                const item = new ClipboardItem({ "image/png": blob });
                                await navigator.clipboard.write([item]);
                                alert('Image copied to clipboard successfully!');
                            } else {
                                throw new Error('Clipboard API not supported');
                            }
                        } catch (err) {
                            console.error("Copy failed", err);
                            alert("Copy to clipboard failed. " + err.message);
                        } finally {
                            document.body.removeChild(container);
                        }
                    });
                }
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
            const hairType = s.hairType || 'Regular';
            const badgeStyle = hairType === 'Bleachable'
                ? 'background:#ede9fe; color:#7c3aed; border:1px solid #ddd6fe;'
                : 'background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;';
            li.innerHTML = `<span>${s.name}</span><span style="float:right; font-size:9px; font-weight:700; padding:2px 6px; border-radius:8px; ${badgeStyle}">${hairType}</span>`;
            li.addEventListener('click', () => loadSupplierForEditing(s.id));
            supplierListEl.appendChild(li);
        });
    }

    function startNewSupplier() {
        editingSupplierId = null;
        editSupplierName.value = '';
        if (editSupplierHairType) editSupplierHairType.value = 'Regular';
        // clear inputs
        document.querySelectorAll('.supplier-price-edit').forEach(inp => inp.value = '');

        // Update UI state
        renderSupplierList(); // To remove active class
        deleteSupplierBtn.classList.add('hidden');
        const duplicateSupplierBtn = document.getElementById('duplicateSupplierBtn');
        if (duplicateSupplierBtn) duplicateSupplierBtn.classList.add('hidden');
    }

    function loadSupplierForEditing(id) {
        const supplier = db.suppliers.find(s => s.id === id);
        if (!supplier) return;

        editingSupplierId = id;
        editSupplierName.value = supplier.name;
        if (editSupplierHairType) editSupplierHairType.value = supplier.hairType || 'Regular';

        // Fill inputs
        document.querySelectorAll('.supplier-price-edit').forEach(inp => {
            const len = inp.dataset.len;
            inp.value = supplier.prices[len] || '';
        });

        renderSupplierList(); // update active state
        deleteSupplierBtn.classList.remove('hidden');
        const duplicateSupplierBtn = document.getElementById('duplicateSupplierBtn');
        if (duplicateSupplierBtn) duplicateSupplierBtn.classList.remove('hidden');
    }

    function duplicateSupplier() {
        if (!editingSupplierId) return;
        
        // Disconnect from the currently saved ID to create a draft
        editingSupplierId = null; 
        
        // Modify the name input to denote a copy
        const currentName = editSupplierName.value.trim();
        editSupplierName.value = currentName ? `${currentName} (Copy)` : 'Copy';
        
        // Hide delete/duplicate buttons since this is now an unsaved draft
        deleteSupplierBtn.classList.add('hidden');
        const duplicateSupplierBtn = document.getElementById('duplicateSupplierBtn');
        if (duplicateSupplierBtn) duplicateSupplierBtn.classList.add('hidden');
        
        // Re-render list to clear active highlight
        renderSupplierList();
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
                db.suppliers[idx].hairType = editSupplierHairType ? editSupplierHairType.value : 'Regular';
                supplierData = db.suppliers[idx];
            }
            
            // Un-delete it if someone is editing a recently soft-deleted one
            if (db.deletedSuppliers && db.deletedSuppliers.includes(editingSupplierId)) {
                db.deletedSuppliers = db.deletedSuppliers.filter(id => id !== editingSupplierId);
            }
        } else {
            // Create
            const id = 'sup_' + Date.now();
            const hairType = editSupplierHairType ? editSupplierHairType.value : 'Regular';
            supplierData = { id, name, prices, hairType };
            db.suppliers.push(supplierData);
            editingSupplierId = id;
        }

        // Save locally
        try {
            saveDB();
            
            try {
                fetch('/api/save-supplier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(supplierData)
                }).catch(e => console.warn("Could not save to local server", e));
            } catch(e) {}
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

            if (!db.deletedSuppliers) db.deletedSuppliers = [];
            db.deletedSuppliers.push(editingSupplierId);
            db.suppliers = db.suppliers.filter(s => s.id !== editingSupplierId);
            saveDB();

            // Also try to delete from server via API (if running locally natively)
            try {
                fetch('/api/delete-supplier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingSupplierId })
                }).catch(e => console.warn("Could not delete from server", e));
            } catch(e) {}

        } catch (e) {
            alert("Error deleting supplier");
            console.error(e);
            return;
        }

        if (appState.currentSupplierId === editingSupplierId) {
            appState.currentSupplierId = null;
            appState.prices = {};
        }

        startNewSupplier();
        renderSupplierList();
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
        const tag = clientTagInput ? clientTagInput.value.trim() : '';
        if (!name) return alert("Please enter a Ratio Name to save configuration.");

        // Requirement: "This will only save the ratios matrix to the jason file."
        const ratioData = {
            name,
            tag,
            matrix: appState.matrix,
            currency: appState.currency || 'INR',
            marginType: appState.marginType || 'percent',
            marginPercent: appState.marginPercent || 0,
            marginAmount: appState.marginAmount || 0,

            wastagePercent: appState.wastagePercent || 0,
            machineCharge: appState.machineCharge !== undefined ? appState.machineCharge : 2500,
            machineChargeName: appState.machineChargeName || 'MR/Wash Charge',
            weftingWastagePercent: appState.weftingWastagePercent || 0,
            weftingCharge: appState.weftingCharge || 0,
            exchangeRate: appState.exchangeRate || 1,
            roundingFactor: appState.roundingFactor !== undefined ? appState.roundingFactor : 50,
            customPricesEnabled: appState.customPricesEnabled || false,
            customPrices: JSON.parse(JSON.stringify(appState.customPrices || {})),
            individualMargins: JSON.parse(JSON.stringify(appState.individualMargins || {})),
            supplierId: appState.currentSupplierId || null,
            exportUnit: document.getElementById('exportUnitSelect') ? document.getElementById('exportUnitSelect').value : 'kg',
            exportGrams: Array.from(document.querySelectorAll('#exportGramsList .gram-val-input')).map(i => parseFloat(i.value)).filter(n => !isNaN(n) && n > 0),
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

            // Un-delete the ratio if it was previously deleted so Firebase merge won't ban it
            if (db.deletedClients && db.deletedClients.includes(name)) {
                db.deletedClients = db.deletedClients.filter(n => n !== name);
            }

            saveDB();
            
            try {
                // Key sanitization exactly like save-client
                const safeName = name.replace(/[^a-z0-9_\-\. ]/gi, '_');
                const filename = `${safeName}.json`;
                fetch('/api/save-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ratioData)
                }).catch(e => console.warn("Could not save to local server", e));
            } catch(e) {}
            
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
            if (clientTagInput) clientTagInput.value = data.tag || '';
            appState.tag = data.tag || '';
            if (typeof updateRatioDisplay === 'function') updateRatioDisplay();
            // MIGRATION HOOK: Safely cast indices (0,1..) natively back into absolute lengths (4,6..)
            const legacyMap = [4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40];
            
            // Determine if this ratio uses legacy indices instead of lengths
            let isLegacy = false;
            if (data.matrix) {
                const keys = Object.keys(data.matrix).map(Number).filter(n => !isNaN(n));
                if (keys.some(k => k < 4)) {
                    isLegacy = true; // indices 0,1,2,3 are strictly legacy
                } else if (keys.length > 0 && keys.every(k => k <= 18 && k >= 4)) {
                    // Ambiguous range: keys are in [4, 18].
                    // We check if the raw lengths (inner keys) suggest legacy behavior.
                    const sampleKey = keys[0];
                    const innerObj = data.matrix[sampleKey];
                    if (innerObj && typeof innerObj === 'object') {
                        const innerKeys = Object.keys(innerObj).map(Number).filter(n => !isNaN(n));
                        if (innerKeys.length > 0) {
                            const maxRaw = Math.max(...innerKeys);
                            // If max raw length used is >= the mapped finished length, it's legacy.
                            // e.g. index 4 -> 12". Max raw must be >= 12".
                            if (maxRaw >= legacyMap[sampleKey]) {
                                isLegacy = true;
                            }
                        }
                    }
                }
            }

            const translateMap = (obj) => {
                if (!obj) return {};
                if (!isLegacy) return JSON.parse(JSON.stringify(obj)); // Return unchanged if already using lengths
                
                let mapped = {};
                Object.keys(obj).forEach(k => {
                    const numK = parseInt(k);
                    if (numK < 20) {
                        const lenStr = legacyMap[numK];
                        if (lenStr) mapped[lenStr] = obj[k];
                    } else {
                        mapped[k] = obj[k]; // already length based
                    }
                });
                return mapped;
            };

            appState.matrix = translateMap(data.matrix || {});
            if (data.customPrices) appState.customPrices = translateMap(data.customPrices);
            if (data.individualMargins) appState.individualMargins = translateMap(data.individualMargins);
            // Restore supplier if available
            if (data.supplierId && db.suppliers.find(s => s.id === data.supplierId)) {
                supplierSelect.value = data.supplierId;
                loadSupplierPricesIntoMixer(data.supplierId);
            } else {
                supplierSelect.value = "";
                appState.currentSupplierId = null;
                // Use the latest global appState.prices if no supplier is specified
                applyRawLengthsVisibility();
            }

            // Restore Modifiers Safely
            appState.marginType = data.marginType || 'percent';
            appState.marginAmount = data.marginAmount || 0;
            appState.marginPercent = (data.marginPercent !== undefined && data.marginPercent !== null) ? data.marginPercent : 30;

            appState.wastagePercent = (data.wastagePercent !== undefined && data.wastagePercent !== null) ? data.wastagePercent : 10;
            appState.machineCharge = (data.machineCharge !== undefined && data.machineCharge !== null) ? data.machineCharge : 2500;
            appState.machineChargeName = data.machineChargeName || 'MR/Wash Charge';
            appState.currency = data.currency || 'INR';
            appState.exchangeRate = data.exchangeRate || 1;
            appState.roundingFactor = data.roundingFactor !== undefined ? data.roundingFactor : 50;
            if (roundingFactorInput) {
                roundingFactorInput.value = appState.roundingFactor;
            }
            updateRoundingLabel();
            
            if (data.customPricesEnabled) {
                appState.customPricesEnabled = data.customPricesEnabled;
                appState.customPrices = data.customPrices || {};
                customizePricesCheckbox.checked = true;
                customPriceRow.classList.remove('hidden');
            } else {
                appState.customPricesEnabled = false;
                appState.customPrices = {};
                customizePricesCheckbox.checked = false;
                customPriceRow.classList.add('hidden');
            }
            appState.individualMargins = data.individualMargins || {};

            // Force DOM values synchronously
            if (marginTypeSelect) {
                marginTypeSelect.value = appState.marginType;
                if (marginInputLabel) {
                    marginInputLabel.innerText = appState.marginType === 'percent' ? 'Margin %' : 'Margin Amt';
                }
            }
            if (appState.marginType === 'amount') {
                marginInput.value = appState.marginAmount;
            } else {
                marginInput.value = appState.marginPercent;
            }

            wastageInput.value = appState.wastagePercent;
            machineRemyInput.value = appState.machineCharge;
            if (machineChargeNameInput) {
                machineChargeNameInput.value = appState.machineChargeName;
            }
            if (machineRowLabel) {
                machineRowLabel.textContent = appState.machineChargeName;
            }
            currencySelect.value = appState.currency;
            exchangeRateInput.value = appState.exchangeRate;
            currencyCodeDisplay.textContent = appState.currency;
            
            const exportUnitSel = document.getElementById('exportUnitSelect');
            if (exportUnitSel) {
                exportUnitSel.value = data.exportUnit || 'kg';
                document.getElementById('exportGramsContainer').style.display = exportUnitSel.value === 'grams' ? 'flex' : 'none';
                
                if (data.exportGrams && data.exportGrams.length > 0) {
                    const gl = document.getElementById('exportGramsList');
                    if (gl) {
                        gl.innerHTML = '';
                        data.exportGrams.forEach(g => {
                            window.addGramInputBox('exportGramsList', false);
                            const inputs = gl.querySelectorAll('.gram-val-input');
                            if (inputs.length > 0) inputs[inputs.length - 1].value = g;
                        });
                    }
                }
            }
            // Save custom prices first because the event listeners call clearCustomPrices()
            const savedCustomPrices = JSON.parse(JSON.stringify(appState.customPrices || {}));
            
            // Dispatch to let internal event listeners naturally bind
            [marginInput, wastageInput, machineRemyInput, exchangeRateInput, roundingFactorInput].forEach(inp => {
                if(inp) inp.dispatchEvent(new Event('input', { bubbles: true }));
            });
            
            // CRITICAL FIX: Restore custom prices that were cleared by event listeners
            appState.customPrices = savedCustomPrices;
            
            // Directly redraw table inputs
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
            if (!db.deletedClients) db.deletedClients = [];
            db.deletedClients.push(filename);
            saveDB();

            try {
                // Key sanitization
                const safeName = filename.replace(/[^a-z0-9_\-\. ]/gi, '_');
                const apiFilename = `${safeName}.json`;
                fetch('/api/delete-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: apiFilename })
                }).catch(e => console.warn("Could not delete from server", e));
            } catch(e) {}

            alert(`Ratio "${displayName}" deleted.`);
            refreshRatioDropdown();
            deleteClientBtn.classList.add('hidden');
            clientNameInput.value = '';
            if (clientTagInput) clientTagInput.value = '';
            if (typeof updateRatioDisplay === 'function') updateRatioDisplay();

            if (typeof renderSavedRatios === 'function') renderSavedRatios();
        } catch (e) {
            console.error(e);
            alert("Error deleting ratio.");
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
            const clients = (db.clients || []).slice().sort((a, b) => a.name.localeCompare(b.name));
            
            const groups = {};
            const noTagClients = [];

            clients.forEach(client => {
                const tagStr = client.tag ? client.tag.trim() : '';
                if (tagStr) {
                    let tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => {
                        if (!groups[tag]) groups[tag] = [];
                        groups[tag].push(client);
                    });
                } else {
                    noTagClients.push(client);
                }
            });

            // Sort tags alphabetically
            const sortedTags = Object.keys(groups).sort((a, b) => a.localeCompare(b));

            sortedTags.forEach(tag => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = tag;
                groups[tag].forEach(client => {
                    const opt = document.createElement('option');
                    opt.value = client.name;
                    opt.textContent = client.name;
                    optgroup.appendChild(opt);
                });
                clientSelect.appendChild(optgroup);
            });

            // Add untagged clients at the end
            if (noTagClients.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = "Untagged";
                noTagClients.forEach(client => {
                    const opt = document.createElement('option');
                    opt.value = client.name;
                    opt.textContent = client.name;
                    optgroup.appendChild(opt);
                });
                clientSelect.appendChild(optgroup);
            }
        } catch (e) {
            console.error("Failed to list ratios", e);
        }
    }

    function updateRatioDisplay() {
        const display = document.getElementById('activeRatioDisplay');
        if (!display) return;
        const name = clientNameInput ? clientNameInput.value.trim() : '';
        const tag = clientTagInput ? clientTagInput.value.trim() : '';
        if (name) {
            display.textContent = tag ? `${name} [${tag}]` : name;
            display.style.display = 'inline-block';
        } else {
            display.textContent = '';
            display.style.display = 'none';
        }
    }

    // (Removed refreshPriceListDropdown)

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
                                
                                // Safe Merge Clients
                                if (cloudDB.clients) {
                                    const cDeleted = new Set([...(cloudDB.deletedClients || []), ...(db.deletedClients || [])]);
                                    const mergedMap = new Map();
                                    cloudDB.clients.forEach(c => { if(!cDeleted.has(c.name)) mergedMap.set(c.name, c); });
                                    if (db.clients) {
                                        db.clients.forEach(c => {
                                            if (!mergedMap.has(c.name) && !cDeleted.has(c.name)) mergedMap.set(c.name, c);
                                        });
                                    }
                                    db.clients = Array.from(mergedMap.values());
                                    db.deletedClients = Array.from(cDeleted);
                                    updated = true;
                                }
                                
                                // Safe Merge Suppliers
                                if (cloudDB.suppliers) {
                                    const sDeleted = new Set([...(cloudDB.deletedSuppliers || []), ...(db.deletedSuppliers || [])]);
                                    const mergedMap = new Map();
                                    cloudDB.suppliers.forEach(s => { if(!sDeleted.has(s.id)) mergedMap.set(s.id, s); });
                                    if (db.suppliers) {
                                        db.suppliers.forEach(s => {
                                            if (!mergedMap.has(s.id) && !sDeleted.has(s.id)) mergedMap.set(s.id, s);
                                        });
                                    }
                                    db.suppliers = Array.from(mergedMap.values());
                                    db.deletedSuppliers = Array.from(sDeleted);
                                    updated = true;
                                }
                                
                                
                                // Clean up old db.priceLists sync if any
                                if (cloudDB.priceLists) {
                                    db.priceLists = cloudDB.priceLists;
                                }

                                if (updated) {
                                    localStorage.setItem('hairRatioDB', JSON.stringify(db));
                                    refreshSupplierDropdowns();
                                    renderSupplierList();
                                    refreshRatioDropdown();
                                    // refreshPriceListDropdown();
                                    if (typeof renderSavedRatios === 'function') renderSavedRatios();
                                    
                                    // Make sure cloud gets updated if we preserved some local stuff that wasn't in cloud
                                    setTimeout(() => {
                                        // turn off the lock, then push back any local creations we salvaged
                                        firebaseSyncActive = false; 
                                        syncToFirebase(db);
                                    }, 1000);
                                } else {
                                    firebaseSyncActive = false;
                                }
                            }
                        } else {
                            // Document does not exist in the cloud yet!
                            // This happens on a fresh database. We should push our local DB to initialize it safely.
                            if (db.clients.length > 0 || db.suppliers.length > 0) {
                                syncToFirebase(db);
                            }
                        }
                    });
            } catch (e) {
                console.error("Firebase listener setup failed:", e);
                firebaseSyncActive = false;
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

                if (localDB.deletedSuppliers) db.deletedSuppliers = localDB.deletedSuppliers;
                if (localDB.deletedClients) db.deletedClients = localDB.deletedClients;
            } catch (e) { console.error(e); }
        }

        if (!db.suppliers) db.suppliers = [];
        if (!db.clients) db.clients = [];
        if (!db.priceLists) db.priceLists = [];

        // Optional Check: Create default if absolutely empty
        // Mute this to avoid accidentally overwriting Firebase cloud DB when no local storage is present
        // Wait for Firebase listener to pull in global data instead.

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
                            // Optionally overwrite local with server state
                            // We now prefer local edits over static server data
                            // const idx = db.suppliers.findIndex(ls => ls.id === s.id);
                            // db.suppliers[idx] = s;
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
                            // We now prefer local edits over static server data
                            // const idx = db.clients.findIndex(lc => lc.name === c.name);
                            // db.clients[idx] = c;
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
        } else {
            applyRawLengthsVisibility();
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
        if (clientTagInput) appState.currentClientTag = clientTagInput.value;
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
                } else {
                    applyRawLengthsVisibility();
                }
                if (appState.currentClientName) {
                    clientNameInput.value = appState.currentClientName;
                    if (typeof updateRatioDisplay === 'function') updateRatioDisplay();
                }
                if (appState.currentClientTag && clientTagInput) {
                    clientTagInput.value = appState.currentClientTag;
                    if (typeof updateRatioDisplay === 'function') updateRatioDisplay();
                }

                // Restore inputs
                if (marginTypeSelect) {
                    marginTypeSelect.value = appState.marginType || 'percent';
                    if (marginInputLabel) {
                        marginInputLabel.innerText = marginTypeSelect.value === 'percent' ? 'Margin %' : 'Margin Amt';
                    }
                }
                if (appState.marginType === 'amount') {
                    marginInput.value = appState.marginAmount !== undefined ? appState.marginAmount : 0;
                } else {
                    marginInput.value = appState.marginPercent !== undefined ? appState.marginPercent : 30;
                }

                wastageInput.value = appState.wastagePercent !== undefined ? appState.wastagePercent : 10;
                machineRemyInput.value = appState.machineCharge !== undefined ? appState.machineCharge : 2500;

                if (appState.machineChargeName === undefined) appState.machineChargeName = 'MR/Wash Charge';
                if (machineChargeNameInput) {
                    machineChargeNameInput.value = appState.machineChargeName;
                }
                if (machineRowLabel) {
                    machineRowLabel.textContent = appState.machineChargeName;
                }

                if (appState.currency) {
                    currencySelect.value = appState.currency;
                    currencyCodeDisplay.textContent = appState.currency;
                }
                if (appState.exchangeRate) exchangeRateInput.value = appState.exchangeRate;
                appState.roundingFactor = appState.roundingFactor !== undefined ? appState.roundingFactor : 50;
                if (roundingFactorInput) {
                    roundingFactorInput.value = appState.roundingFactor;
                }
                updateRoundingLabel();
                if (appState.accentColor && accentColorInput) accentColorInput.value = appState.accentColor;
                
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
            // New instance: load it blank
            appState.matrix = {};
            appState.prices = {};
            if(supplierSelect) supplierSelect.value = "";
            marginInput.value = 30;

            appState.marginPercent = 30;
            appState.discountPercent = 0;
            appState.discountAmount = 0;
            wastageInput.value = 10;
            appState.wastagePercent = 10;
            if (roundingFactorInput) {
                roundingFactorInput.value = 50;
            }
            appState.roundingFactor = 50;
            updateRoundingLabel();
            refreshTableInputs();
        }
    }

    // Navigation support for arrow keys (Re-added)
    function handleNavigation(e) {
        const colIdx = parseInt(e.target.dataset.colIdx);

        // Ctrl+C — copy this column's ratios
        if (e.ctrlKey && e.key === 'c' && !e.shiftKey && !e.altKey) {
            // Only intercept if nothing is selected in the input
            const inp = e.target;
            if (inp.selectionStart === inp.selectionEnd) {
                e.preventDefault();
                _copyColumnByIdx(colIdx);
                return;
            }
        }

        // Ctrl+V — paste copied column ratios
        if (e.ctrlKey && e.key === 'v' && !e.shiftKey && !e.altKey) {
            if (_copiedColData) {
                e.preventDefault();
                _pasteColumnByIdx(colIdx);
                return;
            }
        }

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

// Dynamic Gram Input Handlers
window.addGramInputBox = function(containerId, isMulti = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'gram-input-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '4px';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = isMulti ? 'gram-val-input multi-gram' : 'gram-val-input';
    input.value = '100';
    if (isMulti) {
        input.style.width = '60px';
        input.style.padding = '4px 6px';
        input.style.border = '1px solid #c7d2fe';
        input.style.borderRadius = '6px';
        input.style.fontSize = '13px';
        input.style.fontWeight = '600';
        input.style.color = '#334155';
        input.style.outline = 'none';
    } else {
        input.style.width = '60px';
        input.style.padding = '4px';
        input.style.border = '1px solid #cbd5e1';
        input.style.borderRadius = '4px';
        input.style.fontSize = '13px';
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fa-solid fa-circle-minus"></i>';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.color = '#ef4444';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.padding = '0';
    removeBtn.onclick = function() {
        wrapper.remove();
    };
    
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
};

window.removeGramInputBox = function(btnElement) {
    // This is handled via the onclick function assigned during creation, but keeping for reference if needed.
    if (btnElement && btnElement.parentElement) {
        btnElement.parentElement.remove();
    }
};
