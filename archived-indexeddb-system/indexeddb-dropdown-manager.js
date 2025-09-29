/**
 * IndexedDB Dropdown Manager
 * Replaces localStorage-based dropdown management with IndexedDB
 * Maintains the same interface as LocalStorageDropdownManager for seamless integration
 */

class IndexedDBDropdownManager {
    constructor(config = {}) {
        this.dbManager = null;
        this.cache = new Map();
        this.isInitialized = false;
        this.logLevel = config.logLevel || 'info';
        
        // Data type mappings for backward compatibility
        this.dataKeys = {
            products: ['products', 'data_products', 'fallback_products'],
            clients: ['clients', 'data_clients', 'fallback_clients'],
            salespeople: ['salespeople', 'data_salespeople', 'fallback_salespeople'],
            priceLists: ['priceLists', 'data_priceLists', 'fallback_priceLists'],
            colors: ['colors', 'data_colors', 'fallback_colors'],
            styles: ['styles', 'data_styles', 'fallback_styles'],
            categories: ['categories', 'data_categories', 'fallback_categories']
        };

        this.log('IndexedDB Dropdown Manager initialized', 'info');
    }

    /**
     * Initialize the dropdown manager
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('Dropdown manager already initialized', 'warn');
            return;
        }

        try {
            this.log('Initializing IndexedDB Dropdown Manager...', 'info');

            // Initialize IndexedDB Manager
            this.dbManager = new IndexedDBManager({
                dbName: 'INH_SyncDatabase',
                logLevel: this.logLevel
            });
            await this.dbManager.initialize();

            // Load all data into cache
            for (const dataType of Object.keys(this.dataKeys)) {
                await this.loadDataToCache(dataType);
            }

            this.isInitialized = true;
            this.log('IndexedDB Dropdown Manager initialized successfully', 'info');

        } catch (error) {
            this.log(`Failed to initialize dropdown manager: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Load data from IndexedDB to cache
     */
    async loadDataToCache(dataType) {
        try {
            if (!this.dbManager) {
                throw new Error('Database manager not initialized');
            }

            let data = [];
            
            try {
                // Get data from IndexedDB
                data = await this.dbManager.getAll(dataType);
                
                if (data && data.length > 0) {
                    this.log(`📦 Loaded ${data.length} ${dataType} from IndexedDB`, 'debug');
                } else {
                    this.log(`⚠️ No ${dataType} data found in IndexedDB`, 'warn');
                    data = [];
                }
            } catch (dbError) {
                this.log(`Failed to load ${dataType} from IndexedDB: ${dbError.message}`, 'error');
                data = [];
            }
            
            // Cache the data
            this.cache.set(dataType, data);
            
            return data;
        } catch (error) {
            this.log(`❌ Error loading ${dataType} to cache: ${error.message}`, 'error');
            this.cache.set(dataType, []);
            return [];
        }
    }

    /**
     * Get data from cache or load from IndexedDB
     */
    async getData(dataType) {
        if (!this.cache.has(dataType)) {
            this.log(`⚠️ ${dataType} not in cache, loading from IndexedDB...`, 'debug');
            await this.loadDataToCache(dataType);
        }
        
        return this.cache.get(dataType) || [];
    }

    /**
     * Refresh data from IndexedDB
     */
    async refreshData(dataType = null) {
        if (dataType) {
            return await this.loadDataToCache(dataType);
        } else {
            // Refresh all data
            for (const type of Object.keys(this.dataKeys)) {
                await this.loadDataToCache(type);
            }
        }
    }

    /**
     * Get DOM element from string ID or return the element if already a DOM element
     */
    getElement(elementOrId) {
        if (typeof elementOrId === 'string') {
            const element = document.getElementById(elementOrId);
            if (!element) {
                throw new Error(`Element with ID '${elementOrId}' not found`);
            }
            return element;
        }
        return elementOrId;
    }

