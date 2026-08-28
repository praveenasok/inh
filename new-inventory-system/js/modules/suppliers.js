// ============================================================================
// Suppliers Module
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const supplierForm = document.getElementById('add-supplier-form');
    const tbody = document.getElementById('suppliers-tbody');
    const submitBtn = document.getElementById('sup-save-btn');

    function loadSuppliers() {
        if (!window.db) {
            setTimeout(loadSuppliers, 500);
            return;
        }

        window.db.collection('new_inventory_suppliers')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                tbody.innerHTML = '';
                
                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No suppliers found.</td></tr>';
                    return;
                }

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const tr = document.createElement('tr');
                    
                    tr.innerHTML = `
                        <td><strong>${data.name}</strong></td>
                        <td>${data.address || '<span style="color: var(--text-muted)">-</span>'}</td>
                        <td>${data.phone}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }, err => {
                console.error("Error fetching suppliers:", err);
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--accent-danger);">Error loading suppliers.</td></tr>';
            });
    }

    supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!window.db) return;

        const name = document.getElementById('sup-name').value.trim();
        const address = document.getElementById('sup-address').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();

        submitBtn.innerHTML = '<i class="ph ph-spinner spinner"></i> Saving...';
        submitBtn.disabled = true;

        try {
            await window.db.collection('new_inventory_suppliers').add({
                name,
                address,
                phone,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.app?.showToast('Supplier Added', `${name} has been saved to your vendors.`, 'success');
            supplierForm.reset();
        } catch (error) {
            console.error("Error saving supplier:", error);
            window.app?.showToast('Error', 'Failed to save supplier.', 'error');
        } finally {
            submitBtn.innerHTML = '<i class="ph ph-plus-circle"></i> Add';
            submitBtn.disabled = false;
        }
    });

    // Initialize
    loadSuppliers();
});
