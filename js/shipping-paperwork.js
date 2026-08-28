document.addEventListener('DOMContentLoaded', () => {

    // Default Exporter Value if none saved
    const DEFAULT_EXPORTER = `IND Natural Hair Pvt Ltd\nWZ 81/1-A, G/F Shop\nGuru Nanak Nagar\nNear CRPE\nNew Delhi 110018\nIndia\nPhone: +91-8800244033`;

    // State
    let customers = JSON.parse(localStorage.getItem('shipping_customers')) || [];
    let exporters = JSON.parse(localStorage.getItem('shipping_exporters')) || [{ id: 'default', name: 'Default Exporter', details: DEFAULT_EXPORTER }];
    let savedInvoices = JSON.parse(localStorage.getItem('shipping_invoices')) || [];
    let docMargins = JSON.parse(localStorage.getItem('shipping_doc_margins')) || {};

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
        prevTotalNet: document.getElementById('prev-total-net'),
        prevTotalGross: document.getElementById('prev-total-gross'),

        // Certificate Previews
        certExporter: document.getElementById('cert-exporter'),
        certConsignee: document.getElementById('cert-consignee'),
        certConsigneePhone: document.getElementById('cert-consignee-phone'),
        certPkgs: document.getElementById('cert-pkgs'),
        certDestination: document.getElementById('cert-destination'),
        certGrossWt: document.getElementById('cert-gross-wt'),

        // Label Previews
        labelExporter: document.getElementById('label-exporter'),
        labelConsignee: document.getElementById('label-consignee'),
        labelConsigneePhone: document.getElementById('label-consignee-phone'),
        labelDestination: document.getElementById('label-destination'),

        // Declaration Previews
        declExporterName: document.getElementById('decl-exporter-name'),
        declDate: document.getElementById('decl-date'),
        
        // Annexure-A Previews
        annexInvNoDate: document.getElementById('annex-inv-no-date'),
        annexDate: document.getElementById('annex-date'),
        annexExporterName: document.getElementById('annex-exporter-name'),

        // SLI Previews
        sliShipperName: document.getElementById('sli-shipper-name'),
        sliInvoiceNo: document.getElementById('sli-invoice-no'),
        sliConsigneeName: document.getElementById('sli-consignee-name'),
        sliDate: document.getElementById('sli-date'),
        sliAwb: document.getElementById('sli-awb'),
        sliValue: document.getElementById('sli-value'),
        sliPkgs: document.getElementById('sli-pkgs'),
        sliNetWt: document.getElementById('sli-net-wt'),
        sliGrossWt: document.getElementById('sli-gross-wt'),

        // Additional Inputs
        inpTopMargin: document.getElementById('inp-top-margin'),
        inpBottomMargin: document.getElementById('inp-bottom-margin'),
        inpLeftMargin: document.getElementById('inp-left-margin'),
        inpRightMargin: document.getElementById('inp-right-margin'),
        inpTotalPkgs: document.getElementById('inp-total-pkgs'),
        inpAwb: document.getElementById('inp-awb'),
        previewContainer: document.getElementById('invoice-preview-container'),

        // Database / Settings
        dbExpName: document.getElementById('db-exp-name'),
        dbExpDetails: document.getElementById('db-exp-details'),
        btnSaveExporter: document.getElementById('btn-save-exporter'),
        exporterList: document.getElementById('exporter-list'),
        
        // Actions
        btnSaveInvoice: document.getElementById('btn-save-invoice'),
        btnPrint: document.getElementById('btn-print'),
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
            elements.certExporter.textContent = exporters[idx].details;
            elements.labelExporter.textContent = exporters[idx].details;
            const actualExporterName = exporters[idx].details ? exporters[idx].details.split('\n')[0].trim() : exporters[idx].name;
            if (elements.sliShipperName) elements.sliShipperName.textContent = actualExporterName;
            if (elements.declExporterName) elements.declExporterName.textContent = actualExporterName;
            if (elements.annexExporterName) elements.annexExporterName.textContent = actualExporterName;
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

    elements.docType.addEventListener('change', (e) => {
        elements.prevDocType.textContent = elements.docType.value;
        
        if (e && e.isTrusted) {
            let val = docMargins[elements.docType.value];
            if (typeof val === 'string' || typeof val === 'number') val = { top: val, bottom: 0, left: 0, right: 0 };
            val = val || {};
            elements.inpTopMargin.value = val.top !== undefined ? val.top : 0;
            elements.inpBottomMargin.value = val.bottom !== undefined ? val.bottom : 0;
            elements.inpLeftMargin.value = val.left !== undefined ? val.left : 0;
            elements.inpRightMargin.value = val.right !== undefined ? val.right : 0;
        }
        
        updateDocumentTypeView();
        updateItemsPreview();
    });
    
    const updateMargins = () => {
        docMargins[elements.docType.value] = {
            top: elements.inpTopMargin.value,
            bottom: elements.inpBottomMargin.value,
            left: elements.inpLeftMargin.value,
            right: elements.inpRightMargin.value
        };
        localStorage.setItem('shipping_doc_margins', JSON.stringify(docMargins));
        updateDocumentTypeView();
    };

    elements.inpTopMargin.addEventListener('input', updateMargins);
    elements.inpBottomMargin.addEventListener('input', updateMargins);
    elements.inpLeftMargin.addEventListener('input', updateMargins);
    elements.inpRightMargin.addEventListener('input', updateMargins);
    
    function updateDocumentTypeView() {
        const docType = elements.docType.value;
        const isPackingList = docType === 'Packing List';
        const isCert = docType === 'Certificate for Non-Dangerous Goods';
        const isLabel = docType === 'Shipping Label';
        const isSli = docType === "Shipper's Letter of Instructions";
        const isDeclaration = docType === 'Declaration';
        const isAnnexureA = docType === 'Annexure-A';
        
        const isPan = docType === 'PAN';
        const isIec = docType === 'IEC';
        const isAdCode = docType === 'AD Code';
        const isLut = docType === 'LUT';
        const isStaticDoc = isPan || isIec || isAdCode || isLut;

        document.getElementById('common-table').style.display = (!isCert && !isLabel && !isSli && !isDeclaration && !isAnnexureA && !isStaticDoc) ? 'table' : 'none';
        document.getElementById('cert-table').style.display = isCert ? 'table' : 'none';
        document.getElementById('label-container').style.display = isLabel ? 'flex' : 'none';
        if(document.getElementById('sli-container')) document.getElementById('sli-container').style.display = isSli ? 'block' : 'none';
        if(document.getElementById('declaration-container')) document.getElementById('declaration-container').style.display = isDeclaration ? 'block' : 'none';
        if(document.getElementById('annexurea-container')) document.getElementById('annexurea-container').style.display = isAnnexureA ? 'block' : 'none';
        
        const staticDocContainer = document.getElementById('static-doc-container');
        if (staticDocContainer) {
            staticDocContainer.style.display = isStaticDoc ? 'block' : 'none';
            if (isStaticDoc) {
                document.getElementById('static-pan').style.display = isPan ? 'block' : 'none';
                document.getElementById('static-iec').style.display = isIec ? 'block' : 'none';
                document.getElementById('static-adcode').style.display = isAdCode ? 'block' : 'none';
                document.getElementById('static-lut').style.display = isLut ? 'block' : 'none';
            }
        }

        const previewContainer = document.getElementById('invoice-preview-container');
        if (isStaticDoc) {
            previewContainer.classList.add('is-static');
        } else {
            previewContainer.classList.remove('is-static');
        }
        const keepTopMargin = ['Proforma Invoice', 'Commercial Invoice', 'Packing List', 'Certificate for Non-Dangerous Goods', 'Declaration', 'Annexure-A'].includes(docType);
        const topInches = parseFloat(elements.inpTopMargin.value) || 0;
        const bottomInches = parseFloat(elements.inpBottomMargin.value) || 0;
        const leftInches = parseFloat(elements.inpLeftMargin.value) || 0;
        const rightInches = parseFloat(elements.inpRightMargin.value) || 0;

        previewContainer.style.setProperty('--extra-top-margin', topInches + 'in');
        previewContainer.style.setProperty('--extra-bottom-margin', bottomInches + 'in');
        previewContainer.style.setProperty('--extra-left-margin', leftInches + 'in');
        previewContainer.style.setProperty('--extra-right-margin', rightInches + 'in');
        
        if (keepTopMargin) {
            previewContainer.classList.remove('flush-margins');
            previewContainer.style.padding = '0.5in';
            previewContainer.style.paddingTop = (0.5 + topInches) + 'in';
            previewContainer.style.paddingBottom = (0.5 + bottomInches) + 'in';
            previewContainer.style.paddingLeft = (0.5 + leftInches) + 'in';
            previewContainer.style.paddingRight = (0.5 + rightInches) + 'in';
        } else {
            previewContainer.classList.add('flush-margins');
            previewContainer.style.padding = '0';
        }

        if (isSli) {
            previewContainer.classList.add('is-sli');
            previewContainer.style.padding = '0.2in'; // override for SLI to fit on A4 screen
        } else {
            previewContainer.classList.remove('is-sli');
        }
        
        document.querySelectorAll('.inv-only').forEach(el => el.style.display = isPackingList ? 'none' : '');
        document.querySelectorAll('.pack-only').forEach(el => el.style.display = isPackingList ? '' : 'none');
    }
    
    // Init doc type view
    elements.prevDocType.textContent = elements.docType.value;
    
    let initMargin = docMargins[elements.docType.value];
    if (initMargin !== undefined) {
        if (typeof initMargin === 'string' || typeof initMargin === 'number') initMargin = { top: initMargin, bottom: 0, left: 0, right: 0 };
        elements.inpTopMargin.value = initMargin.top || 0;
        elements.inpBottomMargin.value = initMargin.bottom || 0;
        elements.inpLeftMargin.value = initMargin.left || 0;
        elements.inpRightMargin.value = initMargin.right || 0;
    }
    
    updateDocumentTypeView();


    bindInputToPreview(elements.invoiceNo, elements.prevInvoiceNo);
    bindInputToPreview(elements.date, elements.prevDate);
    bindInputToPreview(elements.date, elements.declDate);
    bindInputToPreview(elements.date, elements.annexDate);
    
    const updateAnnexInvDate = () => {
        if (elements.annexInvNoDate) {
            elements.annexInvNoDate.textContent = `${elements.invoiceNo.value} / ${elements.date.value}`;
        }
    };
    elements.invoiceNo.addEventListener('input', updateAnnexInvDate);
    elements.date.addEventListener('input', updateAnnexInvDate);
    updateAnnexInvDate();
    
    bindInputToPreview(elements.iec, elements.prevIec);
    bindInputToPreview(elements.consignee, elements.prevConsignee);
    bindInputToPreview(elements.consignee, elements.certConsignee);
    bindInputToPreview(elements.consignee, elements.labelConsignee);
    bindInputToPreview(elements.consigneePhone, elements.prevConsigneePhone);
    bindInputToPreview(elements.consigneePhone, elements.certConsigneePhone);
    bindInputToPreview(elements.consigneePhone, elements.labelConsigneePhone);
    bindInputToPreview(elements.buyer, elements.prevBuyer);
    bindInputToPreview(elements.pol, elements.prevPol);
    bindInputToPreview(elements.coo, elements.prevCoo);
    bindInputToPreview(elements.pod, elements.prevPod);
    bindInputToPreview(elements.destination, elements.prevDestCountry);
    bindInputToPreview(elements.destination, elements.prevDestination);
    bindInputToPreview(elements.destination, elements.certDestination);
    bindInputToPreview(elements.destination, elements.labelDestination);
    bindInputToPreview(elements.terms, elements.prevTerms);
    bindInputToPreview(elements.inpTotalPkgs, elements.certPkgs);
    
    // SLI Bindings
    if (elements.inpAwb) bindInputToPreview(elements.inpAwb, elements.sliAwb);
    if (elements.invoiceNo) bindInputToPreview(elements.invoiceNo, elements.sliInvoiceNo);
    if (elements.date) bindInputToPreview(elements.date, elements.sliDate);
    if (elements.consignee) bindInputToPreview(elements.consignee, elements.sliConsigneeName, val => val.split('\n')[0]);
    if (elements.inpTotalPkgs) bindInputToPreview(elements.inpTotalPkgs, elements.sliPkgs);

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
                    <td class="center-align border-t-0 border-b-0">${amount.toFixed(2)}</td>
                `;
            }
            elements.prevItemsBody.appendChild(tr);
        });

        elements.prevTotalAmount.textContent = `${currSymbol}${totalVal.toFixed(2)}`;
        
        // Update Totals
        if (isPackingList) {
            if (elements.prevTotalNet) elements.prevTotalNet.textContent = totalNet > 0 ? totalNet.toFixed(2) + ' kg' : '-';
            if (elements.prevTotalGross) elements.prevTotalGross.textContent = totalGross > 0 ? totalGross.toFixed(2) + ' kg' : '-';
        } else {
            const words = numberToWords(Math.floor(totalVal));
            const currencyName = getCurrencyName(curr);
            elements.prevTotalWords.textContent = `Total Payable Amount: ${currencyName} ${words} Only`;
        }

        // Update Certificate
        elements.certGrossWt.textContent = totalGross > 0 ? totalGross.toFixed(2) + ' kgs' : '';
        
        // Update SLI
        if (elements.sliNetWt) elements.sliNetWt.textContent = totalNet > 0 ? totalNet.toFixed(2) + ' kg' : '';
        if (elements.sliGrossWt) elements.sliGrossWt.textContent = totalGross > 0 ? totalGross.toFixed(2) + ' kg' : '';
        if (elements.sliValue) elements.sliValue.textContent = totalVal > 0 ? `${currSymbol}${totalVal.toFixed(2)}` : '';
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
            topMargin: elements.inpTopMargin.value,
            bottomMargin: elements.inpBottomMargin.value,
            leftMargin: elements.inpLeftMargin.value,
            rightMargin: elements.inpRightMargin.value,
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
        elements.inpTopMargin.value = inv.topMargin || '0';
        elements.inpBottomMargin.value = inv.bottomMargin || '0';
        elements.inpLeftMargin.value = inv.leftMargin || '0';
        elements.inpRightMargin.value = inv.rightMargin || '0';
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
        [elements.docType, elements.inpTopMargin, elements.inpBottomMargin, elements.inpLeftMargin, elements.inpRightMargin, elements.invoiceNo, elements.date, elements.iec, elements.exporterSelect, 
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

    document.getElementById('btn-export-all').addEventListener('click', async () => {
        const btn = document.getElementById('btn-export-all');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Preparing Print...';
        
        try {
            const originalDocType = elements.docType.value;
            const printContainer = document.getElementById('print-all-container');
            printContainer.innerHTML = ''; // clear previous
            
            // Add printing class to hide normal preview
            document.body.classList.add('printing-all');

            // Iterate over selected options
            const optionsToExport = Array.from(elements.docType.selectedOptions).length > 0 ? Array.from(elements.docType.selectedOptions) : Array.from(elements.docType.options);
            
            for (const option of optionsToExport) {
                elements.docType.value = option.value;
                elements.docType.dispatchEvent(new Event('change'));
                
                // wait for DOM to update and layout to settle
                await new Promise(r => setTimeout(r, 400));
                
                const isStatic = ['PAN', 'IEC', 'AD Code', 'LUT'].includes(option.value);
                
                if (isStatic) {
                    let staticId = '';
                    if (option.value === 'PAN') staticId = 'static-pan';
                    if (option.value === 'IEC') staticId = 'static-iec';
                    if (option.value === 'AD Code') staticId = 'static-adcode';
                    if (option.value === 'LUT') staticId = 'static-lut';
                    
                    const staticNode = document.getElementById(staticId).cloneNode(true);
                    staticNode.style.display = 'block';
                    printContainer.appendChild(staticNode);
                } else {
                    // Clone the dynamic document container
                    const containerClone = document.getElementById('invoice-preview-container').cloneNode(true);
                    containerClone.id = ''; // remove ID to avoid duplicates
                    
                    printContainer.appendChild(containerClone);
                }
            }

            // Trigger print dialog
            window.print();

            // Cleanup after print dialog closes (or blocks)
            document.body.classList.remove('printing-all');
            printContainer.innerHTML = '';

            // Restore original
            elements.docType.value = originalDocType;
            elements.docType.dispatchEvent(new Event('change'));
            
        } catch (error) {
            console.error(error);
            alert("Error preparing print.");
        } finally {
            btn.innerHTML = originalText;
            document.body.classList.remove('printing-all');
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
