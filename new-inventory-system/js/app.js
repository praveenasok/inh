// ============================================================================
// App Global Logic: Routing, Toasts, and Dashboard
// ============================================================================

window.app = {
    // ------------------------------------------------------------------------
    // Toast Notification System
    // ------------------------------------------------------------------------
    showToast: function(title, message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="ph ${iconClass}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Wait for transition
        }, 4000);
    },

    // ------------------------------------------------------------------------
    // Dashboard Data Sync
    // ------------------------------------------------------------------------
    initDashboard: function() {
        if (!window.db) return;

        // 1. Finished Goods (Inventory)
        window.db.collection('new_inventory_items').onSnapshot(snapshot => {
            document.getElementById('dash-total-items').textContent = snapshot.size;
        });

        // 2. Processing LOTs
        window.db.collection('new_inventory_goli_records').onSnapshot(snapshot => {
            document.getElementById('dash-total-lots').textContent = snapshot.size;
        });

        // 3. Suppliers
        window.db.collection('new_inventory_suppliers').onSnapshot(snapshot => {
            document.getElementById('dash-total-suppliers').textContent = snapshot.size;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------------------------------
    // Routing Logic
    // ------------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    function switchView(targetId) {
        // Update Nav
        navItems.forEach(item => item.classList.remove('active'));
        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if (targetNav) targetNav.classList.add('active');

        // Update Views
        viewSections.forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });

        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
            // Trigger animation reflow
            void targetView.offsetWidth;
            targetView.classList.add('active');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('data-target');
            if (targetId) {
                switchView(targetId);
                // Update URL hash for direct links
                window.location.hash = e.currentTarget.getAttribute('href');
            }
        });
    });

    // Handle deep links on load
    if (window.location.hash) {
        const hash = window.location.hash;
        const targetNav = document.querySelector(`.nav-item[href="${hash}"]`);
        if (targetNav) {
            switchView(targetNav.getAttribute('data-target'));
        }
    }

    // Initialize Dashboard
    setTimeout(() => {
        window.app.initDashboard();
    }, 1000); // Give Firebase a moment to init
});
