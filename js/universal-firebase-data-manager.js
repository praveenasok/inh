/**
 * Universal Firebase Data Manager
 * Provides automatic, consistent data access with fallback-first strategy
 * Features: Fallback-first loading, Firebase sync only via admin panel, reactive data updates, error handling, caching
 */

class UniversalFirebaseDataManager {
    constructor() {
        this.isInitialized = false;
        this.isDataLoaded = false;
        this.initializationPromise = null;
        this.dataLoadingPromise = null;
        
        // Determine if this is admin panel (Firebase sync allowed)
        this.isAdminPanel = this._isAdminPanel();
        this.fallbackFirstMode = !this.isAdminPanel;
        
        // Global reactive data store
        this.data = new Proxy({
            clients: [],
            products: [],
            salespeople: [],
            colors: [],
            styles: [],
            quotes: [],
            orders: [],
            categories: [],
            subcategories: [],
            brands: [],
            priceLists: []
        }, {
            set: (target, property, value) => {
                const oldValue = target[property];
                target[property] = value;
                this._notifyDataChange(property, value, oldValue);
                return true;
            }
        });
        
        // Event system for reactive updates
        this.eventListeners = new Map();
        this.dataChangeListeners = new Map();
        
        // Firebase instances (only for admin panel)
        this.firebaseApp = null;
        this.firestore = null;
        this.storage = null;
        
        // Cache and performance
        this.cache = new Map();
        this.lastFetchTime = new Map();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes for better performance
        
        // Error handling
        this.errors = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Fallback manager reference
        this.localFallbackManager = null;
        
        // Auto-initialize when created
        this.autoInitialize();
    }
    
    /**
     * Detect if current page is admin panel
     */
    _isAdminPanel() {
        if (typeof window === 'undefined') return false;
        
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || '';
        
        return currentFile === 'admin-panel.html' || 
               currentFile === 'admin-sync-interface.html' ||
               currentPath.includes('admin');
    }
    
    /**
     * Auto-initialize the system
     */
    async autoInitialize() {
        try {
            await this.initialize();
            await this.loadAllData();
            this._setupAutoRefresh();
            console.log(`🚀 Universal Firebase Data Manager ready (${this.fallbackFirstMode ? 'Fallback-First Mode' : 'Admin Mode'})`);
        } catch (error) {
            console.error('❌ Universal Firebase Data Manager initialization failed:', error);
            this._handleInitializationError(error);
        }
    }
    
    /**
     * Initialize system (Firebase only for admin panel, fallback manager for others)
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }
    
    async _performInitialization() {
        try {
            if (this.fallbackFirstMode) {
                // Initialize fallback manager for non-admin pages
                await this._initializeFallbackManager();
                console.log('📦 Fallback-first mode initialized');
            } else {
                // Initialize Firebase for admin panel
                await this._initializeFirebase();
                console.log('🔥 Firebase admin mode initialized');
            }
            
            this.isInitialized = true;
            this._dispatchEvent('initialized', { success: true, mode: this.fallbackFirstMode ? 'fallback' : 'firebase' });
            
        } catch (error) {
            this.isInitialized = false;
            this._dispatchEvent('initialized', { success: false, error });
            throw error;
        }
    }
    
    /**
     * Initialize Firebase (admin panel only)
     */
    async _initializeFirebase() {
        // Wait for Firebase SDK to be available
        await this._waitForFirebaseSDK();
        
        // Initialize Firebase App
        if (typeof window.initializeFirebaseApp === 'function') {
            await window.initializeFirebaseApp();
        } else {
            throw new Error('Firebase initialization function not available');
        }
        
        // Get Firebase instances
        this.firebaseApp = firebase.app();
        this.firestore = firebase.firestore();
        this.storage = firebase.storage();
    }
    
    /**
     * Initialize fallback manager (non-admin pages)
     */
    async _initializeFallbackManager() {
        // Wait for LocalFallbackManager to be available
        await this._waitForFallbackManager();
        
        if (window.localFallbackManager) {
            this.localFallbackManager = window.localFallbackManager;
        } else {
            throw new Error('LocalFallbackManager not available');
        }
    }
    
    /**
     * Load all data collections
     */
    async loadAllData() {
        if (this.dataLoadingPromise) {
            return this.dataLoadingPromise;
        }
        
        this.dataLoadingPromise = this._performDataLoading();
        return this.dataLoadingPromise;
    }
    
