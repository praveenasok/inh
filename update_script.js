    // ----- COMPOSE PRODUCT FEATURE -----
    window.COMPOSE_TARGET_LENGTHS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
    window.composeComponents = []; // Array of ratio names
    window.composeMatrixData = {}; // { [targetLen]: { [ratioName]: { len, weight } } }

    window.openComposeProductModal = function() {
        if (_selectedRatioNames.length < 1) return alert('Please select at least one ratio to compose a product.');

        window.composeComponents = [];
        window.composeMatrixData = {};

        // Reset fields
        document.getElementById('composeProductName').value = '';
        document.getElementById('composeWastagePercent').value = '0';
        document.getElementById('composeLaborCost').value = '0';
        document.getElementById('composeMaterialCost').value = '0';
        document.getElementById('composeOutputUnit').value = 'kg';

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

        document.getElementById('composeProductModal').classList.remove('hidden');
    };

    window.addRatioToComposeProduct = function(ratioNameOverride) {
        const select = document.getElementById('composeAddRatioSelect');
        const ratioName = ratioNameOverride || (select ? select.value : '');
        if (!ratioName) return alert('Please select a ratio to add.');

        if (!window.composeComponents.includes(ratioName)) {
            window.composeComponents.push(ratioName);
            
            // Initialize defaults for this new component
            let defaultWeight = 100;
            const client = (db.clients || []).find(c => c.name === ratioName);
            if (client && client.exportGrams && client.exportGrams.length > 0) {
                defaultWeight = client.exportGrams[0];
            }
            
            window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
                if (!window.composeMatrixData[tLen]) window.composeMatrixData[tLen] = {};
                window.composeMatrixData[tLen][ratioName] = { len: tLen, weight: defaultWeight };
            });
        }

        if (!ratioNameOverride && select) select.value = '';
        window.renderComposeMatrix();
    };

    window.removeComposeComponent = function(ratioName) {
        window.composeComponents = window.composeComponents.filter(n => n !== ratioName);
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            if (window.composeMatrixData[tLen]) {
                delete window.composeMatrixData[tLen][ratioName];
            }
        });
        window.renderComposeMatrix();
    };

    window.updateComposeMatrixValue = function(tLen, ratioName, field, value) {
        if (!window.composeMatrixData[tLen]) return;
        if (!window.composeMatrixData[tLen][ratioName]) return;
        window.composeMatrixData[tLen][ratioName][field] = parseFloat(value) || 0;
        window.updateComposeTotalWeight();
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
                        <span>${comp}</span>
                        <button type="button" onclick="window.removeComposeComponent('${comp.replace(/'/g, "\\\\'")}')" class="text-slate-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50 ml-2">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </th>
            `;
        });
        theadHTML += `<th class="p-3 text-xs font-bold text-slate-500 uppercase text-right w-32 bg-slate-50 sticky right-0 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Weight</th></tr>`;
        thead.innerHTML = theadHTML;

        // Build tbody
        let tbodyHTML = '';
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            let rowHTML = `<tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">`;
            rowHTML += `<td class="p-3 font-bold text-slate-800 text-sm sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">${tLen}"</td>`;
            
            let rowWeight = 0;
            
            window.composeComponents.forEach(comp => {
                const data = window.composeMatrixData[tLen]?.[comp] || { len: tLen, weight: 0 };
                rowWeight += data.weight;
                
                // Length select
                let selectHTML = `<select onchange="window.updateComposeMatrixValue(${tLen}, '${comp.replace(/'/g, "\\\\'")}', 'len', this.value)" class="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-500 mr-2">`;
                ALL_FINISHED_LENGTHS.forEach(l => {
                    selectHTML += `<option value="${l}" ${l === data.len ? 'selected' : ''}>${l}"</option>`;
                });
                selectHTML += `</select>`;
                
                // Weight input
                let weightInput = `<div class="relative flex-1"><input type="number" oninput="window.updateComposeMatrixValue(${tLen}, '${comp.replace(/'/g, "\\\\'")}', 'weight', this.value)" class="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-500 pr-6" value="${data.weight}" min="0"><span class="absolute right-2 top-1.5 text-slate-400 text-xs">g</span></div>`;
                
                rowHTML += `<td class="p-2 border-r border-slate-200"><div class="flex items-center">${selectHTML}${weightInput}</div></td>`;
            });
            
            rowHTML += `<td class="p-3 font-bold text-slate-700 text-right sticky right-0 bg-white shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50" id="compose-row-weight-${tLen}">${rowWeight} g</td>`;
            rowHTML += `</tr>`;
            tbodyHTML += rowHTML;
        });
        
        tbody.innerHTML = tbodyHTML;
    };

    window.updateComposeTotalWeight = function() {
        window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
            let rowWeight = 0;
            window.composeComponents.forEach(comp => {
                rowWeight += window.composeMatrixData[tLen]?.[comp]?.weight || 0;
            });
            const cell = document.getElementById(`compose-row-weight-${tLen}`);
            if (cell) cell.textContent = rowWeight + ' g';
        });
    };

    window.saveComposeProduct = async function() {
        const nameInput = document.getElementById('composeProductName').value.trim();
        if (!nameInput) return alert('Please enter a product name.');
        
        if ((db.clients || []).find(c => c.name.toLowerCase() === nameInput.toLowerCase())) {
            return alert('A saved ratio/product with this name already exists.');
        }

        const outputUnit = document.getElementById('composeOutputUnit') ? document.getElementById('composeOutputUnit').value : 'kg';
        const productWastagePercent = parseFloat(document.getElementById('composeWastagePercent').value) || 0;
        const productLaborCost = parseFloat(document.getElementById('composeLaborCost').value) || 0;
        const productMaterialCost = parseFloat(document.getElementById('composeMaterialCost').value) || 0;

        if (window.composeComponents.length === 0) return alert('Please add at least one component.');

        // Backup current state
        const savedState = JSON.parse(JSON.stringify(appState));
        let customPrices = {};
        ALL_FINISHED_LENGTHS.forEach(len => customPrices[len] = 0);
        let success = true;

        try {
            // Preload client configs so we don't reload matrix inside the loop unnecessarily
            const clientConfigs = {};
            window.composeComponents.forEach(compName => {
                const client = (db.clients || []).find(c => c.name === compName);
                if (client) {
                    clientConfigs[compName] = client;
                }
            });

            // Calculate price for each target length row
            window.COMPOSE_TARGET_LENGTHS.forEach(tLen => {
                let rowPrice = 0;
                let rowWeight = 0;
                let isValidLength = true;

                window.composeComponents.forEach(compName => {
                    const data = window.composeMatrixData[tLen]?.[compName];
                    if (!data || data.weight <= 0) return;
                    
                    rowWeight += data.weight;
                    const client = clientConfigs[compName];
                    if (!client) { isValidLength = false; return; }

                    // Apply appState context for this component
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

                    // Get price for the selected len
                    let displayPrice = 0;
                    if (appState.customPricesEnabled && appState.customPrices[data.len] > 0) {
                        displayPrice = appState.customPrices[data.len];
                    } else {
                        displayPrice = calculateColumn(data.len);
                    }

                    if (displayPrice && displayPrice > 0 && !isNaN(displayPrice)) {
                        rowPrice += (displayPrice * (data.weight / 1000));
                    } else {
                        isValidLength = false; // Could not find a price for this component len
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
                    customPrices[tLen] = Math.round(rowPrice);
                } else {
                    customPrices[tLen] = 0;
                }
            });

        } catch(e) {
            console.error(e);
            success = false;
        } finally {
            Object.assign(appState, savedState);
        }

        if (!success) return alert("Error calculating composed prices.");

        Object.keys(customPrices).forEach(k => {
            if (isNaN(customPrices[k]) || customPrices[k] === null) customPrices[k] = 0;
        });

        // Save legacy bundleComponents structure for UI reference if needed
        const legacyComponents = window.composeComponents.map(name => ({ name, offset: 0, weightGrams: 0 }));

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
            bundleComponents: legacyComponents,
            composeMatrix: JSON.parse(JSON.stringify(window.composeMatrixData)),
            outputUnit: outputUnit
        };

        db.clients = db.clients || [];
        db.clients.push(newClient);

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
