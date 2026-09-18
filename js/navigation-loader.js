/**
 * INHsuite Unified Navigation Loader
 *
 * This script injects the standard navigation bar into any page.
 * It automatically handles:
 * 1. Path resolution (root-relative paths)
 * 2. Active state highlighting
 * 3. Mobile menu toggling
 */

(function () {
    // Configuration
    const navConfig = {
        logoSrc: '/images/logo-optimized.png', // Root-relative path
        siteTitle: (window.navConfig && window.navConfig.siteTitle) || 'INHsuite',
        menuItems: [
            { name: 'Home', icon: 'fa-home', href: '/index.html' },
            { name: 'Production Status', icon: 'fa-clipboard-list', href: '/delegated-orders.html' },
            { name: 'Inventory', icon: 'fa-boxes-stacked', href: 'https://inhinventory.web.app/inventory' },
            { name: 'JOB-Billing', icon: 'fa-briefcase', href: '/job-billing.html' },
            { name: 'Price Lookup', icon: 'fa-tags', href: '/price-lookup.html' },
            { name: 'Shipping', icon: 'fa-truck', href: '/shipping-calculator/index.html' },
            { name: 'Shipping Paperwork', icon: 'fa-file-invoice', href: '/shipping-paperwork.html' },
            { name: 'Proforma Invoice', icon: 'fa-file-signature', href: '/proforma-invoice.html' },
            { name: 'Ratio Mixer', icon: 'fa-balance-scale', href: '/inh-ratio-mix/index.html' },
            { name: 'Manufacturing Order', icon: 'fa-industry', href: '/raw-manufacturing-order.html' },
            { name: 'QR Code Tracker', icon: 'fa-qrcode', href: '/qr-manager.html' },
            {
                name: 'SOP',
                icon: 'fa-book',
                href: '#',
                subItems: [
                    { name: 'Bone Straight', href: '/sop-bone-straight.html' },
                    { name: 'Curly', href: '/sop-curly.html' },
                    { name: 'Softening', href: '/sop-softening.html' },
                    { name: 'Bleach Calculator', href: '/sop-bleach-calculator.html' },
                    { name: 'Cuticle Removal', href: '/sop-cuticle-removal.html' }
                ]
            },
            {
                name: 'Payroll',
                icon: 'fa-money-check-dollar',
                href: '/payroll/index.html'
            }
        ]
    };

    // Determine current page for active state
    const currentPath = window.location.pathname;

    // fix for root index.html when served as /
    const normalizedPath = currentPath === '/' ? '/index.html' : currentPath;

    // Styles for the navigation
    const styles = `
        /* Navigation Styles */
        .universal-nav {
            background: rgba(15, 23, 42, 0.85); /* Dark slate glass */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: white;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .universal-nav-container {
            max-width: 90rem;
            margin: 0 auto;
            padding: 0 1rem;
        }
        @media (min-width: 640px) { .universal-nav-container { padding: 0 1.5rem; } }
        @media (min-width: 1024px) { .universal-nav-container { padding: 0 2rem; } }

        .universal-nav-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 4.5rem; /* Slightly taller for breathing room */
        }

        .universal-nav-logo-area {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .universal-nav-logo {
            height: 2.2rem;
            width: auto;
            opacity: 1;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .universal-nav-title {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            background: linear-gradient(to right, #ffffff, #e2e8f0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Pill Menu Styles */
        .universal-pill-menu {
            display: none;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 1rem 0.5rem;
            width: 100%;
            background: rgba(15, 23, 42, 0.98);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            z-index: 40;
        }

        .universal-pill-menu.active {
            display: flex;
        }

        /* Hamburger Menu Icon */
        .universal-hamburger-menu {
            display: flex;
            flex-direction: column;
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .universal-hamburger-menu:hover {
            background-color: rgba(255, 255, 255, 0.15);
        }

        .universal-hamburger-line {
            width: 22px;
            height: 2px;
            background-color: white;
            margin: 2.5px 0;
            transition: 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            border-radius: 2px;
        }

        .universal-hamburger-menu.active .universal-hamburger-line:nth-child(1) {
            transform: rotate(-45deg) translate(-4px, 5px);
        }
        .universal-hamburger-menu.active .universal-hamburger-line:nth-child(2) {
            opacity: 0;
            transform: scale(0);
        }
        .universal-hamburger-menu.active .universal-hamburger-line:nth-child(3) {
            transform: rotate(45deg) translate(-5px, -6px);
        }

        .universal-nav-item-wrapper {
            position: relative;
            display: inline-block;
        }

        .universal-menu-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.4rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            color: #e2e8f0;
            text-decoration: none;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            background-color: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            white-space: nowrap;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }

        .universal-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.18);
            border-color: rgba(255, 255, 255, 0.3);
            color: #ffffff;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .universal-menu-item.active-page {
             background: linear-gradient(135deg, #f59e0b, #ea580c);
             color: white;
             box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
             border-color: rgba(255, 255, 255, 0.3);
             text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        /* Dropdown Styles */
        .universal-dropdown-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            min-width: 220px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            z-index: 60;
            padding: 0.5rem 0;
            margin-top: 0.5rem;
            animation: dropdownFade 0.2s ease-out;
        }

        .universal-nav-item-wrapper:hover .universal-dropdown-menu {
            display: block;
        }

        .universal-dropdown-item {
            display: block;
            padding: 0.75rem 1.25rem;
            color: #cbd5e1;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }

        .universal-dropdown-item:hover {
            background-color: rgba(255, 255, 255, 0.08);
            color: #ffffff;
            border-left-color: #f59e0b;
        }

        /* Mobile Menu */
        .universal-mobile-menu {
            display: none;
            background: rgba(15, 23, 42, 0.98);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 1rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .universal-mobile-menu.active {
            display: block;
        }

        @media (min-width: 1024px) {
            .universal-mobile-menu {
                display: none !important;
            }
        }

        .universal-mobile-sub-item {
            padding-left: 2rem;
            font-size: 0.95rem;
            opacity: 0.9;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes dropdownFade {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    // Inject CSS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Helper to check access
    function canAccessNav(itemName) {
        // If access control function exists, use it
        if (typeof hasAccessTo === 'function') {
            return hasAccessTo('App: ' + itemName);
        }

        // Otherwise, fallback to checking localStorage
        const email = (localStorage.getItem('SESSION_EMAIL') || '').trim().toLowerCase();
        const INH_ADMINS = ['info@indiannaturalhair.com', 'info@praveenasok.com'];
        if (INH_ADMINS.includes(email)) return true;

        try {
            const segments = JSON.parse(localStorage.getItem('USER_SEGMENTS') || '[]');
            return segments.includes('App: ' + itemName);
        } catch (e) {
            return false;
        }
    }

    // Create Navigation HTML
    function createNavHTML() {
        // Filter items based on access control
        const accessibleMenuItems = navConfig.menuItems.filter(item => canAccessNav(item.name));

        // Pill Menu Items
        const pillMenuItemsHTML = accessibleMenuItems.map(item => {
            if (item.subItems) {
                const subItemsHTML = item.subItems.map(sub => `
                    <a href="${sub.href}" class="universal-dropdown-item">
                        ${sub.name}
                    </a>
                `).join('');

                return `
                    <div class="universal-nav-item-wrapper">
                        <a href="${item.href}" class="universal-menu-item">
                            ${item.name} <i class="fas fa-chevron-down ml-1" style="font-size: 0.7em;"></i>
                        </a>
                        <div class="universal-dropdown-menu">
                            ${subItemsHTML}
                        </div>
                    </div>
                `;
            } else {
                const isActive = normalizedPath.endsWith(item.href) || (item.href !== '/index.html' && normalizedPath.includes(item.href));
                return `
                    <div class="universal-nav-item-wrapper">
                        <a href="${item.href}" class="universal-menu-item ${isActive ? 'active-page' : ''}">
                            <i class="fas ${item.icon} mr-2"></i>${item.name}
                        </a>
                    </div>
                `;
            }
        }).join('');

        return `
            <div class="universal-nav">
                <div class="universal-nav-container">
                    <div class="universal-nav-content" style="flex-direction: column; height: auto; align-items: stretch; padding: 0.5rem 0;">
                        <div class="universal-nav-logo-area" style="display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; margin-bottom: 0;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <img src="${navConfig.logoSrc}" alt="Logo" class="universal-nav-logo">
                                <span class="universal-nav-title">${navConfig.siteTitle}</span>
                            </div>
                            
                            <!-- Hamburger Menu Button -->
                            <div class="universal-hamburger-menu" id="universalHamburger">
                                <div class="universal-hamburger-line"></div>
                                <div class="universal-hamburger-line"></div>
                                <div class="universal-hamburger-line"></div>
                            </div>
                        </div>
                        
                        <!-- Pill Menu -->
                        <div class="universal-pill-menu" id="universalPillMenu">
                            ${pillMenuItemsHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Function to initialize navigation
    function initNav() {
        // Prevent duplicate navigation bars
        if (document.querySelector('.universal-nav')) {
            return;
        }

        // Check if font-awesome is loaded
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }

        // Insert Nav as first child of body
        const navContainer = document.createElement('div');
        navContainer.innerHTML = createNavHTML();
        document.body.insertBefore(navContainer.firstElementChild, document.body.firstChild);

        // Bind events
        const hamburger = document.getElementById('universalHamburger');
        const pillMenu = document.getElementById('universalPillMenu');

        if (hamburger && pillMenu) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                hamburger.classList.toggle('active');
                pillMenu.classList.toggle('active');
            });

            // Close when clicking outside
            document.addEventListener('click', function (event) {
                if (!hamburger.contains(event.target) && !pillMenu.contains(event.target)) {
                    hamburger.classList.remove('active');
                    pillMenu.classList.remove('active');
                }
            });
        }
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }

})();
