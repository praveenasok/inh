document.addEventListener('DOMContentLoaded', () => {
    
    // DB Keys
    const DB_KEY = 'inhOrderListDB';
    const RATIO_MIXER_DB_KEY = 'hairRatioDB';
    const CLIENTS_DB_KEY = 'inhClientsDB';
    const PRODUCTS_DB_KEY = 'inhProductListsDB';

    let currentClientPricelist = "";
    let clientsDb = [];
    let productsDb = [];
    
    // Datalists Setup
    const datalistFields = [
        "ClientName", "OrderStatus", "Contact", "Country", "Currency", 
        "AssignedTo", "SalesPerson", "Length", "Product", "ProductType", 
        "Style", "Color", "Weight", "Comment"
    ];

    const datalistContainer = document.getElementById('datalist-container');

    // DOM Elements
    const itemsBody = document.getElementById('itemsBody');
    const addItemBtn = document.getElementById('addItemBtn');
    const orderForm = document.getElementById('orderForm');
    const totalAmountDisplay = document.getElementById('totalAmountDisplay');
    const resetBtn = document.getElementById('resetBtn');

    // Modals
    const successModal = document.getElementById('successModal');
    const successModalContent = document.getElementById('successModalContent');
    const modalAddAnotherBtn = document.getElementById('modalAddAnotherBtn');

    // Client Modal
    const clientModal = document.getElementById('clientModal');
    const clientModalContent = document.getElementById('clientModalContent');
    const manageClientBtn = document.getElementById('manageClientBtn');
    const closeClientModalBtn = document.getElementById('closeClientModalBtn');
    const cancelClientBtn = document.getElementById('cancelClientBtn');
    const clientForm = document.getElementById('clientForm');

    // Load Clients
    try {
        const cData = localStorage.getItem(CLIENTS_DB_KEY);
        if (cData) clientsDb = JSON.parse(cData);
    } catch(e) {}

    // Load Products Config
    try {
        const pData = localStorage.getItem(PRODUCTS_DB_KEY);
        if (pData) productsDb = JSON.parse(pData);
    } catch(e) {}

    // Load available price lists
    let availablePriceLists = [];
    try {
        const ratioData = localStorage.getItem(RATIO_MIXER_DB_KEY);
        if (ratioData) {
            const parsed = JSON.parse(ratioData);
            if (parsed && parsed.priceLists) {
                availablePriceLists = parsed.priceLists.map(pl => pl.name);
            }
        }
    } catch (e) {
        console.error("Failed to load Ratio Mixer price lists", e);
    }
    
    // Combine base material lists with Configured Product Lists
    if (productsDb && productsDb.length > 0) {
        productsDb.forEach(p => {
            const plName = p.priceListName || "Configured Products";
            if (!availablePriceLists.includes(plName)) {
                availablePriceLists.push(plName);
            }
        });
    }

    // Initialize Datalists from Order DB
    function populateDatalists() {
        datalistContainer.innerHTML = '';

        let savedData = null;
        try {
            savedData = JSON.parse(localStorage.getItem(DB_KEY));
        } catch(e) {}

        const dbRows = savedData && savedData.rows ? savedData.rows : [];

        // Simple mapping from safe name to actual Column Name
        const mapToCol = {
            "ClientName": "Client Name",
            "OrderStatus": "Order Status",
            "AssignedTo": "Assigned To",
            "SalesPerson": "Sales Person",
            "ProductType": "Product Type"
        };

        datalistFields.forEach(field => {
            const actualColName = mapToCol[field] || field;

            const datalist = document.createElement('datalist');
            datalist.id = 'list-' + field;
            
            const uniqueVals = new Set();
            dbRows.forEach(r => {
                if (r[actualColName] && typeof r[actualColName] === 'string' && r[actualColName].trim() !== '') {
                    uniqueVals.add(r[actualColName].trim());
                }
            });

            // Products will be handled dynamically per-row now, but we seed historical names
            if (field === "Product") {
                // Keep historical uniqueVals, don't auto-append all configs
            }

            Array.from(uniqueVals).sort().forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                datalist.appendChild(opt);
            });
            datalistContainer.appendChild(datalist);
        });

        // Price List Datalist
        const plList = document.getElementById('list-PriceList');
        if (plList) {
            plList.innerHTML = '';
            availablePriceLists.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl;
                plList.appendChild(opt);
            });
        }
    }

    // Build unique ID for items
    let itemIdCounter = 0;

    function renderItemRow() {
        itemIdCounter++;
        const tr = document.createElement('tr');
        tr.className = "border-b item-row group hover:bg-slate-50";
        tr.id = `item-row-${itemIdCounter}`;

        tr.innerHTML = `
            <td class="p-2">
                <input type="text" list="list-PriceList" class="form-control text-xs w-full min-w-[120px] i-pricelist" placeholder="List...">
            </td>
            <td class="p-2">
                <input type="text" list="list-Length" class="form-control text-xs w-full i-length" placeholder="Len...">
            </td>
            <td class="p-2 relative">
                <input type="text" list="list-Product-d-${itemIdCounter}" class="form-control text-xs w-full min-w-[100px] i-product" placeholder="Prod...">
                <datalist id="list-Product-d-${itemIdCounter}"></datalist>
            </td>
            <td class="p-2">
                <input type="text" list="list-ProductType" class="form-control text-xs w-full min-w-[100px] i-type" placeholder="Type...">
            </td>
            <td class="p-2">
                <input type="text" list="list-Style" class="form-control text-xs w-full min-w-[100px] i-style" placeholder="Style...">
            </td>
            <td class="p-2">
                <input type="text" list="list-Color" class="form-control text-xs w-full min-w-[100px] i-color" placeholder="Color...">
            </td>
            <td class="p-2 relative">
                <input type="number" step="any" list="list-Weight-d-${itemIdCounter}" class="form-control text-xs w-full i-weight" placeholder="Wt">
                <datalist id="list-Weight-d-${itemIdCounter}"></datalist>
            </td>
            <td class="p-2">
                <input type="number" step="any" class="form-control text-xs w-full i-qty" placeholder="0">
            </td>
            <td class="p-2">
                <input type="number" step="any" class="form-control text-xs w-full i-rate" placeholder="0.00">
            </td>
            <td class="p-2">
                <input type="number" step="any" class="form-control text-xs w-full bg-slate-50 i-amount" placeholder="0.00" readonly>
            </td>
            <td class="p-2">
                <input type="text" list="list-Comment" class="form-control text-xs w-full i-comment" placeholder="...">
            </td>
            <td class="p-2 text-center">
                <button type="button" class="text-red-400 hover:text-red-600 transition-colors remove-item-btn p-1 outline-none" title="Remove Row">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

        itemsBody.appendChild(tr);

        // Attach calc event listeners
        const qtyInput = tr.querySelector('.i-qty');
        const rateInput = tr.querySelector('.i-rate');
        const productInp = tr.querySelector('.i-product');
        const lengthInp = tr.querySelector('.i-length');
        const weightInp = tr.querySelector('.i-weight');
        const priceListInp = tr.querySelector('.i-pricelist');
        
        const calcAmount = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            const amountInput = tr.querySelector('.i-amount');
            amountInput.value = (qty * rate > 0) ? (qty * rate).toFixed(2) : "";
            calculateTotal();
        };

        const autoPriceCheck = () => {
            const prodName = productInp.value.trim();
            const len = lengthInp.value.replace(/[^0-9]/g, ''); // Extract purely digits e.g., '14"' -> '14'
            const wt = weightInp.value.trim();

            if (prodName && len && productsDb.length > 0) {
                const prod = productsDb.find(p => p.name.toLowerCase() === prodName.toLowerCase());
                
                if (prod && prod.finalPrices && prod.finalPrices[len]) {
                    // Update Weight Datalist
                    const wtDatalist = tr.querySelector(`#list-Weight-d-${tr.id.split('-').pop()}`);
                    const availWeights = Object.keys(prod.finalPrices[len]).sort((a,b)=>parseFloat(a)-parseFloat(b));
                    
                    if (wtDatalist) {
                        wtDatalist.innerHTML = '';
                        availWeights.forEach(w => {
                            const opt = document.createElement('option');
                            opt.value = w;
                            wtDatalist.appendChild(opt);
                        });
                    }

                    // Attempt exact match
                    if (wt && prod.finalPrices[len][wt]) {
                        rateInput.value = prod.finalPrices[len][wt].toFixed(2);
                        calcAmount();
                    } 
                    // Attempt closest float match if exact string match fails
                    else if (wt && availWeights.find(k => parseFloat(k) === parseFloat(wt))) {
                        const exactKey = availWeights.find(k => parseFloat(k) === parseFloat(wt));
                        rateInput.value = prod.finalPrices[len][exactKey].toFixed(2);
                        calcAmount();
                    }
                    // Proportional Scaling for Custom Unlisted Weights
                    else if (wt && parseFloat(wt) > 0 && availWeights.length > 0) {
                        // Prefer 100g as the ideal baseline, otherwise fallback to the first listed weight
                        const baseWtStr = availWeights.includes("100") ? "100" : availWeights[0];
                        const baseWtNum = parseFloat(baseWtStr);
                        const basePrice = parseFloat(prod.finalPrices[len][baseWtStr]);

                        // Per-gram price * target weight
                        const customScaledPrice = (basePrice / baseWtNum) * parseFloat(wt);
                        rateInput.value = customScaledPrice.toFixed(2);
                        calcAmount();
                    }
                    // Auto-fill solitary (No weight specified by user yet)
                    else if (!wt && availWeights.length === 1) {
                        weightInp.value = availWeights[0];
                        rateInput.value = prod.finalPrices[len][availWeights[0]].toFixed(2);
                        calcAmount();
                    }
                }
            }
        };

        const updateProductDatalist = () => {
            const prodListEl = tr.querySelector(`#list-Product-d-${tr.id.split('-').pop()}`);
            if (!prodListEl) return;
            prodListEl.innerHTML = '';
            
            const selectedPL = priceListInp.value.trim();
            let relevantProds = productsDb;
            
            if (selectedPL) {
                relevantProds = productsDb.filter(p => (p.priceListName || "Configured Products").toLowerCase() === selectedPL.toLowerCase());
            }

            const uniqueProds = [...new Set(relevantProds.map(p => p.name))].sort();
            uniqueProds.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                prodListEl.appendChild(opt);
            });
            
            // Re-trigger calc
            autoPriceCheck();
        };

        qtyInput.addEventListener('input', calcAmount);
        rateInput.addEventListener('input', calcAmount);
        productInp.addEventListener('change', autoPriceCheck);
        lengthInp.addEventListener('change', autoPriceCheck);
        weightInp.addEventListener('input', autoPriceCheck);
        priceListInp.addEventListener('change', updateProductDatalist);
        priceListInp.addEventListener('input', updateProductDatalist);

        // Initial setup for datalist
        updateProductDatalist();

        // Tab to create new row
        const commentInput = tr.querySelector('.i-comment');
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                // Check if this is the last row in the table
                const isLastRow = !tr.nextElementSibling;
                if (isLastRow) {
                    e.preventDefault();
                    renderItemRow();
                    // focus first input of the newly added row
                    const newRow = itemsBody.lastElementChild;
                    if (newRow) {
                        const firstInput = newRow.querySelector('.i-pricelist');
                        if (firstInput) firstInput.focus();
                    }
                }
            }
        });

        // Default Pricelist if Client defined
        const plInp = tr.querySelector('.i-pricelist');
        if (currentClientPricelist && !plInp.value) {
            plInp.value = currentClientPricelist;
        }

        // Remove btn
        tr.querySelector('.remove-item-btn').addEventListener('click', () => {
            tr.remove();
            calculateTotal();
        });
    }

    function calculateTotal() {
        let total = 0;
        document.querySelectorAll('.i-amount').forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            total += val;
        });
        totalAmountDisplay.textContent = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Submit Logic
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const orderNum = document.getElementById('h-order-num').value.trim();
        if (!orderNum) return alert('Order Number is required.');

        // Gather Header Data
        const headerData = {
            "Order Number": orderNum,
            "Order Date": document.getElementById('h-order-date').value,
            "Client Name": document.getElementById('h-client').value,
            "Order Status": document.getElementById('h-status').value,
            "Contact": document.getElementById('h-contact').value,
            "Country": document.getElementById('h-country').value,
            "Currency": document.getElementById('h-currency').value,
            "Exchange Rate": document.getElementById('h-ex-rate').value || "1",
            "Assigned To": document.getElementById('h-assigned').value,
            "Sales Person": document.getElementById('h-sales').value,
            "Delivered Date": document.getElementById('h-deliver-date').value
        };

        const exRate = parseFloat(headerData["Exchange Rate"]) || 1;

        // Gather Items Data
        const items = [];
        document.querySelectorAll('.item-row').forEach(tr => {
            const qty = tr.querySelector('.i-qty').value;
            const rate = tr.querySelector('.i-rate').value;
            const amt = parseFloat(tr.querySelector('.i-amount').value) || (parseFloat(qty||0) * parseFloat(rate||0)) || undefined;
            
            // Generate Base Amount if amt is populated
            const baseAmt = amt ? (amt / exRate).toFixed(2) : "";

            const itemData = {
                "Price List": tr.querySelector('.i-pricelist').value,
                "Length": tr.querySelector('.i-length').value,
                "Product": tr.querySelector('.i-product').value,
                "Product Type": tr.querySelector('.i-type').value,
                "Style": tr.querySelector('.i-style').value,
                "Color": tr.querySelector('.i-color').value,
                "Weight": tr.querySelector('.i-weight').value,
                "Quantity": qty,
                "Rate": rate,
                "Amount": amt ? amt.toFixed(2) : "",
                "Base Amount": baseAmt,
                "Comment": tr.querySelector('.i-comment').value
            };

            // Only add item if it has at least some actual content mapped
            const hasData = Object.values(itemData).some(v => v.trim() !== '');
            if (hasData) {
                items.push(itemData);
            }
        });

        // Assemble spreadsheet rows
        let finalRowsToInject = [];
        if (items.length === 0) {
            // Push just the header
            finalRowsToInject.push({ ...headerData });
        } else {
            // Explode header across all items
            items.forEach(item => {
                finalRowsToInject.push({ ...headerData, ...item });
            });
        }

        // Save to Database
        try {
            let dbData = JSON.parse(localStorage.getItem(DB_KEY));
            if (!dbData || !dbData.rows) {
                // Initialize if doesn't exist
                const defaultCols = [
                    "Order Date", "Order Status", "Delivered Date", "Order Number", 
                    "Client Name", "Contact", "Country", "Price List", "Length", 
                    "Product", "Product Type", "Style", "Color", "Weight", "Comment", 
                    "Quantity", "Currency", "Rate", "Amount", "Exchange Rate", 
                    "Base Amount", "Assigned To", "Sales Person"
                ];
                dbData = { columns: [...defaultCols], rows: [] };
            }

            // We push the new rows to the END of the spreadsheet
            dbData.rows = [...dbData.rows, ...finalRowsToInject];

            localStorage.setItem(DB_KEY, JSON.stringify(dbData));
            
            // Show Success UI
            showSuccessModal();

        } catch (err) {
            console.error(err);
            alert("Failed to save order to spreadsheet database.");
        }
    });

    // Resetting
    resetBtn.addEventListener('click', () => {
        if(confirm("Are you sure you want to clear the form?")) {
            orderForm.reset();
            itemsBody.innerHTML = '';
            document.getElementById('h-order-date').valueAsDate = new Date();
            renderItemRow(); // Start with 1 empty row
            calculateTotal();
        }
    });

    // Modal behavior
    function showSuccessModal() {
        successModal.classList.remove('hidden');
        // Trigger reflow for fade animation
        void successModal.offsetWidth;
        successModalContent.classList.remove('scale-95', 'opacity-0');
        successModalContent.classList.add('scale-100', 'opacity-100');
    }

    modalAddAnotherBtn.addEventListener('click', () => {
        successModalContent.classList.add('scale-95', 'opacity-0');
        successModalContent.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => {
            successModal.classList.add('hidden');
            // Hard reset the form for safety
            orderForm.reset();
            itemsBody.innerHTML = '';
            renderItemRow();
            document.getElementById('h-order-date').valueAsDate = new Date();
            // Optional: Increment Order Number slightly? 
            // Often left blank for safety
        }, 200);
    });

    // Client Modal Manager Logic
    function showClientModal() {
        clientForm.reset();
        const currentName = document.getElementById('h-client').value.trim();
        if (currentName) {
            document.getElementById('c-name').value = currentName;
            // Load if exists
            const existing = clientsDb.find(c => c.name.toLowerCase() === currentName.toLowerCase());
            if (existing) {
                document.getElementById('c-contact').value = existing.contact || "";
                document.getElementById('c-phone').value = existing.phone || "";
                document.getElementById('c-address').value = existing.address || "";
                document.getElementById('c-city').value = existing.city || "";
                document.getElementById('c-postal').value = existing.postal || "";
                document.getElementById('c-country').value = existing.country || "";
                document.getElementById('c-currency').value = existing.currency || "";
                document.getElementById('c-pricelist').value = existing.pricelist || "";
            }
        }
        clientModal.classList.remove('hidden');
        void clientModal.offsetWidth;
        clientModalContent.classList.remove('scale-95', 'opacity-0');
        clientModalContent.classList.add('scale-100', 'opacity-100');
    }

    function hideClientModal() {
        clientModalContent.classList.add('scale-95', 'opacity-0');
        clientModalContent.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => clientModal.classList.add('hidden'), 200);
    }

    manageClientBtn.addEventListener('click', showClientModal);
    closeClientModalBtn.addEventListener('click', hideClientModal);
    cancelClientBtn.addEventListener('click', hideClientModal);

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const clientData = {
            name: document.getElementById('c-name').value.trim(),
            contact: document.getElementById('c-contact').value.trim(),
            phone: document.getElementById('c-phone').value.trim(),
            address: document.getElementById('c-address').value.trim(),
            city: document.getElementById('c-city').value.trim(),
            postal: document.getElementById('c-postal').value.trim(),
            country: document.getElementById('c-country').value.trim(),
            currency: document.getElementById('c-currency').value.trim(),
            pricelist: document.getElementById('c-pricelist').value.trim(),
        };

        if (!clientData.name) return;

        const existIdx = clientsDb.findIndex(c => c.name.toLowerCase() === clientData.name.toLowerCase());
        if (existIdx >= 0) {
            clientsDb[existIdx] = clientData;
        } else {
            clientsDb.push(clientData);
        }

        localStorage.setItem(CLIENTS_DB_KEY, JSON.stringify(clientsDb));
        
        // Push back up to header
        document.getElementById('h-client').value = clientData.name;
        document.getElementById('h-client').dispatchEvent(new Event('change'));

        hideClientModal();
    });

    // Client Selection Handler
    document.getElementById('h-client').addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (!val) {
            currentClientPricelist = "";
            return;
        }

        const client = clientsDb.find(c => c.name.toLowerCase() === val.toLowerCase());
        if (client) {
            if (client.contact) document.getElementById('h-contact').value = client.contact;
            if (client.country) document.getElementById('h-country').value = client.country;
            if (client.currency) document.getElementById('h-currency').value = client.currency;
            if (client.pricelist) {
                currentClientPricelist = client.pricelist;
                // Auto fill empty item rows
                document.querySelectorAll('.i-pricelist').forEach(el => {
                    if(!el.value) el.value = currentClientPricelist;
                });
            }
        }
    });

    // Init Page setup
    addItemBtn.addEventListener('click', renderItemRow);
    populateDatalists();
    document.getElementById('h-order-date').valueAsDate = new Date();
    
    // Spawn 3 default rows to start
    renderItemRow();
    renderItemRow();
    renderItemRow();

});
