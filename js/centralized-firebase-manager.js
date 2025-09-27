/**
 * Centralized Firebase Manager
 * Handles all Firebase initialization and data loading for the entire application
 * Provides a global data store and event system for dependent pages
 */

class CentralizedFirebaseManager {
    constructor() {
        this.isInitialized = false;
        this.isDataLoaded = false;
        this.initializationPromise = null;
        this.dataLoadingPromise = null;
        
        // Global data store
        this.data = {
            clients: [],
            products: [],
            salespeople: [],
            categories: [],
            subcategories: [],
            brands: []
        };
        
        // Event listeners for data updates
        this.eventListeners = new Map();
        
        // Firebase instances
        this.firebaseApp = null;
        this.firestore = null;
        this.storage = null;
    }
    
    /**
     * Initialize Firebase application and database
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
            // Initialize Firebase App
            if (typeof window.initializeFirebaseApp === 'function') {
                await window.initializeFirebaseApp();
            } else {
                throw new Error('initializeFirebaseApp function not found');
            }
            
            // Initialize Firebase Database
            if (window.firebaseDB && typeof window.firebaseDB.initialize === 'function') {
                await window.firebaseDB.initialize();
            } else {
                throw new Error('firebaseDB not found or initialize method missing');
            }
            
            // Store Firebase instances for direct access
            this.firebaseApp = firebase.app();
            this.firestore = firebase.firestore();
            this.storage = firebase.storage();
            
            this.isInitialized = true;
            this._dispatchEvent('firebase-initialized', { manager: this });
            
            return true;
            
        } catch (error) {
            this._dispatchEvent('firebase-initialization-failed', { error });
            throw error;
        }
    }
    
    /**
     * Load all data from Firebase
     */
    async loadAllData() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (this.dataLoadingPromise) {
            return this.dataLoadingPromise;
        }
        
        this.dataLoadingPromise = this._performDataLoading();
        return this.dataLoadingPromise;
    }
    
    async _performDataLoading() {
        try {
            // Load all data in parallel
            const [clients, products, salespeople] = await Promise.all([
                this._loadClients(),
                this._loadProducts(),
                this._loadSalespeople()
            ]);
            
            // Extract categories, subcategories, and brands from products
            this._extractProductMetadata();
            
            this.isDataLoaded = true;
            this._dispatchEvent('data-loaded', { 
                data: this.data,
                manager: this 
            });
            
            return this.data;
            
        } catch (error) {
            this._dispatchEvent('data-loading-failed', { error });
            throw error;
        }
    }
    
    async _loadClients() {
        try {
            const snapshot = await this.firestore.collection('clients').get();
            this.data.clients = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this._dispatchEvent('clients-loaded', { clients: this.data.clients });
            return this.data.clients;
        } catch (error) {
            // No fallback - Firebase connection is required for data access
            throw error;
        }
    }
    
    async _loadProducts() {
        try {
            const snapshot = await this.firestore.collection('products').get();
            this.data.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this._dispatchEvent('products-loaded', { products: this.data.products });
            return this.data.products;
        } catch (error) {
            // No fallback - Firebase connection is required for data access
            throw error;
        }
    }
    
    async _loadSalespeople() {
        try {
            const snapshot = await this.firestore.collection('salespeople').get();
            this.data.salespeople = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this._dispatchEvent('salespeople-loaded', { salespeople: this.data.salespeople });
            return this.data.salespeople;
        } catch (error) {
            // No fallback - Firebase connection is required for data access
            throw error;
        }
    }
    
    _extractProductMetadata() {
        const categories = new Set();
        const subcategories = new Set();
        const brands = new Set();
        
        this.data.products.forEach(product => {
            if (product.category) categories.add(product.category);
            if (product.subcategory) subcategories.add(product.subcategory);
            if (product.brand) brands.add(product.brand);
        });
        
        this.data.categories = Array.from(categories).sort();
        this.data.subcategories = Array.from(subcategories).sort();
        this.data.brands = Array.from(brands).sort();
        
        this._dispatchEvent('metadata-extracted', {
            categories: this.data.categories,
            subcategories: this.data.subcategories,
            brands: this.data.brands
        });
    }
    
    /**
     * Get data with optional filtering
     */
    getData(type, filter = null) {
        if (!this.data[type]) {
            return [];
        }
        
        if (!filter) {
            return this.data[type];
        }
        
        return this.data[type].filter(filter);
    }
    
    /**
     * Wait for specific data to be loaded
     */
    waitForData(type) {
        return new Promise((resolve) => {
            if (this.isDataLoaded && this.data[type]) {
                resolve(this.data[type]);
                return;
            }
            
            const listener = (event) => {
                if (event.detail.data && event.detail.data[type]) {
                    resolve(event.detail.data[type]);
                    this.removeEventListener('data-loaded', listener);
                }
            };
            
            this.addEventListener('data-loaded', listener);
        });
    }
    
    /**
     * Wait for Firebase to be initialized
     */
    waitForInitialization() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized) {
                resolve(this);
                return;
            }
            
            const successListener = () => {
                resolve(this);
                this.removeEventListener('firebase-initialized', successListener);
                this.removeEventListener('firebase-initialization-failed', errorListener);
            };
            
            const errorListener = (event) => {
                reject(event.detail.error);
                this.removeEventListener('firebase-initialized', successListener);
                this.removeEventListener('firebase-initialization-failed', errorListener);
            };
            
            this.addEventListener('firebase-initialized', successListener);
            this.addEventListener('firebase-initialization-failed', errorListener);
        });
    }
    
    /**
     * Event system for communication with dependent pages
     */
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(listener);
        
        // Also add to window for global access
        window.addEventListener(`cfm-${eventType}`, listener);
    }
    
    removeEventListener(eventType, listener) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).delete(listener);
        }
        window.removeEventListener(`cfm-${eventType}`, listener);
    }
    
    _dispatchEvent(eventType, detail) {
        const event = new CustomEvent(`cfm-${eventType}`, { detail });
        window.dispatchEvent(event);
        
        // Also call direct listeners
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    // Error in event listener - silently continue
                }
            });
        }
    }
    
    /**
     * Get Firebase instances for direct database operations
     */
    getFirebaseInstances() {
        return {
            app: this.firebaseApp,
            firestore: this.firestore,
            storage: this.storage,
            database: window.firebaseDB
        };
    }
    
    /**
     * Refresh specific data type
     */
    async refreshData(type) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }
        
        switch (type) {
            case 'clients':
                await this._loadClients();
                break;
            case 'products':
                await this._loadProducts();
                this._extractProductMetadata();
                break;
            case 'salespeople':
                await this._loadSalespeople();
                break;
            default:
                throw new Error(`Unknown data type: ${type}`);
        }
        
        this._dispatchEvent(`${type}-refreshed`, { 
            data: this.data[type],
            type 
        });
    }
    
    /**
     * Get initialization and loading status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDataLoaded: this.isDataLoaded,
            dataCount: {
                clients: this.data.clients.length,
                products: this.data.products.length,
                salespeople: this.data.salespeople.length,
                categories: this.data.categories.length,
                subcategories: this.data.subcategories.length,
                brands: this.data.brands.length
            }
        };
    }
}

// Create global instance
window.centralizedFirebaseManager = new CentralizedFirebaseManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CentralizedFirebaseManager;
}