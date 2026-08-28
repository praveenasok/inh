// Shared Shipping Calculator Logic for INH Lookup Apps

let shipCountryList = [];

function initShippingModalListeners() {
    const providerSelect = document.getElementById('ship-provider-select');
    if(providerSelect) {
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
}

// Call on load
document.addEventListener('DOMContentLoaded', initShippingModalListeners);

function openShippingModal() {
    document.getElementById('shipping-modal').classList.remove('hidden');
    
    // Auto-calculate weight based on cart if available
    let totalWt = 0.5; // default 500g
    if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        let wtGrams = 0;
        cart.forEach(item => {
            // Usually item weight is per piece in grams, e.g., "100" or "150"
            let w = parseFloat(item.weight) || 100;
            if (item.unit && item.unit.toLowerCase() === 'kg') {
                w = w * 1000;
            }
            wtGrams += (w * item.qty);
        });
        
        // Add packaging weight (e.g. box weight 200g per 5 items)
        let totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        let pkgWeight = Math.ceil(totalItems / 5) * 200;
        
        totalWt = (wtGrams + pkgWeight) / 1000;
        if(totalWt < 0.1) totalWt = 0.5;
    }
    
    document.getElementById('ship-weight-input').value = totalWt.toFixed(2);
    
    populateShipCountries();
    calculateShipModalRate();
}

function closeShippingModal() {
    document.getElementById('shipping-modal').classList.add('hidden');
}

function populateShipCountries() {
    const providerSelect = document.getElementById('ship-provider-select');
    if (!providerSelect) return;
    
    // Populate providers if empty
    if (providerSelect.options.length === 0 && typeof shippingData !== 'undefined') {
        const providers = Object.keys(shippingData);
        providers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            providerSelect.appendChild(opt);
        });
    }

    const provider = providerSelect.value;
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
        
    // Default country empty
    document.getElementById('ship-country-search').value = '';
    document.getElementById('ship-country-select').value = '';
    document.getElementById('ship-country-suggestions').classList.add('hidden');
    calculateShipModalRate();
}

