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
            { name: 'Jobwork Billing', icon: 'fa-file-invoice-dollar', href: '/inh-jobwork.html' },
            { name: 'Price Lookup', icon: 'fa-tags', href: '/price-lookup.html' },
            { name: 'Price Calculator', icon: 'fa-calculator', href: '/pricelists.html' },
            { name: 'Shipping', icon: 'fa-truck', href: '/shipping-calculator/index.html' },
            { name: 'Shipping Paperwork', icon: 'fa-file-invoice', href: '/shipping-paperwork.html' },
            { name: 'Proforma Invoice', icon: 'fa-file-signature', href: '/proforma-invoice.html' },
            { name: 'Production Status', icon: 'fa-clipboard-list', href: '/delegated-orders.html' },
            { name: 'Ratio Mixer', icon: 'fa-balance-scale', href: '/inh-ratio-mix/index.html' },
            { name: 'Manufacturing Order', icon: 'fa-industry', href: '/raw-manufacturing-order.html' },
            { name: 'Inventory Hub', icon: 'fa-boxes-stacked', href: '/inventory-system/dist/index.html' },
            { name: 'New Inventory', icon: 'fa-box-open', href: '/new-inventory-system/index.html' },
            { name: 'Hair Stock Ledger', icon: 'fa-warehouse', href: '/stocks/index.html' },
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
            background: linear-gradient(to right, #1e3a8a, #1e40af, #b45309);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
            height: 4rem;
        }

        .universal-nav-logo-area {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .universal-nav-logo {
            height: 2rem;
            width: auto;
            opacity: 0.9;
        }

        .universal-nav-title {
            font-size: 1.125rem;
            font-weight: 700;
        }

        /* Desktop Menu Styles */
        .universal-desktop-menu {
            display: none; /* hidden by default on mobile */
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.35rem; /* Reduced gap */
            padding: 0.35rem 0.5rem; /* Reduced padding */
            width: 100%;
        }

        @media (min-width: 1024px) {
            .universal-desktop-menu {
                display: flex; /* show on desktop */
            }
        }

        /* Hamburger Menu Icon */
        .universal-hamburger-menu {
            display: flex;
            flex-direction: column;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }

        @media (min-width: 1024px) {
            .universal-hamburger-menu {
                display: none !important; /* hide on desktop */
            }
        }

        .universal-hamburger-menu:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .universal-hamburger-line {
            width: 25px;
            height: 3px;
            background-color: white;
            margin: 3px 0;
            transition: 0.3s;
            border-radius: 2px;
        }

        .universal-hamburger-menu.active .universal-hamburger-line:nth-child(1) {
            transform: rotate(-45deg) translate(-5px, 6px);
        }

        .universal-hamburger-menu.active .universal-hamburger-line:nth-child(2) {
            opacity: 0;
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
            padding: 0.35rem 0.65rem; /* Reduced padding */
            border-radius: 9999px; /* Pill shape */
            font-size: 0.75rem; /* Reduced font size */
            font-weight: 600;
            color: white;
            text-decoration: none;
            transition: all 0.2s ease;
            background-color: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            white-space: nowrap;
        }

        .universal-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
        }

        .universal-menu-item.active-page {
             background-color: #f59e0b; /* Amber 500 */
             color: white;
             box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
             border-color: #f59e0b;
        }

        /* Dropdown Styles */
        .universal-dropdown-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: #1e3a8a; 
            min-width: 220px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-radius: 0.5rem;
            z-index: 60;
            padding: 0.5rem 0;
            margin-top: 0.25rem;
        }

        .universal-nav-item-wrapper:hover .universal-dropdown-menu {
            display: block;
        }

        .universal-dropdown-item {
            display: block;
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .universal-dropdown-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        /* Mobile Menu */
        .universal-mobile-menu {
            display: none;
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #d97706 100%);
            padding: 0.5rem 0;
            animation: slideDown 0.3s ease-out;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
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

        // Desktop Menu Items
        const desktopMenuItemsHTML = accessibleMenuItems.map(item => {
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

        // Mobile Menu Items
        const mobileMenuItemsHTML = accessibleMenuItems.map(item => {
            const isActive = normalizedPath.endsWith(item.href) || (item.href !== '/index.html' && normalizedPath.includes(item.href));

            let html = `
                <a href="${item.href}" class="universal-menu-item ${isActive ? 'active-page' : ''}">
                    <i class="fas ${item.icon} mr-2"></i> ${item.name}
                </a>
            `;

            if (item.subItems) {
                const subItemsHTML = item.subItems.map(sub => `
                    <a href="${sub.href}" class="universal-menu-item universal-mobile-sub-item">
                        ${sub.name}
                    </a>
                `).join('');
                html += subItemsHTML;
            }

            return html;
        }).join('');

        return `
            <div class="universal-nav">
                <div class="universal-nav-container">
                    <div class="universal-nav-content" style="flex-direction: column; height: auto; align-items: stretch; padding: 0.5rem 0;">
                        <div class="universal-nav-logo-area" style="display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; margin-bottom: 0.5rem;">
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
                        <div class="universal-desktop-menu">
                            ${desktopMenuItemsHTML}
                        </div>
                    </div>
                </div>

                <!-- Mobile Menu -->
                <div class="universal-mobile-menu" id="universalMobileMenu">
                    ${mobileMenuItemsHTML}
                </div>
            </div>
        `;
    }

    // Function to initialize navigation
    function initNav() {
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
        const mobileMenu = document.getElementById('universalMobileMenu');

        if (hamburger && mobileMenu) {
            hamburger.addEventListener('click', function (e) {
                e.stopPropagation();
                hamburger.classList.toggle('active');
                mobileMenu.classList.toggle('active');
            });

            // Close when clicking outside
            document.addEventListener('click', function (event) {
                if (!hamburger.contains(event.target) && !mobileMenu.contains(event.target)) {
                    hamburger.classList.remove('active');
                    mobileMenu.classList.remove('active');
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
