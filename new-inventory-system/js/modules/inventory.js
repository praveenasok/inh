// ============================================================================
// Inventory Module
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('inventory-tbody');

    function loadInventory() {
        if (!window.db) {
            console.warn("Firebase not initialized yet. Retrying in 500ms.");
            setTimeout(loadInventory, 500);
            return;
        }

        // Listen for real-time updates
        window.db.collection('new_inventory_items')
            .orderBy('length', 'asc')
            .onSnapshot(snapshot => {
                tbody.innerHTML = '';
                
                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No inventory found.</td></tr>';
                    return;
                }

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const tr = document.createElement('tr');
                    
                    tr.innerHTML = `
                        <td><strong>${data.name || 'Unknown'}</strong></td>
                        <td><span class="badge brand">${data.category || 'Finished Goods'}</span></td>
                        <td>${data.length ? data.length + '"' : 'N/A'}</td>
                        <td style="font-size: 16px; font-weight: 600; color: var(--brand-primary);">${(data.stock || 0).toFixed(2)} g</td>
                    `;
                    tbody.appendChild(tr);
                });
            }, err => {
                console.error("Error fetching inventory:", err);
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--accent-danger);">Error loading inventory.</td></tr>';
                window.app?.showToast('Inventory Error', 'Failed to load stock data.', 'error');
            });
    }

    // Initialize
    loadInventory();
});
