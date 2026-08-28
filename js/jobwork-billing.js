/**
 * Jobwork Billing Logic - Redesigned UI
 */

document.addEventListener('DOMContentLoaded', () => {
    const salesmanFilter = document.getElementById('salesmanFilter');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const calculateBtn = document.getElementById('calculateBtn');
    const tableSearchFilter = document.getElementById('tableSearchFilter');
    
    const toggleConfigBtn = document.getElementById('configToggleBtn');
    const configPanel = document.getElementById('configPanel');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    const sheetIdInput = document.getElementById('sheetIdInput');
    const gidInput = document.getElementById('gidInput');
    const salesmanColumnSelect = document.getElementById('salesmanColumnSelect');
    const dateColumnSelect = document.getElementById('dateColumnSelect');
    const amountColumnSelect = document.getElementById('amountColumnSelect');
    
    const tableHeaders = document.getElementById('tableHeaders');
    const tableBody = document.getElementById('tableBody');
    
    const statOrderCount = document.getElementById('statOrderCount');
    const statTotalAmount = document.getElementById('statTotalAmount');
    const statSalesmenCount = document.getElementById('statSalesmenCount');
    const statDateRange = document.getElementById('statDateRange');
    
    let rawHeaders = [];
    let rawRows = [];
    let uniqueSalesmen = new Set();
    let columnFilters = {};
    let currentSortCol = null;
    let currentSortDir = 'asc';

    // --- Tab Switching Logic ---
    const tabOrdersBtn = document.getElementById('tabOrdersBtn');
    const tabRatesBtn = document.getElementById('tabRatesBtn');
    const ordersTabContent = document.getElementById('ordersTabContent');
    const ratesTabContent = document.getElementById('ratesTabContent');

    if (tabOrdersBtn && tabRatesBtn) {
        tabOrdersBtn.addEventListener('click', () => {
            tabOrdersBtn.classList.replace('text-slate-500', 'text-blue-600');
            tabOrdersBtn.classList.replace('border-transparent', 'border-blue-600');
            tabRatesBtn.classList.replace('text-blue-600', 'text-slate-500');
            tabRatesBtn.classList.replace('border-blue-600', 'border-transparent');
            ordersTabContent.classList.remove('hidden');
            ratesTabContent.classList.add('hidden');
        });
        tabRatesBtn.addEventListener('click', () => {
            tabRatesBtn.classList.replace('text-slate-500', 'text-blue-600');
            tabRatesBtn.classList.replace('border-transparent', 'border-blue-600');
            tabOrdersBtn.classList.replace('text-blue-600', 'text-slate-500');
            tabOrdersBtn.classList.replace('border-blue-600', 'border-transparent');
            ordersTabContent.classList.add('hidden');
            ratesTabContent.classList.remove('hidden');
            renderRatesTab(); // Re-render when switching
        });
    }

    
    const ALIASES_KEY = 'inh_jobwork_aliases_v1';
    let productAliases = JSON.parse(localStorage.getItem(ALIASES_KEY)) || {};
    
    function getCanonicalProduct(salesman, product) {
        if (productAliases[salesman] && productAliases[salesman][product]) {
            return productAliases[salesman][product];
        }
        return product;
    }

    const RATES_KEY = 'inh_jobwork_rates_v1';
    let salespersonProductRates = JSON.parse(localStorage.getItem(RATES_KEY)) || {};
    
    const PAYMENTS_KEY = 'inh_jobwork_payments_v1';
    let salespersonPayments = JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || {};
    
    const DELETED_ROWS_KEY = 'inh_jobwork_deleted_rows_v1';
    let deletedRows = JSON.parse(localStorage.getItem(DELETED_ROWS_KEY)) || {};
    
    const EXCLUDED_ROWS_KEY = 'inh_jobwork_excluded_rows_v1';
    let excludedRows = JSON.parse(localStorage.getItem(EXCLUDED_ROWS_KEY)) || {};
    
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    const paymentModal = document.getElementById('paymentModal');
    const paymentSalesmanName = document.getElementById('paymentSalesmanName');
    const paymentDate = document.getElementById('paymentDate');
    const paymentAmount = document.getElementById('paymentAmount');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const savePaymentBtn = document.getElementById('savePaymentBtn');
    
    const CONFIG_KEY = 'inh_jobwork_billing_config_v4';
    let savedConfig = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {
        sheetId: '',
        gid: '',
        salesmanColIdx: -1,
        dateColIdx: -1,
        amountColIdx: -1
    };
    
    if (savedConfig.sheetId) {
        sheetIdInput.value = savedConfig.sheetId;
    } else {
        sheetIdInput.value = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    }
    
    if (savedConfig.gid) {
        gidInput.value = savedConfig.gid;
    } else {
        gidInput.value = '904261097';
    }

    if (toggleConfigBtn) {
        toggleConfigBtn.addEventListener('click', () => {
            configPanel.classList.toggle('hidden');
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadData();
        });
    }

    async function loadData() {
        console.log("loadData started");
        try {
            salesmanFilter.innerHTML = '<option value="">Loading Google Sheet...</option>';
            
            const apiKey = window.GOOGLE_SHEETS_API_KEY;
            let sheetId = sheetIdInput.value.trim();
            const gid = gidInput.value.trim() || '0';
            
            console.log("Sheet config:", { apiKey: apiKey ? 'present' : 'missing', sheetId, gid });
            
            let metaData = null;
            let valData = null;
            
            let useProxy = false;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                useProxy = true;
            }
            
            console.log("useProxy:", useProxy);
            
            if (useProxy) {
                console.log("Fetching via proxy...");
                const response = await fetch(`/api/delegated-orders?spreadsheetId=${sheetId}&gid=${gid}`);
                if (!response.ok) throw new Error(`Backend fetch failed HTTP ${response.status}`);
                const result = await response.json();
                if (!result.success) throw new Error(result.error || "Backend sync failed");
                
                // The backend proxy format returns { headers: [], rows: [] } 
                // We need to re-assemble into `rows` format like Google Sheets
                const rawHeaders = result.headers || [];
                const proxyRows = result.rows || [];
                const assembledRows = [rawHeaders];
                
                proxyRows.forEach(obj => {
                    let arr = new Array(rawHeaders.length).fill('');
                    rawHeaders.forEach((h, i) => {
                        arr[i] = obj[h] !== undefined ? obj[h] : '';
                    });
                    assembledRows.push(arr);
                });
                valData = { values: assembledRows };
                console.log("Proxy fetch done");
            } else {
                const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
                console.log("Fetching metaUrl");
                const metaResp = await fetch(metaUrl);
                console.log("metaResp received");
                metaData = await metaResp.json();
                console.log("metaData parsed");
                
                if (metaData.error) {
                    throw new Error(metaData.error.message);
                }
                
                const sheetsList = metaData.sheets || [];
                let targetSheet = sheetsList.find(s => String(s.properties?.sheetId) === String(gid));
                if (!targetSheet) targetSheet = sheetsList[0];
                
                const tabTitle = targetSheet.properties.title;
                console.log("Tab title:", tabTitle);
                
                const valUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}!A1:ZZZ?key=${apiKey}`;
                console.log("Fetching valUrl");
                const valResp = await fetch(valUrl);
                console.log("valResp received");
                valData = await valResp.json();
                console.log("valData parsed");
                if (valData.error) throw new Error(valData.error.message);
            }
            
            const rows = valData.values || [];
            if (rows.length === 0) throw new Error("Sheet is empty");
            
            // Find the header row (the one in the first 10 rows with the most columns)
            let headerRowIdx = 0;
            let maxCols = 0;
            for(let i=0; i < Math.min(10, rows.length); i++) {
                if(rows[i].length > maxCols) {
                    maxCols = rows[i].length;
                    headerRowIdx = i;
                }
            }
            
            rawHeaders = rows[headerRowIdx].map(h => (h||'').toString().trim());
            rawRows = rows.slice(headerRowIdx + 1);
            
            // Populate config dropdowns
            salesmanColumnSelect.innerHTML = '<option value="-1">-- Select Salesman Column --</option>';
            dateColumnSelect.innerHTML = '<option value="-1">-- Select Date Column --</option>';
            amountColumnSelect.innerHTML = '<option value="-1">-- Select Amount Column --</option>';
            
            let guessedDateIdx = -1;
            let guessedAmountIdx = -1;
            let guessedSalesmanIdx = 24; // Default Col Y
            
            rawHeaders.forEach((h, idx) => {
                const label = `${String.fromCharCode(65 + (idx % 26))} - ${h || 'Empty'}`; // simplistic A, B, C mapping
                const optionHtml = `<option value="${idx}">${label}</option>`;
                
                salesmanColumnSelect.innerHTML += optionHtml;
                dateColumnSelect.innerHTML += optionHtml;
                amountColumnSelect.innerHTML += optionHtml;
                
                const hLow = h.toLowerCase();
                if (hLow.includes('date') && guessedDateIdx === -1) guessedDateIdx = idx;
                if ((hLow.includes('amount') || hLow.includes('total') || hLow.includes('price') || hLow.includes('bill') || hLow.includes('rate') || hLow.includes('making')) && guessedAmountIdx === -1) guessedAmountIdx = idx;
                if (hLow.includes('salesman') || hLow.includes('salesperson') || hLow.includes('delegate')) guessedSalesmanIdx = idx;
            });
            
            // Apply saved config or guesses
            salesmanColumnSelect.value = savedConfig.salesmanColIdx !== -1 ? savedConfig.salesmanColIdx : guessedSalesmanIdx;
            dateColumnSelect.value = savedConfig.dateColIdx !== -1 ? savedConfig.dateColIdx : guessedDateIdx;
            amountColumnSelect.value = savedConfig.amountColIdx !== -1 ? savedConfig.amountColIdx : guessedAmountIdx;
            
            extractSalesmen();
            
        } catch (err) {
            console.error(err);
            salesmanFilter.innerHTML = `<option value="">Error: ${err.message}. Open Config.</option>`;
        }
    }
    
    function extractSalesmen() {
        uniqueSalesmen.clear();
        const salesIdx = parseInt(salesmanColumnSelect.value);
        if (salesIdx === -1) {
            salesmanFilter.innerHTML = '<option value="">-- Setup Salesman Column in Config --</option>';
            return;
        }
        
        rawRows.forEach(row => {
            const salesman = (row[salesIdx] || '').toString().trim();
            if (salesman) uniqueSalesmen.add(salesman);
        });
        
        if (uniqueSalesmen.size === 0) {
            const colLetter = String.fromCharCode(65 + (salesIdx % 26));
            salesmanFilter.innerHTML = `<option value="">No salesmen found in Col ${colLetter}</option>`;
        } else {
            salesmanFilter.innerHTML = '<option value="">-- All Salesmen --</option>';
            Array.from(uniqueSalesmen).sort().forEach(s => {
                salesmanFilter.innerHTML += `<option value="${s}">${s}</option>`;
            });
        }
        
        calculateBilling();
    }

    function saveConfig() {
        savedConfig = {
            sheetId: sheetIdInput.value.trim(),
            gid: gidInput.value.trim(),
            salesmanColIdx: parseInt(salesmanColumnSelect.value),
            dateColIdx: parseInt(dateColumnSelect.value),
            amountColIdx: parseInt(amountColumnSelect.value)
        };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(savedConfig)); queueFirebaseSync();
    }
    
    saveConfigBtn.addEventListener('click', () => {
        saveConfig();
        loadData();
    });
    
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', () => {
            const salesman = salesmanFilter.value;
            if (!salesman) {
                alert("Please select a salesman from the top-right dropdown first.");
                return;
            }
            paymentSalesmanName.textContent = `Salesman: ${salesman}`;
            paymentDate.value = new Date().toISOString().split('T')[0];
            paymentAmount.value = '';
            
            savePaymentBtn.removeAttribute('data-edit-idx');
            savePaymentBtn.removeAttribute('data-edit-salesman');
            
            paymentModal.classList.remove('hidden');
        });
    }

    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', () => {
            paymentModal.classList.add('hidden');
        });
    }

    if (savePaymentBtn) {
        savePaymentBtn.addEventListener('click', () => {
            const editSalesman = savePaymentBtn.getAttribute('data-edit-salesman');
            const editIdxStr = savePaymentBtn.getAttribute('data-edit-idx');
            const salesman = editSalesman || salesmanFilter.value;
            const pDate = paymentDate.value;
            const pAmount = parseFloat(paymentAmount.value);
            
            if (!salesman || !pDate || isNaN(pAmount) || pAmount <= 0) {
                alert("Please enter a valid date and positive amount.");
                return;
            }
            
            if (!salespersonPayments[salesman]) salespersonPayments[salesman] = [];
            
            if (editIdxStr !== null) {
                const editIdx = parseInt(editIdxStr);
                salespersonPayments[salesman][editIdx].date = pDate;
                salespersonPayments[salesman][editIdx].amount = pAmount;
                savePaymentBtn.removeAttribute('data-edit-salesman');
                savePaymentBtn.removeAttribute('data-edit-idx');
            } else {
                salespersonPayments[salesman].push({ date: pDate, amount: pAmount, excluded: false });
            }
            
            localStorage.setItem(PAYMENTS_KEY, JSON.stringify(salespersonPayments)); queueFirebaseSync();
            paymentModal.classList.add('hidden');
            calculateBilling();
        });
    }
    
    function parseDateObj(dateStr) {
        if (!dateStr) return null;
        const s = dateStr.trim();
        
        // Try DD/MM/YYYY or YYYY-MM-DD explicitly first to avoid JS native Date parsing MM/DD/YYYY
        const parts = s.split(/[-/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                let d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
                if (!isNaN(d.getTime())) return d;
            } else if (parts[2].length === 4 || parts[2].length === 2) {
                // Assume DD/MM/YYYY
                let year = parts[2];
                if (year.length === 2) year = "20" + year;
                let day = parts[0];
                let month = parts[1];
                let d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                if (!isNaN(d.getTime())) return d;
            }
        }
        
        // Fallback
        let d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        
        return null;
    }

    function calculateBilling() {
        if (typeof renderRatesTab === 'function') renderRatesTab();
        const salesman = salesmanFilter.value;
        const dFromStr = dateFrom.value;
        const dToStr = dateTo.value;
        const salesIdx = parseInt(salesmanColumnSelect.value);
        const dateIdx = parseInt(dateColumnSelect.value);
        const amountIdx = parseInt(amountColumnSelect.value);
        

        
        if (salesIdx === -1) {
            tableHeaders.innerHTML = '';
            tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 italic font-bold">Please configure columns in Config</td></tr>`;
            statOrderCount.textContent = "0";
            statTotalAmount.textContent = "₹0.00";
            statSalesmenCount.textContent = "0";
            return;
        }
        
        const dFrom = dFromStr ? new Date(dFromStr) : null;
        if (dFrom) dFrom.setHours(0,0,0,0);
        
        const dTo = dToStr ? new Date(dToStr) : null;
        if (dTo) dTo.setHours(23,59,59,999);
        
        // Define columns to show in table
        const displayCols = [1, 4, 5, 9, 10, 12, 13, 15, salesIdx, amountIdx].filter(x => x !== -1 && x < rawHeaders.length);
        
        const searchTerm = (tableSearchFilter.value || '').toLowerCase().trim();

        let filtered = rawRows.filter(row => {
            const rowSalesman = (row[salesIdx] || '').toString().trim();
            // Core rule: Only populate orders where salesman is NOT empty
            if (!rowSalesman) return false;
            
            const uid = (row[1] || '') + '|' + (row[dateIdx] || '') + '|' + rowSalesman + '|' + (row[10] || '');
            row._uid = uid;
            
            if (deletedRows[uid]) return false;
            
            // Filter by Status dropdown
            const statusFilterDropdown = document.getElementById('statusFilter');
            if (statusFilterDropdown) {
                const sVal = statusFilterDropdown.value;
                const cellTextStr = row.map(c => (c || '').toString().toLowerCase()).join(' ');
                let matchesStatus = false;
                if (sVal === 'cpend') {
                    matchesStatus = cellTextStr.includes('cpend');
                } else if (sVal === 'delpend') {
                    matchesStatus = cellTextStr.includes('delpend');
                } else if (sVal === 'both') {
                    matchesStatus = cellTextStr.includes('cpend') || cellTextStr.includes('delpend');
                } else {
                    matchesStatus = true;
                }
                if (!matchesStatus) return false;
            }
            
            // If specific salesman is selected, filter by it
            if (salesman && rowSalesman !== salesman) return false;
            
            if (dateIdx !== -1 && (dFrom || dTo)) {
                const rowDateStr = (row[dateIdx] || '').toString();
                const rowDate = parseDateObj(rowDateStr);
                if (rowDate) {
                    if (dFrom && rowDate < dFrom) return false;
                    if (dTo && rowDate > dTo) return false;
                } else {
                    return false;
                }
            }
            
            if (searchTerm) {
                const matchesSearch = displayCols.some(idx => {
                    return (row[idx] || '').toString().toLowerCase().includes(searchTerm);
                });
                if (!matchesSearch) return false;
            }
            
            // Check column filters
            for (const colIdx in columnFilters) {
                const filterText = columnFilters[colIdx];
                if (filterText) {
                    let cellValue = '';
                    if (colIdx === 'jobrate') {
                        const product = (row[10] || '').toString().trim();
                        const canonicalProd = getCanonicalProduct(rowSalesman, product);
                        const currentRate = salespersonProductRates[rowSalesman] ? (salespersonProductRates[rowSalesman][canonicalProd] || 0) : 0;
                        cellValue = currentRate.toString();
                    } else if (colIdx === 'jobcost') {
                        const product = (row[10] || '').toString().trim();
                        const qtyStr = (row[15] || '1').toString().replace(/[^0-9.-]+/g,"");
                        const qty = parseFloat(qtyStr) || 1;
                        const canonicalProd = getCanonicalProduct(rowSalesman, product);
                        const currentRate = salespersonProductRates[rowSalesman] ? (salespersonProductRates[rowSalesman][canonicalProd] || 0) : 0;
                        const rowCost = currentRate * qty;
                        cellValue = rowCost.toString();
                    } else {
                        cellValue = (row[colIdx] || '').toString().toLowerCase();
                    }
                    if (!cellValue.includes(filterText)) {
                        return false;
                    }
                }
            }
            
            return true;
        });
        const uniqueCols = [...new Set(displayCols)].sort((a,b)=>a-b);
        
        if (tableHeaders.children.length === 0) {
            tableHeaders.innerHTML = uniqueCols.map(idx => `
                <th class="p-3 font-extrabold text-slate-800 uppercase tracking-wide border border-slate-300 bg-slate-200 group">
                    <div class="mb-1 cursor-pointer hover:text-blue-600 transition-colors flex justify-between items-center header-sort" data-sortcol="${idx}">
                        <span>${rawHeaders[idx] || `Col ${idx+1}`}</span>
                        <span class="sort-icon text-slate-400 text-xs ml-1"></span>
                    </div>
                    <input type="text" data-col="${idx}" class="col-filter-input w-full p-1 text-sm font-normal border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400" placeholder="Filter..." />
                </th>
            `).join('') +
            `<th class="p-3 font-extrabold text-slate-800 uppercase tracking-wide border border-slate-300 bg-slate-200 group">
                <div class="mb-1 cursor-pointer hover:text-blue-600 transition-colors flex justify-between items-center header-sort" data-sortcol="jobrate">
                    <span>Job Rate</span>
                    <span class="sort-icon text-slate-400 text-xs ml-1"></span>
                </div>
                <input type="text" data-col="jobrate" class="col-filter-input w-full p-1 text-sm font-normal border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400" placeholder="Filter..." />
            </th>` +
            `<th class="p-3 font-extrabold text-slate-800 uppercase tracking-wide border border-slate-300 bg-slate-200 group">
                <div class="mb-1 cursor-pointer hover:text-blue-600 transition-colors flex justify-between items-center header-sort" data-sortcol="jobcost">
                    <span>Job Cost</span>
                    <span class="sort-icon text-slate-400 text-xs ml-1"></span>
                </div>
                <input type="text" data-col="jobcost" class="col-filter-input w-full p-1 text-sm font-normal border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400" placeholder="Filter..." />
            </th>` +
            `<th class="p-3 font-extrabold text-slate-800 uppercase tracking-wide border border-slate-300 bg-slate-200 text-center">Action</th>`;
            
            // Add event listeners to the new filters
            tableHeaders.querySelectorAll('.col-filter-input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    columnFilters[e.target.getAttribute('data-col')] = e.target.value.trim().toLowerCase();
                    calculateBilling();
                });
            });
            
            // Add event listeners for sorting
            tableHeaders.querySelectorAll('th').forEach(th => {
                th.style.cursor = 'pointer';
                th.addEventListener('click', (e) => {
                    // Don't sort if clicking on the filter input
                    if (e.target.tagName === 'INPUT') return;
                    
                    const hd = th.querySelector('.header-sort');
                    if (!hd) return;
                    
                    const col = hd.getAttribute('data-sortcol');
                    if (currentSortCol === col) {
                        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortCol = col;
                        currentSortDir = 'asc';
                    }
                    
                    // Update icons visually
                    tableHeaders.querySelectorAll('.sort-icon').forEach(icon => {
                        icon.innerHTML = '';
                        icon.classList.remove('text-blue-600');
                        icon.classList.add('text-slate-400');
                    });
                    
                    const myIcon = hd.querySelector('.sort-icon');
                    myIcon.innerHTML = currentSortDir === 'asc' ? '▲' : '▼';
                    myIcon.classList.remove('text-slate-400');
                    myIcon.classList.add('text-blue-600');
                    
                    calculateBilling();
                });
            });
        }
        
        let sum = 0;
        let matchedSalesmen = new Set();
        let totalPieces = 0;
        let salesmanTotals = {};
        tableBody.innerHTML = '';
        
        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${uniqueCols.length + 2}" class="p-8 text-center text-slate-500 font-bold bg-slate-50">No orders found matching this criteria.</td></tr>`;
        } else {
            if (currentSortCol !== null) {
                filtered.sort((a, b) => {
                    let valA, valB;
                    const aSalesman = (a[salesIdx] || '').toString().trim();
                    const bSalesman = (b[salesIdx] || '').toString().trim();
                    
                    if (currentSortCol === 'jobrate') {
                        const aProduct = (a[10] || '').toString().trim();
                        valA = salespersonProductRates[aSalesman] ? (salespersonProductRates[aSalesman][getCanonicalProduct(aSalesman, aProduct)] || 0) : 0;
                        const bProduct = (b[10] || '').toString().trim();
                        valB = salespersonProductRates[bSalesman] ? (salespersonProductRates[bSalesman][getCanonicalProduct(bSalesman, bProduct)] || 0) : 0;
                    } else if (currentSortCol === 'jobcost') {
                        const aProduct = (a[10] || '').toString().trim();
                        const aQty = parseFloat((a[15] || '1').toString().replace(/[^0-9.-]+/g,"")) || 1;
                        const aRate = salespersonProductRates[aSalesman] ? (salespersonProductRates[aSalesman][getCanonicalProduct(aSalesman, aProduct)] || 0) : 0;
                        valA = aRate * aQty;
                        
                        const bProduct = (b[10] || '').toString().trim();
                        const bQty = parseFloat((b[15] || '1').toString().replace(/[^0-9.-]+/g,"")) || 1;
                        const bRate = salespersonProductRates[bSalesman] ? (salespersonProductRates[bSalesman][getCanonicalProduct(bSalesman, bProduct)] || 0) : 0;
                        valB = bRate * bQty;
                    } else {
                        const idx = parseInt(currentSortCol);
                        valA = (a[idx] || '').toString().trim();
                        valB = (b[idx] || '').toString().trim();
                        
                        if (idx === dateIdx) {
                            const dateA = parseDateObj(valA);
                            const dateB = parseDateObj(valB);
                            if (dateA && dateB) {
                                valA = dateA.getTime();
                                valB = dateB.getTime();
                            }
                        } else if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                            valA = parseFloat(valA);
                            valB = parseFloat(valB);
                        } else {
                            valA = valA.toLowerCase();
                            valB = valB.toLowerCase();
                        }
                    }
                    
                    if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
                    if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            
            filtered.forEach(row => {
                const uid = row._uid;
                const isExcluded = !!excludedRows[uid];
            
                const product = (row[10] || '').toString().trim();
                const qtyStr = (row[15] || '1').toString().replace(/[^0-9.-]+/g,"");
                const qty = parseFloat(qtyStr) || 1;
                const sVal = (row[salesIdx] || '').toString().trim();
                if(sVal) {
                    matchedSalesmen.add(sVal);
                    if (!salesmanTotals[sVal]) salesmanTotals[sVal] = { pieces: 0, amount: 0 };
                }
                
                if (!isExcluded) {
                    totalPieces += qty;
                    if (sVal) salesmanTotals[sVal].pieces += qty;
                }
                
                if (!salespersonProductRates[sVal]) salespersonProductRates[sVal] = {};
                const currentRate = salespersonProductRates[sVal][getCanonicalProduct(sVal, product)] || 0;
                const rowCost = currentRate * qty;
                if (!isExcluded) {
                    sum += rowCost;
                    if (sVal) salesmanTotals[sVal].amount += rowCost;
                }
                
                const tr = document.createElement('tr');
                tr.className = "row-clickable transition-colors hover:bg-slate-50";
                if (isExcluded) tr.classList.add('opacity-50', 'bg-slate-100');
                
                const cellsHtml = uniqueCols.map(idx => {
                    let cellVal = row[idx] || '';
                    if (idx === amountIdx && cellVal) {
                         const rawNum = parseFloat(cellVal.toString().replace(/[^0-9.-]+/g,"")) || 0;
                         cellVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rawNum);
                         return `<td class="p-2 border border-slate-300 text-right font-semibold text-emerald-700 bg-emerald-50/20">${cellVal}</td>`;
                    }
                    if (idx === salesIdx) {
                         return `<td class="p-2 border border-slate-300 font-bold text-amber-700 bg-amber-50/20">${cellVal}</td>`;
                    }
                    if (isExcluded) return `<td class="p-2 border border-slate-300 text-slate-400 whitespace-nowrap line-through">${cellVal}</td>`;
                    return `<td class="p-2 border border-slate-300 text-slate-700 whitespace-nowrap">${cellVal}</td>`;
                }).join('');
                
                const rateHtml = `<td class="p-2 border border-slate-300 bg-white"><input type="number" data-salesman="${sVal.replace(/"/g, '&quot;')}" data-product="${product.replace(/"/g, '&quot;')}" data-qty="${qty}" class="rate-input w-24 p-1 border border-slate-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500" value="${currentRate || ''}" placeholder="Rate" ${isExcluded ? 'disabled' : ''} /></td>`;
                const costHtml = `<td class="p-2 border border-slate-300 text-right font-bold text-blue-700 bg-blue-50/20 cost-cell ${isExcluded ? 'text-slate-400 line-through' : ''}" data-cost="${isExcluded ? 0 : rowCost}">${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rowCost)}</td>`;
                const safeUid = uid.replace(/"/g, '&quot;');
                const actionHtml = `
                <td class="p-2 border border-slate-300 text-center bg-white">
                    <div class="flex items-center justify-center gap-2">
                        <label class="flex items-center gap-1 cursor-pointer text-xs font-semibold text-slate-600">
                            <input type="checkbox" class="exclude-cbx form-checkbox h-3 w-3 text-amber-500 rounded border-slate-300" data-uid="${safeUid}" ${isExcluded ? 'checked' : ''}>
                            Exclude
                        </label>
                        <button class="delete-row-btn text-red-500 hover:text-red-700 p-1 rounded" data-uid="${safeUid}" title="Delete Row">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>`;
                
                tr.innerHTML = cellsHtml + rateHtml + costHtml + actionHtml;
                tableBody.appendChild(tr);
            });
        }
        
        // Add payment rows
        Array.from(matchedSalesmen).forEach(sVal => {
             const payments = salespersonPayments[sVal] || [];
             payments.forEach((payment, idx) => {
                 const pDate = parseDateObj(payment.date);
                 if (pDate) {
                     if (dFrom && pDate < dFrom) return;
                     if (dTo && pDate > dTo) return;
                 }
                 
                 const isExcluded = !!payment.excluded;
                 if (!isExcluded) {
                     sum -= parseFloat(payment.amount);
                     if (salesmanTotals[sVal]) {
                         salesmanTotals[sVal].amount -= parseFloat(payment.amount);
                     }
                 }
                 
                 const tr = document.createElement('tr');
                 tr.className = "bg-emerald-50/50 hover:bg-emerald-50 transition-colors";
                 if (isExcluded) tr.classList.add('opacity-50', 'bg-slate-100');
                 
                 const cellsHtml = uniqueCols.map((colIdx) => {
                     if (colIdx === dateIdx) {
                         return `<td class="p-2 border border-slate-300 font-medium text-emerald-700 whitespace-nowrap">${payment.date}</td>`;
                     } else if (colIdx === salesIdx) {
                         return `<td class="p-2 border border-slate-300 font-medium text-amber-700 whitespace-nowrap">${sVal}</td>`;
                     } else if (colIdx === displayCols[0]) {
                         return `<td class="p-2 border border-slate-300 font-bold text-emerald-800 whitespace-nowrap">Payment Received</td>`;
                     }
                     return `<td class="p-2 border border-slate-300"></td>`;
                 }).join('');
                 
                 const pAmountFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount);
                 const rateHtml = `<td class="p-2 border border-slate-300 bg-white"></td>`;
                 const costHtml = `<td class="p-2 border border-slate-300 text-right font-bold text-emerald-700 bg-emerald-100/50 cost-cell ${isExcluded ? 'text-slate-400 line-through' : ''}" data-cost="${isExcluded ? 0 : -payment.amount}">- ${pAmountFormatted}</td>`;
                 const actionHtml = `
                 <td class="p-2 border border-slate-300 text-center bg-white">
                     <div class="flex items-center justify-center gap-2">
                        <label class="flex items-center gap-1 cursor-pointer text-xs font-semibold text-slate-600">
                            <input type="checkbox" class="exclude-payment-cbx form-checkbox h-3 w-3 text-emerald-600 rounded border-slate-300" data-salesman="${sVal}" data-idx="${idx}" ${isExcluded ? 'checked' : ''}>
                            Exclude
                        </label>
                        <button class="edit-payment-btn text-blue-500 hover:text-blue-700 p-1 rounded" data-salesman="${sVal}" data-idx="${idx}" title="Edit Payment">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="del-payment-btn text-red-500 hover:text-red-700 p-1 rounded" data-salesman="${sVal}" data-idx="${idx}" title="Delete Payment">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                 </td>`;
                 
                 tr.innerHTML = cellsHtml + rateHtml + costHtml + actionHtml;
                 tableBody.appendChild(tr);
             });
        });
        
        statOrderCount.textContent = filtered.length;
        statSalesmenCount.textContent = matchedSalesmen.size;
        
        // Render Salesman Pills
        const pillsContainer = document.getElementById('salesmanPillsSection');
        if (pillsContainer) {
            pillsContainer.innerHTML = '';
            const sortedSalesmen = Object.keys(salesmanTotals).sort();
            
            if (sortedSalesmen.length > 0) {
                sortedSalesmen.forEach(sName => {
                    const sData = salesmanTotals[sName];
                    const sAmountFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sData.amount);
                    
                    const isActive = (salesmanFilter.value === sName);
                    
                    // Create pill div
                    const pillDiv = document.createElement('div');
                    pillDiv.className = `bg-white border ${isActive ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 shadow-sm'} rounded-full px-4 py-2 flex items-center gap-3 micro-bounce cursor-pointer hover:border-blue-400 transition-all`;
                    pillDiv.innerHTML = `
                        <div class="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-500 uppercase leading-tight">${sName}</span>
                            <span class="text-sm font-black text-slate-800 leading-tight">${sAmountFormatted} <span class="text-[10px] font-normal text-slate-400 ml-1">(${sData.pieces} pcs)</span></span>
                        </div>
                    `;
                    
                    // Allow clicking a pill to select/deselect that salesman in the filter
                    pillDiv.addEventListener('click', () => {
                        if (salesmanFilter.value === sName) {
                            salesmanFilter.value = ''; // Toggle off
                        } else {
                            salesmanFilter.value = sName; // Toggle on
                        }
                        calculateBilling();
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                    
                    pillsContainer.appendChild(pillDiv);
                });
            }
        }
        
        const statPiecesCount = document.getElementById('statPiecesCount');
        if (statPiecesCount) statPiecesCount.textContent = parseFloat(totalPieces.toFixed(2));
        
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        });
        statTotalAmount.textContent = formatter.format(sum);
        
        if (dFromStr && dToStr) {
             statDateRange.textContent = `${dFromStr} to ${dToStr}`;
        } else if (dFromStr) {
             statDateRange.textContent = `Since ${dFromStr}`;
        } else if (dToStr) {
             statDateRange.textContent = `Until ${dToStr}`;
        } else {
             statDateRange.textContent = "All Time";
        }
    }
    
    calculateBtn.addEventListener('click', calculateBilling);
    salesmanFilter.addEventListener('change', calculateBilling);
    tableSearchFilter.addEventListener('input', calculateBilling);
    const sf = document.getElementById('statusFilter');
    if (sf) sf.addEventListener('change', calculateBilling);
    
    tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-payment-btn');
        if (editBtn) {
            const sVal = editBtn.getAttribute('data-salesman');
            const idx = parseInt(editBtn.getAttribute('data-idx'));
            const payment = salespersonPayments[sVal][idx];
            
            paymentSalesmanName.textContent = `Salesman: ${sVal}`;
            paymentDate.value = payment.date;
            paymentAmount.value = payment.amount;
            
            savePaymentBtn.setAttribute('data-edit-idx', idx);
            savePaymentBtn.setAttribute('data-edit-salesman', sVal);
            
            paymentModal.classList.remove('hidden');
        }

        const delBtn = e.target.closest('.del-payment-btn');
        if (delBtn) {
            const sVal = delBtn.getAttribute('data-salesman');
            const idx = parseInt(delBtn.getAttribute('data-idx'));
            if (confirm("Are you sure you want to delete this payment?")) {
                if (salespersonPayments[sVal]) {
                    salespersonPayments[sVal].splice(idx, 1);
                    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(salespersonPayments)); queueFirebaseSync();
                    calculateBilling();
                }
            }
        }
        
        const deleteRowBtn = e.target.closest('.delete-row-btn');
        if (deleteRowBtn) {
            const uid = deleteRowBtn.getAttribute('data-uid');
            if (confirm("Are you sure you want to hide this row from the billing table completely?")) {
                deletedRows[uid] = true;
                localStorage.setItem(DELETED_ROWS_KEY, JSON.stringify(deletedRows)); queueFirebaseSync();
                calculateBilling();
            }
        }
    });
    
    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('exclude-payment-cbx')) {
            const sVal = e.target.getAttribute('data-salesman');
            const idx = parseInt(e.target.getAttribute('data-idx'));
            if (salespersonPayments[sVal] && salespersonPayments[sVal][idx]) {
                salespersonPayments[sVal][idx].excluded = e.target.checked;
                localStorage.setItem(PAYMENTS_KEY, JSON.stringify(salespersonPayments)); queueFirebaseSync();
                calculateBilling();
            }
        }
        
        if (e.target.classList.contains('exclude-cbx')) {
            const uid = e.target.getAttribute('data-uid');
            if (e.target.checked) {
                excludedRows[uid] = true;
            } else {
                delete excludedRows[uid];
            }
            localStorage.setItem(EXCLUDED_ROWS_KEY, JSON.stringify(excludedRows)); queueFirebaseSync();
            calculateBilling();
        }
    });

    tableBody.addEventListener('input', handleRateChange);
    tableBody.addEventListener('change', handleRateChange);
    
    function handleRateChange(e) {
        if (e.target.classList.contains('rate-input')) {
            const input = e.target;
            const product = input.getAttribute('data-product');
            const salesman = input.getAttribute('data-salesman');
            const newRate = parseFloat(input.value) || 0;
            
            if (!salespersonProductRates[salesman]) salespersonProductRates[salesman] = {};
            salespersonProductRates[salesman][product] = newRate;
            localStorage.setItem(RATES_KEY, JSON.stringify(salespersonProductRates)); queueFirebaseSync();
            
            let newSum = 0;
            const allInputs = tableBody.querySelectorAll('.rate-input');
            allInputs.forEach(inp => {
                const inpProduct = inp.getAttribute('data-product');
                const inpSalesman = inp.getAttribute('data-salesman');
                if (inpProduct === product && inpSalesman === salesman) {
                    if (inp !== input) inp.value = newRate || '';
                }
                
                const currentInpRate = parseFloat(inp.value) || 0;
                const qty = parseFloat(inp.getAttribute('data-qty')) || 1;
                const rowCost = currentInpRate * qty;
                
                if (inpProduct === product && inpSalesman === salesman) {
                    const costCell = inp.closest('tr').querySelector('.cost-cell');
                    costCell.setAttribute('data-cost', rowCost);
                    costCell.textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rowCost);
                }
            });
            
            const allCostCells = tableBody.querySelectorAll('.cost-cell');
            allCostCells.forEach(cell => {
                newSum += parseFloat(cell.getAttribute('data-cost')) || 0;
            });
            
            const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
            
            // Add visual feedback
            input.classList.add('bg-green-50');
            setTimeout(() => input.classList.remove('bg-green-50'), 500);
            statTotalAmount.textContent = formatter.format(newSum);
        }
    }

    if (window.googleSheetsAutoConfig && window.googleSheetsAutoConfig.initialized) {
        loadData();
    } else {
        setTimeout(loadData, 1000);
    }