function handleShipCountrySearch(e) {
    const val = e.target.value.toLowerCase().trim();
    const suggestionsEl = document.getElementById('ship-country-suggestions');
    
    suggestionsEl.innerHTML = '';
    if (val.length > 0) {
        const matches = shipCountryList.filter(c => c.searchKey.includes(val));
        
        if (matches.length > 0) {
            suggestionsEl.classList.remove('hidden');
            matches.forEach(item => {
                const li = document.createElement('li');
                li.className = 'px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700';
                li.innerHTML = `<strong>${item.label}</strong> <span class="text-xs text-slate-400">(${item.zone})</span>`;
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
        if(resultContainer) resultContainer.classList.add('hidden');
        if(applyBtn) applyBtn.disabled = true;
        const input = document.getElementById('shippingChargeInput');
        if (input && input.value !== '0') {
            input.value = '0';
            if (typeof handleShippingChange === 'function') handleShippingChange();
        }
        return;
    }

    const result = calcShipLogicShared(provider, zone, weight, fuelPercent, isCommercial);
    
    if (result.error) {
        if(resultContainer) resultContainer.classList.add('hidden');
        if(applyBtn) applyBtn.disabled = true;
        const input = document.getElementById('shippingChargeInput');
        if (input && input.value !== '0') {
            input.value = '0';
            if (typeof handleShippingChange === 'function') handleShippingChange();
        }
        return;
    }

    // Format display in INR (if they exist in the DOM)
    if(document.getElementById('ship-base-display')) document.getElementById('ship-base-display').innerText = "₹" + result.baseRate.toFixed(2);
    if(document.getElementById('ship-fuel-display')) document.getElementById('ship-fuel-display').innerText = "₹" + result.fuelSurcharge.toFixed(2);
    
    
    const commRow = document.getElementById('ship-commercial-row');
    if (isCommercial) {
        commRow.classList.remove('hidden');
        document.getElementById('ship-commercial-display').innerText = "₹" + result.commercialCharge.toFixed(2);
    } else {
        commRow.classList.add('hidden');
    }

    document.getElementById('ship-total-display').innerText = "₹" + result.total.toFixed(2);
    
    
    // Convert to target currency
    let rate = 1;
    let targetCurrency = 'INR';
    if (typeof currentCurrency !== 'undefined' && typeof CURRENCY_CONFIG !== 'undefined' && CURRENCY_CONFIG[currentCurrency]) {
        targetCurrency = currentCurrency;
        rate = CURRENCY_CONFIG[currentCurrency].rate || 1;
    }
    
    // In price-lookup and employee-lookup, rate is defined as INR per 1 unit of foreign currency
    // e.g., USD rate = 83.5. So to convert INR total to USD, we divide by rate.
    const converted = targetCurrency === 'INR' ? result.total : (result.total / rate);
    
    if(document.getElementById('ship-currency-note')) document.getElementById('ship-currency-note').innerText = `≈ ${converted.toFixed(2)} ${targetCurrency}`;
    
    // Update inline display instead of auto-applying to quote
    const inlineDisplay = document.getElementById('ship-inline-display');
    if (inlineDisplay) {
        inlineDisplay.innerText = converted.toFixed(2);
    }

    // Attach to button (if using modal or inline Apply button)
    const btn = document.getElementById('btn-apply-shipping');
    if (btn) {
        btn.dataset.amount = converted.toFixed(2);
        btn.disabled = false;
    }
    if (resultContainer) resultContainer.classList.remove('hidden');
}

function calcShipLogicShared(provider, zone, weight, fuelPercent, isCommercial) {
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
    if(!applyBtn) return;
    const val = applyBtn.dataset.amount;
    if (val) {
        const input = document.getElementById('shippingChargeInput');
        if (input) {
            input.value = val;
            if (typeof handleShippingChange === 'function') {
                handleShippingChange();
            }
        }
    }
    closeShippingModal();
}

let lastCalculatedCartWeight = null;

function updateInlineShippingWeight() {
    // Auto-calculate weight based on cart or userEdits if available
    let totalWt = 0.5; // default 500g
    let wtGrams = 0;
    let totalItemsCount = 0;

    if (typeof userEdits !== 'undefined' && userEdits instanceof Map && typeof rawData !== 'undefined') {
        rawData.forEach(item => {
            const edit = userEdits.get(item.id);
            if (edit) {
                let qty = parseFloat(edit.qty);
                if (edit.qty === '' || isNaN(qty)) qty = 1;
                if (qty > 0) {
                    totalItemsCount += qty;
                    const customWeight = parseFloat(edit.customWeight);
                    let w = 100; // default 100g
                    if (!isNaN(customWeight) && customWeight > 0) {
                        w = customWeight;
                    } else if (item.weight) {
                        // try to parse weight string like "200g" or "1kg"
                        let parsed = parseFloat(item.weight);
                        if (!isNaN(parsed)) {
                            if (String(item.weight).toLowerCase().includes('kg')) {
                                w = parsed * 1000;
                            } else {
                                w = parsed;
                            }
                        }
                    }
                    wtGrams += (w * qty);
                }
            }
        });
    } else if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        cart.forEach(item => {
            let w = parseFloat(item.weight) || 100;
            if (item.unit && item.unit.toLowerCase() === 'kg') {
                w = w * 1000;
            }
            wtGrams += (w * item.qty);
            totalItemsCount += item.qty;
        });
    }
    
    if (totalItemsCount > 0) {
        let pkgWeight = Math.ceil(totalItemsCount / 5) * 200;
        totalWt = (wtGrams + pkgWeight) / 1000;
        if(totalWt < 0.1) totalWt = 0.5;
    }
    
    // Only update if the cart's calculated weight has actually changed
    // This prevents overwriting manual user inputs when they just click "Apply"
    if (lastCalculatedCartWeight === null || lastCalculatedCartWeight !== totalWt) {
        lastCalculatedCartWeight = totalWt;
        const weightInput = document.getElementById('ship-weight-input');
        if (weightInput) {
            weightInput.value = totalWt.toFixed(2);
            calculateShipModalRate();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ship-provider-select')) {
        populateShipCountries();
        initShippingModalListeners();
        updateInlineShippingWeight();
    }
});
