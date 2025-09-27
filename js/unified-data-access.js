/**
 * Unified Data Access Layer
 * Provides seamless access to data from Firebase or local fallback storage
 * Features: Automatic source selection, caching, real-time updates, error recovery
 */

class UnifiedDataAccess {
    constructor() {
        console.log('🔧 Initializing Unified Data Access...');
        
        // Add global error handler for .has() errors
        this._setupGlobalErrorHandler();
        
        try {
            this.cache = new Map();
            this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
            this.eventListeners = new Map();
            this.isInitialized = false;
            this.isInitializing = false;
            
            // Ensure eventListeners is properly initialized
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                this.eventListeners = new Map();
            }
            
            console.log('UnifiedDataAccess constructor completed, eventListeners:', this.eventListeners);
        } catch (error) {
            console.error('Error in UnifiedDataAccess constructor:', error);
            this.eventListeners = new Map(); // Fallback
        }
        
        // Lazy loading flags
        this.dependenciesLoaded = false;
        this.initializationPromise = null;
        
        // Fallback-first mode configuration
        this.isAdminPage = this._isAdminPage();
        this.fallbackFirstMode = !this.isAdminPage;
        
        // Data source priorities - adjusted for fallback-first mode
        this.sourcePriority = this.fallbackFirstMode ? ['local', 'firebase'] : ['firebase', 'local'];
        
        // Collection mappings
        this.collections = {
            products: 'products',
            clients: 'clients', 
            salespeople: 'salespeople',
            colors: 'colors',
            styles: 'styles',
            quotes: 'quotes',
            orders: 'orders',
            categories: 'categories',
            priceLists: 'priceLists'
        };
        
        // Performance optimizations
        this.requestQueue = new Map(); // Deduplicate concurrent requests
        this.batchTimeout = 50; // Batch requests within 50ms
        this.maxConcurrentRequests = 5;
        this.activeRequests = 0;
        
        // Statistics tracking
        this.stats = {
            requests: 0,
            firebaseRequests: 0,
            localRequests: 0,
            cacheHits: 0,
            errors: 0,
            lastUpdate: null,
            averageResponseTime: 0,
            batchedRequests: 0,
            deduplicatedRequests: 0
        };
        