// --- FIREBASE SYNC INTEGRATION ---
let firebaseSyncTimer = null;
async function syncJobworkToFirebase() {
    if (!window.firebaseDB || !window.firebaseDB.initialized) return;
    try {
        const payload = {
            rates: salespersonProductRates,
            aliases: productAliases,
            payments: salespersonPayments,
            deletedRows: deletedRows,
            excludedRows: excludedRows,
            config: savedConfig
        };
        await window.firebaseDB.saveJobworkData(payload);
        console.log('✅ Jobwork billing data backed up to Firebase.');
    } catch(e) {
        console.error('Failed to sync jobwork data to Firebase', e);
    }
}


    // --- Product Rates Tab Logic ---
    let ratesTabSortCol = 'product';
let ratesTabSortDir = 'asc';

window.sortRatesTab = function(col) {
    if (ratesTabSortCol === col) {
        ratesTabSortDir = ratesTabSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        ratesTabSortCol = col;
        ratesTabSortDir = 'asc';
    }
    if (typeof renderRatesTab === 'function') renderRatesTab();
};

window.renderRatesTab = function() {
        const ratesContainer = document.getElementById('ratesContainer');
        if (!ratesContainer) return;
        
        if (rawRows.length === 0) {
            ratesContainer.innerHTML = '<div class="text-center text-slate-500 py-8">No data available. Please Sync Sheet.</div>';
            return;
        }

        const salesmanCol = (savedConfig.salesmanColIdx !== undefined && savedConfig.salesmanColIdx !== -1) ? savedConfig.salesmanColIdx : (document.getElementById('salesmanColumnSelect') ? parseInt(document.getElementById('salesmanColumnSelect').value) : 24); // Default to Y
        const productCol = 10; // Column K for Products
        
        // Group unique products by salesman
        let salesmenProducts = {};
        const selectedSalesman = (document.getElementById('salesmanFilter') && document.getElementById('salesmanFilter').value) ? document.getElementById('salesmanFilter').value : '';
        
        rawRows.forEach(row => {
            let salesman = row[salesmanCol] || 'Unknown';
            let product = row[productCol] || 'Unknown';
            salesman = String(salesman).trim();
            product = String(product).trim();
            
            if (!salesmenProducts[salesman]) salesmenProducts[salesman] = new Set();
            salesmenProducts[salesman].add(product);
        });

        let html = '';
        let hasVisibleSalesmen = false;
        
        for (let salesman of Object.keys(salesmenProducts).sort()) {
            if (selectedSalesman && salesman !== selectedSalesman) continue;
            hasVisibleSalesmen = true;
            
            html += `<div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-3 flex items-center justify-between">
                    <span><i class="fas fa-user-tie text-blue-500 mr-2"></i> ${salesman}</span>
                    <button class="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition font-semibold" onclick="mergeSelectedProducts('${salesman}')">
                        <i class="fas fa-link"></i> Merge Selected
                    </button>
                </h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200 text-sm bg-white rounded-lg shadow-sm border border-slate-200">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="px-4 py-2 w-10 text-center"><input type="checkbox" onchange="toggleAllMerge(this, '${salesman}')" class="rounded"></th>
                                <th class="px-4 py-2 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 select-none group" onclick="sortRatesTab('product')">
                                    <div class="flex items-center justify-between">
                                        <span>Original Product Name</span>
                                        ${ratesTabSortCol === 'product' ? (ratesTabSortDir === 'asc' ? '<span class="text-blue-600 text-xs ml-1">▲</span>' : '<span class="text-blue-600 text-xs ml-1">▼</span>') : '<span class="text-slate-300 text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity">▲</span>'}
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 select-none group" onclick="sortRatesTab('alias')">
                                    <div class="flex items-center justify-between">
                                        <span>Primary Mapping (Alias)</span>
                                        ${ratesTabSortCol === 'alias' ? (ratesTabSortDir === 'asc' ? '<span class="text-blue-600 text-xs ml-1">▲</span>' : '<span class="text-blue-600 text-xs ml-1">▼</span>') : '<span class="text-slate-300 text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity">▲</span>'}
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 select-none group" onclick="sortRatesTab('rate')">
                                    <div class="flex items-center justify-between">
                                        <span>Billing Rate (₹)</span>
                                        ${ratesTabSortCol === 'rate' ? (ratesTabSortDir === 'asc' ? '<span class="text-blue-600 text-xs ml-1">▲</span>' : '<span class="text-blue-600 text-xs ml-1">▼</span>') : '<span class="text-slate-300 text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity">▲</span>'}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">`;
            
            let products = Array.from(salesmenProducts[salesman]);
            products.sort((a, b) => {
                let valA, valB;
                if (ratesTabSortCol === 'product') {
                    valA = a.toLowerCase();
                    valB = b.toLowerCase();
                } else if (ratesTabSortCol === 'alias') {
                    const canonA = getCanonicalProduct(salesman, a);
                    const canonB = getCanonicalProduct(salesman, b);
                    valA = (canonA === a ? '-- primary --' : canonA).toLowerCase();
                    valB = (canonB === b ? '-- primary --' : canonB).toLowerCase();
                } else if (ratesTabSortCol === 'rate') {
                    const canonA = getCanonicalProduct(salesman, a);
                    const canonB = getCanonicalProduct(salesman, b);
                    valA = salespersonProductRates[salesman] ? (salespersonProductRates[salesman][canonA] || 0) : 0;
                    valB = salespersonProductRates[salesman] ? (salespersonProductRates[salesman][canonB] || 0) : 0;
                }
                
                if (valA < valB) return ratesTabSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return ratesTabSortDir === 'asc' ? 1 : -1;
                return 0;
            });
            products.forEach(product => {
                const canonical = getCanonicalProduct(salesman, product);
                const isAlias = canonical !== product;
                
                const rate = salespersonProductRates[salesman] ? (salespersonProductRates[salesman][canonical] || 0) : 0;
                
                html += `
                            <tr class="hover:bg-slate-50 transition ${isAlias ? 'bg-amber-50/30' : ''}">
                                <td class="px-4 py-2 text-center">
                                    <input type="checkbox" class="merge-checkbox rounded border-slate-300" data-salesman="${salesman.replace(/"/g, '&quot;')}" data-product="${product.replace(/"/g, '&quot;')}">
                                </td>
                                <td class="px-4 py-2 font-medium text-slate-800">${product}</td>
                                <td class="px-4 py-2 text-slate-500 italic text-xs">
                                    ${isAlias ? `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center w-fit gap-1"><i class="fas fa-level-up-alt rotate-90"></i> ${canonical}</span>` : '<span class="text-slate-300">-- Primary --</span>'}
                                    ${isAlias ? `<button class="ml-2 text-red-500 hover:text-red-700 font-bold" onclick="removeAlias('${salesman}', '${product}')" title="Remove Alias"><i class="fas fa-times"></i></button>` : ''}
                                </td>
                                <td class="px-4 py-2">
                                    <div class="relative w-32">
                                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                                        <input type="number" 
                                            class="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold bg-white ${isAlias ? 'bg-slate-100 cursor-not-allowed opacity-70' : ''}" 
                                            value="${rate}" 
                                            onchange="updateCanonicalRate('${salesman}', '${canonical}', this.value)"
                                            ${isAlias ? 'disabled title="Edit rate on the primary product"' : ''}
                                        />
                                    </div>
                                </td>
                            </tr>
                `;
            });
            
            html += `       </tbody>
                    </table>
                </div>
            </div>`;
        }
        
        if (!hasVisibleSalesmen) {
            html = `<div class="text-center text-slate-500 py-8">No products found for the selected salesman.</div>`;
        }
        
        ratesContainer.innerHTML = html;
    };
    
    window.toggleAllMerge = function(checkbox, salesman) {
        document.querySelectorAll(`.merge-checkbox[data-salesman="${salesman.replace(/"/g, '\\"')}"]`).forEach(cb => {
            cb.checked = checkbox.checked;
        });
    };
    
    window.updateCanonicalRate = function(salesman, canonicalProduct, value) {
        let newRate = parseFloat(value) || 0;
        if (!salespersonProductRates[salesman]) salespersonProductRates[salesman] = {};
        salespersonProductRates[salesman][canonicalProduct] = newRate;
        localStorage.setItem(RATES_KEY, JSON.stringify(salespersonProductRates));
        if (typeof queueFirebaseSync === 'function') queueFirebaseSync();
        if (typeof calculateBilling === 'function') calculateBilling(); // Update order list immediately
    };
    
    window.removeAlias = function(salesman, product) {
        if (productAliases[salesman] && productAliases[salesman][product]) {
            delete productAliases[salesman][product];
            localStorage.setItem(ALIASES_KEY, JSON.stringify(productAliases));
            if (typeof queueFirebaseSync === 'function') queueFirebaseSync();
            renderRatesTab();
            if (typeof calculateBilling === 'function') calculateBilling();
        }
    };
    
    window.mergeSelectedProducts = function(salesman) {
        const checkboxes = document.querySelectorAll(`.merge-checkbox[data-salesman="${salesman.replace(/"/g, '\\"')}"]:checked`);
        if (checkboxes.length < 2) {
            alert('Please select at least 2 products to merge.');
            return;
        }
        
        const products = Array.from(checkboxes).map(cb => cb.getAttribute('data-product'));
        
        // Show a custom modal or just a simple prompt for now
        let promptText = "Which product should be the PRIMARY name?\n\n";
        products.forEach((p, i) => {
            promptText += `${i + 1}: ${p}\n`;
        });
        promptText += "\nEnter the exact name of the primary product from the list above:";
        
        const primary = prompt(promptText);
        if (!primary) return;
        
        if (!products.includes(primary)) {
            alert('The primary name must exactly match one of the selected products.');
            return;
        }
        
        if (!productAliases[salesman]) productAliases[salesman] = {};
        
        products.forEach(p => {
            if (p !== primary) {
                // If 'p' itself was already a primary for something else, we should re-map its dependents
                // But for simplicity, just map 'p' to 'primary'
                productAliases[salesman][p] = primary;
                // Inherit the rate of the new primary if needed, but since it relies on primary, it automatically does!
            }
        });
        
        localStorage.setItem(ALIASES_KEY, JSON.stringify(productAliases));
        if (typeof queueFirebaseSync === 'function') queueFirebaseSync();
        
        renderRatesTab();
        if (typeof calculateBilling === 'function') calculateBilling();
    };

    function queueFirebaseSync() {
    if (firebaseSyncTimer) clearTimeout(firebaseSyncTimer);
    firebaseSyncTimer = setTimeout(syncJobworkToFirebase, 2000);
}

