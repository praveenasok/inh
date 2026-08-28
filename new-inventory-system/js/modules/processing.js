// ============================================================================
// Raw Material Processing Module
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const lotInput = document.getElementById('proc-lot-id');
    const materialSelect = document.getElementById('proc-material-type');
    const supplierSelect = document.getElementById('proc-supplier');
    const initialWeightInput = document.getElementById('proc-initial-weight');
    const totalCostInput = document.getElementById('proc-total-cost');
    
    const addRowBtn = document.getElementById('proc-add-row-btn');
    const yieldRowsContainer = document.getElementById('proc-yield-rows');
    
    const totalYieldDisplay = document.getElementById('proc-total-yield');
    const wastageDisplay = document.getElementById('proc-wastage');
    const wastagePercentDisplay = document.getElementById('proc-wastage-percent');
    const effectiveCostDisplay = document.getElementById('proc-effective-cost');
    
    const saveBtn = document.getElementById('proc-save-btn');

    let rowCount = 0;

    // Build Length Options HTML
    let lengthOptionsHTML = '<option value="" disabled selected>Select Length</option>';
    for(let i=3; i<=50; i++) {
        lengthOptionsHTML += `<option value="${i}">${i}"</option>`;
    }

    function generateLotNumber() {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        lotInput.value = `LOT-${yy}${mm}${dd}-${hh}${min}${ss}`;
    }

    function loadSuppliers() {
        if (!window.db) {
            setTimeout(loadSuppliers, 500);
            return;
        }
        window.db.collection('new_inventory_suppliers').orderBy('name').onSnapshot(snapshot => {
            let html = '<option value="">No Supplier Selected</option>';
            snapshot.forEach(doc => {
                html += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            supplierSelect.innerHTML = html;
        });
    }

    function addYieldRow() {
        rowCount++;
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex-row';
        rowDiv.style.marginBottom = '12px';
        rowDiv.style.alignItems = 'center';
        rowDiv.style.flexWrap = 'nowrap';

        rowDiv.innerHTML = `
            <div style="flex: 1;">
                <select class="modern-select proc-length" required>
                    ${lengthOptionsHTML}
                </select>
            </div>
            <div style="flex: 1;">
                <input type="number" class="modern-input proc-weight" required min="0" step="0.1" placeholder="Weight (g)">
            </div>
            <button type="button" class="action-btn remove-row-btn" style="color: var(--accent-danger); background: var(--accent-danger-bg); padding: 12px; border-radius: var(--radius-md);">
                <i class="ph ph-trash"></i>
            </button>
        `;

        rowDiv.querySelector('.remove-row-btn').addEventListener('click', () => {
            rowDiv.remove();
            calculateSummary();
        });

        rowDiv.querySelector('.proc-weight').addEventListener('input', calculateSummary);
        yieldRowsContainer.appendChild(rowDiv);
    }

    function calculateSummary() {
        const initialWeight = parseFloat(initialWeightInput.value) || 0;
        const totalCost = parseFloat(totalCostInput.value) || 0;
        let totalYield = 0;

        document.querySelectorAll('.proc-weight').forEach(input => {
            totalYield += parseFloat(input.value) || 0;
        });

        const wastage = initialWeight - totalYield;
        let wastagePercent = 0;
        if (initialWeight > 0) {
            wastagePercent = (wastage / initialWeight) * 100;
        }

        let effectiveCost = 0;
        if (totalYield > 0 && totalCost > 0) {
            effectiveCost = totalCost / totalYield;
        }

        totalYieldDisplay.textContent = totalYield.toFixed(2);
        wastageDisplay.textContent = wastage.toFixed(2);
        wastagePercentDisplay.textContent = wastagePercent.toFixed(2);
        effectiveCostDisplay.textContent = effectiveCost.toFixed(2);

        if (wastage < 0) {
            wastageDisplay.style.color = 'var(--accent-danger)';
            if(window.app) window.app.showToast('Calculation Warning', 'Yield exceeds initial weight!', 'error');
        } else {
            wastageDisplay.style.color = 'var(--accent-warning)';
        }
    }

    // Events
    addRowBtn.addEventListener('click', addYieldRow);
    initialWeightInput.addEventListener('input', calculateSummary);
    totalCostInput.addEventListener('input', calculateSummary);

    saveBtn.addEventListener('click', async () => {
        if (!window.db) return;

        const batchId = lotInput.value.trim();
        const materialType = materialSelect.value;
        const supplierId = supplierSelect.value;
        const initialWeight = parseFloat(initialWeightInput.value);
        const totalCost = parseFloat(totalCostInput.value) || 0;

        if (!batchId || isNaN(initialWeight) || !materialType) {
            window.app?.showToast('Validation Error', 'Material Type and Initial Weight are required.', 'error');
            return;
        }

        const yields = [];
        const rows = yieldRowsContainer.querySelectorAll('.flex-row');
        for (let row of rows) {
            const length = row.querySelector('.proc-length').value;
            const weight = parseFloat(row.querySelector('.proc-weight').value);
            
            if (!length || isNaN(weight)) {
                window.app?.showToast('Validation Error', 'Ensure all lengths and weights are filled.', 'error');
                return;
            }
            yields.push({ length: parseInt(length), weight: weight });
        }

        if (yields.length === 0) {
            window.app?.showToast('Validation Error', 'Add at least one yield row.', 'error');
            return;
        }

        saveBtn.innerHTML = '<i class="ph ph-spinner spinner"></i> Processing...';
        saveBtn.disabled = true;

        try {
            const totalYield = yields.reduce((sum, y) => sum + y.weight, 0);
            const wastage = initialWeight - totalYield;
            const effectiveCost = (totalYield > 0 && totalCost > 0) ? (totalCost / totalYield) : 0;

            const record = {
                batchId: batchId,
                materialType: materialType,
                supplierId: supplierId || null,
                initialWeight: initialWeight,
                totalCost: totalCost,
                totalYield: totalYield,
                wastage: wastage,
                wastagePercent: (initialWeight > 0) ? (wastage / initialWeight) * 100 : 0,
                effectiveCost: effectiveCost,
                yields: yields,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 1. Save processing record
            await window.db.collection('new_inventory_goli_records').add(record);

            // 2. Add yielding directly into Main Inventory
            const batchPromises = [];
            for (let y of yields) {
                const itemName = `Non Remy 1x1 - ${y.length}"`;
                
                const snapshot = await window.db.collection('new_inventory_items')
                    .where('name', '==', itemName)
                    .limit(1).get();

                if (snapshot.empty) {
                    batchPromises.push(window.db.collection('new_inventory_items').add({
                        itemId: `NR1X1-${y.length}`,
                        name: itemName,
                        category: 'Non Remy 1x1',
                        length: y.length,
                        stock: y.weight,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }));
                } else {
                    const doc = snapshot.docs[0];
                    const currentStock = doc.data().stock || 0;
                    batchPromises.push(doc.ref.update({
                        stock: currentStock + y.weight,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }));
                }
            }

            await Promise.all(batchPromises);

            window.app?.showToast('Success', `LOT ${batchId} saved and Inventory updated!`, 'success');
            
            // Reset
            generateLotNumber();
            materialSelect.value = '';
            supplierSelect.value = '';
            initialWeightInput.value = '';
            totalCostInput.value = '';
            yieldRowsContainer.innerHTML = '';
            addYieldRow();
            calculateSummary();

        } catch (error) {
            console.error('Error saving record:', error);
            window.app?.showToast('System Error', 'Failed to save record.', 'error');
        } finally {
            saveBtn.innerHTML = '<i class="ph ph-check-circle"></i> Save & Push to Inventory';
            saveBtn.disabled = false;
        }
    });

    // Init
    generateLotNumber();
    loadSuppliers();
    addYieldRow();
});
