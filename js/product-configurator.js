document.addEventListener('DOMContentLoaded', () => {

    const RATIO_MIXER_DB_KEY = 'hairRatioDB';
    const PRODUCTS_DB_KEY = 'inhProductListsDB';

    // DOM Elements - Standard
    const baseSelect = document.getElementById('pc-base');
    const pcPriceList = document.getElementById('pc-pricelist');
    const pcName = document.getElementById('pc-name');
    const pcMargin = document.getElementById('pc-margin');
    const pcBaseWeight = document.getElementById('pc-base-weight');
    const pcProductWeights = document.getElementById('pc-product-weights');
    const pcWastage = document.getElementById('pc-wastage');
    const pcExtraLengthDir = document.getElementById('pc-extra-length-dir');
    const pcExtraLengthVal = document.getElementById('pc-extra-length-val');

    // Toggle Elements
    const typeStandardBtn = document.getElementById('type-standard-btn');
    const typeComboBtn = document.getElementById('type-combo-btn');
    const standardConfigGroup = document.getElementById('standard-config-group');
    const comboConfigGroup = document.getElementById('combo-config-group');
    const comboComponentsBox = document.getElementById('combo-components-box');

    // DOM Elements - Combo
    const ccBase = document.getElementById('cc-base');
    const ccBaseUnit = document.getElementById('cc-base-unit');
    const ccBaseQty = document.getElementById('cc-base-qty');
    const ccBaseConfigRow = document.getElementById('cc-base-config-row');
    const ccBaseDir = document.getElementById('cc-base-dir');
    const ccBaseOffset = document.getElementById('cc-base-offset');
    const componentsContainer = document.getElementById('componentsContainer');
    const addComponentBtn = document.getElementById('addComponentBtn');
    const emptyComponentsMsg = document.getElementById('emptyComponentsMsg');

    // DOM Elements - Shared
    const lengthsContainerWrapper = document.getElementById('lengthsContainerWrapper');
    const lengthsCheckboxContainer = document.getElementById('lengthsCheckboxContainer');
    const specsContainer = document.getElementById('specsContainer');
    const addSpecBtn = document.getElementById('addSpecBtn');
    const emptySpecsMsg = document.getElementById('emptySpecsMsg');
    const priceOutputBody = document.getElementById('priceOutputBody');
    const currencyDisplay = document.getElementById('currencyDisplay');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const viewSavedBtn = document.getElementById('viewSavedBtn');

    // Modal Elements
    const savedProductsModal = document.getElementById('savedProductsModal');
    const savedProductsModalContent = document.getElementById('savedProductsModalContent');
    const closeSavedModalBtn = document.getElementById('closeSavedModalBtn');
    const closeSavedModalBtnBottom = document.getElementById('closeSavedModalBtnBottom');
    const savedProductsList = document.getElementById('savedProductsList');

    // Constants from Ratio Mixer
    const RAW_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    const FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

    // State Variables
    let configMode = 'standard'; // 'standard' or 'combo'
    let rawPriceLists = [];      // For standard mode
    let savedProducts = [];      // For combo mode

    let selectedBase = null;     // Standard mode base 
    let selectedComboBase = null;// Combo mode base product

    let specifications = [];     // Shared specs
    let extraComponents = [];    // Combo extra parts

    // Load available price lists
    try {
        const ratioData = localStorage.getItem(RATIO_MIXER_DB_KEY);
        if (ratioData) {
            const parsed = JSON.parse(ratioData);
            if (parsed && parsed.priceLists) {
                rawPriceLists = parsed.priceLists;
            }
        }
    } catch (e) {
        console.error("Failed to load Ratio Mixer price lists", e);
    }

    try {
        const existingData = localStorage.getItem(PRODUCTS_DB_KEY);
        if (existingData) {
            savedProducts = JSON.parse(existingData);
        }
    } catch (e) {
        console.error("Failed to load products", e);
    }

    // Populate Base Price List Dropdown (Standard)
    function populateBaseRawSelect() {
        const currentVal = baseSelect.value;
        baseSelect.innerHTML = '<option value="">Select a Ratio Mixer Price List...</option>';
        rawPriceLists.forEach((pl, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${pl.name} (${pl.currency || 'INR'})`;
            baseSelect.appendChild(opt);
        });
        if (currentVal !== "") baseSelect.value = currentVal;
    }

    // Populate Datalist & Combo Base Select
    function populateComboBaseSelect() {
        const currentVal = ccBase.value;
        ccBase.innerHTML = '<option value="">Select a Saved Product...</option>';

        if (savedProducts.length > 0) {
            const plNames = [...new Set(savedProducts.map(p => p.priceListName || p.name))];
            const datalist = document.getElementById('existing-pricelists');
            if (datalist) {
                datalist.innerHTML = '';
                plNames.forEach(pln => {
                    const opt = document.createElement('option');
                    opt.value = pln;
                    datalist.appendChild(opt);
                });
            }

            savedProducts.forEach((prod, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${prod.name} (PL: ${prod.priceListName || 'N/A'}) - ${prod.currency}`;
                ccBase.appendChild(opt);
            });

            if (currentVal !== "" && ccBase.options[currentVal]) {
                ccBase.value = currentVal;
            }
        }
    }

    populateBaseRawSelect();
    populateComboBaseSelect();

    // Toggle Logic
    function switchMode(mode) {
        configMode = mode;
        if (mode === 'standard') {
            typeStandardBtn.className = "flex-1 py-1.5 text-sm font-semibold rounded shadow-sm bg-white text-blue-600 transition-colors";
            typeComboBtn.className = "flex-1 py-1.5 text-sm font-semibold rounded text-slate-500 hover:text-slate-700 transition-colors";
            standardConfigGroup.classList.remove('hidden');
            comboConfigGroup.classList.add('hidden');
            comboComponentsBox.classList.add('hidden');
            document.getElementById('priceOutputHeader').innerHTML = `
                <th class="p-3 border-b border-r bg-slate-50 text-slate-600 font-semibold sticky left-0 z-20">Len & Wt</th>
                <th class="p-3 border-b text-slate-500 font-medium whitespace-nowrap">Raw Cost</th>
                <th class="p-3 border-b text-slate-500 font-medium whitespace-nowrap">Specs Total</th>
                <th class="p-3 border-b text-slate-500 font-medium whitespace-nowrap">Product Cost</th>
                <th class="p-3 border-b text-indigo-600 font-bold whitespace-nowrap bg-indigo-50/50">Final Sale Price</th>
            `;

            // Sync selection state
            const baseVal = baseSelect.value;
            selectedBase = baseVal !== "" ? rawPriceLists[baseVal] : null;

            if (selectedBase) {
                lengthsContainerWrapper.classList.remove('hidden');
                renderStandardLengths();
            } else {
                lengthsContainerWrapper.classList.add('hidden');
            }
            calculatePrices();
        } else {
            typeComboBtn.className = "flex-1 py-1.5 text-sm font-semibold rounded shadow-sm bg-white text-purple-600 transition-colors";
            typeStandardBtn.className = "flex-1 py-1.5 text-sm font-semibold rounded text-slate-500 hover:text-slate-700 transition-colors";
            standardConfigGroup.classList.add('hidden');
            comboConfigGroup.classList.remove('hidden');
            comboComponentsBox.classList.remove('hidden');
            document.getElementById('priceOutputHeader').innerHTML = `
                <th class="p-3 border-b border-r bg-slate-50 text-slate-600 font-semibold sticky left-0 z-20">Master Len & Wt</th>
                <th class="p-3 border-b text-slate-500 font-medium whitespace-nowrap min-w-[200px]">Component Breakdown Cost</th>
                <th class="p-3 border-b text-slate-500 font-medium whitespace-nowrap">Assembly Total</th>
                <th class="p-3 border-b text-purple-600 font-bold whitespace-nowrap bg-purple-50/50">Final Sale Price</th>
            `;

            // Sync selection state
            const comboBaseVal = ccBase.value;
            if (comboBaseVal !== "") {
                selectedComboBase = savedProducts[comboBaseVal];
                ccBaseConfigRow.classList.remove('hidden');
                populateUnitSelect(selectedComboBase, ccBaseUnit);
            } else {
                selectedComboBase = null;
                ccBaseConfigRow.classList.add('hidden');
            }

            if (selectedComboBase) {
                lengthsContainerWrapper.classList.remove('hidden');
                renderComboLengths();
            } else {
                lengthsContainerWrapper.classList.add('hidden');
            }
            calculatePrices();
        }
    }

    typeStandardBtn.addEventListener('click', () => switchMode('standard'));
    typeComboBtn.addEventListener('click', () => switchMode('combo'));

    // Initialize UI on load
    switchMode('standard');

    // --- Standard Mode Logic ---
    function getBaseLengthCost(finLenStr) {
        if (!selectedBase) return 0;

        // 1. Direct Override
        if (selectedBase.customPricesEnabled && selectedBase.customPrices && selectedBase.customPrices[finLenStr]) {
            return parseFloat(selectedBase.customPrices[finLenStr]);
        }

        const dir = pcExtraLengthDir ? pcExtraLengthDir.value : '+';
        const val = pcExtraLengthVal ? parseInt(pcExtraLengthVal.value) || 0 : 0;
        const extraOffset = dir === '+' ? val : -val;

        let targetLen = parseInt(finLenStr) + extraOffset;
        const colIdx = FINISHED_LENGTHS.indexOf(targetLen);
        if (colIdx === -1) return 0;

        const colData = selectedBase.matrix[colIdx] || {};
        let totalPercent = 0;
        let weightedRawCost = 0;

        RAW_LENGTHS.forEach(rawLen => {
            const percent = parseFloat(colData[rawLen]) || 0;
            const price = parseFloat(selectedBase.prices ? selectedBase.prices[rawLen] : 0) || 0;
            totalPercent += percent;
            weightedRawCost += (percent / 100) * price;
        });

        if (Math.abs(totalPercent - 100) > 0.1 || totalPercent === 0) return 0;

        let currentCost = weightedRawCost + (weightedRawCost * ((parseFloat(selectedBase.wastagePercent) || 0) / 100));
        currentCost += (parseFloat(selectedBase.machineCharge) || 0);

        if ((parseFloat(selectedBase.weftingWastagePercent) || 0) > 0) {
            currentCost += currentCost * ((parseFloat(selectedBase.weftingWastagePercent) || 0) / 100);
            currentCost += (parseFloat(selectedBase.weftingCharge) || 0);
        }

        currentCost += currentCost * ((parseFloat(selectedBase.marginPercent) || 0) / 100);
        const roundedPrice = Math.round(currentCost / 50) * 50;
        return Math.round(roundedPrice * (parseFloat(selectedBase.exchangeRate) || 1));
    }

    function renderStandardLengths() {
        lengthsCheckboxContainer.innerHTML = '';
        if (!selectedBase) return;

        let validLengths = new Set(FINISHED_LENGTHS.map(String));
        if (selectedBase.customPricesEnabled && selectedBase.customPrices) {
            Object.keys(selectedBase.customPrices).forEach(k => validLengths.add(k));
        }

        let lengths = Array.from(validLengths).sort((a, b) => parseInt(a) - parseInt(b));

        lengths.forEach(len => {
            if (getBaseLengthCost(len) <= 0) return;

            const label = document.createElement('label');
            label.className = "flex items-center gap-1 text-sm bg-white border border-slate-200 px-2 py-1 rounded cursor-pointer hover:bg-slate-50";
            label.innerHTML = `<input type="checkbox" class="len-cb accent-blue-600" value="${len}" checked> <span>${len}"</span>`;
            label.querySelector('input').addEventListener('change', calculatePrices);
            lengthsCheckboxContainer.appendChild(label);
        });
    }

    baseSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === "") {
            selectedBase = null;
            lengthsContainerWrapper.classList.add('hidden');
        } else {
            selectedBase = rawPriceLists[val];
            if (configMode === 'standard') {
                lengthsContainerWrapper.classList.remove('hidden');
                renderStandardLengths();
            }
        }
        calculatePrices();
    });

    const triggerUpdate = () => {
        if (configMode === 'standard') renderStandardLengths();
        calculatePrices();
    }
    if (pcExtraLengthDir) pcExtraLengthDir.addEventListener('change', triggerUpdate);
    if (pcExtraLengthVal) pcExtraLengthVal.addEventListener('change', triggerUpdate);


    // --- Combo Mode Logic ---
    ccBase.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === "") {
            selectedComboBase = null;
            ccBaseConfigRow.classList.add('hidden');
            if (configMode === 'combo') lengthsContainerWrapper.classList.add('hidden');
        } else {
            selectedComboBase = savedProducts[val];
            ccBaseConfigRow.classList.remove('hidden');
            populateUnitSelect(selectedComboBase, ccBaseUnit);
            if (configMode === 'combo') {
                lengthsContainerWrapper.classList.remove('hidden');
                renderComboLengths();
            }
        }
        calculatePrices();
    });

    ccBaseUnit.addEventListener('change', calculatePrices);
    ccBaseQty.addEventListener('input', calculatePrices);
    ccBaseDir.addEventListener('change', calculatePrices);
    ccBaseOffset.addEventListener('change', calculatePrices);

    function populateUnitSelect(product, selectElement) {
        selectElement.innerHTML = '';
        if (!product || !product.finalPrices) return;

        let units = new Set();
        Object.values(product.finalPrices).forEach(wtObj => {
            Object.keys(wtObj).forEach(wt => units.add(wt));
        });

        const sortedUnits = Array.from(units).sort((a, b) => parseFloat(a) - parseFloat(b));
        sortedUnits.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = `${u}g / item`;
            selectElement.appendChild(opt);
        });
    }

    function renderComboLengths() {
        lengthsCheckboxContainer.innerHTML = '';
        if (!selectedComboBase) return;

        const lengths = Object.keys(selectedComboBase.finalPrices).sort((a, b) => parseInt(a) - parseInt(b));

        lengths.forEach(len => {
            const label = document.createElement('label');
            label.className = "flex items-center gap-1 text-sm bg-white border border-slate-200 px-2 py-1 rounded cursor-pointer hover:bg-slate-50";
            label.innerHTML = `<input type="checkbox" class="base-len-cb accent-purple-600" value="${len}" checked> <span>${len}"</span>`;
            label.querySelector('input').addEventListener('change', calculatePrices);
            lengthsCheckboxContainer.appendChild(label);
        });
    }

    // Extra Components
    function renderExtraComponents() {
        emptyComponentsMsg.style.display = extraComponents.length === 0 ? 'block' : 'none';
        componentsContainer.innerHTML = '';

        extraComponents.forEach((comp, idx) => {
            const div = document.createElement('div');
            div.className = "bg-white p-3 rounded border border-slate-200 shadow-sm";

            const header = document.createElement('div');
            header.className = "flex justify-between items-center mb-2";
            header.innerHTML = `<h4 class="text-xs font-bold text-slate-600 uppercase">Extra Component ${idx + 1}</h4>`;

            const delBtn = document.createElement('button');
            delBtn.className = "text-red-400 hover:text-red-600 p-1";
            delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            delBtn.onclick = () => {
                extraComponents.splice(idx, 1);
                renderExtraComponents();
                calculatePrices();
            };
            header.appendChild(delBtn);
            div.appendChild(header);

            const selectRow = document.createElement('div');
            selectRow.className = "mb-2";
            const pSelect = document.createElement('select');
            pSelect.className = "w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-purple-500 comp-product";
            pSelect.innerHTML = '<option value="">-- Choose Product --</option>';
            savedProducts.forEach((p, pIdx) => {
                const opt = document.createElement('option');
                opt.value = pIdx;
                opt.textContent = `${p.name}`;
                if (comp.productIndex == pIdx) opt.selected = true;
                pSelect.appendChild(opt);
            });
            selectRow.appendChild(pSelect);
            div.appendChild(selectRow);

            const gridRow = document.createElement('div');
            gridRow.className = "grid grid-cols-3 gap-2";

            gridRow.innerHTML += `
                <div>
                    <label class="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Length Offset</label>
                    <div class="flex">
                        <select class="w-1/2 px-1 py-1 border border-r-0 border-slate-300 rounded-l text-xs outline-none comp-dir">
                            <option value="+" ${comp.offsetDir === '+' ? 'selected' : ''}>+</option>
                            <option value="-" ${comp.offsetDir === '-' ? 'selected' : ''}>-</option>
                        </select>
                        <select class="w-1/2 px-1 py-1 border border-slate-300 rounded-r text-xs outline-none comp-offset">
                            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map(n => `<option value="${n}" ${comp.offsetVal == n ? 'selected' : ''}>${n}"</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;

            const unitDiv = document.createElement('div');
            unitDiv.innerHTML = `<label class="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Saved Unit</label>`;
            const unitSelect = document.createElement('select');
            unitSelect.className = "w-full px-2 py-1 border border-slate-300 rounded text-xs outline-none comp-unit";
            populateUnitSelect(savedProducts[comp.productIndex], unitSelect);
            if (comp.unit) unitSelect.value = comp.unit;
            unitDiv.appendChild(unitSelect);
            gridRow.appendChild(unitDiv);

            gridRow.innerHTML += `
                <div>
                    <label class="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Quantity</label>
                    <input type="number" step="any" class="w-full px-2 py-1 border border-slate-300 rounded text-xs outline-none comp-qty" value="${comp.quantity}">
                </div>
            `;

            div.appendChild(gridRow);
            componentsContainer.appendChild(div);

            pSelect.addEventListener('change', (e) => {
                comp.productIndex = e.target.value;
                comp.product = savedProducts[comp.productIndex];
                populateUnitSelect(comp.product, unitSelect);
                comp.unit = unitSelect.value;
                calculatePrices();
            });

            const dirSelect = gridRow.querySelector('.comp-dir');
            const offsetSelect = gridRow.querySelector('.comp-offset');
            const qtyInput = gridRow.querySelector('.comp-qty');

            const updateComp = () => {
                comp.offsetDir = dirSelect.value;
                comp.offsetVal = parseInt(offsetSelect.value) || 0;
                comp.unit = unitSelect.value;
                comp.quantity = parseFloat(qtyInput.value) || 0;
                calculatePrices();
            };

            dirSelect.addEventListener('change', updateComp);
            offsetSelect.addEventListener('change', updateComp);
            unitSelect.addEventListener('change', updateComp);
            qtyInput.addEventListener('input', updateComp);
        });
    }

    addComponentBtn.addEventListener('click', () => {
        extraComponents.push({
            productIndex: "",
            product: null,
            offsetDir: '-',
            offsetVal: 0,
            unit: "",
            quantity: 1
        });
        renderExtraComponents();
    });

    // --- Specs Logic (Shared) ---
    function renderSpecs() {
        emptySpecsMsg.style.display = specifications.length === 0 ? 'block' : 'none';
        specsContainer.innerHTML = '';
        specifications.forEach((spec, idx) => {
            const div = document.createElement('div');
            div.className = "flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200";

            div.innerHTML = `
                <input type="text" class="px-2 py-1 text-sm border rounded outline-none focus:border-blue-400 flex-grow s-name" placeholder="Spec Name..." value="${spec.name}">
                <select class="px-2 py-1 text-sm border rounded outline-none focus:border-blue-400 s-type">
                    <option value="fixed" ${spec.type === 'fixed' ? 'selected' : ''}>Fixed Amt (+)</option>
                    <option value="percent" ${spec.type === 'percent' ? 'selected' : ''}>Pct of Base (+%)</option>
                </select>
                <input type="number" step="any" class="px-2 py-1 text-sm border rounded outline-none w-20 text-right focus:border-blue-400 s-val" placeholder="0" value="${spec.value}">
                <button type="button" class="text-red-400 hover:text-red-600 p-1 remove-spec">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;

            specsContainer.appendChild(div);

            const sName = div.querySelector('.s-name');
            const sType = div.querySelector('.s-type');
            const sVal = div.querySelector('.s-val');

            const updateField = () => {
                specifications[idx].name = sName.value;
                specifications[idx].type = sType.value;
                specifications[idx].value = parseFloat(sVal.value) || 0;
                calculatePrices();
            };

            sName.addEventListener('input', updateField);
            sType.addEventListener('change', updateField);
            sVal.addEventListener('input', updateField);

            div.querySelector('.remove-spec').addEventListener('click', () => {
                specifications.splice(idx, 1);
                renderSpecs();
                calculatePrices();
            });
        });
    }

    addSpecBtn.addEventListener('click', () => {
        specifications.push({ name: '', type: 'fixed', value: 0 });
        renderSpecs();
    });

    renderSpecs();

    // Inputs bindings
    pcWastage.addEventListener('input', calculatePrices);
    pcMargin.addEventListener('input', calculatePrices);
    pcBaseWeight.addEventListener('input', calculatePrices);
    pcProductWeights.addEventListener('input', calculatePrices);

    // --- Master Calculate Route ---
    function calculatePrices() {
        if (configMode === 'standard') {
            calculateStandardPrices();
        } else {
            calculateComboPrices();
        }
    }

    function calculateStandardPrices() {
        console.log("CALC STD START");
        if (!selectedBase) {
            console.log("No selectedBase found.");
            priceOutputBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">Select a Base Raw Material to calculate prices.</td></tr>`;
            currencyDisplay.textContent = `Currency: -`;
            return;
        }

        const wastage = parseFloat(pcWastage.value) || 0;
        const margin = parseFloat(pcMargin.value) || 0;
        const cur = selectedBase.currency || '-';
        currencyDisplay.textContent = `Currency: ${cur}`;

        const baseWeight = parseFloat(pcBaseWeight.value) || 1000;
        const weightsStr = pcProductWeights.value || "";
        const targetWeights = weightsStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);

        console.log("Target Weights: ", targetWeights);
        if (targetWeights.length === 0) {
            console.log("Target weights empty");
            priceOutputBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">Please provide valid product weights (e.g., 100).</td></tr>`;
            return;
        }

        const selectedLenCbs = Array.from(lengthsCheckboxContainer.querySelectorAll('.len-cb:checked')).map(cb => cb.value);
        console.log("Selected Length Cbs: ", selectedLenCbs);
        if (selectedLenCbs.length === 0) {
            console.log("Len Cbs empty");
            priceOutputBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">Please select at least one length.</td></tr>`;
            return;
        }

        priceOutputBody.innerHTML = '';
        let validRows = false;

        selectedLenCbs.forEach(len => {
            const bCostRaw = getBaseLengthCost(len);
            if (bCostRaw <= 0) return;

            validRows = true;

            targetWeights.forEach(tWeight => {
                const scaledBaseCost = (bCostRaw / baseWeight) * tWeight;

                let specCost = 0;
                specifications.forEach(spec => {
                    if (spec.type === 'fixed') {
                        specCost += spec.value;
                    } else if (spec.type === 'percent') {
                        specCost += (scaledBaseCost * (spec.value / 100));
                    }
                });

                const totalCost = scaledBaseCost + specCost;
                const costWithWastage = totalCost + (totalCost * (wastage / 100));

                let finalSalePrice = costWithWastage + (costWithWastage * (margin / 100));
                finalSalePrice = Math.round(finalSalePrice / 100) * 100;

                const dir = pcExtraLengthDir ? pcExtraLengthDir.value : '+';
                const val = pcExtraLengthVal ? parseInt(pcExtraLengthVal.value) || 0 : 0;
                const lengthOffset = dir === '+' ? val : -val;

                let extraLabel = '';
                if (lengthOffset > 0) {
                    extraLabel = ` <span class="text-xs text-orange-500 font-normal ml-1">(Uses +${lengthOffset}" Raw)</span>`;
                } else if (lengthOffset < 0) {
                    extraLabel = ` <span class="text-xs text-emerald-600 font-normal ml-1">(Uses ${lengthOffset}" Raw)</span>`;
                }

                const tr = document.createElement('tr');
                tr.dataset.len = len;
                tr.dataset.wt = tWeight;
                tr.dataset.final = finalSalePrice;

                tr.innerHTML = `
                    <td class="p-3 border-b border-r bg-slate-50 font-bold text-slate-700 sticky left-0 z-20 whitespace-nowrap">${len}" - ${tWeight}g ${extraLabel}</td>
                    <td class="p-3 border-b text-slate-600">${scaledBaseCost.toFixed(2)}</td>
                    <td class="p-3 border-b text-orange-600">+${specCost.toFixed(2)}</td>
                    <td class="p-3 border-b text-slate-800 font-semibold">${costWithWastage.toFixed(2)} <span class="text-xs font-normal text-slate-500">(${totalCost.toFixed(2)} + ${wastage}%)</span></td>
                    <td class="p-3 border-b text-indigo-700 font-bold bg-indigo-50/50">${finalSalePrice.toFixed(2)}</td>
                `;
                priceOutputBody.appendChild(tr);
            });
        });

        if (!validRows) {
            console.log("No valid rows rendered.");
            priceOutputBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">Base Raw Material has no valid length costs for the selected lengths.</td></tr>`;
        }
        console.log("CALC STD DONE");
    }

    function calculateComboPrices() {
        priceOutputBody.innerHTML = '';
        if (!selectedComboBase) {
            priceOutputBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400">Select a Base Product to begin calculating the combo.</td></tr>`;
            currencyDisplay.textContent = `Currency: -`;
            return;
        }

        const wastage = parseFloat(pcWastage.value) || 0;
        const margin = parseFloat(pcMargin.value) || 0;
        currencyDisplay.textContent = `Currency: ${selectedComboBase.currency}`;

        const weightsStr = pcProductWeights.value || "";
        const targetComboWeights = weightsStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);

        if (targetComboWeights.length === 0) {
            priceOutputBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Please provide valid combo weights.</td></tr>`;
            return;
        }

        const selectedLenCbs = Array.from(lengthsCheckboxContainer.querySelectorAll('.base-len-cb:checked')).map(cb => cb.value);
        if (selectedLenCbs.length === 0) {
            priceOutputBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Please select at least one master length.</td></tr>`;
            return;
        }

        const bUnit = ccBaseUnit.value;
        const bQty = parseFloat(ccBaseQty.value) || 1;
        const bDir = ccBaseDir.value;
        const bOffset = parseInt(ccBaseOffset.value) || 0;

        selectedLenCbs.forEach(lenStr => {
            let baseItemCost = 0;
            const reqBaseLenNum = bDir === '+' ? parseInt(lenStr) + bOffset : parseInt(lenStr) - bOffset;
            const reqBaseLenStr = reqBaseLenNum.toString();

            if (selectedComboBase.finalPrices[reqBaseLenStr] && selectedComboBase.finalPrices[reqBaseLenStr][bUnit]) {
                baseItemCost = selectedComboBase.finalPrices[reqBaseLenStr][bUnit];
            }
            if (baseItemCost <= 0) return;

            const totalBaseCost = baseItemCost * bQty;

            let breakdownHTML = `<div class="text-xs text-slate-600 space-y-1">`;
            const offsetLabel = bOffset > 0 ? ` (Req Len: ${reqBaseLenStr}")` : '';
            breakdownHTML += `<div><strong>Base:</strong> ${selectedComboBase.name} (Len: ${lenStr}"${offsetLabel}, Qty: ${bQty}x${bUnit}g) = <strong>${totalBaseCost.toFixed(2)}</strong></div>`;

            let extraComponentsCostTotal = 0;
            extraComponents.forEach(comp => {
                if (!comp.product) return;

                const reqLenNum = comp.offsetDir === '+' ? parseInt(lenStr) + comp.offsetVal : parseInt(lenStr) - comp.offsetVal;
                const reqLenStr = reqLenNum.toString();

                let compItemCost = 0;
                if (comp.product.finalPrices[reqLenStr] && comp.product.finalPrices[reqLenStr][comp.unit]) {
                    compItemCost = comp.product.finalPrices[reqLenStr][comp.unit];
                }

                if (compItemCost > 0) {
                    const compTotal = compItemCost * comp.quantity;
                    extraComponentsCostTotal += compTotal;
                    breakdownHTML += `<div class="text-[10px]"><strong>+</strong> ${comp.product.name} (Len: ${reqLenStr}", Qty: ${comp.quantity}x${comp.unit}) = <strong>${compTotal.toFixed(2)}</strong></div>`;
                } else {
                    breakdownHTML += `<div class="text-[10px] text-red-500"><strong>!</strong> ${comp.product.name} (Len: ${reqLenStr}" not found) = <strong>0</strong></div>`;
                }
            });
            breakdownHTML += `</div>`;

            const sumOfComponents = totalBaseCost + extraComponentsCostTotal;

            // In combo mode, percentage specs are applied to the sumOfComponents
            let specCost = 0;
            specifications.forEach(spec => {
                if (spec.type === 'fixed') {
                    specCost += spec.value;
                } else if (spec.type === 'percent') {
                    specCost += (sumOfComponents * (spec.value / 100));
                }
            });

            const totalCost = sumOfComponents + specCost;
            const costWithWastage = totalCost + (totalCost * (wastage / 100));

            let finalSalePrice = costWithWastage + (costWithWastage * (margin / 100));
            finalSalePrice = Math.round(finalSalePrice / 100) * 100;

            targetComboWeights.forEach(tWeight => {
                const tr = document.createElement('tr');
                tr.dataset.len = lenStr;
                tr.dataset.wt = tWeight;
                tr.dataset.final = finalSalePrice;

                tr.innerHTML = `
                    <td class="p-3 border-b border-r bg-slate-50 font-bold text-slate-700 sticky left-0 z-20 whitespace-nowrap">${lenStr}" - ${tWeight}g Combo</td>
                    <td class="p-3 border-b">${breakdownHTML}</td>
                    <td class="p-3 border-b text-slate-800 font-semibold">${costWithWastage.toFixed(2)} <span class="text-xs font-normal text-slate-500">Mtrl: ${sumOfComponents.toFixed(2)} | Spec: +${specCost.toFixed(2)} | Wastage: +${wastage}%</span></td>
                    <td class="p-3 border-b text-purple-700 font-bold bg-purple-50/50">${finalSalePrice.toFixed(2)}</td>
                `;
                priceOutputBody.appendChild(tr);
                validRows = true;
            });
        });

        if (!validRows) {
            priceOutputBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500 italic">No matching products found for the selected base + offset. Check if the required lengths exist in the base product.</td></tr>`;
        }
    }

    // --- Save Product Handler ---
    saveProductBtn.addEventListener('click', () => {
        const plName = pcPriceList.value.trim();
        const name = pcName.value.trim();
        if (!plName) return alert("Please provide a Target Price List Name.");
        if (!name) return alert("Please provide a Product Name.");

        if (configMode === 'standard' && !selectedBase) return alert("Please select a Base Raw Material Price List.");
        if (configMode === 'combo' && !selectedComboBase) return alert("Please select a Combo Base Product.");

        let finalPrices = {};
        const rows = priceOutputBody.querySelectorAll('tr');
        rows.forEach(tr => {
            if (tr.dataset.len && tr.dataset.wt) {
                const len = tr.dataset.len;
                const wt = tr.dataset.wt;
                const val = parseFloat(tr.dataset.final);
                if (!finalPrices[len]) finalPrices[len] = {};
                finalPrices[len][wt] = val;
            }
        });

        if (Object.keys(finalPrices).length === 0) {
            return alert("No valid prices to save.");
        }

        let productConfig = {
            id: 'PROD-' + Date.now(),
            priceListName: plName,
            name: name,
            targetWeightsStr: pcProductWeights.value || "",
            baseWeight: parseFloat(pcBaseWeight.value) || 1000,
            wastagePercent: parseFloat(pcWastage.value) || 0,
            margin: parseFloat(pcMargin.value) || 0,
            specifications: JSON.parse(JSON.stringify(specifications)),
            finalPrices: finalPrices,
            created: new Date().toISOString()
        };

        if (configMode === 'standard') {
            const dir = pcExtraLengthDir ? pcExtraLengthDir.value : '+';
            const val = pcExtraLengthVal ? parseInt(pcExtraLengthVal.value) || 0 : 0;
            const lengthOffset = dir === '+' ? val : -val;

            productConfig.isCombo = false;
            productConfig.baseList = selectedBase.name;
            productConfig.currency = selectedBase.currency || 'INR';
            productConfig.extraLength = lengthOffset;
        } else {
            const compsData = extraComponents.map(c => ({
                baseProductName: c.product ? c.product.name : 'Unknown',
                offset: (c.offsetDir === '+' ? 1 : -1) * c.offsetVal,
                quantity: c.quantity,
                unit: c.unit
            }));

            productConfig.isCombo = true;
            productConfig.baseList = selectedComboBase.name;
            productConfig.comboBaseUnit = ccBaseUnit.value;
            productConfig.comboBaseQty = parseFloat(ccBaseQty.value) || 1;
            productConfig.comboBaseDir = ccBaseDir.value;
            productConfig.comboBaseOffset = parseInt(ccBaseOffset.value) || 0;
            productConfig.comboComponents = compsData;
            productConfig.currency = selectedComboBase.currency || 'INR';
        }

        try {
            let dbProducts = [];
            const existingRaw = localStorage.getItem(PRODUCTS_DB_KEY);
            if (existingRaw) dbProducts = JSON.parse(existingRaw);

            const exIdx = dbProducts.findIndex(p => p.name === name && (p.priceListName === plName || !p.priceListName));
            if (exIdx >= 0) dbProducts[exIdx] = productConfig;
            else dbProducts.push(productConfig);

            localStorage.setItem(PRODUCTS_DB_KEY, JSON.stringify(dbProducts));

            // Overwrite memory
            savedProducts = dbProducts;

            // Refresh dropdowns so the new product is available for combos immediately
            populateComboBaseSelect();

            alert(`Product Price List saved successfully!`);
        } catch (e) {
            console.error(e);
            alert("Failed to save product.");
        }
    });

    // --- Modal Logic ---
    function openSavedModal() {
        savedProductsModal.classList.remove('hidden');
        savedProductsModal.classList.add('flex');
        void savedProductsModal.offsetWidth;
        savedProductsModalContent.classList.remove('scale-95', 'opacity-0');
        renderSavedProducts();
    }

    function closeSavedModal() {
        savedProductsModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            savedProductsModal.classList.add('hidden');
            savedProductsModal.classList.remove('flex');
        }, 200);
    }

    viewSavedBtn.addEventListener('click', openSavedModal);
    closeSavedModalBtn.addEventListener('click', closeSavedModal);
    closeSavedModalBtnBottom.addEventListener('click', closeSavedModal);

    function renderSavedProducts() {
        let dbProducts = [];
        try {
            const raw = localStorage.getItem(PRODUCTS_DB_KEY);
            if (raw) dbProducts = JSON.parse(raw);
        } catch (e) { }

        savedProductsList.innerHTML = '';
        if (dbProducts.length === 0) {
            savedProductsList.innerHTML = `<div class="text-center text-slate-500 italic py-8">No products saved yet.</div>`;
            return;
        }

        dbProducts.forEach((prod, index) => {
            const card = document.createElement('div');
            card.className = "bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col";
            const isC = prod.isCombo ? `<span class="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded border border-purple-200 uppercase font-bold tracking-wider ml-2">Combo Product</span>` : '';

            let extraBadge = '';
            if (!prod.isCombo && prod.extraLength) {
                if (prod.extraLength > 0) extraBadge = `<span class="ml-2 inline-block bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded border border-orange-200 uppercase font-bold tracking-wider">+${prod.extraLength}" Raw</span>`;
                else if (prod.extraLength < 0) extraBadge = `<span class="ml-2 inline-block bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded border border-emerald-200 uppercase font-bold tracking-wider">${prod.extraLength}" Raw</span>`;
            }

            const header = document.createElement('div');
            header.className = "px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center";
            header.innerHTML = `
                <div>
                    <h4 class="font-bold text-slate-800 text-base flex items-center">${prod.name} ${extraBadge} ${isC}</h4>
                    <p class="text-xs text-slate-500">Price List: <strong>${prod.priceListName || 'N/A'}</strong> | Base: ${prod.baseList} | Margin: ${prod.margin}% | Wastage: ${prod.wastagePercent || 0}%</p>
                </div>
                <div class="flex gap-2">
                    <button class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded transition-colors edit-prod-btn" data-idx="${index}" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors delete-prod-btn" data-idx="${index}" title="Delete Product">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            card.appendChild(header);

            const tableContainer = document.createElement('div');
            tableContainer.className = "p-4 overflow-x-auto";

            let allWeights = new Set();
            for (const len in prod.finalPrices) {
                for (const wt in prod.finalPrices[len]) {
                    allWeights.add(parseFloat(wt));
                }
            }
            const weightsArray = Array.from(allWeights).sort((a, b) => a - b);

            const table = document.createElement('table');
            table.className = "w-full text-left border-collapse text-xs";

            const thead = document.createElement('thead');
            const thr = document.createElement('tr');
            thr.innerHTML = `<th class="p-2 border-b font-medium text-slate-500 bg-slate-50">Length \\ Weight</th>`;
            weightsArray.forEach(wt => {
                thr.innerHTML += `<th class="p-2 border-b font-medium text-slate-500 bg-slate-50 text-right">${wt}g</th>`;
            });
            thead.appendChild(thr);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const lengthsArray = Object.keys(prod.finalPrices).sort((a, b) => parseInt(a) - parseInt(b));

            lengthsArray.forEach(len => {
                const tr = document.createElement('tr');
                tr.className = "border-b last:border-0";
                tr.innerHTML = `<td class="p-2 font-bold text-slate-700 bg-slate-50 border-r">${len}"</td>`;
                weightsArray.forEach(wt => {
                    const price = prod.finalPrices[len][wt];
                    if (price !== undefined) {
                        tr.innerHTML += `<td class="p-2 text-right text-indigo-700 font-semibold">${price.toFixed(2)}</td>`;
                    } else {
                        tr.innerHTML += `<td class="p-2 text-right text-slate-300">-</td>`;
                    }
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableContainer.appendChild(table);
            card.appendChild(tableContainer);

            const specSummary = document.createElement('div');
            specSummary.className = "px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-2";
            if (prod.specifications && prod.specifications.length > 0) {
                prod.specifications.forEach(sp => {
                    const spType = sp.type === 'fixed' ? '+' : '+%';
                    specSummary.innerHTML += `<span class="bg-white px-2 py-0.5 border rounded"><b>${sp.name}:</b> ${sp.value}${spType}</span>`;
                });
            } else {
                specSummary.innerHTML = `<span>No extra specifications applied.</span>`;
            }
            card.appendChild(specSummary);

            card.querySelector('.delete-prod-btn').addEventListener('click', (e) => {
                if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                    const targetIdx = parseInt(e.currentTarget.getAttribute('data-idx'));
                    dbProducts.splice(targetIdx, 1);
                    localStorage.setItem(PRODUCTS_DB_KEY, JSON.stringify(dbProducts));
                    renderSavedProducts();
                }
            });

            card.querySelector('.edit-prod-btn').addEventListener('click', (e) => {
                const targetIdx = parseInt(e.currentTarget.getAttribute('data-idx'));
                const p = dbProducts[targetIdx];

                // 1. Populate Shared Fields
                document.getElementById('pc-pricelist').value = p.priceListName || '';
                document.getElementById('pc-name').value = p.name || '';
                document.getElementById('pc-product-weights').value = p.targetWeightsStr || '';
                document.getElementById('pc-base-weight').value = p.baseWeight || 1000;
                document.getElementById('pc-wastage').value = p.wastagePercent || 0;
                document.getElementById('pc-margin').value = p.margin || 0;

                specifications = p.specifications ? JSON.parse(JSON.stringify(p.specifications)) : [];
                renderSpecs();

                // 2. Populate Mode-Specific Fields
                if (!p.isCombo) {
                    switchMode('standard');
                    const baseIdx = rawPriceLists.findIndex(pl => pl.name === p.baseList);
                    if (baseIdx >= 0) {
                        baseSelect.value = baseIdx;
                        baseSelect.dispatchEvent(new Event('change'));

                        // Set Length Offset if available
                        if (p.extraLength !== undefined) {
                            pcExtraLengthDir.value = p.extraLength >= 0 ? '+' : '-';
                            pcExtraLengthVal.value = Math.abs(p.extraLength);
                        }
                    }
                } else {
                    switchMode('combo');
                    const ccBaseIdx = savedProducts.findIndex(sp => sp.name === p.baseList);
                    if (ccBaseIdx >= 0) {
                        ccBase.value = ccBaseIdx;
                        ccBase.dispatchEvent(new Event('change'));

                        // Populate Combo Base Inputs
                        if (p.comboBaseUnit) ccBaseUnit.value = p.comboBaseUnit;
                        if (p.comboBaseQty) ccBaseQty.value = p.comboBaseQty;
                        if (p.comboBaseDir) document.getElementById('cc-base-dir').value = p.comboBaseDir;
                        if (p.comboBaseOffset !== undefined) document.getElementById('cc-base-offset').value = p.comboBaseOffset;

                        // Reconstruct Extra Components array mapping to local indices
                        extraComponents = (p.comboComponents || []).map(savedComp => {
                            const cIdx = savedProducts.findIndex(sp => sp.name === savedComp.baseProductName);
                            return {
                                productIndex: cIdx >= 0 ? cIdx : "",
                                product: cIdx >= 0 ? savedProducts[cIdx] : null,
                                offsetDir: savedComp.offset >= 0 ? '+' : '-',
                                offsetVal: Math.abs(savedComp.offset),
                                unit: savedComp.unit,
                                quantity: savedComp.quantity
                            };
                        });
                        renderExtraComponents();
                    }
                }

                closeSavedModal();
                calculatePrices();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            savedProductsList.appendChild(card);
        });
    }

});
