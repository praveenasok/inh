/**
 * Local Storage Dropdown Manager
 * Centralized system for managing dropdown population from local storage
 * Replaces all Firebase, API, and external data source dependencies
 */

class LocalStorageDropdownManager {
    constructor() {
        this.dataKeys = {
            products: ['fallback_data_products', 'products', 'fallback_products', 'firebaseProductData'],
            clients: ['fallback_data_clients', 'clientData', 'cloudClients', 'fallback_clients'],
            salespeople: ['fallback_data_salespeople', 'salespeople', 'cloudSalesmen', 'fallback_salespeople'],
            colors: ['fallback_data_colors', 'colors', 'fallback_colors'],
            styles: ['fallback_data_styles', 'styles', 'fallback_styles'],
            categories: ['fallback_data_categories', 'categories', 'fallback_categories'],
            priceLists: ['fallback_data_priceLists', 'priceLists', 'fallback_price_lists'],
            quotes: ['fallback_data_quotes', 'savedQuotes', 'cloudQuotes', 'fallback_quotes'],
            companies: ['fallback_data_companies', 'companies', 'fallback_companies']
        };
        
        this.cache = new Map();
        this.initialized = false;
        
    }

    /**
     * Initialize the manager and load all data into cache
     */
    async initialize() {
        try {
            
            // Load all data types into cache
            for (const [dataType, keys] of Object.entries(this.dataKeys)) {
                await this.loadDataToCache(dataType, keys);
            }
            
            this.initialized = true;
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load data from local storage to cache
     */
    async loadDataToCache(dataType, keys) {
        try {
            let data = [];
            
            // Try each key until we find valid data
            for (const key of keys) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            data = parsed;
                            break;
                        } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            // Handle object format data
                            data = Object.values(parsed);
                            if (data.length > 0) {
                                break;
                            }
                        }
                    } catch (parseError) {
                    }
                }
            }
            
            // Cache the data
            this.cache.set(dataType, data);
            
            if (data.length === 0) {
            }
            
            return data;
        } catch (error) {
            this.cache.set(dataType, []);
            return [];
        }
    }

    /**
     * Get data from cache or load from localStorage
     */
    async getData(dataType) {
        if (!this.cache.has(dataType)) {
            const keys = this.dataKeys[dataType] || [dataType];
            await this.loadDataToCache(dataType, keys);
        }
        
        // First try to get data from LocalFallbackManager if available
        if (window.localFallbackManager) {
            try {
                const fallbackData = await window.localFallbackManager.getData(dataType);
                if (fallbackData && fallbackData.length > 0) {
                    this.cache.set(dataType, fallbackData);
                    return fallbackData;
                }
            } catch (error) {
                console.warn(`Error getting data from LocalFallbackManager for ${dataType}:`, error);
            }
        }
        
        return this.cache.get(dataType) || [];
    }

    /**
     * Refresh data from localStorage
     */
    async refreshData(dataType = null) {
        if (dataType) {
            const keys = this.dataKeys[dataType] || [dataType];
            return await this.loadDataToCache(dataType, keys);
        } else {
            // Refresh all data
            for (const [type, keys] of Object.entries(this.dataKeys)) {
                await this.loadDataToCache(type, keys);
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
            const element = this.getElement(selectElement);
            
            const products = await this.getData('products');
            
            const priceLists = new Set();
            
            products.forEach(product => {
                const priceListName = product.PriceListName || product.PriceList || product['Price List Name'];
                if (priceListName && priceListName !== 'N/A' && priceListName.trim() !== '') {
                    priceLists.add(priceListName);
                }
            });
            
            const defaultOption = options.defaultOption || 'Select Price List';
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            const sortedPriceLists = Array.from(priceLists).sort();
            sortedPriceLists.forEach(priceList => {
                const option = document.createElement('option');
                option.value = priceList;
                option.textContent = priceList;
                element.appendChild(option);
            });
            
            return sortedPriceLists.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate client dropdown
     */
    async populateClientDropdown(selectElement, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const clients = await this.getData('clients');
            const defaultOption = options.defaultOption || 'Select Client';
            const includeAddNew = options.includeAddNew !== false;
            
            let html = `<option value="">${defaultOption}</option>`;
            if (includeAddNew) {
                html += '<option value="add-new">+ Add New Client</option>';
            }
            element.innerHTML = html;
            
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id || client.clientId;
                const clientName = client.clientName || client.name || client.Name;
                const companyName = client.companyName || client.company || client.Company || 'No Company';
                option.textContent = `${clientName} (${companyName})`;
                element.appendChild(option);
            });
            
            return clients.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate salesperson dropdown
     */
    async populateSalespersonDropdown(selectElement, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const salespeople = await this.getData('salespeople');
            const defaultOption = options.defaultOption || 'Select Salesperson';
            
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            salespeople.forEach(salesperson => {
                const option = document.createElement('option');
                const name = salesperson.name || salesperson.Name;
                option.value = name;
                option.textContent = name;
                element.appendChild(option);
            });
            
            return salespeople.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate category dropdown
     */
    async populateCategoryDropdown(selectElement, priceList = null, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const products = await this.getData('products');
            const categories = new Set();
            
            products.forEach(product => {
                if (!priceList || (product.PriceListName || product.PriceList || product['Price List Name']) === priceList) {
                    const category = product.Category || product.category;
                    if (category && category.trim() !== '') {
                        categories.add(category);
                    }
                }
            });
            
            const defaultOption = options.defaultOption || (priceList ? 'Select Category' : 'All Categories');
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            const sortedCategories = Array.from(categories).sort();
            sortedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                element.appendChild(option);
            });
            
            return sortedCategories.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate product dropdown
     */
    async populateProductDropdown(selectElement, priceList = null, category = null, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const products = await this.getData('products');
            const filteredProducts = products.filter(product => {
                const productPriceList = product.PriceListName || product.PriceList || product['Price List Name'];
                const productCategory = product.Category || product.category;
                
                return (!priceList || productPriceList === priceList) &&
                       (!category || productCategory === category);
            });
            
            const defaultOption = options.defaultOption || 'Select Product';
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            filteredProducts.forEach(product => {
                const option = document.createElement('option');
                const productName = product.ProductName || product.Product || product.name;
                option.value = productName;
                option.textContent = productName;
                element.appendChild(option);
            });
            
            return filteredProducts.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate color dropdown
     */
    async populateColorDropdown(selectElement, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const colors = await this.getData('colors');
            const defaultOption = options.defaultOption || 'Select Color';
            const includeCustom = options.includeCustom !== false;
            
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            colors.forEach(color => {
                const option = document.createElement('option');
                const colorName = color.name || color.Name || color.colorName;
                option.value = colorName;
                option.textContent = colorName;
                element.appendChild(option);
            });
            
            if (includeCustom) {
                const customOption = document.createElement('option');
                customOption.value = 'Custom';
                customOption.textContent = 'Custom Color';
                element.appendChild(customOption);
            }
            
            return colors.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate style dropdown
     */
    async populateStyleDropdown(selectElement, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const styles = await this.getData('styles');
            const defaultOption = options.defaultOption || 'Select Style';
            const includeCustom = options.includeCustom !== false;
            
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            styles.forEach(style => {
                const option = document.createElement('option');
                const styleName = style.name || style.Name || style.styleName;
                option.value = styleName;
                option.textContent = styleName;
                element.appendChild(option);
            });
            
            if (includeCustom) {
                const customOption = document.createElement('option');
                customOption.value = 'Custom';
                customOption.textContent = 'Custom Style';
                element.appendChild(customOption);
            }
            
            return styles.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate density dropdown from product data
     */
    async populateDensityDropdown(selectElement, priceList, category, product, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const products = await this.getData('products');
            const densities = new Set();
            
            products.forEach(prod => {
                const productPriceList = prod.PriceListName || prod.PriceList || prod['Price List Name'];
                const productCategory = prod.Category || prod.category;
                const productName = prod.ProductName || prod.Product || prod.name;
                
                if (productPriceList === priceList && productCategory === category && productName === product) {
                    const density = prod.Density || prod.density;
                    if (density && density.trim() !== '') {
                        densities.add(density);
                    }
                }
            });
            
            const defaultOption = options.defaultOption || 'Select Density';
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            const sortedDensities = Array.from(densities).sort();
            sortedDensities.forEach(density => {
                const option = document.createElement('option');
                option.value = density;
                option.textContent = density;
                element.appendChild(option);
            });
            
            return sortedDensities.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Populate length dropdown from product data
     */
    async populateLengthDropdown(selectElement, priceList, category, product, options = {}) {
        try {
            const element = this.getElement(selectElement);
            const products = await this.getData('products');
            const lengths = new Set();
            
            products.forEach(prod => {
                const productPriceList = prod.PriceListName || prod.PriceList || prod['Price List Name'];
                const productCategory = prod.Category || prod.category;
                const productName = prod.ProductName || prod.Product || prod.name;
                
                if (productPriceList === priceList && productCategory === category && productName === product) {
                    const length = prod.Length || prod.length;
                    if (length && length.toString().trim() !== '') {
                        lengths.add(length.toString());
                    }
                }
            });
            
            const defaultOption = options.defaultOption || 'Select Length';
            element.innerHTML = `<option value="">${defaultOption}</option>`;
            
            const sortedLengths = Array.from(lengths).sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
            });
            
            sortedLengths.forEach(length => {
                const option = document.createElement('option');
                option.value = length;
                option.textContent = length;
                element.appendChild(option);
            });
            
            return sortedLengths.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get color types for a specific product
     */
    async getColorTypesByProduct(priceList, category, product) {
        try {
            const products = await this.getData('products');
            const colorTypes = new Set();
            
            products.forEach(prod => {
                const productPriceList = prod.PriceListName || prod.PriceList || prod['Price List Name'];
                const productCategory = prod.Category || prod.category;
                const productName = prod.ProductName || prod.Product || prod.name;
                
                if (productPriceList === priceList && productCategory === category && productName === product) {
                    const colors = prod.Colors || prod.Color || prod.color || '';
                    if (colors && colors.toString().trim() !== '') {
                        // Split colors by comma and add each one
                        colors.split(',').forEach(color => {
                            const trimmedColor = color.trim();
                            if (trimmedColor) {
                                colorTypes.add(trimmedColor);
                            }
                        });
                    }
                }
            });
            
            const sortedColors = Array.from(colorTypes).sort();
            return sortedColors;
        } catch (error) {
            return [];
        }
    }

    /**
     * Get product data for pricing calculations
     */
    async getProductData(priceList, category, product, density = null, length = null) {
        try {
            const products = await this.getData('products');
            
            return products.find(prod => {
                const productPriceList = prod.PriceListName || prod.PriceList || prod['Price List Name'];
                const productCategory = prod.Category || prod.category;
                const productName = prod.ProductName || prod.Product || prod.name;
                const productDensity = prod.Density || prod.density;
                const productLength = prod.Length || prod.length;
                
                return productPriceList === priceList &&
                       productCategory === category &&
                       productName === product &&
                       (!density || productDensity === density) &&
                       (!length || productLength?.toString() === length?.toString());
            });
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if data is available
     */
    async isDataAvailable(dataType) {
        const data = await this.getData(dataType);
        return data && data.length > 0;
    }

    /**
     * Get data statistics
     */
    async getDataStats() {
        const stats = {};
        for (const dataType of Object.keys(this.dataKeys)) {
            const data = await this.getData(dataType);
            stats[dataType] = data ? data.length : 0;
        }
        return stats;
    }

    /**
     * Get products filtered by price list and category
     */
    async getProductsByPriceListAndCategory(priceList, category = null) {
        try {
            
            const products = await this.getData('products');
            if (!products || products.length === 0) {
                return [];
            }

            let filteredProducts = products;

            // Filter by price list
            if (priceList) {
                filteredProducts = filteredProducts.filter(product => {
                    const productPriceList = product.PriceListName || product.PriceList || product['Price List Name'];
                    return productPriceList === priceList;
                });
            }

            // Filter by category if provided
            if (category) {
                filteredProducts = filteredProducts.filter(product => {
                    const productCategory = product.Category || product.category || product.CategoryName;
                    return productCategory === category;
                });
            }

            // Extract unique product names
            const productNames = [...new Set(filteredProducts.map(product => {
                return product.ProductName || product.Product || product.Name || product.name;
            }))].filter(name => name && name.trim() !== '');

            return productNames.sort();

        } catch (error) {
            return [];
        }
    }
}

// Create global instance
window.localStorageDropdownManager = new LocalStorageDropdownManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.localStorageDropdownManager.initialize();
    });
} else {
    window.localStorageDropdownManager.initialize();
}

