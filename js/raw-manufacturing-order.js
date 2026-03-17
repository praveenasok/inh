document.addEventListener('DOMContentLoaded', async () => {
    const FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
    const RAW_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, "34+"];

    const ratioSelect = document.getElementById('ratioSelect');
    const dynamicInputsContainer = document.getElementById('dynamicInputsContainer');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const outputSummary = document.getElementById('outputSummary');

    let clientsDB = [];
    let currentActiveFinishedLengths = [];

    // 1. Fetch Clients
    try {
        let serverClients = [];
        
        // Fetch static from server
        try {
            const res = await fetch('/data/clients.json');
            if (res.ok) {
                serverClients = await res.json();
            }
        } catch(e) { console.error("Failed to fetch static config", e); }

        // Fetch active from localStorage
        let localClients = [];
        const savedDB = localStorage.getItem('hairRatioDB');
        if (savedDB) {
            try {
                const parsed = JSON.parse(savedDB);
                if (parsed.clients && parsed.clients.length > 0) {
                    localClients = parsed.clients;
                }
            } catch(e) { console.error("Failed to parse local DB", e); }
        }

        // Merge, preferring local edits if names collide
        const mergedMap = new Map();
        serverClients.forEach(c => mergedMap.set(c.name, c));
        localClients.forEach(c => mergedMap.set(c.name, c));

        clientsDB = Array.from(mergedMap.values());
        
        if(clientsDB.length > 0) {
            populateRatioDropdown();
        } else {
             ratioSelect.innerHTML = '<option value="">No ratios found</option>';
        }

        // --- Load Past MOs Logic ---
        const loadSavedMoSelect = document.getElementById('loadSavedMoSelect');
        let reversedMOs = [];

        window.populateSavedMoDropdown = function() {
            if (!loadSavedMoSelect) return;
            
            let savedMOs = [];
            try {
                savedMOs = JSON.parse(localStorage.getItem('savedMOs') || '[]');
            } catch(e) {}

            if (savedMOs.length > 0) {
                loadSavedMoSelect.classList.remove('hidden');
                loadSavedMoSelect.innerHTML = '<option value="">Load Past MO...</option>';
                reversedMOs = [...savedMOs].reverse();
                
                reversedMOs.forEach((mo, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx; 
                    let moLabel = mo.orderNumber !== 'N/A' ? mo.orderNumber : 'Draft';
                    if (mo.orderSupplier && mo.orderSupplier !== 'N/A') {
                        moLabel += ` (${mo.orderSupplier})`;
                    }
                    opt.textContent = `${mo.orderDate} - ${moLabel} [${mo.clientName}]`;
                    loadSavedMoSelect.appendChild(opt);
                });
            } else {
                loadSavedMoSelect.classList.add('hidden');
            }
        };

        populateSavedMoDropdown();

        if (loadSavedMoSelect) {
            loadSavedMoSelect.addEventListener('change', (e) => {
                const selectedIdx = e.target.value;
                if (selectedIdx === "") return;
                const mo = reversedMOs[selectedIdx];
                if (!mo) return;

                // Populate Text/Date Fields
                document.getElementById('orderNumber').value = mo.orderNumber !== 'N/A' ? mo.orderNumber : '';
                document.getElementById('orderDate').value = mo.orderDate;
                document.getElementById('orderSupplier').value = mo.orderSupplier !== 'N/A' ? mo.orderSupplier : '';
                document.getElementById('orderRef').value = mo.orderRef !== 'N/A' ? mo.orderRef : '';
                
                if (mo.orderHairType) {
                    document.getElementById('orderHairType').value = mo.orderHairType;
                }

                // Set Ratio and immediately trigger the build of input fields
                ratioSelect.value = mo.clientName;
                ratioSelect.dispatchEvent(new Event('change'));

                // Now populate the generated dynamic inputs
                mo.activeOrders.forEach(order => {
                    const input = document.querySelector(`.target-qty-input[data-idx="${order.matrixIdx}"]`);
                    if (input) {
                        input.value = order.targetKilos;
                        input.dispatchEvent(new Event('input')); // trigger live total calculation
                    }
                });

                // Auto calculate to display results
                calculateBtn.dispatchEvent(new Event('click'));
                
                // Reset select back to default so same MO can be clicked again later if needed
                loadSavedMoSelect.value = "";
            });
        }

    } catch (error) {
        console.error("Failed to assemble clients database:", error);
        ratioSelect.innerHTML = '<option value="">Error loading ratios</option>';
    }

    function populateRatioDropdown() {
        if (!clientsDB || clientsDB.length === 0) {
            ratioSelect.innerHTML = '<option value="">No ratios found</option>';
            return;
        }

        ratioSelect.innerHTML = '<option value="">-- Choose a Ratio Template --</option>';
        // Sort clients alphabetically by name
        const sortedClients = [...clientsDB].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedClients.forEach(client => {
            const opt = document.createElement('option');
            opt.value = client.name;
            opt.textContent = client.name;
            ratioSelect.appendChild(opt);
        });
    }

    // 2. Handle Dropdown Change - Build Dynamic Inputs
    ratioSelect.addEventListener('change', (e) => {
        const clientName = e.target.value;
        dynamicInputsContainer.innerHTML = ''; // Clear previous
        currentActiveFinishedLengths = [];
        resultsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                <i class="fa-solid fa-boxes-stacked text-5xl mb-4 opacity-20"></i>
                <p class="font-medium text-slate-500">Pick a ratio and enter quantities to see the manufacturing breakdown.</p>
            </div>
        `;
        outputSummary.classList.add('hidden');

        if (!clientName) return;

        const client = clientsDB.find(c => c.name === clientName);
        if (!client || !client.matrix) return;

        // Find which Finished Lengths have data in this matrix
        FINISHED_LENGTHS.forEach((len, idx) => {
            if (client.matrix[idx]) {
                const hasValue = Object.values(client.matrix[idx]).some(val => val > 0);
                if (hasValue) {
                    currentActiveFinishedLengths.push({ length: len, idx: idx });
                }
            }
        });

        if (currentActiveFinishedLengths.length === 0) {
            dynamicInputsContainer.innerHTML = '<p class="text-sm text-slate-500 italic py-2">This ratio matrix is empty.</p>';
            return;
        }

        // Build input fields for each active finished length
        let inputsHTML = '<div class="space-y-3">';
        inputsHTML += '<label class="block text-xs font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2">Target Output Kilos per Length</label>';
        
        currentActiveFinishedLengths.forEach(fl => {
            inputsHTML += `
                <div class="flex items-center justify-between gap-4">
                    <label for="input-len-${fl.idx}" class="text-sm font-bold text-slate-700 w-24">Finished ${fl.length}"</label>
                    <div class="relative flex-1">
                        <input type="number" id="input-len-${fl.idx}" class="target-qty-input w-full bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 pr-10 outline-none transition-all shadow-sm" placeholder="0.00" min="0" step="0.5" data-idx="${fl.idx}" data-len="${fl.length}">
                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span class="text-slate-400 font-bold text-xs">KG</span>
                        </div>
                    </div>
                </div>
            `;
        });
        inputsHTML += '</div>';

        dynamicInputsContainer.innerHTML = inputsHTML;

        // Add event listeners to all inputs to calculate live total
        const inputs = document.querySelectorAll('.target-qty-input');
        const totalSection = document.getElementById('totalInputSection');
        const totalOutput = document.getElementById('totalInputKg');

        if (totalSection && totalOutput) {
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    let sum = 0;
                    inputs.forEach(inp => sum += parseFloat(inp.value) || 0);
                    if (sum > 0) {
                        totalOutput.textContent = sum.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2}) + ' kg';
                        totalSection.classList.remove('hidden');
                    } else {
                        totalSection.classList.add('hidden');
                    }
                });
            });
        }
    });

    // 3. Handle Calculation
    calculateBtn.addEventListener('click', () => {
        const clientName = ratioSelect.value;
        if (!clientName) {
            alert("Please select a ratio template first.");
            return;
        }

        const client = clientsDB.find(c => c.name === clientName);
        if (!client || !client.matrix) return;

        // Collect inputs
        let totalOutputKilos = 0;
        let activeOrders = []; // { finishedLength: 16, matrixIdx: 6, targetKilos: 10 }
        
        const inputElements = document.querySelectorAll('.target-qty-input');
        inputElements.forEach(input => {
            const val = parseFloat(input.value);
            if (val > 0) {
                totalOutputKilos += val;
                activeOrders.push({
                    finishedLength: parseInt(input.dataset.len),
                    matrixIdx: parseInt(input.dataset.idx),
                    targetKilos: val
                });
            }
        });

        if (activeOrders.length === 0) {
            resultsContainer.innerHTML = `
                <div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 font-medium flex items-center gap-3">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Please enter a quantity greater than 0 for at least one finished length.
                </div>
            `;
            return;
        }

        // Aggregate Raw Requirements
        // Map of rawLength -> total Kilos required
        let rawRequirements = {}; 

        activeOrders.forEach(order => {
            const matrixRow = client.matrix[order.matrixIdx];
            if (!matrixRow) return;

            Object.keys(matrixRow).forEach(rawIdxStr => {
                const percent = matrixRow[rawIdxStr];
                if (percent > 0) {
                    // rawIdxStr in the matrix is already the length string, e.g. "16" or "34+"
                    const rawLengthStr = rawIdxStr;
                    const kilosNeeded = (percent / 100) * order.targetKilos;
                    
                    if (!rawRequirements[rawLengthStr]) {
                        rawRequirements[rawLengthStr] = 0;
                    }
                    rawRequirements[rawLengthStr] += kilosNeeded;
                }
            });
        });

        // Calculate Totals and Generate HTML
        outputSummary.textContent = `Total Target Output: ${totalOutputKilos.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})} kg`;
        outputSummary.classList.remove('hidden');

        // Sort the required raw lengths for deterministic display
        const sortedRawKeys = Object.keys(rawRequirements).sort((a, b) => {
            if (a === "34+") return 1;
            if (b === "34+") return -1;
            return parseInt(a) - parseInt(b);
        });

        let totalRawRequiredKilos = 0;

        // Collect new order details
        const orderNumber = document.getElementById('orderNumber').value.trim() || 'N/A';
        const orderDate = document.getElementById('orderDate').value || new Date().toISOString().split('T')[0];
        const orderSupplier = document.getElementById('orderSupplier').value.trim() || 'N/A';
        const orderRef = document.getElementById('orderRef').value.trim() || 'N/A';
        const orderHairType = document.getElementById('orderHairType').value || 'Normal';

        let resultsHTML = `
            <div id="mo-export-container" class="bg-white p-4 border-2 border-slate-100 rounded-xl max-w-3xl mx-auto space-y-4">
                
                <!-- Order Overview Header -->
                <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Order #</p>
                            <p class="font-bold text-slate-900 text-sm">${orderNumber}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
                            <p class="font-bold text-slate-900 text-sm">${orderDate}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Supplier</p>
                            <p class="font-bold text-slate-900 text-sm">${orderSupplier}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Ref / PO</p>
                            <p class="font-bold text-slate-900 text-sm">${orderRef}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Hair Type</p>
                            <p class="font-bold text-indigo-700 text-sm">${orderHairType}</p>
                        </div>
                    </div>
                </div>

                <!-- Aggregate Raw Materials Required (The Picking Slip) -->
                <div>
                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-slate-100 pb-1">
                        <i class="fa-solid fa-clipboard-list text-indigo-500"></i> Raw Material Picking Slip
                    </h3>
                    
                    <div class="overflow-hidden rounded-lg border border-slate-200">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-indigo-50 text-indigo-900 border-b border-slate-200 uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th scope="col" class="px-3 py-2">Raw Length needed</th>
                                    <th scope="col" class="px-3 py-2 text-right">Required Weight (KG)</th>
                                    <th scope="col" class="px-3 py-2 text-right">Required Weight (Grams)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
        `;

        sortedRawKeys.forEach(rawLen => {
            const kg = rawRequirements[rawLen];
            totalRawRequiredKilos += kg;
            const grams = Math.round(kg * 1000);
            
            resultsHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="px-3 py-1.5 font-bold text-slate-800">${rawLen}" Raw</td>
                    <td class="px-3 py-1.5 text-right font-medium text-slate-700">${kg.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3})} kg</td>
                    <td class="px-3 py-1.5 text-right font-bold text-indigo-700 mono">${grams.toLocaleString()} g</td>
                </tr>
            `;
        });

        // Add Total Row
        resultsHTML += `
                            </tbody>
                            <tfoot class="bg-slate-50 border-t border-slate-200 font-bold">
                                <tr>
                                    <td class="px-3 py-2 text-slate-800 uppercase tracking-wider text-[10px]">Total Raw Material</td>
                                    <td class="px-3 py-2 text-right text-slate-900 text-sm">${totalRawRequiredKilos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3})} kg</td>
                                    <td class="px-3 py-2 text-right text-indigo-700 font-black text-sm mono">${(Math.round(totalRawRequiredKilos * 1000)).toLocaleString()} g</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Breakdown by Finished Length (Audit Trail) -->
                <div>
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-slate-100 pb-1">
                        <i class="fa-solid fa-table opacity-70"></i> Breakdown by Target Product Matrix
                    </h3>
                    <div class="overflow-x-auto rounded-lg border border-slate-200">
                        <table class="w-full text-xs text-center border-collapse">
                            <thead class="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th scope="col" class="px-2 py-1.5 text-left border-r border-slate-200">Raw \\ Target</th>
        `;

        // Column Headers
        activeOrders.forEach(order => {
            resultsHTML += `<th scope="col" class="px-2 py-1.5 border-r border-slate-100 last:border-0"><span class="block text-indigo-700 font-bold">Finished ${order.finishedLength}"</span><span class="text-[9px] text-slate-500 font-normal normal-case">Target: ${order.targetKilos} kg</span></th>`;
        });

        resultsHTML += `
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
        `;

        // Rows for each raw length required
        sortedRawKeys.forEach(rawLenStr => {
            resultsHTML += `
                                <tr class="hover:bg-slate-50">
                                    <td class="px-2 py-1 font-bold text-slate-800 text-left border-r border-slate-200 bg-slate-50">${rawLenStr}" Raw</td>
            `;

            activeOrders.forEach(order => {
                const matrixRow = client.matrix[order.matrixIdx];
                const percent = matrixRow && matrixRow[rawLenStr] ? matrixRow[rawLenStr] : 0;
                
                if (percent > 0) {
                    const kilosNeeded = (percent / 100) * order.targetKilos;
                    const grams = Math.round(kilosNeeded * 1000);
                    // Show grams and percentage
                    resultsHTML += `<td class="px-2 py-1 border-r border-slate-100 last:border-0"><span class="font-bold text-slate-700 mono">${grams.toLocaleString()} g</span><br><span class="text-[9px] text-slate-400 font-sans font-medium">${percent}%</span></td>`;
                } else {
                    // Empty cell
                    resultsHTML += `<td class="px-2 py-1 text-slate-300 border-r border-slate-100 last:border-0 text-[10px]">-</td>`;
                }
            });

            resultsHTML += `
                                </tr>
            `;
        });

        resultsHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div> <!-- End mo-export-container -->
            
            <div class="mt-6 pt-4 flex flex-wrap justify-center gap-4">
                <button id="saveMoBtn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 shadow-md text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-floppy-disk"></i> Save MO
                </button>
                <button id="shareMoBtn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 shadow-md text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-share-nodes"></i> Share MO
                </button>
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;

        // Attach Save MO listener
        const saveBtn = document.getElementById('saveMoBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const moData = {
                    orderNumber,
                    orderDate,
                    orderSupplier,
                    orderRef,
                    orderHairType,
                    clientName,
                    totalOutputKilos,
                    totalRawRequiredKilos,
                    activeOrders,
                    rawRequirements,
                    savedAt: new Date().toISOString()
                };

                let savedMOs = [];
                try {
                    savedMOs = JSON.parse(localStorage.getItem('savedMOs') || '[]');
                } catch(e) {}
                savedMOs.push(moData);
                localStorage.setItem('savedMOs', JSON.stringify(savedMOs));
                
                if (typeof window.populateSavedMoDropdown === 'function') {
                    window.populateSavedMoDropdown();
                }

                alert(`Manufacturing Order ${orderNumber !== 'N/A' ? orderNumber : '(Draft)'} saved successfully!`);
            });
        }

        // Attach Share MO listener
        const shareBtn = document.getElementById('shareMoBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
                shareBtn.disabled = true;

                try {
                    // Prevent cropping on mobile/long screens by adjusting canvas window properties
                    window.scrollTo(0, 0);
                    const container = document.getElementById('mo-export-container');
                    
                    const canvas = await html2canvas(container, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        windowWidth: document.documentElement.scrollWidth,
                        windowHeight: document.documentElement.scrollHeight,
                        useCORS: true
                    });
                    
                    canvas.toBlob(async (blob) => {
                        if (navigator.share) {
                            const file = new File([blob], `MO_${orderNumber}.png`, { type: 'image/png' });
                            try {
                                await navigator.share({
                                    title: `Manufacturing Order ${orderNumber}`,
                                    files: [file]
                                });
                            } catch (err) {
                                console.log('Share dismissed or failed:', err);
                            }
                        } else {
                            // Fallback download if Web Share API is not supported
                            const link = document.createElement('a');
                            link.download = `MO_${orderNumber}.png`;
                            link.href = canvas.toDataURL('image/png');
                            link.click();
                        }
                        shareBtn.innerHTML = originalText;
                        shareBtn.disabled = false;
                    }, 'image/png');
                } catch (error) {
                    console.error('Error generating MO image:', error);
                    alert("Failed to generate image.");
                    shareBtn.innerHTML = originalText;
                    shareBtn.disabled = false;
                }
            });
        }
    });
});