    /**
     * Populate price list dropdown
     */
    async populatePriceListDropdown(selectElement, options = {}) {
        try {
            this.log('🔄 populatePriceListDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const products = await this.getData('products');
            this.log(`📦 Products data retrieved: ${products.length} items`, 'debug');
            
            const priceLists = new Set();
            
            // Extract unique price lists from products
            products.forEach(product => {
                if (product.priceList && product.active !== false) {
                    priceLists.add(product.priceList);
                }
            });

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Price List';
                element.appendChild(defaultOption);
            }

            // Sort and add price list options
            const sortedPriceLists = Array.from(priceLists).sort();
            sortedPriceLists.forEach(priceList => {
                const option = document.createElement('option');
                option.value = priceList;
                option.textContent = priceList;
                element.appendChild(option);
            });

            this.log(`✅ Populated price list dropdown with ${sortedPriceLists.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating price list dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate client dropdown
     */
    async populateClientDropdown(selectElement, options = {}) {
        try {
            this.log('🔄 populateClientDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const clients = await this.getData('clients');
            this.log(`📦 Clients data retrieved: ${clients.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Client';
                element.appendChild(defaultOption);
            }

            // Filter and sort clients
            const activeClients = clients.filter(client => client.active !== false);
            const sortedClients = activeClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Add client options
            sortedClients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                option.dataset.email = client.email || '';
                option.dataset.salesperson = client.salesperson || '';
                element.appendChild(option);
            });

            this.log(`✅ Populated client dropdown with ${sortedClients.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating client dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate salesperson dropdown
     */
    async populateSalespersonDropdown(selectElement, options = {}) {
        try {
            this.log('🔄 populateSalespersonDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const salespeople = await this.getData('salespeople');
            this.log(`📦 Salespeople data retrieved: ${salespeople.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Salesperson';
                element.appendChild(defaultOption);
            }

            // Filter and sort salespeople
            const activeSalespeople = salespeople.filter(person => person.active !== false);
            const sortedSalespeople = activeSalespeople.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Add salesperson options
            sortedSalespeople.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                option.dataset.email = person.email || '';
                option.dataset.territory = person.territory || '';
                element.appendChild(option);
            });

