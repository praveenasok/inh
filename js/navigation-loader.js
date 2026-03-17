/**
 * InstaQuote Unified Navigation Loader
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
        siteTitle: (window.navConfig && window.navConfig.siteTitle) || 'InstaQuote Suite',
        menuItems: [
            { name: 'Home', icon: 'fa-home', href: '/index.html' },
            { name: 'Quote Maker', icon: 'fa-file-invoice-dollar', href: '/quotemaker.html' },
            { name: 'Shipping', icon: 'fa-truck', href: '/shipping-calculator/index.html' },
            { name: 'Catalog', icon: 'fa-th-large', href: '/productcatalog.html' },
            { name: 'Price Lists', icon: 'fa-calculator', href: '/pricelists.html' },
            { name: 'Orders', icon: 'fa-list', href: '/orders.html' },
            { name: 'Order List', icon: 'fa-table-list', href: '/order-list.html' },
            { name: 'Order Entry', icon: 'fa-file-signature', href: '/order-entry.html' },
            { name: 'Product Configurator', icon: 'fa-cogs', href: '/product-configurator.html' },
            { name: 'Ratio Mixer', icon: 'fa-balance-scale', href: '/inh-ratio-mix/index.html' },
            { name: 'Manufacturing Order', icon: 'fa-industry', href: '/raw-manufacturing-order.html' },
            { name: 'Inventory', icon: 'fa-boxes', href: '/inventory.html' },
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
            { name: 'Admin', icon: 'fa-cog', href: '/adminpanel.html' },
            { name: 'Files', icon: 'fa-share-alt', href: '/share-files.html' },
            { name: 'Sheets Config', icon: 'fa-table', href: '/google-sheets-config-interface.html' }
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

        /* Desktop Menu Styles - REMOVED for Hamburger Only */
        .universal-desktop-menu {
            display: none !important;
        }

        /* Ensure hamburger is always visible */
        .universal-hamburger-menu {
            display: flex !important;
        }

        .universal-nav-item-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            height: 100%;
        }

        .universal-menu-item {
            display: block;
            padding: 0.5rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.9rem;
            font-weight: 500;
            color: white;
            text-decoration: none;
            transition: background-color 0.2s;
            margin: 0 0.25rem;
            white-space: nowrap;
        }

        .universal-menu-item:hover {
            background-color: rgba(30, 58, 138, 0.8);
            color: #e5e7eb;
        }

        .universal-menu-item.active-page {
             background-color: rgba(0, 0, 0, 0.2);
             font-weight: 700;
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
            border-radius: 0 0 0.375rem 0.375rem;
            z-index: 60;
            padding: 0.5rem 0;
        }

        .universal-nav-item-wrapper:hover .universal-dropdown-menu {
            display: block;
        }

        .universal-dropdown-item {
            display: block;
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            font-size: 0.95rem;
            transition: background-color 0.2s;
        }

        .universal-dropdown-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        /* Hamburger Menu Button */
        .universal-hamburger-menu {
            display: flex;
            flex-direction: column;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.3s ease;
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

    // Create Navigation HTML
    function createNavHTML() {
        // Desktop Menu Items
        const desktopMenuItemsHTML = navConfig.menuItems.map(item => {
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
        const mobileMenuItemsHTML = navConfig.menuItems.map(item => {
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
                    <div class="universal-nav-content">
                        <div class="universal-nav-logo-area">
                            <img src="${navConfig.logoSrc}" alt="Logo" class="universal-nav-logo">
                            <span class="universal-nav-title">${navConfig.siteTitle}</span>
                        </div>
                        
                        <!-- Desktop Menu (Hidden) -->
                        <div class="universal-desktop-menu" style="display: none;"></div>

                        <!-- Hamburger Menu Button -->
                        <div class="universal-hamburger-menu" id="universalHamburger">
                            <div class="universal-hamburger-line"></div>
                            <div class="universal-hamburger-line"></div>
                            <div class="universal-hamburger-line"></div>
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