        // Defer initialization to first use
        this.deferredInitialize();
    }
    
    // Global error handler for debugging .has() errors
    _setupGlobalErrorHandler() {
        // Override Map.prototype.has to catch errors
        const originalHas = Map.prototype.has;
        Map.prototype.has = function(key) {
            try {
                // Additional safety check
                if (this === null || this === undefined) {
                    console.error('Global .has() error: Map instance is null/undefined', {
                        key: key,
                        stack: new Error().stack
                    });
                    return false;
                }
                return originalHas.call(this, key);
            } catch (error) {
                console.error('Global .has() error caught:', {
                    error: error,
                    mapInstance: this,
                    key: key,
                    stack: error.stack,
                    fullStack: new Error().stack
                });
                return false; // Safe fallback
            }
        };
        
        // Also add a global error handler for uncaught errors
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('has')) {
                console.error('Global error handler caught .has() related error:', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error,
                    stack: event.error ? event.error.stack : 'No stack available'
                });
            }
        });
    }
    
    // Deferred initialization - only sets up the promise
    deferredInitialize() {
        this.initializationPromise = null;
    }
    
    // Lazy initialization - called on first data access
    async ensureInitialized() {
        if (this.isInitialized) {
            return;
        }
        
        if (this.isInitializing) {
            return this.initializationPromise;
        }
        
        this.isInitializing = true;
        this.initializationPromise = this.initialize();
        
        try {
            await this.initializationPromise;
        } finally {
            this.isInitializing = false;
        }
        
        return this.initializationPromise;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing Unified Data Access...');
            console.log(`📊 Mode: ${this.fallbackFirstMode ? 'Fallback-First' : 'Firebase-First'} (${this.isAdminPage ? 'Admin Page' : 'Regular Page'})`);
            console.log(`📋 Data source priority: [${this.sourcePriority.join(', ')}]`);
            
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Setup event listeners with comprehensive error handling
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Unified Data Access initialized successfully');
            
            // Trigger initialization event with comprehensive error handling
            try {
                if (this && typeof this.emit === 'function' && this.eventListeners && this.eventListeners instanceof Map) {
                    this.emit('initialized', {
                        timestamp: Date.now(),
                        dataSource: this.dataSource,
                        fallbackAvailable: !!window.localFallbackManager
                    });
                } else {
                    console.error('Cannot emit initialized event - object not properly constructed');
                }
            } catch (emitError) {
                console.error('Error emitting initialized event:', emitError);
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Unified Data Access:', error);
            console.log('Debug: this =', this, 'this.eventListeners =', this.eventListeners);
            // Emit error event with comprehensive error handling
            try {
                if (this && typeof this.emit === 'function' && this.eventListeners && this.eventListeners instanceof Map) {
                    this.emit('error', { error, context: 'initialization' });
                } else {
                    console.error('Cannot emit error event - emit function or eventListeners not available');
                }
            } catch (emitError) {
                console.error('Error emitting error event:', emitError);
            }
            throw error;
        }
    }
    
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.localFallbackManager && window.fallbackDetector) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        throw new Error('Required dependencies not available');
    }
    
    setupEventListeners() {
        try {
            // Listen to fallback detector events
            if (window.fallbackDetector && typeof window.fallbackDetector.on === 'function') {
                try {
                    window.fallbackDetector.on('firebaseUnavailable', () => {
                        try {
                            this.clearCache();
                            if (this && typeof this.emit === 'function' && this.eventListeners && this.eventListeners instanceof Map) {
                                this.emit('sourceChanged', { newSource: 'local', reason: 'firebase_unavailable' });
                            } else {
                                console.log('sourceChanged event (firebase unavailable) - emit not available');
                            }
                        } catch (error) {
                            console.error('Error in firebaseUnavailable handler:', error);
                        }
                    });
                    
                    window.fallbackDetector.on('firebaseRestored', () => {
                        try {
                            this.clearCache();
                            if (this && typeof this.emit === 'function' && this.eventListeners && this.eventListeners instanceof Map) {
                                this.emit('sourceChanged', { newSource: 'firebase', reason: 'firebase_restored' });
                            } else {
                                console.log('sourceChanged event (firebase restored) - emit not available');
                            }
                        } catch (error) {
                            console.error('Error in firebaseRestored handler:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error setting up fallback detector listeners:', error);
                }
            }
            
            // Listen to local storage updates
            if (window.localFallbackManager && typeof window.localFallbackManager.on === 'function') {
                try {
                    window.localFallbackManager.on('dataUpdated', (data) => {
                        try {
                            this.invalidateCache(data.collection);
                            if (this && typeof this.emit === 'function' && this.eventListeners && this.eventListeners instanceof Map) {
                                this.emit('dataUpdated', data);
                            } else {
                                console.log('dataUpdated event - emit not available');
                            }
                        } catch (error) {
                            console.error('Error in dataUpdated handler:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error setting up local fallback manager listeners:', error);
                }
            }
        } catch (error) {
            console.error('Error in setupEventListeners:', error);
            // Ensure eventListeners is properly initialized even if setup fails
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                this.eventListeners = new Map();
            }
        }
    }
    
    // ==================== CORE DATA ACCESS METHODS ====================
    
    async getData(collection, options = {}) {
        const startTime = Date.now();
        
        try {
            // Ensure system is initialized lazily
            await this.ensureInitialized();
            
            // Check for duplicate requests
            const requestKey = `${collection}-${JSON.stringify(options)}`;
            
            // Safety check for requestQueue
            if (!this.requestQueue || !(this.requestQueue instanceof Map)) {
                console.warn('requestQueue not properly initialized, creating new Map');
                this.requestQueue = new Map();
            }
            
            // Additional safety check for the has method
            try {
                if (this.requestQueue && typeof this.requestQueue.has === 'function' && this.requestQueue.has(requestKey)) {
                    this.stats.deduplicatedRequests++;
                    return await this.requestQueue.get(requestKey);
                }
            } catch (hasError) {
                console.error('Error checking requestQueue.has:', hasError);
                console.error('requestQueue:', this.requestQueue);
                console.error('typeof requestQueue:', typeof this.requestQueue);
                console.error('requestQueue instanceof Map:', this.requestQueue instanceof Map);
                // Recreate the requestQueue and continue
                this.requestQueue = new Map();
            }
            
            // Create and queue the request
            const requestPromise = this._performDataRequest(collection, options, startTime);
            this.requestQueue.set(requestKey, requestPromise);
            
            // Clean up request queue after completion
            requestPromise.finally(() => {
                setTimeout(() => this.requestQueue.delete(requestKey), this.batchTimeout);
            });
            
            return await requestPromise;
            
        } catch (error) {
            this.stats.errors++;
            this.emit('error', { 
                error, 
                collection, 
                context: 'getData',
                duration: Date.now() - startTime
            });
            throw error;
        }
    }
    
    async _performDataRequest(collection, options = {}, startTime) {
        const maxRetries = options.maxRetries || 2;
        
        // Throttle concurrent requests
        while (this.activeRequests >= this.maxConcurrentRequests) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.activeRequests++;
        let lastError = null;
        
        try {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    this.stats.requests++;
                    
                    if (!this.collections[collection]) {
                        throw new Error(`Unknown collection: ${collection}`);
                    }
                    
                    // Check cache first (skip on retries unless explicitly requested)
                    if (!options.skipCache && attempt === 0) {
                        const cachedData = this.getCachedData(collection);
                        if (cachedData) {
                            this.stats.cacheHits++;
                            this._updateResponseTime(startTime);
                            return cachedData;
                        }
                    }
                    
                    // Determine data source
                    const source = await this.determineDataSource(options);
                    
                    // Get data from source with timeout
                    let result;
                    const timeout = options.timeout || 15000; // 15 second default timeout
                    
                    if (source === 'firebase') {
                        result = await Promise.race([
                            this.getFirebaseData(collection, options),
                            this.createTimeoutPromise(timeout, `Firebase request timeout for ${collection}`)
                        ]);
                        this.stats.firebaseRequests++;
                    } else {
                        result = await Promise.race([
                            this.getLocalData(collection, options),
                            this.createTimeoutPromise(timeout, `Local storage request timeout for ${collection}`)
                        ]);
                        this.stats.localRequests++;
                    }
                    
                    // Validate result
                    if (!result || (Array.isArray(result) && result.length === 0 && !options.allowEmpty)) {
                        throw new Error(`No data returned for ${collection}`);
                    }
                    
                    // Cache the result
                    if (result && !options.skipCache) {
                        this.setCachedData(collection, result);
                    }
                    
                    this.stats.lastUpdate = new Date().toISOString();
                    
                    // Log successful recovery if this was a retry
                    if (attempt > 0) {
                        console.log(`Successfully recovered data for ${collection} on attempt ${attempt + 1}`);
                        this.emit('dataRecovered', { collection, attempt, source });
                    }
                    
                    this._updateResponseTime(startTime);
                    return result;
                    
                } catch (error) {
                    lastError = error;
                    this.stats.errors++;
                    
                    // Categorize error type
                    const errorType = this.categorizeError(error);
                    
                    console.warn(`Attempt ${attempt + 1} failed for ${collection} (${errorType}):`, error.message);
                    
                    // If this is the last attempt, try fallback
                    if (attempt === maxRetries) {
                        if (!options.skipFallback) {
                            try {
                                const fallbackResult = await this.getFallbackData(collection, options, error);
                                this._updateResponseTime(startTime);
                                return fallbackResult;
                            } catch (fallbackError) {
                                // Both primary and fallback failed
                                this.emit('criticalError', { 
                                    collection, 
                                    primaryError: error, 
                                    fallbackError,
                                    attempts: attempt + 1
                                });
                                throw fallbackError;
                            }
                        }
                        throw error;
                    }
                    
                    // Wait before retry (exponential backoff)
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            throw lastError;
            
        } finally {
            this.activeRequests--;
        }
    }
    
    _updateResponseTime(startTime) {
        const responseTime = Date.now() - startTime;
        this.stats.averageResponseTime = this.stats.averageResponseTime === 0 ? 
            responseTime : 
            (this.stats.averageResponseTime + responseTime) / 2;
    }
    
    createTimeoutPromise(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) return 'timeout';
        if (message.includes('network') || message.includes('fetch')) return 'network';
        if (message.includes('permission') || message.includes('auth')) return 'permission';
        if (message.includes('not found') || message.includes('404')) return 'not_found';
        if (message.includes('quota') || message.includes('limit')) return 'quota';
        if (message.includes('storage') || message.includes('localStorage')) return 'storage';
        
        return 'unknown';
    }
    
    async saveData(collection, data, options = {}) {
        try {
            if (!this.collections[collection]) {
                throw new Error(`Unknown collection: ${collection}`);
            }
            
            const results = {};
            
            // In fallback-first mode, only save to Firebase on admin pages
            if (!this.fallbackFirstMode || this.isAdminPage) {
                // Save to Firebase if available
                if (await this.isFirebaseAvailable() && !options.localOnly) {
                    try {
                        results.firebase = await this.saveFirebaseData(collection, data, options);
                    } catch (error) {
                        console.warn(`Failed to save to Firebase: ${error.message}`);
                        results.firebaseError = error.message;
                    }
                }
            }
            
            // Always save to local storage
            if (window.localFallbackManager) {
                try {
                    results.local = await window.localFallbackManager.saveData(collection, data, options);
                } catch (error) {
                    console.warn(`Failed to save to local storage: ${error.message}`);
                    results.localError = error.message;
                }
            }
            
            // Invalidate cache
            this.invalidateCache(collection);
            
            // Emit update event
            this.emit('dataSaved', { collection, data, results });
            
            return results;
            
        } catch (error) {
            console.error(`Error saving data to ${collection}:`, error);
            throw error;
        }
    }
    
    async deleteData(collection, id, options = {}) {
        try {
            if (!this.collections[collection]) {
                throw new Error(`Unknown collection: ${collection}`);
            }
            
            const results = {};
            
            // In fallback-first mode, only delete from Firebase on admin pages
            if (!this.fallbackFirstMode || this.isAdminPage) {
                // Delete from Firebase if available
                if (await this.isFirebaseAvailable() && !options.localOnly) {
                    try {
                        results.firebase = await this.deleteFirebaseData(collection, id, options);
                    } catch (error) {
                        console.warn(`Failed to delete from Firebase: ${error.message}`);
                        results.firebaseError = error.message;
                    }
                }
            }
            
            // Delete from local storage
            if (window.localFallbackManager) {
                try {
                    const localData = await window.localFallbackManager.getData(collection, { returnEmpty: true });
                    const filteredData = localData.filter(item => item.id !== id);
                    results.local = await window.localFallbackManager.saveData(collection, filteredData, { overwrite: true });
                } catch (error) {
                    console.warn(`Failed to delete from local storage: ${error.message}`);
                    results.localError = error.message;
                }
            }
            
            // Invalidate cache
            this.invalidateCache(collection);
            
            // Emit delete event
            this.emit('dataDeleted', { collection, id, results });
            
            return results;
            
        } catch (error) {
            console.error(`Error deleting data from ${collection}:`, error);
            throw error;
        }
    }
    
    // ==================== DATA SOURCE METHODS ====================
    
    // Helper method to detect admin pages
    _isAdminPage() {
        // Safety check for window.location
        if (!window || !window.location || !window.location.pathname) {
            return false;
        }
        
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || 'index.html';
        
        const adminPages = [
            'admin-panel.html',
            'admin-sync-interface.html',
            'client-admin-ui.html'
        ];
        
        return adminPages.includes(currentFile);
    }

    async determineDataSource(options = {}) {
        if (options.forceLocal) {
            return 'local';
        }
        
        if (options.forceFirebase) {
            return 'firebase';
        }
        
        // In fallback-first mode, prioritize local data
        if (this.fallbackFirstMode) {
            return 'local';
        }
        
        // For admin pages, use fallback detector to determine availability
        if (window.fallbackDetector) {
            const status = window.fallbackDetector.getStatus();
            return status.currentSource === 'firebase' ? 'firebase' : 'local';
        }
        
        // Default to Firebase for admin pages
        return 'firebase';
    }
    
    async isFirebaseAvailable() {
        if (window.fallbackDetector) {
            return window.fallbackDetector.isFirebaseAvailable;
        }
        
        // Fallback check
        try {
            return typeof firebase !== 'undefined' && firebase.database;
        } catch {
            return false;
        }
    }
    
    async getFirebaseData(collection, options = {}) {
        try {
            // Use existing universalDataManager if available
            if (window.universalDataManager && window.universalDataManager[collection]) {
                return {
                    data: window.universalDataManager[collection],
                    source: 'firebase',
                    timestamp: new Date().toISOString(),
                    cached: false
                };
            }
            
            // Direct Firebase access if universalDataManager not available
            if (typeof firebase !== 'undefined' && firebase.database) {
                const ref = firebase.database().ref(collection);
                const snapshot = await ref.once('value');
                const data = snapshot.val();
                
                return {
                    data: data ? Object.values(data) : [],
                    source: 'firebase',
                    timestamp: new Date().toISOString(),
                    cached: false
                };
            }
            
            throw new Error('Firebase not available');
            
        } catch (error) {
            console.error(`Error getting Firebase data for ${collection}:`, error);
            throw error;
        }
    }
    
    async getLocalData(collection, options = {}) {
        try {
            if (!window.localFallbackManager) {
                throw new Error('Local fallback manager not available');
            }
            
            const data = await window.localFallbackManager.getData(collection, {
                returnEmpty: true,
                validateIntegrity: options.validateIntegrity
            });
            
            return {
                data: data || [],
                source: 'local',
                timestamp: new Date().toISOString(),
                cached: false
            };
            
        } catch (error) {
            console.error(`Error getting local data for ${collection}:`, error);
            throw error;
        }
    }
    
    async getFallbackData(collection, options, originalError) {
        try {
            console.warn(`Primary data source failed for ${collection}, trying fallback...`);
            
            // Try the opposite source
            const primarySource = await this.determineDataSource(options);
            const fallbackSource = primarySource === 'firebase' ? 'local' : 'firebase';
            
            let result;
            if (fallbackSource === 'firebase') {
                result = await this.getFirebaseData(collection, { ...options, skipFallback: true });
            } else {
                result = await this.getLocalData(collection, { ...options, skipFallback: true });
            }
            
            // Mark as fallback data
            result.isFallback = true;
            result.originalError = originalError.message;
            
            this.emit('fallbackUsed', { collection, source: fallbackSource, originalError });
            
            return result;
            
        } catch (fallbackError) {
            console.error(`Fallback also failed for ${collection}:`, fallbackError);
            throw new Error(`Both primary and fallback sources failed: ${originalError.message} | ${fallbackError.message}`);
        }
    }
    
    async saveFirebaseData(collection, data, options = {}) {
        try {
            // Use existing universalDataManager if available
            if (window.universalDataManager && window.universalDataManager.updateData) {
                await window.universalDataManager.updateData(collection, data);
                return { success: true, method: 'universalDataManager' };
            }
            
            // Direct Firebase save
            if (typeof firebase !== 'undefined' && firebase.database) {
                const ref = firebase.database().ref(collection);
                
                if (Array.isArray(data)) {
                    // Save array data
                    const dataObject = {};
                    data.forEach((item, index) => {
                        const key = item.id || `item_${index}`;
                        dataObject[key] = item;
                    });
                    await ref.set(dataObject);
                } else {
                    // Save single item
                    const key = data.id || ref.push().key;
                    await ref.child(key).set(data);
                }
                
                return { success: true, method: 'direct_firebase' };
            }
            
            throw new Error('Firebase not available for saving');
            
        } catch (error) {
            console.error(`Error saving Firebase data for ${collection}:`, error);
            throw error;
        }
    }
    
    async deleteFirebaseData(collection, id, options = {}) {
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const ref = firebase.database().ref(`${collection}/${id}`);
                await ref.remove();
                return { success: true, method: 'direct_firebase' };
            }
            
            throw new Error('Firebase not available for deletion');
            
        } catch (error) {
            console.error(`Error deleting Firebase data for ${collection}:`, error);
            throw error;
        }
    }
    
    // ==================== CACHING SYSTEM ====================
    
    initializeCache() {
        this.cache.clear();
    }
    
    getCachedData(collection) {
        const cached = this.cache.get(collection);
        if (!cached) {
            return null;
        }
        
        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(collection);
            return null;
        }
        
        return {
            ...cached.data,
            cached: true
        };
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
    
    clearCache() {
        this.cache.clear();
        this.emit('cacheCleared');
    }
    
    // ==================== BATCH OPERATIONS ====================
    
    async getMultipleCollections(collections, options = {}) {
        try {
            const results = {};
            const promises = collections.map(async (collection) => {
                try {
                    const data = await this.getData(collection, options);
                    results[collection] = data;
                } catch (error) {
                    results[collection] = { error: error.message };
                }
            });
            
            await Promise.all(promises);
            return results;
            
        } catch (error) {
            console.error('Error getting multiple collections:', error);
            throw error;
        }
    }
    
    async syncAllCollections(options = {}) {
        try {
            const collections = Object.keys(this.collections);
            const results = {};
            
            for (const collection of collections) {
                try {
                    // Get Firebase data
                    const firebaseData = await this.getFirebaseData(collection, options);
                    
                    // Save to local storage
                    if (firebaseData.data && window.localFallbackManager) {
                        await window.localFallbackManager.saveData(collection, firebaseData.data, {
                            source: 'sync',
                            overwrite: true
                        });
                    }
                    
                    results[collection] = {
                        success: true,
                        count: firebaseData.data ? firebaseData.data.length : 0
                    };
                    
                } catch (error) {
                    results[collection] = {
                        success: false,
                        error: error.message
                    };
                }
            }
            
            this.clearCache();
            this.emit('syncCompleted', results);
            
            return results;
            
        } catch (error) {
            console.error('Error syncing all collections:', error);
            throw error;
        }
    }
    
    // ==================== STATISTICS AND MONITORING ====================
    
    getStatistics() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            collections: Object.keys(this.collections),
            isInitialized: this.isInitialized
        };
    }
    
    async getDataStatistics() {
        try {
            const stats = {};
            
            for (const collection of Object.keys(this.collections)) {
                try {
                    // Get counts from both sources
                    const firebaseData = await this.isFirebaseAvailable() ? 
                        await this.getFirebaseData(collection, { skipCache: true }) : null;
                    
                    const localData = window.localFallbackManager ? 
                        await window.localFallbackManager.getData(collection, { returnEmpty: true }) : null;
                    
                    stats[collection] = {
                        firebase: firebaseData ? firebaseData.data.length : 0,
                        local: localData ? localData.length : 0,
                        source: await this.determineDataSource()
                    };
                    
                } catch (error) {
                    stats[collection] = {
                        firebase: 0,
                        local: 0,
                        error: error.message
                    };
                }
            }
            
            return stats;
            
        } catch (error) {
            console.error('Error getting data statistics:', error);
            throw error;
        }
    }
    
    // ==================== EVENT SYSTEM ====================
    
    on(event, callback) {
        try {
            if (!this.eventListeners) {
                this.eventListeners = new Map();
            }
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                console.warn('eventListeners not properly initialized in on(), recreating');
                this.eventListeners = new Map();
            }
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        } catch (error) {
            console.error('Error in on() method:', error);
            this.eventListeners = new Map();
            this.eventListeners.set(event, [callback]);
        }
    }
    
    off(event, callback) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                return;
            }
            
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                if (listeners && Array.isArray(listeners)) {
                    const index = listeners.indexOf(callback);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            }
        } catch (error) {
            console.error('Error in off() method:', error);
            // Recreate eventListeners if there's an error
            this.eventListeners = new Map();
        }
    }
    
    emit(event, data) {
        try {
            // Comprehensive safety checks
            if (!this || typeof this !== 'object') {
                console.error('emit: Invalid this context');
                return;
            }
            
            if (!event || typeof event !== 'string') {
                console.error('emit: Invalid event parameter');
                return;
            }
            
            // Initialize eventListeners if needed
            if (!this.eventListeners) {
                this.eventListeners = new Map();
            }
            
            // Verify eventListeners is a proper Map
            if (!(this.eventListeners instanceof Map)) {
                console.warn('emit: eventListeners is not a Map, recreating');
                this.eventListeners = new Map();
            }
            
            // Verify has method exists
            if (typeof this.eventListeners.has !== 'function') {
                console.warn('emit: eventListeners.has is not a function, recreating');
                this.eventListeners = new Map();
            }
            
            // Safe check for event listeners
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                if (listeners && Array.isArray(listeners)) {
                    listeners.forEach(callback => {
                        try {
                            if (typeof callback === 'function') {
                                callback(data);
                            }
                        } catch (callbackError) {
                            console.error('Error in event callback:', callbackError);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error in emit method:', error);
            console.error('this:', this);
            console.error('eventListeners:', this.eventListeners);
            // Recreate eventListeners if there's an error
            this.eventListeners = new Map();
        }
    }
    
    // ==================== CONVENIENCE METHODS ====================
    
    async getProducts(options = {}) {
        return await this.getData('products', options);
    }
    
    async getClients(options = {}) {
        return await this.getData('clients', options);
    }
    
    async getSalespeople(options = {}) {
        return await this.getData('salespeople', options);
    }
    
    async getColors(options = {}) {
        return await this.getData('colors', options);
    }
    
    async getStyles(options = {}) {
        return await this.getData('styles', options);
    }
    
    async getQuotes(options = {}) {
        return await this.getData('quotes', options);
    }
    
    async getOrders(options = {}) {
        return await this.getData('orders', options);
    }
    
    async getCategories(options = {}) {
        return await this.getData('categories', options);
    }
    
    async getPriceLists(options = {}) {
        return await this.getData('priceLists', options);
    }
    
    // Save methods
    async saveProduct(data, options = {}) {
        return await this.saveData('products', data, options);
    }
    
    async saveClient(data, options = {}) {
        return await this.saveData('clients', data, options);
    }
    
    async saveSalesperson(data, options = {}) {
        return await this.saveData('salespeople', data, options);
    }
    
    async saveColor(data, options = {}) {
        return await this.saveData('colors', data, options);
    }
    
    async saveStyle(data, options = {}) {
        return await this.saveData('styles', data, options);
    }
    
    async saveQuote(data, options = {}) {
        return await this.saveData('quotes', data, options);
    }
    
    async saveOrder(data, options = {}) {
        return await this.saveData('orders', data, options);
    }
    
    // Delete methods
    async deleteProduct(id, options = {}) {
        return await this.deleteData('products', id, options);
    }
    
    async deleteClient(id, options = {}) {
        return await this.deleteData('clients', id, options);
    }
    
    async deleteSalesperson(id, options = {}) {
        return await this.deleteData('salespeople', id, options);
    }
    
    async deleteColor(id, options = {}) {
        return await this.deleteData('colors', id, options);
    }
    
    async deleteStyle(id, options = {}) {
        return await this.deleteData('styles', id, options);
    }
    
    async deleteQuote(id, options = {}) {
        return await this.deleteData('quotes', id, options);
    }
    
    async deleteOrder(id, options = {}) {
        return await this.deleteData('orders', id, options);
    }
    
    // ==================== UTILITY METHODS ====================
    
    async refreshData(collection) {
        this.invalidateCache(collection);
        return await this.getData(collection, { skipCache: true });
    }
    
    async refreshAllData() {
        this.clearCache();
        const collections = Object.keys(this.collections);
        const results = {};
        
        for (const collection of collections) {
            try {
                results[collection] = await this.getData(collection, { skipCache: true });
            } catch (error) {
                results[collection] = { error: error.message };
            }
        }
        
        return results;
    }
    
    // ==================== CLEANUP ====================
    
    destroy() {
        this.clearCache();
        this.eventListeners.clear();
        this.isInitialized = false;
        console.log('Unified Data Access destroyed');
    }
}

// Global instance will be created by the HTML file when needed

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedDataAccess;
}