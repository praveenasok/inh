// ============================================================================
// Reports Module
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const lotSelect = document.getElementById('rep-lot-select');
    const detailsContainer = document.getElementById('rep-details-container');
    
    // Elements
    const elMaterial = document.getElementById('rep-material');
    const elDate = document.getElementById('rep-date');
    const elSupplierInfo = document.getElementById('rep-supplier-info');
    
    const elInitWeight = document.getElementById('rep-initial-weight');
    const elTotalCost = document.getElementById('rep-total-cost');
    const elTotalYield = document.getElementById('rep-total-yield');
    const elWastage = document.getElementById('rep-wastage');
    const elWastagePercent = document.getElementById('rep-wastage-percent');
    const elEffectiveCost = document.getElementById('rep-effective-cost');
    
    const tbodyYield = document.getElementById('rep-yield-tbody');

    let recordsCache = {};

    function loadLots() {
        if (!window.db) {
            setTimeout(loadLots, 500);
            return;
        }

        window.db.collection('new_inventory_goli_records')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                let html = '<option value="" disabled selected>Select a LOT...</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    recordsCache[doc.id] = data;
                    const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Unknown';
                    html += `<option value="${doc.id}">${data.batchId} (${dateStr})</option>`;
                });
                lotSelect.innerHTML = html;
            });
    }

    async function fetchSupplier(supplierId) {
        if (!supplierId) {
            elSupplierInfo.innerHTML = '<p style="color: var(--text-muted);">No supplier recorded.</p>';
            return;
        }

        try {
            const doc = await window.db.collection('new_inventory_suppliers').doc(supplierId).get();
            if (doc.exists) {
                const s = doc.data();
                elSupplierInfo.innerHTML = `
                    <p style="margin-bottom: 6px;"><strong>${s.name}</strong></p>
                    ${s.address ? `<p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">${s.address}</p>` : ''}
                    ${s.phone ? `<p style="font-size: 13px; color: var(--text-secondary);"><i class="ph ph-phone"></i> ${s.phone}</p>` : ''}
                `;
            } else {
                elSupplierInfo.innerHTML = '<p style="color: var(--accent-danger);">Supplier not found.</p>';
            }
        } catch (error) {
            console.error("Supplier fetch error:", error);
            elSupplierInfo.innerHTML = '<p style="color: var(--accent-danger);">Failed to load supplier.</p>';
        }
    }

    lotSelect.addEventListener('change', async (e) => {
        const docId = e.target.value;
        if (!docId || !recordsCache[docId]) return;

        const record = recordsCache[docId];

        // Basic Info
        elMaterial.textContent = record.materialType || 'N/A';
        elDate.textContent = record.createdAt ? record.createdAt.toDate().toLocaleString() : 'N/A';
        
        // Supplier
        elSupplierInfo.innerHTML = '<p style="color: var(--text-muted);"><i class="ph ph-spinner spinner"></i> Loading...</p>';
        await fetchSupplier(record.supplierId);

        // Math
        elInitWeight.textContent = (record.initialWeight || 0).toFixed(2);
        elTotalCost.textContent = (record.totalCost || 0).toFixed(2);
        elTotalYield.textContent = (record.totalYield || 0).toFixed(2);
        
        const wastageVal = record.wastage || 0;
        elWastage.textContent = wastageVal.toFixed(2);
        elWastage.style.color = wastageVal < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)';
        
        elWastagePercent.textContent = (record.wastagePercent || 0).toFixed(2);
        elEffectiveCost.textContent = (record.effectiveCost || 0).toFixed(2);

        // Yield Table
        tbodyYield.innerHTML = '';
        if (record.yields && record.yields.length > 0) {
            const sorted = [...record.yields].sort((a, b) => a.length - b.length);
            sorted.forEach(y => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${y.length}"</strong></td>
                    <td style="color: var(--brand-primary); font-weight: 500;">${y.weight.toFixed(2)} g</td>
                `;
                tbodyYield.appendChild(tr);
            });
        } else {
            tbodyYield.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No yields recorded.</td></tr>';
        }

        detailsContainer.style.display = 'flex';
    });

    // Reset view when clicking reports nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.currentTarget.getAttribute('href') === '#reports') {
                detailsContainer.style.display = 'none';
                lotSelect.value = '';
            }
        });
    });

    // Init
    loadLots();
});
