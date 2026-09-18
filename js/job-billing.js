document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const btnRefresh = document.getElementById('refreshDataBtn');
    const selSalesperson = document.getElementById('salespersonSelect');
    const inputDateStart = document.getElementById('dateStart');
    const inputDateEnd = document.getElementById('dateEnd');
    const tbody = document.getElementById('tableBody');
    const labelRow = document.getElementById('rowCountLabel');
    const labelQty = document.getElementById('totalQtyLabel');
    const spinner = document.getElementById('loadingSpinner');
    const statusText = document.getElementById('statusText');

    // Dashboard Elements
    const spDashboard = document.getElementById('salespersonDashboard');
    const spDashboardName = document.getElementById('spDashboardName');
    const spTotalAmount = document.getElementById('spTotalAmount');
    const spTotalPaid = document.getElementById('spTotalPaid');
    const spBalanceDue = document.getElementById('spBalanceDue');
    
    // Modal Elements
    const paymentModal = document.getElementById('paymentModal');
    const btnAddPayment = document.getElementById('addPaymentBtn');
    const btnCancelPayment = document.getElementById('cancelPaymentBtn');
    const btnSubmitPayment = document.getElementById('submitPaymentBtn');
    const inputPaySP = document.getElementById('paymentSalesperson');
    const inputPayAmt = document.getElementById('paymentAmount');
    const inputPayDate = document.getElementById('paymentDate');
    const inputPayNote = document.getElementById('paymentNote');
    const modalSpinner = document.getElementById('modalSpinner');
    const inputPaymentId = document.getElementById('paymentId');
    const modalTitle = document.getElementById('modal-title');
    const paymentTableBody = document.getElementById('paymentTableBody');

    let rawData = [];
    let jobRates = {}; // OrderNo -> JobRate
    let currentTotalPaid = 0;
    let currentPayments = [];
    
    // Table State
    let currentSortCol = '';
    let currentSortDir = 'asc';
    let globalSearchQuery = '';
    let colFilters = {};
    let currentPageSize = 10000;
    
    // Debounce timer for autosave
    let autosaveTimeout = null;
    
    // Set default dates
    inputDateStart.value = '2026-01-01'; 
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today - offset)).toISOString().split('T')[0];
    inputDateEnd.value = localISOTime;
    
    // Event Listeners
    btnRefresh.addEventListener('click', fetchData);
    selSalesperson.addEventListener('change', handleSalespersonChange);
    inputDateStart.addEventListener('change', renderTable);
    inputDateEnd.addEventListener('change', renderTable);
    
    // UI Table Controllers
    const searchInput = document.getElementById('searchInput');
    const pageSizeSelector = document.getElementById('pageSizeSelector');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const toast = document.getElementById('saveToast');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            globalSearchQuery = e.target.value.toLowerCase();
            renderTable();
        });
    }
    
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener('change', (e) => {
            currentPageSize = parseInt(e.target.value, 10);
            renderTable();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            globalSearchQuery = '';
            searchInput.value = '';
            colFilters = {};
            document.querySelectorAll('.col-filter').forEach(inp => inp.value = '');
            currentSortCol = '';
            document.querySelectorAll('.sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort text-slate-300 sort-icon';
            });
            renderTable();
        });
    }

    document.querySelectorAll('.col-filter').forEach(input => {
        input.addEventListener('input', (e) => {
            colFilters[e.target.dataset.col] = e.target.value.toLowerCase();
            renderTable();
        });
    });

    document.querySelectorAll('.sort-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const sortCol = e.currentTarget.dataset.sort;
            if (currentSortCol === sortCol) {
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortCol = sortCol;
                currentSortDir = 'asc';
            }
            document.querySelectorAll('.sort-icon').forEach(icon => {
                icon.className = 'fas fa-sort text-slate-300 sort-icon';
            });
            const icon = e.currentTarget.querySelector('.sort-icon');
            if (icon) {
                icon.className = currentSortDir === 'asc' ? 'fas fa-sort-up text-indigo-600 sort-icon' : 'fas fa-sort-down text-indigo-600 sort-icon';
            }
            renderTable();
        });
    });
    
    btnAddPayment.addEventListener('click', openPaymentModal);
    btnCancelPayment.addEventListener('click', closePaymentModal);
    btnSubmitPayment.addEventListener('click', submitPayment);

    // Initial Fetch
    setTimeout(() => {
        fetchData();
    }, 100);
    
    function parseCSVRow(text) {
        let ret = [], inQuote = false, value = '';
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (inQuote) {
                if (char === '"') {
                    if (i < text.length - 1 && text[i+1] === '"') {
                        value += '"';
                        i++;
                    } else {
                        inQuote = false;
                    }
                } else {
                    value += char;
                }
            } else {
                if (char === '"') {
                    inQuote = true;
                } else if (char === ',') {
                    ret.push(value);
                    value = '';
                } else {
                    value += char;
                }
            }
        }
        ret.push(value);
        return ret;
    }

    async function fetchJobRates() {
        try {
            const snap = await firebase.firestore().collection('job_billing_orders').get();
            jobRates = {};
            snap.forEach(doc => {
                jobRates[doc.id] = doc.data().jobRate || 0;
            });
        } catch (err) {
            console.error("Error fetching job rates:", err);
        }
    }

    async function fetchData() {
        spinner.classList.remove('hidden');
        statusText.textContent = 'Fetching data...';
        btnRefresh.disabled = true;
        
        try {
            // Parallel fetch CSV and Firestore Rates
            // Use /export instead of /gviz/tq to ignore any active filters on the Google Sheet.
            // Add a cache-buster so browsers don't serve a stale CSV.
            const url = 'https://docs.google.com/spreadsheets/d/199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU/export?format=csv&gid=904261097&t=' + new Date().getTime();
            const [res] = await Promise.all([
                fetch(url),
                fetchJobRates()
            ]);
            
            if (!res.ok) throw new Error('Network response was not ok');
            const csvText = await res.text();
            
            const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
            const dataRows = lines.slice(1).map(parseCSVRow);
            
            const globalOccurrence = {};
            rawData = dataRows.filter(row => {
                const status = (row[2] || '').trim();
                return status.toLowerCase() === 'delpend';
            }).map(row => {
                const orderNo = row[4] || '';
                const length = row[9] || '';
                const product = row[10] || '';
                const style = row[12] || '';
                const color = row[13] || '';
                const baseId = `${orderNo}_${product}_${length}_${style}_${color}`.replace(/[^a-zA-Z0-9]/g, '_');
                globalOccurrence[baseId] = (globalOccurrence[baseId] || 0) + 1;
                row._rowId = `${baseId}_${globalOccurrence[baseId]}`;
                return row;
            });
            
            populateSalespersons();
            await handleSalespersonChange(); // Render table and load dashboard
            
            statusText.textContent = 'Data loaded';
        } catch (err) {
            console.error(err);
            statusText.textContent = 'Error loading data';
            tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-red-500"><i class="fas fa-exclamation-triangle text-3xl mb-3 block"></i>Failed to load data. See console.</td></tr>`;
        } finally {
            spinner.classList.add('hidden');
            btnRefresh.disabled = false;
        }
    }

    function populateSalespersons() {
        const uniqueSp = new Set();
        rawData.forEach(row => {
            const sp = (row[24] || '').trim();
            if (sp) uniqueSp.add(sp);
        });
        
        const sortedSp = Array.from(uniqueSp).sort();
        const currentSel = selSalesperson.value;
        
        let optionsHtml = '<option value="">All Sales Persons</option>';
        sortedSp.forEach(sp => {
            optionsHtml += `<option value="${sp}">${sp}</option>`;
        });
        selSalesperson.innerHTML = optionsHtml;
        
        if (uniqueSp.has(currentSel)) {
            selSalesperson.value = currentSel;
        }
    }
    
    function parseDate(dateStr) {
        if (!dateStr) return null;
        dateStr = dateStr.trim();
        
        let parts = dateStr.split(/[\/\-]/);
        if (parts.length === 2) {
            // DD/MM format
            const currentYear = new Date().getFullYear();
            const d = new Date(currentYear, parseInt(parts[1]) - 1, parseInt(parts[0]));
            d.setHours(0,0,0,0);
            if (!isNaN(d.getTime())) return d;
        } else if (parts.length === 3) {
            // DD/MM/YYYY or YYYY-MM-DD
            let d;
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                // DD/MM/YYYY or DD/MM/YY
                let year = parseInt(parts[2]);
                if (year < 100) year += 2000;
                d = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            d.setHours(0,0,0,0);
            if (!isNaN(d.getTime())) return d;
        }
        
        // Fallback
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            d.setHours(0,0,0,0);
            return d;
        }
        
        return null;
    }

    async function fetchSalespersonPayments(spName) {
        currentTotalPaid = 0;
        currentPayments = [];
        if (!spName) return;
        
        try {
            const snap = await firebase.firestore()
                .collection('job_billing_payments')
                .where('salesperson', '==', spName)
                .get();
                
            snap.forEach(doc => {
                const data = doc.data();
                currentTotalPaid += (data.amount || 0);
                currentPayments.push({
                    id: doc.id,
                    ...data
                });
            });
            // Sort descending by date locally
            currentPayments.sort((a,b) => {
                const tA = a.date ? a.date.toMillis() : 0;
                const tB = b.date ? b.date.toMillis() : 0;
                return tB - tA;
            });
            
            spTotalPaid.textContent = `₹${currentTotalPaid.toFixed(2)}`;
            renderPayments();
        } catch (err) {
            console.error("Error fetching payments:", err);
            spTotalPaid.textContent = 'Error';
        }
    }

    function renderPayments() {
        if (!paymentTableBody) return;
        
        if (currentPayments.length === 0) {
            paymentTableBody.innerHTML = `
                <tr>
                  <td colspan="5" class="px-6 py-8 text-center text-slate-400">
                    <i class="fas fa-receipt text-3xl mb-3 block"></i>
                    No payments found for this salesperson.
                  </td>
                </tr>
            `;
            return;
        }

        paymentTableBody.innerHTML = currentPayments.map(p => {
            let dateStr = '-';
            if (p.date) {
                const d = p.date.toDate();
                dateStr = d.toLocaleDateString('en-GB'); // dd/mm/yyyy
            }
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-2 whitespace-nowrap">${dateStr}</td>
                    <td class="px-6 py-2 whitespace-nowrap font-medium text-emerald-600">₹${(p.amount || 0).toFixed(2)}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-slate-500 max-w-[200px] truncate" title="${p.note || ''}">${p.note || '-'}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-slate-400 text-xs">${p.recordedBy || 'unknown'}</td>
                    <td class="px-6 py-2 whitespace-nowrap text-right">
                        <button class="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition-colors text-xs mr-2" onclick="window.editPayment('${p.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded transition-colors text-xs" onclick="window.deletePayment('${p.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.editPayment = function(docId) {
        const p = currentPayments.find(x => x.id === docId);
        if (!p) return;
        
        if (inputPaymentId) inputPaymentId.value = p.id;
        if (modalTitle) modalTitle.textContent = 'Edit Payment';
        inputPaySP.value = p.salesperson;
        inputPayAmt.value = p.amount;
        inputPayNote.value = p.note || '';
        
        if (p.date && inputPayDate) {
            const d = p.date.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            inputPayDate.value = `${year}-${month}-${day}`;
        } else if (inputPayDate) {
            inputPayDate.value = '';
        }
        
        paymentModal.classList.remove('hidden');
    };
    
    window.deletePayment = async function(docId) {
        if (!confirm("Are you sure you want to delete this payment?")) return;
        
        try {
            await firebase.firestore().collection('job_billing_payments').doc(docId).delete();
            const sp = selSalesperson.value.trim();
            if (sp) {
                await fetchSalespersonPayments(sp);
                recalcTotals();
            }
        } catch (err) {
            console.error("Failed to delete payment:", err);
            alert("Failed to delete payment.");
        }
    };
    
    async function handleSalespersonChange() {
        const spFilter = selSalesperson.value.trim();
        
        if (spFilter) {
            spDashboardName.textContent = spFilter;
            spTotalPaid.textContent = 'Loading...';
            spDashboard.classList.remove('hidden');
            await fetchSalespersonPayments(spFilter);
        } else {
            spDashboard.classList.add('hidden');
        }
        
        renderTable();
    }
    
    function renderTable() {
        if (rawData.length === 0) {
             tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-slate-400"><i class="fas fa-inbox text-3xl mb-3 block"></i>No 'Delpend' records found.</td></tr>`;
             labelRow.textContent = 'Showing 0 rows';
             labelQty.textContent = 'Total Qty: 0';
             return;
        }
        
        const spFilter = selSalesperson.value.trim();
        const startStr = inputDateStart.value;
        const endStr = inputDateEnd.value;
        
        let startDate = null;
        let endDate = null;
        if (startStr) {
            const p = startStr.split('-');
            startDate = new Date(p[0], parseInt(p[1]) - 1, p[2]);
            startDate.setHours(0,0,0,0);
        }
        if (endStr) {
            const p = endStr.split('-');
            endDate = new Date(p[0], parseInt(p[1]) - 1, p[2]);
            endDate.setHours(23,59,59,999);
        }
        
        let filtered = rawData.filter(row => {
            const sp = (row[24] || '').trim();
            if (spFilter && sp !== spFilter) return false;
            
            const dStr = (row[1] || '').trim();
            const dObj = parseDate(dStr);
            if (dObj) {
                if (startDate && dObj < startDate) return false;
                if (endDate && dObj > endDate) return false;
            }
            return true;
        });

        const colMap = {
            orderNo: 4, delDate: 3, clientName: 5, product: 10, length: 9, style: 12, color: 13, qty: 15
        };

        filtered = filtered.filter(row => {
            for (const col in colFilters) {
                if (!colFilters[col]) continue;
                const idx = colMap[col];
                if (idx !== undefined) {
                    const val = (row[idx] || '').toString().toLowerCase();
                    if (!val.includes(colFilters[col])) return false;
                }
            }
            return true;
        });

        if (globalSearchQuery) {
            filtered = filtered.filter(row => {
                return Object.values(colMap).some(idx => {
                    const val = (row[idx] || '').toString().toLowerCase();
                    return val.includes(globalSearchQuery);
                });
            });
        }

        const hasFilters = globalSearchQuery !== '' || Object.values(colFilters).some(v => v !== '');
        if (clearFiltersBtn) {
            if (hasFilters || currentSortCol !== '') {
                clearFiltersBtn.classList.remove('hidden');
            } else {
                clearFiltersBtn.classList.add('hidden');
            }
        }

        if (currentSortCol) {
            filtered.sort((a, b) => {
                let valA, valB;
                
                if (currentSortCol === 'amount') {
                    const rIdA = a._rowId;
                    const rateA = jobRates[rIdA] || 0;
                    const qtyA = parseFloat(a[15] || '0') || 0;
                    valA = qtyA * rateA;
                    
                    const rIdB = b._rowId;
                    const rateB = jobRates[rIdB] || 0;
                    const qtyB = parseFloat(b[15] || '0') || 0;
                    valB = qtyB * rateB;
                } else {
                    const idx = colMap[currentSortCol];
                    valA = a[idx] || '';
                    valB = b[idx] || '';
                    
                    if (currentSortCol === 'qty') {
                        valA = parseFloat(valA) || 0;
                        valB = parseFloat(valB) || 0;
                    } else if (currentSortCol === 'delDate') {
                        const dA = parseDate(valA);
                        const dB = parseDate(valB);
                        valA = dA ? dA.getTime() : 0;
                        valB = dB ? dB.getTime() : 0;
                    } else {
                        valA = valA.toString().toLowerCase();
                        valB = valB.toString().toLowerCase();
                    }
                }
                
                if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        let totalQty = 0;
        let totalAmount = 0;
        
        filtered.forEach(row => {
            const qtyStr = row[15] || '0';
            const qty = parseFloat(qtyStr) || 0;
            const rate = jobRates[row._rowId] || 0;
            const amt = qty * rate;
            totalQty += qty;
            totalAmount += amt;
        });

        const paginated = filtered.slice(0, currentPageSize);
        let html = '';
        
        paginated.forEach(row => {
            const orderNo = row[4] || '';
            const rawDelDate = row[1] || '';
            let delDateStr = rawDelDate;
            const parsedD = parseDate(rawDelDate);
            if (parsedD) {
                const dd = String(parsedD.getDate()).padStart(2, '0');
                const mm = String(parsedD.getMonth() + 1).padStart(2, '0');
                const yyyy = parsedD.getFullYear();
                delDateStr = `${dd}/${mm}/${yyyy}`;
            }
            
            const clientName = row[5] || '';
            const length = row[9] || '';
            const product = row[10] || '';
            const style = row[12] || '';
            const color = row[13] || '';
            const qtyStr = row[15] || '0';
            const qty = parseFloat(qtyStr) || 0;
            const rowId = row._rowId;
            
            const rate = jobRates[rowId] || 0;
            const amt = qty * rate;
            
            html += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-3 border-b border-slate-100">${orderNo}</td>
                    <td class="px-6 py-3 border-b border-slate-100">${delDateStr}</td>
                    <td class="px-6 py-3 border-b border-slate-100 font-medium text-indigo-600">${clientName}</td>
                    <td class="px-6 py-3 border-b border-slate-100">${product}</td>
                    <td class="px-6 py-3 border-b border-slate-100">${length}</td>
                    <td class="px-6 py-3 border-b border-slate-100">${style}</td>
                    <td class="px-6 py-3 border-b border-slate-100"><span class="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">${color}</span></td>
                    <td class="px-6 py-3 border-b border-slate-100 text-right font-bold text-slate-700">${qty}</td>
                    <td class="px-6 py-3 border-b border-slate-100">
                        <input type="number" class="job-rate-input w-24 rounded border-slate-300 px-2 py-1 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                               data-rowid="${rowId}" data-qty="${qty}" data-product="${product.replace(/"/g, '&quot;')}" value="${rate || ''}" placeholder="0.00">
                    </td>
                    <td class="px-6 py-3 border-b border-slate-100 text-right font-bold text-slate-900 amount-cell" data-rowid="${rowId}">₹${amt.toFixed(2)}</td>
                </tr>
            `;
        });
        
        if (paginated.length === 0) {
            html = `<tr><td colspan="10" class="px-6 py-12 text-center text-slate-400"><i class="fas fa-search text-3xl mb-3 block"></i>No records match your filters.</td></tr>`;
        }
        
        tbody.innerHTML = html;
        let showingText = paginated.length < filtered.length ? `Showing ${paginated.length} of ${filtered.length} rows` : `Showing ${filtered.length} rows`;
        labelRow.textContent = showingText;
        labelQty.textContent = `Total Qty: ${totalQty}`;
        
        // Update Dashboard
        spTotalAmount.textContent = `₹${totalAmount.toFixed(2)}`;
        const balance = totalAmount - currentTotalPaid;
        spBalanceDue.textContent = `₹${balance.toFixed(2)}`;
        
        attachRateListeners();
    }

    function attachRateListeners() {
        document.querySelectorAll('.job-rate-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const changedInput = e.target;
                const newRate = parseFloat(changedInput.value) || 0;
                const product = changedInput.getAttribute('data-product');
                
                // Immediately update UI for all similar inputs
                const similarInputs = document.querySelectorAll(`.job-rate-input[data-product="${product.replace(/"/g, '\\"')}"]`);
                
                similarInputs.forEach(inp => {
                    // Update value only if it's not the one currently being typed in (to avoid cursor jump)
                    if (inp !== changedInput) {
                        inp.value = changedInput.value;
                    }
                    const rowId = inp.getAttribute('data-rowid');
                    const qty = parseFloat(inp.getAttribute('data-qty'));
                    
                    jobRates[rowId] = newRate;
                    const newAmt = qty * newRate;
                    
                    const amtCell = document.querySelector(`.amount-cell[data-rowid="${rowId}"]`);
                    if(amtCell) amtCell.textContent = `₹${newAmt.toFixed(2)}`;
                });
                
                recalcTotals();
                
                // Show 'Saving...' indicator immediately
                if (toast) {
                    toast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                    toast.classList.add('show');
                }

                // Debounce Firestore commit
                if (autosaveTimeout) clearTimeout(autosaveTimeout);
                
                autosaveTimeout = setTimeout(async () => {
                    const batch = firebase.firestore().batch();
                    
                    // We need to re-select similar inputs to ensure we get all rowIds to update
                    const allSimilar = rawData.filter(r => (r[10] || '') === product);
                    
                    allSimilar.forEach(row => {
                        const rowId = row._rowId;
                        const docRef = firebase.firestore().collection('job_billing_orders').doc(rowId);
                        batch.set(docRef, {
                            jobRate: newRate,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'unknown'
                        }, { merge: true });
                    });
                    
                    try {
                        await batch.commit();
                        if (toast) {
                            toast.innerHTML = '<i class="fas fa-check-circle"></i> Rates Saved!';
                            setTimeout(() => {
                                toast.classList.remove('show');
                            }, 2000);
                        }
                    } catch(err) {
                        console.error("Failed to save job rates batch", err);
                        if (toast) {
                            toast.style.backgroundColor = '#ef4444'; // Red
                            toast.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Save Failed';
                            setTimeout(() => {
                                toast.classList.remove('show');
                                setTimeout(() => toast.style.backgroundColor = '#10b981', 300); // Reset to green
                            }, 3000);
                        }
                    }
                }, 800); // 800ms debounce
            });
        });
    }

    function recalcTotals() {
        let sumAmount = 0;
        document.querySelectorAll('.amount-cell').forEach(cell => {
            const text = cell.textContent.replace('₹', '');
            sumAmount += parseFloat(text) || 0;
        });
        
        spTotalAmount.textContent = `₹${sumAmount.toFixed(2)}`;
        const balance = sumAmount - currentTotalPaid;
        spBalanceDue.textContent = `₹${balance.toFixed(2)}`;
    }

    // Modal Logic
    function openPaymentModal() {
        const sp = selSalesperson.value.trim();
        if(!sp) return;
        
        if (inputPaymentId) inputPaymentId.value = '';
        if (modalTitle) modalTitle.textContent = 'Record Payment';
        
        inputPaySP.value = sp;
        inputPayAmt.value = '';
        if(inputPayDate) inputPayDate.value = '';
        inputPayNote.value = '';
        paymentModal.classList.remove('hidden');
    }

    function closePaymentModal() {
        paymentModal.classList.add('hidden');
    }

    async function submitPayment() {
        const sp = inputPaySP.value;
        const amt = parseFloat(inputPayAmt.value);
        const dateVal = inputPayDate.value;
        const note = inputPayNote.value.trim();
        
        if(!sp || isNaN(amt) || amt <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        
        let paymentTimestamp;
        if (dateVal) {
            const dateObj = new Date(dateVal);
            dateObj.setHours(12, 0, 0, 0); // avoid timezone shifts
            paymentTimestamp = firebase.firestore.Timestamp.fromDate(dateObj);
        } else {
            paymentTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        btnSubmitPayment.disabled = true;
        modalSpinner.classList.remove('hidden');
        
        try {
            const paymentData = {
                salesperson: sp,
                amount: amt,
                note: note,
                date: paymentTimestamp,
                recordedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'unknown'
            };
            
            if (inputPaymentId && inputPaymentId.value) {
                // Update existing
                await firebase.firestore().collection('job_billing_payments').doc(inputPaymentId.value).update(paymentData);
            } else {
                // Add new
                await firebase.firestore().collection('job_billing_payments').add(paymentData);
            }
            
            // Refresh dashboard
            await fetchSalespersonPayments(sp);
            recalcTotals();
            
            closePaymentModal();
        } catch(err) {
            console.error("Failed to add payment:", err);
            alert("Failed to save payment.");
        } finally {
            btnSubmitPayment.disabled = false;
            modalSpinner.classList.add('hidden');
        }
    }
});