    async _performDataLoading() {
        try {
            await this.initialize();
            
            console.log(`🚀 Starting ${this.fallbackFirstMode ? 'fallback-first' : 'Firebase'} data loading...`);
            const startTime = Date.now();
            
            // Load critical collections first (products is most important)
            const criticalPromises = [
                this._loadCollection('products')
            ];
            
            // Load other collections in parallel
            const otherPromises = [
                this._loadCollection('clients'),
                this._loadCollection('salespeople'),
                this._loadCollection('colors'),
                this._loadCollection('styles'),
                this._loadCollection('quotes'),
                this._loadCollection('orders')
            ];
            
            // Wait for critical data first
            await Promise.allSettled(criticalPromises);
            
            // Extract derived data as soon as products are loaded
            this._extractDerivedData();
            
            // Continue loading other collections in background
            Promise.allSettled(otherPromises).then(() => {
                console.log(`⚡ Background data loading completed in ${Date.now() - startTime}ms`);
                this._dispatchEvent('backgroundDataLoaded', { success: true });
            });
            
            this.isDataLoaded = true;
            const loadTime = Date.now() - startTime;
            console.log(`✅ Critical data loaded in ${loadTime}ms`);
            this._dispatchEvent('dataLoaded', { success: true, loadTime });
            
        } catch (error) {
            this.isDataLoaded = false;
            console.error('❌ Data loading failed:', error);
            this._dispatchEvent('dataLoaded', { success: false, error });
            throw error;
        }
    }
    
    /**
     * Load a specific collection with fallback-first strategy
     */
    async _loadCollection(collectionName) {
        try {
            // Check cache first
            if (this._isCacheValid(collectionName)) {
                this.data[collectionName] = this.cache.get(collectionName);
                return this.data[collectionName];
            }
            
            let data = [];
            
            if (this.fallbackFirstMode) {
                // Fallback-first mode: Load from local storage first
                data = await this._loadFromFallback(collectionName);
                console.log(`📦 Loaded ${data.length} items from fallback storage: ${collectionName}`);
            } else {
                // Admin mode: Load from Firebase
                data = await this._loadFromFirebase(collectionName);
                console.log(`🔥 Loaded ${data.length} items from Firebase: ${collectionName}`);
            }
            
            // Update cache and data
            this.cache.set(collectionName, data);
            this.lastFetchTime.set(collectionName, Date.now());
            this.data[collectionName] = data;
            this.errors.delete(collectionName);
            this.retryAttempts.delete(collectionName);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Failed to load ${collectionName}:`, error);
            this.errors.set(collectionName, error);
            
            // Fallback strategy for errors
            if (this.fallbackFirstMode) {
                // If fallback fails, return empty array to maintain consistency
                console.warn(`📦 Fallback loading failed for ${collectionName}, using empty array`);
                const emptyData = [];
                this.data[collectionName] = emptyData;
                return emptyData;
            } else {
                // Admin mode: try API fallback for permission errors
                const isPermissionError = error.code === 'permission-denied' || 
                                        error.message?.includes('permission') ||
                                        error.message?.includes('insufficient');
                
                if (isPermissionError) {
                    console.warn(`🔒 Permission denied for ${collectionName}, trying API fallback...`);
                    try {
                        const apiData = await this._loadFromAPI(collectionName);
                        this.cache.set(collectionName, apiData);
                        this.lastFetchTime.set(collectionName, Date.now());
                        this.errors.delete(collectionName);
                        return apiData;
                    } catch (apiError) {
                        console.error(`❌ API fallback failed for ${collectionName}:`, apiError);
                        this.data[collectionName] = [];
                        return [];
                    }
                }
                
                // Retry logic for other errors
                const attempts = this.retryAttempts.get(collectionName) || 0;
                if (attempts < this.maxRetries) {
                    this.retryAttempts.set(collectionName, attempts + 1);
                    console.log(`🔄 Retrying ${collectionName} (attempt ${attempts + 1}/${this.maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
                    return this._loadCollection(collectionName);
                }
                
                // Fallback to API if available
                try {
                    return await this._loadFromAPI(collectionName);
                } catch (apiError) {
                    console.error(`❌ API fallback failed for ${collectionName}:`, apiError);
                    // Provide empty array as final fallback
                    this.data[collectionName] = [];
                    return [];
                }
            }
        }
    }
    
    /**
     * Load data from Firebase (admin mode only)
     */
    async _loadFromFirebase(collectionName) {
        const collection = this.firestore.collection(collectionName);
        const snapshot = await collection.get();
        
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        
        return data;
    }
    
