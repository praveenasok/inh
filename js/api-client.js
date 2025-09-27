/**
 * Frontend API Client
 * Provides data access through server API endpoints with automatic fallback
 * Replaces direct Firebase access with server-side API calls
 */

class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.eventListeners = new Map();
        this.isApiAvailable = true; // Track API availability
        
        // Collection endpoints mapping
        this.endpoints = {
            products: '/api/products',
            clients: '/api/clients', 
            salespeople: '/api/salespeople',
            colors: '/api/colors',
            styles: '/api/styles',
            quotes: '/api/quotes',
            orders: '/api/orders',
            categories: '/api/categories',
            priceLists: '/api/priceLists'
        };
    }

    // ==================== CORE DATA ACCESS ====================

    async getData(collection, options = {}) {
        try {
            // Check cache first
            if (!options.skipCache) {
                const cached = this.getCachedData(collection);
                if (cached) {
                    console.log(`📦 Using cached data for ${collection}`);
                    return cached;
                }
            }

            const endpoint = this.endpoints[collection];
            if (!endpoint) {
                throw new Error(`Unknown collection: ${collection}`);
            }

            console.log(`🌐 Fetching ${collection} from server API: ${endpoint}`);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add timeout
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                // If API endpoint doesn't exist (404), mark API as unavailable
                if (response.status === 404) {
                    this.isApiAvailable = false;
                    console.warn(`API endpoint ${endpoint} not found (404). API marked as unavailable.`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Handle different response formats
            let data;
            if (result.success && result.data) {
                data = result.data;
            } else if (Array.isArray(result)) {
                data = result;
            } else if (result.data) {
                data = result.data;
            } else {
                data = result;
            }

            // Ensure data is an array
            if (!Array.isArray(data)) {
                data = [];
            }

            // Cache the result
            this.setCachedData(collection, data);

            console.log(`✅ Successfully loaded ${data.length} items from ${collection}`);
            this.emit('dataLoaded', { collection, count: data.length, source: 'api' });

            return data;

        } catch (error) {
            console.error(`❌ Error loading ${collection}:`, error);
            
            // Mark API as unavailable for network errors
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                this.isApiAvailable = false;
                console.warn(`API marked as unavailable due to network error: ${error.message}`);
            }
            
            this.emit('dataError', { collection, error: error.message });
            
            // Return empty array on error
            return [];
        }
    }

    async saveData(collection, data, options = {}) {
        try {
            const endpoint = this.endpoints[collection];
            if (!endpoint) {
                throw new Error(`Unknown collection: ${collection}`);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Invalidate cache
            this.invalidateCache(collection);
            
            this.emit('dataSaved', { collection, data, result });
            return result;

        } catch (error) {
            console.error(`❌ Error saving ${collection}:`, error);
            this.emit('saveError', { collection, error: error.message });
            throw error;
        }
    }

    // ==================== CACHE MANAGEMENT ====================

    getCachedData(collection) {
        const cached = this.cache.get(collection);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCachedData(collection, data) {
        this.cache.set(collection, {
            data: data,
            timestamp: Date.now()
        });
    }

    invalidateCache(collection) {
        if (collection) {
            this.cache.delete(collection);
        } else {
            this.cache.clear();
        }
    }

    // ==================== CONVENIENCE METHODS ====================

    async getProducts(options = {}) {
        return this.getData('products', options);
    }

    async getClients(options = {}) {
        return this.getData('clients', options);
    }

    async getSalespeople(options = {}) {
        return this.getData('salespeople', options);
    }

    async getColors(options = {}) {
        return this.getData('colors', options);
    }

    async getStyles(options = {}) {
        return this.getData('styles', options);
    }

    async getQuotes(options = {}) {
        return this.getData('quotes', options);
    }

    async getOrders(options = {}) {
        return this.getData('orders', options);
    }

    async getCategories(options = {}) {
        return this.getData('categories', options);
    }

    async getPriceLists(options = {}) {
        return this.getData('priceLists', options);
    }

    // ==================== EVENT SYSTEM ====================

    on(event, callback) {
        try {
            // Ensure eventListeners is properly initialized
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                console.warn('API Client: eventListeners not properly initialized, recreating...');
                this.eventListeners = new Map();
            }
            
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        } catch (error) {
            console.error('API Client: Error in on method:', error);
            // Recreate eventListeners if there's an error
            this.eventListeners = new Map();
            this.eventListeners.set(event, [callback]);
        }
    }

    off(event, callback) {
        try {
            // Ensure eventListeners is properly initialized
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                console.warn('API Client: eventListeners not properly initialized, recreating...');
                this.eventListeners = new Map();
                return;
            }
            
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        } catch (error) {
            console.error('API Client: Error in off method:', error);
            // Recreate eventListeners if there's an error
            this.eventListeners = new Map();
        }
    }

    emit(event, data) {
        try {
            // Ensure eventListeners is properly initialized
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                console.warn('API Client: eventListeners not properly initialized, recreating...');
                this.eventListeners = new Map();
                return;
            }
            
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('Event listener error:', error);
                    }
                });
            }
        } catch (error) {
            console.error('API Client: Error in emit method:', error);
            // Recreate eventListeners if there's an error
            this.eventListeners = new Map();
        }
    }

    // ==================== UTILITY METHODS ====================

    // Check if API is available
    isAvailable() {
        return this.isApiAvailable;
    }

    getStatus() {
        return {
            isInitialized: true,
            isDataLoaded: true,
            isApiAvailable: this.isApiAvailable,
            cacheSize: this.cache.size,
            lastUpdate: new Date().toISOString()
        };
    }

    clearCache() {
        this.cache.clear();
        this.emit('cacheCleared');
    }
}

// Create global instance
window.apiClient = new APIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}