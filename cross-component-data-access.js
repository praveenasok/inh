/**
 * Cross-Component Data Access Service
 * Ensures local storage data is accessible to all key components:
 * - quote-maker-v2-ver3.html
 * - product-catalog.html
 * - price-calculator.html
 * - admin-panel.html
 */

class CrossComponentDataAccess {
    constructor() {
        this.collections = [
            'products', 'clients', 'quotes', 'orders', 
            'salesmen', 'pricelists', 'categories', 'colors', 'styles'
        ];
        
        this.eventListeners = new Map();
        this.cache = new Map();
        this.lastUpdate = new Map();
        
        // Initialize cache
        this.initializeCache();
        
        // Set up storage event listener for cross-tab synchronization
        this.setupStorageListener();
    }

    // Initialize cache with current localStorage data
    initializeCache() {
        this.collections.forEach(collection => {
            this.refreshCache(collection);
        });
    }

    // Set up storage event listener for real-time updates
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (this.collections.includes(event.key)) {
                this.refreshCache(event.key);
                this.emit('data-updated', { collection: event.key, data: this.getCollection(event.key) });
            }
        });
    }

    // Event system for real-time updates
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Refresh cache for a specific collection
    refreshCache(collection) {
        try {
            const data = localStorage.getItem(collection);
            const parsedData = data ? JSON.parse(data) : [];
            this.cache.set(collection, parsedData);
            this.lastUpdate.set(collection, new Date().toISOString());
        } catch (error) {
            console.warn(`Error refreshing cache for ${collection}:`, error);
            this.cache.set(collection, []);
        }
    }

    // Get data for a specific collection
    getCollection(collection) {
        if (!this.cache.has(collection)) {
            this.refreshCache(collection);
        }
        return this.cache.get(collection) || [];
    }

    // Get all collections data
    getAllCollections() {
        const result = {};
        this.collections.forEach(collection => {
            result[collection] = this.getCollection(collection);
        });
        return result;
    }

    // Get products with enhanced filtering
    getProducts(filters = {}) {
        const products = this.getCollection('products');
        
        if (Object.keys(filters).length === 0) {
            return products;
        }

        return products.filter(product => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === null || value === undefined || value === '') {
                    return true;
                }
                
                if (typeof value === 'string') {
                    return product[key]?.toString().toLowerCase().includes(value.toLowerCase());
                }
                
                return product[key] === value;
            });
        });
    }

    // Get clients with search functionality
    getClients(searchTerm = '') {
        const clients = this.getCollection('clients');
        
        if (!searchTerm) {
            return clients;
        }

        const term = searchTerm.toLowerCase();
        return clients.filter(client => 
            client.name?.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term) ||
            client.company?.toLowerCase().includes(term) ||
            client.phone?.includes(term)
        );
    }

    // Get quotes for current device
    getDeviceQuotes() {
        const quotes = this.getCollection('quotes');
        const deviceId = this.getDeviceId();
        
        return quotes.filter(quote => quote.deviceId === deviceId);
    }

    // Get orders for current device
    getDeviceOrders() {
        const orders = this.getCollection('orders');
        const deviceId = this.getDeviceId();
        
        return orders.filter(order => order.deviceId === deviceId);
    }

    // Get salesmen/salespeople
    getSalesmen() {
        return this.getCollection('salesmen');
    }

    // Get categories
    getCategories() {
        return this.getCollection('categories');
    }

    // Get colors
    getColors() {
        return this.getCollection('colors');
    }

    // Get styles
    getStyles() {
        return this.getCollection('styles');
    }

    // Get price lists
    getPriceLists() {
        return this.getCollection('pricelists');
    }

    // Save data to a collection
    saveToCollection(collection, data, options = {}) {
        try {
            let currentData = this.getCollection(collection);
            
            if (options.append) {
                // Add new item
                if (Array.isArray(data)) {
                    currentData = [...currentData, ...data];
                } else {
                    currentData.push(data);
                }
            } else if (options.update && data.id) {
                // Update existing item
                const index = currentData.findIndex(item => item.id === data.id);
                if (index !== -1) {
                    currentData[index] = { ...currentData[index], ...data };
                } else {
                    currentData.push(data);
                }
            } else {
                // Replace entire collection
                currentData = Array.isArray(data) ? data : [data];
            }

            // Add device ID and timestamp for tracking
            if (options.addDeviceInfo) {
                const deviceId = this.getDeviceId();
                const timestamp = new Date().toISOString();
                
                if (Array.isArray(currentData)) {
                    currentData = currentData.map(item => ({
                        ...item,
                        deviceId: item.deviceId || deviceId,
                        lastModified: timestamp
                    }));
                } else {
                    currentData = {
                        ...currentData,
                        deviceId: deviceId,
                        lastModified: timestamp
                    };
                }
            }

            // Save to localStorage
            localStorage.setItem(collection, JSON.stringify(currentData));
            
            // Update cache
            this.cache.set(collection, currentData);
            this.lastUpdate.set(collection, new Date().toISOString());
            
            // Emit update event
            this.emit('data-saved', { collection, data: currentData });
            
            return true;
        } catch (error) {
            console.error(`Error saving to ${collection}:`, error);
            return false;
        }
    }

    // Delete item from collection
    deleteFromCollection(collection, itemId) {
        try {
            let currentData = this.getCollection(collection);
            currentData = currentData.filter(item => item.id !== itemId);
            
            localStorage.setItem(collection, JSON.stringify(currentData));
            this.cache.set(collection, currentData);
            this.lastUpdate.set(collection, new Date().toISOString());
            
            this.emit('data-deleted', { collection, itemId, data: currentData });
            
            return true;
        } catch (error) {
            console.error(`Error deleting from ${collection}:`, error);
            return false;
        }
    }

    // Get device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // Get data statistics
    getDataStatistics() {
        const stats = {};
        
        this.collections.forEach(collection => {
            const data = this.getCollection(collection);
            stats[collection] = {
                count: data.length,
                lastUpdate: this.lastUpdate.get(collection),
                hasData: data.length > 0
            };
        });
        
        return stats;
    }

    // Populate dropdowns for quote maker
    populateQuoteMakerDropdowns() {
        const dropdownData = {
            products: this.getProducts(),
            clients: this.getClients(),
            salesmen: this.getSalesmen(),
            categories: this.getCategories(),
            colors: this.getColors(),
            styles: this.getStyles()
        };

        // Emit event for quote maker to update dropdowns
        this.emit('populate-dropdowns', dropdownData);
        
        return dropdownData;
    }

    // Populate dropdowns for product catalog
    populateProductCatalogData() {
        const catalogData = {
            products: this.getProducts(),
            categories: this.getCategories(),
            colors: this.getColors(),
            styles: this.getStyles(),
            pricelists: this.getPriceLists()
        };

        this.emit('populate-catalog', catalogData);
        
        return catalogData;
    }

    // Populate dropdowns for price calculator
    populatePriceCalculatorData() {
        const calculatorData = {
            products: this.getProducts(),
            pricelists: this.getPriceLists(),
            categories: this.getCategories()
        };

        this.emit('populate-calculator', calculatorData);
        
        return calculatorData;
    }

    // Get data for admin panel statistics
    getAdminPanelData() {
        const adminData = {
            statistics: this.getDataStatistics(),
            deviceQuotes: this.getDeviceQuotes(),
            deviceOrders: this.getDeviceOrders(),
            allCollections: this.getAllCollections(),
            deviceId: this.getDeviceId()
        };

        this.emit('populate-admin', adminData);
        
        return adminData;
    }

    // Clear all data (for testing purposes)
    clearAllData() {
        this.collections.forEach(collection => {
            localStorage.removeItem(collection);
            this.cache.delete(collection);
            this.lastUpdate.delete(collection);
        });
        
        this.emit('data-cleared', {});
    }

    // Export data for backup
    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            deviceId: this.getDeviceId(),
            collections: this.getAllCollections(),
            statistics: this.getDataStatistics()
        };
        
        return exportData;
    }

    // Import data from backup
    importData(importData) {
        try {
            if (importData.collections) {
                Object.entries(importData.collections).forEach(([collection, data]) => {
                    if (this.collections.includes(collection)) {
                        this.saveToCollection(collection, data);
                    }
                });
            }
            
            this.emit('data-imported', importData);
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Check data integrity
    checkDataIntegrity() {
        const issues = [];
        
        this.collections.forEach(collection => {
            const data = this.getCollection(collection);
            
            if (!Array.isArray(data)) {
                issues.push(`${collection}: Data is not an array`);
                return;
            }
            
            data.forEach((item, index) => {
                if (!item.id) {
                    issues.push(`${collection}[${index}]: Missing ID`);
                }
            });
        });
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            checkedAt: new Date().toISOString()
        };
    }
}

// Create global instance
window.CrossComponentDataAccess = CrossComponentDataAccess;

// Auto-initialize if not in a module environment
if (typeof module === 'undefined') {
    window.dataAccess = new CrossComponentDataAccess();
    
    // Make it available globally for easy access
    window.getData = (collection) => window.dataAccess.getCollection(collection);
    window.saveData = (collection, data, options) => window.dataAccess.saveToCollection(collection, data, options);
    window.getProducts = (filters) => window.dataAccess.getProducts(filters);
    window.getClients = (searchTerm) => window.dataAccess.getClients(searchTerm);
    window.getSalesmen = () => window.dataAccess.getSalesmen();
    window.getCategories = () => window.dataAccess.getCategories();
    window.getColors = () => window.dataAccess.getColors();
    window.getStyles = () => window.dataAccess.getStyles();
}