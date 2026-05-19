document.addEventListener('DOMContentLoaded', () => {

    // Default Exporter Value if none saved
    const DEFAULT_EXPORTER = `IND Natural Hair Pvt Ltd\nWZ 81/1-A, G/F Shop\nGuru Nanak Nagar\nNear CRPE\nNew Delhi 110018\nIndia\nPhone: +91-8800244033`;

    // State
    let customers = JSON.parse(localStorage.getItem('shipping_customers')) || [];
    let exporters = JSON.parse(localStorage.getItem('shipping_exporters')) || [{ id: 'default', name: 'Default Exporter', details: DEFAULT_EXPORTER }];
    let savedInvoices = JSON.parse(localStorage.getItem('shipping_invoices')) || [];

    // Element References
    const elements = {
        docType: document.getElementById('inp-doc-type'),
        exporterSelect: document.getElementById('inp-exporter-select'),
        invoiceNo: document.getElementById('inp-invoice-no'),
        date: document.getElementById('inp-date'),
        iec: document.getElementById('inp-iec'),
        consignee: document.getElementById('inp-consignee'),
        consigneePhone: document.getElementById('inp-consignee-phone'),
        buyer: document.getElementById('inp-buyer'),
        pol: document.getElementById('inp-pol'),
        coo: document.getElementById('inp-coo'),
        pod: document.getElementById('inp-pod'),
        destination: document.getElementById('inp-destination'),
        terms: document.getElementById('inp-terms'),
        currency: document.getElementById('inp-currency'),
        
        // Items
        itemsContainer: document.getElementById('items-container'),
        btnAddItem: document.getElementById('btn-add-item'),
        
        // Previews
        prevDocType: document.getElementById('prev-doc-type'),
        prevExporter: document.getElementById('prev-exporter'),
        prevInvoiceNo: document.getElementById('prev-invoice-no'),
        prevDate: document.getElementById('prev-date'),
        prevIec: document.getElementById('prev-iec'),
        prevConsignee: document.getElementById('prev-consignee'),
        prevConsigneePhone: document.getElementById('prev-consignee-phone'),
        prevBuyer: document.getElementById('prev-buyer'),
        prevPol: document.getElementById('prev-pol'),
        prevCoo: document.getElementById('prev-coo'),
        prevPod: document.getElementById('prev-pod'),
        prevDestCountry: document.getElementById('prev-dest-country'),
        prevDestination: document.getElementById('prev-destination'),
        prevTerms: document.getElementById('prev-terms'),
        prevItemsBody: document.getElementById('prev-items-body'),
        prevTotalAmount: document.getElementById('prev-total-amount'),
        prevTotalWords: document.getElementById('prev-total-words'),

        // Database / Settings
        dbExpName: document.getElementById('db-exp-name'),
        dbExpDetails: document.getElementById('db-exp-details'),
        btnSaveExporter: document.getElementById('btn-save-exporter'),
        exporterList: document.getElementById('exporter-list'),
        
        // Actions
        btnSaveInvoice: document.getElementById('btn-save-invoice'),
        btnPrint: document.getElementById('btn-print'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
    };

    // --- Tab Switching ---
    const tabInvoice = document.getElementById('tab-invoice');
    const tabDatabase = document.getElementById('tab-database');
    const tabSaved = document.getElementById('tab-saved');
    const panelInvoice = document.getElementById('panel-invoice');
    const panelDatabase = document.getElementById('panel-database');
    const panelSaved = document.getElementById('panel-saved');

    function resetTabs() {
        const inactiveClass = 'flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors';
        tabInvoice.className = inactiveClass;
        tabDatabase.className = inactiveClass;
        tabSaved.className = inactiveClass;
        panelInvoice.classList.add('hidden');
        panelDatabase.classList.add('hidden');
        panelSaved.classList.add('hidden');
    }

    tabInvoice.addEventListener('click', () => {
        resetTabs();
        tabInvoice.className = 'flex-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 bg-white';
        panelInvoice.classList.remove('hidden');
    });

    tabDatabase.addEventListener('click', () => {
        resetTabs();
        tabDatabase.className = 'flex-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 bg-white';
        panelDatabase.classList.remove('hidden');
        renderCustomerList();
        renderExporterList();
    });

    tabSaved.addEventListener('click', () => {
        resetTabs();
        tabSaved.className = 'flex-1 py-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 bg-white';
        panelSaved.classList.remove('hidden');
        renderSavedInvoices();
    });

    // --- Initialization ---
    function initExporters() {
        elements.exporterSelect.innerHTML = '';
        exporters.forEach((exp, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = exp.name;
            elements.exporterSelect.appendChild(opt);
        });
        updateSelectedExporter();
    }

    function updateSelectedExporter() {
        const idx = elements.exporterSelect.value;
        if (idx !== "" && exporters[idx]) {
            elements.prevExporter.textContent = exporters[idx].details;
        }
    }

    elements.exporterSelect.addEventListener('change', updateSelectedExporter);
    initExporters();

    const today = new Date();
    elements.date.value = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;
    elements.invoiceNo.value = `INH${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}-1`;
    elements.iec.value = "0516971735";

    // --- Core Logic ---

    // Generic function to bind an input to a preview element
    function bindInputToPreview(inputEl, previewEl, formatter = val => val) {
        const update = () => previewEl.textContent = formatter(inputEl.value);
        inputEl.addEventListener('input', update);
        update(); // Init
    }

    elements.docType.addEventListener('change', () => {
        elements.prevDocType.textContent = elements.docType.value;
        updateDocumentTypeView();
        updateItemsPreview();
    });
    
    function updateDocumentTypeView() {
        const isPackingList = elements.docType.value === 'Packing List';
        document.querySelectorAll('.inv-only').forEach(el => el.style.display = isPackingList ? 'none' : '');
        document.querySelectorAll('.pack-only').forEach(el => el.style.display = isPackingList ? '' : 'none');
    }
    
    // Init doc type view
    elements.prevDocType.textContent = elements.docType.value;
    updateDocumentTypeView();

    bindInputToPreview(elements.invoiceNo, elements.prevInvoiceNo);
    bindInputToPreview(elements.date, elements.prevDate);
    bindInputToPreview(elements.iec, elements.prevIec);
    bindInputToPreview(elements.consignee, elements.prevConsignee);
    bindInputToPreview(elements.consigneePhone, elements.prevConsigneePhone);
    bindInputToPreview(elements.buyer, elements.prevBuyer);
    bindInputToPreview(elements.pol, elements.prevPol);
    bindInputToPreview(elements.coo, elements.prevCoo);
    bindInputToPreview(elements.pod, elements.prevPod);
    bindInputToPreview(elements.destination, elements.prevDestCountry);
    bindInputToPreview(elements.destination, elements.prevDestination);
    bindInputToPreview(elements.terms, elements.prevTerms);

    // Bind Currency to Trigger Calculation update
    elements.currency.addEventListener('change', updateItemsPreview);

    // Items Logic
    elements.btnAddItem.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'item-row bg-slate-50 border border-slate-200 p-3 rounded relative';
        row.innerHTML = `
            <button class="btn-remove-item absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-200">&times;</button>
            <textarea class="item-desc w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none mb-2 resize-none" rows="2" placeholder="Description of Goods">Human Hair Extensions</textarea>
            <div class="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <input type="text" class="item-hsn border border-slate-300 rounded p-1.5 text-xs" placeholder="HSN" value="6704.20.00" title="HSN Code">
                <input type="number" class="item-pcs border border-slate-300 rounded p-1.5 text-xs" placeholder="Qty" value="10" title="Quantity">
                <select class="item-unit border border-slate-300 rounded p-1.5 text-xs" title="Unit">
                    <option value="kg">kg</option>
                    <option value="pcs" selected>pcs</option>
                    <option value="sets">sets</option>
                </select>
                <input type="number" step="0.01" class="item-price border border-slate-300 rounded p-1.5 text-xs" placeholder="Price" value="10.00" title="Price">
                <input type="number" step="0.01" class="item-net border border-slate-300 rounded p-1.5 text-xs" placeholder="Net Wt(kg)" title="Net Weight (kg)">
                <input type="number" step="0.01" class="item-gross border border-slate-300 rounded p-1.5 text-xs" placeholder="Gross Wt(kg)" title="Gross Weight (kg)">
            </div>
        `;
        elements.itemsContainer.appendChild(row);
        attachItemListeners(row);
        updateItemsPreview();
    });

    function attachItemListeners(row) {
        row.querySelector('.btn-remove-item').addEventListener('click', () => {
            row.remove();
            updateItemsPreview();
        });
        row.querySelectorAll('input, textarea, select').forEach(inp => {
            inp.addEventListener('input', updateItemsPreview);
        });
    }

    document.querySelectorAll('.item-row').forEach(attachItemListeners);

    function updateItemsPreview() {
        const rows = document.querySelectorAll('.item-row');
        elements.prevItemsBody.innerHTML = '';
        
        let totalVal = 0;
        let totalNet = 0;
        let totalGross = 0;
        const curr = elements.currency.value;
        const currSymbol = getCurrencySymbol(curr);
        const isPackingList = elements.docType.value === 'Packing List';

        rows.forEach((row, idx) => {
            const desc = row.querySelector('.item-desc').value;
            const hsn = row.querySelector('.item-hsn').value;
            const pcs = parseFloat(row.querySelector('.item-pcs').value) || 0;
            const unit = row.querySelector('.item-unit') ? row.querySelector('.item-unit').value : 'pcs';
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const net = parseFloat(row.querySelector('.item-net').value) || 0;
            const gross = parseFloat(row.querySelector('.item-gross').value) || 0;
            
            const amount = pcs * price;
            totalVal += amount;
            totalNet += net;
            totalGross += gross;

            const tr = document.createElement('tr');
            
            if (isPackingList) {
                tr.innerHTML = `
                    <td class="center-align border-t-0 border-b-0">${idx + 1}</td>
                    <td class="border-t-0 border-b-0 whitespace-pre-wrap">${desc}</td>
                    <td class="center-align border-t-0 border-b-0">${hsn}</td>
                    <td class="center-align border-t-0 border-b-0">${pcs} ${unit}</td>
                    <td class="center-align border-t-0 border-b-0">${net ? net.toFixed(2) : '-'}</td>
                    <td class="center-align border-t-0 border-b-0">${gross ? gross.toFixed(2) : '-'}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td class="center-align border-t-0 border-b-0">${idx + 1}</td>
                    <td class="border-t-0 border-b-0 whitespace-pre-wrap">${desc}</td>
                    <td class="center-align border-t-0 border-b-0">${hsn}</td>
                    <td class="center-align border-t-0 border-b-0 border-r-0">${pcs} ${unit}</td>
                    <td class="center-align border-t-0 border-b-0 border-l-0">${currSymbol}${price.toFixed(2)}/${unit}</td>
                    <td class="center-align border-t-0 border-b-0">${curr}</td>
                    <td class="center-align border-t-0 border-b-0">${currSymbol}${amount.toFixed(2)}</td>
                `;
            }
            elements.prevItemsBody.appendChild(tr);
        });

        // Update Totals
        if (isPackingList) {
            document.getElementById('prev-total-net').textContent = totalNet ? totalNet.toFixed(2) + ' kg' : '-';
            document.getElementById('prev-total-gross').textContent = totalGross ? totalGross.toFixed(2) + ' kg' : '-';
        } else {
            elements.prevTotalAmount.textContent = `${currSymbol}${totalVal.toFixed(2)}`;
            const words = numberToWords(Math.floor(totalVal));
            const currencyName = getCurrencyName(curr);
            elements.prevTotalWords.textContent = `Total Payable Amount: ${currencyName} ${words} Only`;
        }
    }

    // --- Exporter Settings ---
    elements.btnSaveExporter.addEventListener('click', () => {
        const name = elements.dbExpName.value.trim();
        const details = elements.dbExpDetails.value.trim();
        if (!name || !details) return alert("Exporter Name and Details are required.");

        exporters.push({ id: Date.now().toString(), name, details });
        localStorage.setItem('shipping_exporters', JSON.stringify(exporters));
        
        elements.dbExpName.value = '';
        elements.dbExpDetails.value = '';
        
        initExporters();
        renderExporterList();
        alert("Exporter Saved!");
    });

    function renderExporterList() {
        elements.exporterList.innerHTML = '';
        exporters.forEach((exp, index) => {
            const div = document.createElement('div');
            div.className = 'bg-white border border-slate-200 p-3 rounded flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <div class="font-bold text-slate-800 text-sm">${exp.name}</div>
                    <div class="text-xs text-slate-500 truncate max-w-[200px]">${exp.details.replace(/\\n/g, ', ')}</div>
                </div>
                <button class="text-red-500 hover:text-red-700" onclick="deleteExporter(${index})"><i class="fas fa-trash"></i></button>
            `;
            elements.exporterList.appendChild(div);
        });
    }

    window.deleteExporter = function(index) {
        if (exporters.length === 1) return alert("You must have at least one exporter.");
        if (confirm("Delete this exporter?")) {
            exporters.splice(index, 1);
            localStorage.setItem('shipping_exporters', JSON.stringify(exporters));
            initExporters();
            renderExporterList();
        }
    };


    // --- Customer Database ---
    const btnSaveCustomer = document.getElementById('btn-save-customer');
    const customerList = document.getElementById('customer-list');
    
    // Modal
    const btnLoadCustomer = document.getElementById('btn-load-customer');
    const customerModal = document.getElementById('customer-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const customerSearch = document.getElementById('customer-search');
    const modalCustomerList = document.getElementById('modal-customer-list');

    btnSaveCustomer.addEventListener('click', () => {
        const name = document.getElementById('db-name').value.trim();
        if (!name) return alert("Company / Name is required");

        const co = document.getElementById('db-co').value.trim();
        const addr1 = document.getElementById('db-addr1').value.trim();
        const addr2 = document.getElementById('db-addr2').value.trim();
        const country = document.getElementById('db-country').value.trim();
        const phone = document.getElementById('db-phone').value.trim();

        const coFormatted = co ? `C/o ${co}` : '';
        const fullAddr = [name, coFormatted, addr1, addr2, country].filter(x => x).join('\n');
        const phoneFormatted = phone ? (phone.startsWith('Ph') ? phone : `Ph: ${phone}`) : '';
        const raw = { name, co, addr1, addr2, country, phone };

        const editId = document.getElementById('db-edit-id') ? document.getElementById('db-edit-id').value : '';
        
        if (editId) {
            const index = customers.findIndex(c => c.id === editId);
            if (index > -1) {
                customers[index] = { ...customers[index], name, fullAddr, phone: phoneFormatted, country: country, raw };
            }
        } else {
            const newCust = { id: Date.now().toString(), name, fullAddr, phone: phoneFormatted, country: country, raw };
            customers.push(newCust);
        }

        localStorage.setItem('shipping_customers', JSON.stringify(customers));
        resetCustomerForm();
        renderCustomerList();
        alert(editId ? "Customer updated!" : "Customer saved!");
    });

    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', resetCustomerForm);
    }

    function resetCustomerForm() {
        const elEditId = document.getElementById('db-edit-id');
        if (elEditId) elEditId.value = '';
        document.getElementById('db-name').value = '';
        document.getElementById('db-co').value = '';
        document.getElementById('db-addr1').value = '';
        document.getElementById('db-addr2').value = '';
        document.getElementById('db-country').value = '';
        document.getElementById('db-phone').value = '';
        
        document.getElementById('btn-save-customer').textContent = 'Save Customer';
        if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
        
        const formTitle = document.querySelector('#panel-database .bg-indigo-50 h3');
        if (formTitle) formTitle.textContent = 'Add New Customer';
    }

    function renderCustomerList() {
        customerList.innerHTML = '';
        customers.forEach((c, index) => {
            const div = document.createElement('div');
            div.className = 'bg-white border border-slate-200 p-3 rounded flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <div class="font-bold text-slate-800 text-sm">${c.name}</div>
                    <div class="text-xs text-slate-500 truncate max-w-[200px]">${c.fullAddr.replace(/\n/g, ', ')}</div>
                </div>
                <div class="flex gap-3">
                    <button class="text-blue-500 hover:text-blue-700" onclick="editCustomer(${index})"><i class="fas fa-edit"></i></button>
                    <button class="text-red-500 hover:text-red-700" onclick="deleteCustomer(${index})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            customerList.appendChild(div);
        });
    }

    window.editCustomer = function(index) {
        const c = customers[index];
        const elEditId = document.getElementById('db-edit-id');
        if (elEditId) elEditId.value = c.id;
        
        if (c.raw) {
            document.getElementById('db-name').value = c.raw.name || '';
            document.getElementById('db-co').value = c.raw.co || '';
            document.getElementById('db-addr1').value = c.raw.addr1 || '';
            document.getElementById('db-addr2').value = c.raw.addr2 || '';
            document.getElementById('db-country').value = c.raw.country || '';
            document.getElementById('db-phone').value = c.raw.phone || '';
        } else {
            // Fallback for older customers without raw metadata
            document.getElementById('db-name').value = c.name || '';
            document.getElementById('db-co').value = '';
            const lines = c.fullAddr ? c.fullAddr.split('\n') : [];
            document.getElementById('db-addr1').value = lines.length > 1 ? lines[1] : '';
            document.getElementById('db-addr2').value = lines.length > 2 ? lines[2] : '';
            document.getElementById('db-country').value = c.country || '';
            const phoneMatch = c.phone ? c.phone.match(/Ph: (.*)/) : null;
            document.getElementById('db-phone').value = phoneMatch ? phoneMatch[1] : (c.phone || '');
        }

        document.getElementById('btn-save-customer').textContent = 'Update Customer';
        if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');
        
        const formTitle = document.querySelector('#panel-database .bg-indigo-50 h3');
        if (formTitle) formTitle.textContent = 'Edit Customer';
        
        // Scroll to form if needed
        document.getElementById('panel-database').scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteCustomer = function(index) {
        if (confirm("Delete this customer?")) {
            customers.splice(index, 1);
            localStorage.setItem('shipping_customers', JSON.stringify(customers));
            renderCustomerList();
        }
    };

    // Customer Modal Logic
    btnLoadCustomer.addEventListener('click', () => {
        renderModalCustomers(customers);
        customerModal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
        customerModal.classList.add('hidden');
    });

    customerSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = customers.filter(c => c.name.toLowerCase().includes(query) || c.fullAddr.toLowerCase().includes(query));
        renderModalCustomers(filtered);
    });

    function renderModalCustomers(list) {
        modalCustomerList.innerHTML = '';
        if (list.length === 0) {
            modalCustomerList.innerHTML = '<div class="p-3 text-sm text-slate-500 text-center">No customers found.</div>';
            return;
        }
        
        list.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left bg-white border border-slate-200 p-3 rounded hover:border-indigo-400 hover:shadow-sm transition';
            btn.innerHTML = `
                <div class="font-bold text-slate-800 text-sm">${c.name}</div>
                <div class="text-xs text-slate-500 truncate">${c.fullAddr.replace(/\\n/g, ', ')}</div>
            `;
            btn.addEventListener('click', () => {
                elements.consignee.value = c.fullAddr;
                elements.consignee.dispatchEvent(new Event('input'));
                
                elements.consigneePhone.value = c.phone || '';
                elements.consigneePhone.dispatchEvent(new Event('input'));
                
                if (c.country) {
                    elements.pod.value = c.country;
                    elements.pod.dispatchEvent(new Event('input'));
                    elements.destination.value = c.country;
                    elements.destination.dispatchEvent(new Event('input'));
                }
                
                customerModal.classList.add('hidden');
            });
            modalCustomerList.appendChild(btn);
        });
    }


    // --- Save Invoice Logic ---
    elements.btnSaveInvoice.addEventListener('click', () => {
        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            items.push({
                desc: row.querySelector('.item-desc').value,
                hsn: row.querySelector('.item-hsn').value,
                pcs: row.querySelector('.item-pcs').value,
                unit: row.querySelector('.item-unit') ? row.querySelector('.item-unit').value : 'pcs',
                price: row.querySelector('.item-price').value,
                net: row.querySelector('.item-net').value,
                gross: row.querySelector('.item-gross').value
            });
        });

        const invoiceData = {
            id: Date.now().toString(),
            docType: elements.docType.value,
            invoiceNo: elements.invoiceNo.value,
            date: elements.date.value,
            iec: elements.iec.value,
            exporterIdx: elements.exporterSelect.value,
            consignee: elements.consignee.value,
            consigneePhone: elements.consigneePhone.value,
            buyer: elements.buyer.value,
            pol: elements.pol.value,
            coo: elements.coo.value,
            pod: elements.pod.value,
            destination: elements.destination.value,
            terms: elements.terms.value,
            currency: elements.currency.value,
            items: items,
            totalAmount: elements.prevTotalAmount.textContent
        };

        // Update if existing with same invoice no, else push
        const existingIdx = savedInvoices.findIndex(i => i.invoiceNo === invoiceData.invoiceNo);
        if (existingIdx >= 0) {
            savedInvoices[existingIdx] = invoiceData;
        } else {
            savedInvoices.push(invoiceData);
        }

        localStorage.setItem('shipping_invoices', JSON.stringify(savedInvoices));
        alert("Invoice Saved Successfully!");
    });

    function renderSavedInvoices() {
        const list = document.getElementById('saved-invoices-list');
        list.innerHTML = '';
        if (savedInvoices.length === 0) {
            list.innerHTML = '<div class="p-4 text-center text-sm text-slate-500">No saved invoices.</div>';
            return;
        }

        [...savedInvoices].reverse().forEach((inv) => {
            const div = document.createElement('div');
            div.className = 'bg-white border border-slate-200 p-3 rounded flex justify-between items-center hover:border-indigo-300 transition';
            div.innerHTML = `
                <div>
                    <div class="font-bold text-slate-800 text-sm">${inv.invoiceNo} <span class="font-normal text-slate-500 ml-2">${inv.date}</span></div>
                    <div class="text-xs text-slate-500 mt-1 truncate max-w-[200px]">${inv.consignee.split('\\n')[0]} - ${inv.totalAmount}</div>
                </div>
                <div class="flex gap-2">
                    <button class="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100" onclick="loadSavedInvoice('${inv.id}')">Load</button>
                    <button class="px-2 py-1.5 text-red-500 hover:text-red-700 rounded text-xs" onclick="deleteSavedInvoice('${inv.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(div);
        });
    }

    window.loadSavedInvoice = function(id) {
        const inv = savedInvoices.find(i => i.id === id);
        if (!inv) return;

        elements.docType.value = inv.docType || 'Proforma Invoice';
        elements.invoiceNo.value = inv.invoiceNo;
        elements.date.value = inv.date;
        elements.iec.value = inv.iec;
        elements.exporterSelect.value = inv.exporterIdx !== undefined ? inv.exporterIdx : 0;
        elements.consignee.value = inv.consignee;
        elements.consigneePhone.value = inv.consigneePhone || '';
        elements.buyer.value = inv.buyer || '';
        elements.pol.value = inv.pol || '';
        elements.coo.value = inv.coo || 'India';
        elements.pod.value = inv.pod || '';
        elements.destination.value = inv.destination || '';
        elements.terms.value = inv.terms || '';
        elements.currency.value = inv.currency || 'USD';

        // Trigger updates
        [elements.docType, elements.invoiceNo, elements.date, elements.iec, elements.exporterSelect, 
         elements.consignee, elements.consigneePhone, elements.buyer, elements.pol, elements.coo, 
         elements.pod, elements.destination, elements.terms, elements.currency].forEach(el => {
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
        });

        // Rebuild items
        elements.itemsContainer.innerHTML = '';
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'item-row bg-slate-50 border border-slate-200 p-3 rounded relative';
                row.innerHTML = `
                    <button class="btn-remove-item absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-200">&times;</button>
                    <textarea class="item-desc w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none mb-2 resize-none" rows="2">${item.desc}</textarea>
                    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        <input type="text" class="item-hsn border border-slate-300 rounded p-1.5 text-xs" value="${item.hsn}" title="HSN Code">
                        <input type="number" class="item-pcs border border-slate-300 rounded p-1.5 text-xs" value="${item.pcs}" title="Quantity">
                        <select class="item-unit border border-slate-300 rounded p-1.5 text-xs" title="Unit">
                            <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="pcs" ${(!item.unit || item.unit === 'pcs') ? 'selected' : ''}>pcs</option>
                            <option value="sets" ${item.unit === 'sets' ? 'selected' : ''}>sets</option>
                        </select>
                        <input type="number" step="0.01" class="item-price border border-slate-300 rounded p-1.5 text-xs" value="${item.price}" title="Price">
                        <input type="number" step="0.01" class="item-net border border-slate-300 rounded p-1.5 text-xs" value="${item.net || ''}" title="Net Weight (kg)">
                        <input type="number" step="0.01" class="item-gross border border-slate-300 rounded p-1.5 text-xs" value="${item.gross || ''}" title="Gross Weight (kg)">
                    </div>
                `;
                elements.itemsContainer.appendChild(row);
                attachItemListeners(row);
            });
        } else {
            // Add at least one empty item if somehow saved with zero items
            elements.btnAddItem.click();
        }
        
        updateItemsPreview();
        tabInvoice.click(); // Switch back to form tab
    };

    window.deleteSavedInvoice = function(id) {
        if (confirm("Delete this saved invoice?")) {
            savedInvoices = savedInvoices.filter(i => i.id !== id);
            localStorage.setItem('shipping_invoices', JSON.stringify(savedInvoices));
            renderSavedInvoices();
        }
    };


    // --- Printing & PDF ---
    elements.btnPrint.addEventListener('click', () => {
        window.print();
    });

    elements.btnExportPdf.addEventListener('click', async () => {
        const container = document.getElementById('invoice-preview-container');
        const originalText = elements.btnExportPdf.innerHTML;
        elements.btnExportPdf.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        
        try {
            const canvas = await html2canvas(container, {
                scale: 3, // High Res
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${elements.invoiceNo.value || 'Draft'}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error generating PDF.");
        } finally {
            elements.btnExportPdf.innerHTML = originalText;
        }
    });

    // --- Utilities ---
    function getCurrencySymbol(curr) {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'AUD': 'A$', 'CAD': 'C$' };
        return symbols[curr] || '$';
    }

    function getCurrencyName(curr) {
        const names = { 'USD': 'US Dollars', 'EUR': 'Euros', 'GBP': 'Pounds', 'INR': 'Rupees', 'AUD': 'Australian Dollars', 'CAD': 'Canadian Dollars' };
        return names[curr] || curr;
    }

    function numberToWords(num) {
        if (num === 0) return 'Zero';
        const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
        const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

        if ((num = num.toString()).length > 9) return 'Overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return; let str = '';
        
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim();
    }

    // Trigger initial calculation
    updateItemsPreview();
});