            this.log(`✅ Populated salesperson dropdown with ${sortedSalespeople.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating salesperson dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate category dropdown
     */
    async populateCategoryDropdown(selectElement, priceList = null, options = {}) {
        try {
            this.log('🔄 populateCategoryDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const products = await this.getData('products');
            this.log(`📦 Products data retrieved: ${products.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Category';
                element.appendChild(defaultOption);
            }

            // Filter products by price list if specified
            let filteredProducts = products.filter(product => product.active !== false);
            if (priceList) {
                filteredProducts = filteredProducts.filter(product => product.priceList === priceList);
            }

            // Extract unique categories
            const categories = new Set();
            filteredProducts.forEach(product => {
                if (product.category) {
                    categories.add(product.category);
                }
            });

            // Sort and add category options
            const sortedCategories = Array.from(categories).sort();
            sortedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                element.appendChild(option);
            });

            this.log(`✅ Populated category dropdown with ${sortedCategories.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating category dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate product dropdown
     */
    async populateProductDropdown(selectElement, priceList = null, category = null, options = {}) {
        try {
            this.log('🔄 populateProductDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const products = await this.getData('products');
            this.log(`📦 Products data retrieved: ${products.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Product';
                element.appendChild(defaultOption);
            }

            // Filter products
            let filteredProducts = products.filter(product => product.active !== false);
            
            if (priceList) {
                filteredProducts = filteredProducts.filter(product => product.priceList === priceList);
            }
            
            if (category) {
                filteredProducts = filteredProducts.filter(product => product.category === category);
            }

            // Sort products by name
            const sortedProducts = filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Add product options
            sortedProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                option.dataset.price = product.price || '';
                option.dataset.description = product.description || '';
                element.appendChild(option);
            });

            this.log(`✅ Populated product dropdown with ${sortedProducts.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating product dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate color dropdown
     */
    async populateColorDropdown(selectElement, options = {}) {
        try {
            this.log('🔄 populateColorDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const colors = await this.getData('colors');
            this.log(`📦 Colors data retrieved: ${colors.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Color';
                element.appendChild(defaultOption);
            }

            // Filter and sort colors
            const activeColors = colors.filter(color => color.active !== false);
            const sortedColors = activeColors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Add color options
            sortedColors.forEach(color => {
                const option = document.createElement('option');
                option.value = color.id;
                option.textContent = color.name;
                option.dataset.hexCode = color.hexCode || '';
                option.dataset.category = color.category || '';
                element.appendChild(option);
            });

            this.log(`✅ Populated color dropdown with ${sortedColors.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating color dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Populate style dropdown
     */
    async populateStyleDropdown(selectElement, options = {}) {
        try {
            this.log('🔄 populateStyleDropdown called', 'debug');
            const element = this.getElement(selectElement);
            
            const styles = await this.getData('styles');
            this.log(`📦 Styles data retrieved: ${styles.length} items`, 'debug');

            // Clear existing options
            element.innerHTML = '';
            
            // Add default option
            if (options.includeDefault !== false) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultText || 'Select Style';
                element.appendChild(defaultOption);
            }

            // Filter and sort styles
            const activeStyles = styles.filter(style => style.active !== false);
            const sortedStyles = activeStyles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Add style options
            sortedStyles.forEach(style => {
                const option = document.createElement('option');
                option.value = style.id;
                option.textContent = style.name;
                option.dataset.category = style.category || '';
                option.dataset.description = style.description || '';
                element.appendChild(option);
            });

            this.log(`✅ Populated style dropdown with ${sortedStyles.length} options`, 'debug');
            
            // Trigger change event if callback provided
            if (options.onChange) {
                element.addEventListener('change', options.onChange);
            }

        } catch (error) {
            this.log(`❌ Error populating style dropdown: ${error.message}`, 'error');
        }
    }

    /**
     * Get product data by filters
     */
    async getProductData(priceList, category, product, density = null, length = null) {
        try {
            const products = await this.getData('products');
            
            let filteredProducts = products.filter(p => 
                p.active !== false &&
                (!priceList || p.priceList === priceList) &&
                (!category || p.category === category) &&
                (!product || p.id === product)
            );

            return filteredProducts;
        } catch (error) {
            this.log(`❌ Error getting product data: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Get products by price list and category
     */
    async getProductsByPriceListAndCategory(priceList, category = null) {
        try {
            const products = await this.getData('products');
            
            let filteredProducts = products.filter(product => 
                product.active !== false &&
                product.priceList === priceList &&
                (!category || product.category === category)
            );

            return filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } catch (error) {
            this.log(`❌ Error getting products by price list and category: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Check if data is available for a specific type
     */
    async isDataAvailable(dataType) {
        try {
            const data = await this.getData(dataType);
            return data && data.length > 0;
        } catch (error) {
            this.log(`❌ Error checking data availability for ${dataType}: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Get data statistics
     */
    async getDataStats() {
        const stats = {};
        
        for (const dataType of Object.keys(this.dataKeys)) {
            try {
                const data = await this.getData(dataType);
                stats[dataType] = {
                    count: data.length,
                    available: data.length > 0
                };
            } catch (error) {
                stats[dataType] = {
                    count: 0,
                    available: false,
                    error: error.message
                };
            }
        }
        
        return stats;
    }

    /**
     * Force refresh all data from IndexedDB
     */
    async forceRefresh() {
        this.log('🔄 Force refreshing all data from IndexedDB', 'info');
        this.cache.clear();
        await this.refreshData();
        this.log('✅ Force refresh completed', 'info');
    }

    /**
     * Get sync status from the database
     */
    async getSyncStatus() {
        if (!this.dbManager) {
            return { initialized: false };
        }

        try {
            const stats = await this.dbManager.getStats();
            return {
                initialized: true,
                dbStats: stats,
                cacheStats: {
                    cachedTypes: Array.from(this.cache.keys()),
                    totalCachedRecords: Array.from(this.cache.values()).reduce((sum, data) => sum + data.length, 0)
                }
            };
        } catch (error) {
            return {
                initialized: true,
                error: error.message
            };
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[IndexedDB Dropdown Manager ${level.toUpperCase()}] ${timestamp}:`;
            
            switch (level) {
                case 'error':
                    break;
                case 'warn':
                    break;
                case 'debug':
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.IndexedDBDropdownManager = IndexedDBDropdownManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBDropdownManager;
}