    /**
     * Load data from fallback storage (non-admin pages)
     */
    async _loadFromFallback(collectionName) {
        if (!this.localFallbackManager) {
            throw new Error('LocalFallbackManager not available');
        }
        
        const data = await this.localFallbackManager.getData(collectionName);
        return data || [];
    }
    
    /**
     * Wait for LocalFallbackManager to be available
     */
    async _waitForFallbackManager(maxWait = 10000) {
        const startTime = Date.now();
        while (!window.localFallbackManager && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!window.localFallbackManager) {
            throw new Error('LocalFallbackManager not available after waiting');
        }
    }
    
    /**
     * API fallback for data loading
     */
    async _loadFromAPI(collectionName) {
        const response = await fetch(`/api/${collectionName}`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        this.data[collectionName] = data;
        console.log(`✅ Loaded ${data.length} items from API for ${collectionName}`);
        return data;
    }
    
    /**
     * Extract derived data (categories, subcategories, brands)
     */
    _extractDerivedData() {
        const products = this.data.products || [];
        
        // Extract categories - check multiple possible field names
        const categories = [...new Set(products.map(p => 
            p.category || p.Category || p.ProductCategory
        ).filter(Boolean))];
        this.data.categories = categories.map(cat => ({ id: cat, name: cat }));
        
        // Extract subcategories
        const subcategories = [...new Set(products.map(p => 
            p.subcategory || p.Subcategory || p.ProductSubcategory
        ).filter(Boolean))];
        this.data.subcategories = subcategories.map(sub => ({ id: sub, name: sub }));
        
        // Extract brands
        const brands = [...new Set(products.map(p => 
            p.brand || p.Brand || p.BrandName
        ).filter(Boolean))];
        this.data.brands = brands.map(brand => ({ id: brand, name: brand }));
        
        // Extract price lists - check multiple possible field names
        const priceLists = [...new Set(products.map(p => 
            p.priceList || p.PriceList || p.PriceListName || p['Price List Name']
        ).filter(Boolean))];
        this.data.priceLists = priceLists.map(pl => ({ id: pl, name: pl }));
        
        console.log(`📊 Extracted derived data: ${categories.length} categories, ${subcategories.length} subcategories, ${brands.length} brands, ${priceLists.length} price lists`);
    }
    
    /**
     * Get data with automatic loading
     */
    async getData(type) {
        await this.waitForReady();
        
        if (!this.data[type]) {
            await this._loadCollection(type);
        }
        
        return this.data[type] || [];
    }
    
    /**
     * Get filtered data
     */
    async getFilteredData(type, filterFn) {
        const data = await this.getData(type);
        return data.filter(filterFn);
    }
    
    /**
     * Convenience methods for specific data types
     */
    async getClients() { return this.getData('clients'); }
    async getProducts() { return this.getData('products'); }
    async getSalespeople() { return this.getData('salespeople'); }
    async getColors() { return this.getData('colors'); }
    async getStyles() { return this.getData('styles'); }
    async getQuotes() { return this.getData('quotes'); }
    async getOrders() { return this.getData('orders'); }
    async getCategories() { return this.getData('categories'); }
    async getSubcategories() { return this.getData('subcategories'); }
    async getBrands() { return this.getData('brands'); }
    async getPriceLists() { return this.getData('priceLists'); }
    
    /**
     * Get products by category
     */
    async getProductsByCategory(category) {
        return this.getFilteredData('products', p => p.category === category);
    }
    
    /**
     * Get products by subcategory
     */
    async getProductsBySubcategory(subcategory) {
        return this.getFilteredData('products', p => p.subcategory === subcategory);
    }
    
    /**
     * Get products by brand
     */
    async getProductsByBrand(brand) {
        return this.getFilteredData('products', p => p.brand === brand);
    }
    
    /**
     * Search products
     */
    async searchProducts(searchTerm) {
        const products = await this.getProducts();
        const term = searchTerm.toLowerCase();
        return products.filter(product => 
            product.name?.toLowerCase().includes(term) ||
            product.description?.toLowerCase().includes(term) ||
            product.category?.toLowerCase().includes(term) ||
            product.subcategory?.toLowerCase().includes(term) ||
            product.brand?.toLowerCase().includes(term)
        );
    }
    
    /**
     * Wait for the system to be ready
     */
    async waitForReady() {
        if (this.isInitialized && this.isDataLoaded) {
            return true;
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for Universal Firebase Data Manager'));
            }, 30000);
            
            const checkReady = () => {
                if (this.isInitialized && this.isDataLoaded) {
                    clearTimeout(timeout);
                    resolve(true);
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            
            checkReady();
        });
    }
    