// Intercept all localStorage setItem calls in this script to also queue a sync

async function initFirebaseJobworkData() {
    if (window.firebaseDB) {
        if (!window.firebaseDB.initialized) {
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (window.firebaseDB.initialized) {
                        clearInterval(check);
                        resolve();
                    }
                }, 500);
                setTimeout(() => { clearInterval(check); resolve(); }, 5000);
            });
        }
        
        if (!window.firebaseDB.initialized) return;
        
        try {
            const data = await window.firebaseDB.getJobworkData();
            if (data) {
                let needsUpdate = false;
                
                // Simple merge function
                const mergeObj = (localObj, remoteObj) => {
                    if (!remoteObj) return localObj;
                    if (typeof localObj !== 'object' || localObj === null) return remoteObj;
                    
                    let merged = Array.isArray(localObj) ? [...localObj] : { ...localObj };
                    
                    for (let key in remoteObj) {
                        if (remoteObj[key] === null) {
                            merged[key] = null;
                        } else if (typeof remoteObj[key] === 'object' && !Array.isArray(remoteObj[key])) {
                            merged[key] = mergeObj(merged[key] || {}, remoteObj[key]);
                        } else if (Array.isArray(remoteObj[key])) {
                            // For arrays (like payments), if we just want to take the remote, or union them:
                            // Let's just use the remote array for simplicity, as payments are added and synced.
                            // To prevent data loss if remote is empty, we only overwrite if remote array has items, or if local is empty.
                            if (remoteObj[key].length > 0 || !merged[key] || merged[key].length === 0) {
                                merged[key] = remoteObj[key];
                            }
                        } else {
                            merged[key] = remoteObj[key];
                        }
                    }
                    return merged;
                };

                if (data.rates) {
                    salespersonProductRates = mergeObj(salespersonProductRates, data.rates);
                    productAliases = mergeObj(productAliases, data.aliases);
                    localStorage.setItem(ALIASES_KEY, JSON.stringify(productAliases));
                    localStorage.setItem(RATES_KEY, JSON.stringify(salespersonProductRates));
                    needsUpdate = true;
                }
                if (data.payments) {
                    salespersonPayments = mergeObj(salespersonPayments, data.payments);
                    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(salespersonPayments));
                    needsUpdate = true;
                }
                if (data.deletedRows) {
                    deletedRows = mergeObj(deletedRows, data.deletedRows);
                    localStorage.setItem(DELETED_ROWS_KEY, JSON.stringify(deletedRows));
                    needsUpdate = true;
                }
                if (data.excludedRows) {
                    excludedRows = mergeObj(excludedRows, data.excludedRows);
                    localStorage.setItem(EXCLUDED_ROWS_KEY, JSON.stringify(excludedRows));
                    needsUpdate = true;
                }
                if (data.config) {
                    savedConfig = mergeObj(savedConfig, data.config);
                    localStorage.setItem(CONFIG_KEY, JSON.stringify(savedConfig));
                    
                    if (savedConfig.sheetId && typeof sheetIdInput !== 'undefined' && sheetIdInput) {
                        sheetIdInput.value = savedConfig.sheetId;
                    }
                    if (savedConfig.gid && typeof gidInput !== 'undefined' && gidInput) {
                        gidInput.value = savedConfig.gid;
                    }
                    needsUpdate = true;
                }
                
                if (needsUpdate && typeof processTableData === 'function' && filteredRows.length > 0) {
                    processTableData(); // Re-render table if data is already loaded
                } else if (needsUpdate && typeof loadData === 'function') {
                    // Try to trigger a load or update the UI
                    updateSummaryCards();
                }
                
                // ALWAYS queue a sync back to Firebase after initialization 
                // to ensure any purely local data (from before the update) gets uploaded!
                queueFirebaseSync();
                
                console.log('✅ Jobwork billing data fetched and merged from Firebase.');
            } else {
                // If there's no data in Firebase at all, but we have local data, we MUST push it up!
                console.log('No data in Firebase, pushing local data up.');
                queueFirebaseSync();
            }
        } catch(e) {
            console.error('Failed to init jobwork data from Firebase', e);
        }
    }
}

// Run the initialization when DOM is loaded or script runs
setTimeout(initFirebaseJobworkData, 1000);
});