    /**
     * Refresh data for a specific type or all data
     */
    async refreshData(type = null) {
        if (type) {
            this.cache.delete(type);
            this.lastFetchTime.delete(type);
            await this._loadCollection(type);
        } else {
            this.cache.clear();
            this.lastFetchTime.clear();
            await this.loadAllData();
        }
    }
    
    /**
     * Subscribe to data changes
     */
    onDataChange(type, callback) {
        if (!this.dataChangeListeners.has(type)) {
            this.dataChangeListeners.set(type, new Set());
        }
        this.dataChangeListeners.get(type).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.dataChangeListeners.get(type);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }
    
    /**
     * Event system
     */
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(listener);
    }
    
    removeEventListener(eventType, listener) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    
    /**
     * Get system status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDataLoaded: this.isDataLoaded,
            errors: Object.fromEntries(this.errors),
            cacheSize: this.cache.size,
            lastUpdate: Math.max(...Array.from(this.lastFetchTime.values()), 0)
        };
    }
    
    // Private helper methods
    
    async _waitForFirebaseSDK(maxWait = 10000) {
        const startTime = Date.now();
        while (typeof firebase === 'undefined' && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not available');
        }
    }
    
    _isCacheValid(collectionName) {
        const lastFetch = this.lastFetchTime.get(collectionName);
        const cachedData = this.cache.get(collectionName);
        return lastFetch && 
               cachedData !== undefined && 
               (Date.now() - lastFetch) < this.cacheTimeout;
    }
    
    _notifyDataChange(type, newValue, oldValue) {
        const listeners = this.dataChangeListeners.get(type);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error('Error in data change listener:', error);
                }
            });
        }
    }
    
    _dispatchEvent(eventType, detail) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(detail);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }
    
    _setupAutoRefresh() {
        // Auto-refresh data every 10 minutes
        setInterval(() => {
            if (this.isInitialized && this.isDataLoaded) {
                this.refreshData().catch(error => {
                    console.error('Auto-refresh failed:', error);
                });
            }
        }, 10 * 60 * 1000);
    }
    
    _handleInitializationError(error) {
        // Provide fallback or retry logic
        console.error('Initialization error, attempting fallback...', error);
        // Could implement offline mode or API-only mode here
    }
}

/**
 * Universal Data Access Utilities
 * Provides convenient methods for populating UI elements
 */
const UniversalDataUtils = {
    /**
     * Populate a select element with data
     */
    async populateSelect(selectElement, dataType, options = {}) {
        try {
            const data = await window.universalDataManager.getData(dataType);
            
            // Clear existing options
            selectElement.innerHTML = '';
            
            // Add default option if specified
            if (options.defaultOption) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultOption;
                selectElement.appendChild(defaultOption);
            }
            
            // Add data options
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id || item.name;
                option.textContent = options.displayField ? item[options.displayField] : (item.name || item.id);
                if (options.selectedValue && option.value === options.selectedValue) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            console.error(`Failed to populate ${dataType} select:`, error);
        }
    },
    
    // Convenience methods for specific data types
    async populateClientsSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'clients', { displayField: 'name', ...options });
    },
    
    async populateProductsSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'products', { displayField: 'name', ...options });
    },
    
    async populateSalespeopleSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'salespeople', { displayField: 'name', ...options });
    },
    
    async populateColorsSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'colors', { displayField: 'name', ...options });
    },
    
    async populateStylesSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'styles', { displayField: 'name', ...options });
    },
    
    async populateCategoriesSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'categories', { displayField: 'name', ...options });
    },
    
    async populateSubcategoriesSelect(selectElement, category = null, options = {}) {
        try {
            let data;
            if (category) {
                data = await window.universalDataManager.getFilteredData('subcategories', 
                    sub => sub.category === category);
            } else {
                data = await window.universalDataManager.getSubcategories();
            }
            
            // Clear and populate
            selectElement.innerHTML = '';
            if (options.defaultOption) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = options.defaultOption;
                selectElement.appendChild(defaultOption);
            }
            
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id || item.name;
                option.textContent = item.name || item.id;
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to populate subcategories select:', error);
        }
    },
    
    async populateBrandsSelect(selectElement, options = {}) {
        return this.populateSelect(selectElement, 'brands', { displayField: 'name', ...options });
    }
};

// Create global instance
window.universalDataManager = new UniversalFirebaseDataManager();
window.UniversalDataUtils = UniversalDataUtils;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UniversalFirebaseDataManager, UniversalDataUtils };
}