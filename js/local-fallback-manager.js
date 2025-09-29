/**
 * Local Fallback Data Manager
 * Provides comprehensive fallback system with automatic data synchronization
 * Features: Local storage management, data validation, integrity checks, automatic recovery
 */

class LocalFallbackManager {
    constructor() {
        this.storageKey = 'fallback_data';
        this.metadataKey = 'fallback_metadata';
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;
        
        // Lazy loading optimization
        this.deferredOperations = [];
        this.collectionCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.supportedCollections = new Set([
            'products', 'clients', 'salespeople', 'colors', 
            'styles', 'quotes', 'orders', 'categories', 'priceLists'
        ]);
        
        // Collection definitions for validation
        this.collections = {
            products: { required: ['id', 'name'], optional: ['category', 'price', 'description'] },
            clients: { required: ['id', 'name'], optional: ['email', 'phone', 'address'] },
            salespeople: { required: ['id', 'name'], optional: ['email', 'phone'] },
            colors: { required: ['id', 'name'], optional: ['value', 'hex'] },
            styles: { required: ['id', 'name'], optional: ['description'] },
            quotes: { required: ['id', 'clientId'], optional: ['items', 'total', 'status'] },
            orders: { required: ['id', 'quoteId'], optional: ['status', 'items'] },
            categories: { required: ['id', 'name'], optional: ['description'] },
            priceLists: { required: ['id', 'name'], optional: ['items', 'currency'] }
        };
        
        // Data validation schemas
        this.schemas = {
            products: ['id', 'name', 'category'],
            clients: ['id', 'name', 'email'],
            salespeople: ['id', 'name', 'email'],
            colors: ['id', 'name', 'value'],
            styles: ['id', 'name'],
            quotes: ['id', 'clientId', 'items'],
            orders: ['id', 'quoteId', 'status'],
            categories: ['id', 'name'],
            priceLists: ['id', 'name', 'items']
        };
        
        // Performance tracking
        this.stats = {
            reads: 0,
            writes: 0,
            errors: 0,
            lastAccess: null,
            dataSize: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Smart cache invalidation settings
        this.cacheInvalidationRules = {
            products: { maxAge: 30 * 60 * 1000, priority: 'high' }, // 30 minutes
            clients: { maxAge: 60 * 60 * 1000, priority: 'medium' }, // 1 hour
            salespeople: { maxAge: 60 * 60 * 1000, priority: 'medium' }, // 1 hour
            colors: { maxAge: 24 * 60 * 60 * 1000, priority: 'low' }, // 24 hours
            styles: { maxAge: 24 * 60 * 60 * 1000, priority: 'low' }, // 24 hours
            quotes: { maxAge: 5 * 60 * 1000, priority: 'high' }, // 5 minutes
            orders: { maxAge: 5 * 60 * 1000, priority: 'high' }, // 5 minutes
            categories: { maxAge: 24 * 60 * 60 * 1000, priority: 'low' }, // 24 hours
            priceLists: { maxAge: 60 * 60 * 1000, priority: 'high' } // 1 hour
        };
        
        // Event system initialization
        this.eventListeners = new Map();
        
        // Background sync settings
        this.backgroundSync = {
            enabled: true,
            interval: 10 * 60 * 1000, // 10 minutes
            maxConcurrentSyncs: 2,
            currentSyncs: 0,
            lastSyncTime: null,
            syncQueue: []
        };
        
        // Selective loading settings
        this.selectiveLoading = {
            enabled: true,
            batchSize: 50,
            priorityFields: {
                products: ['id', 'name', 'price', 'PriceList', 'Price List Name'],
                clients: ['id', 'name', 'email', 'company'],
                salespeople: ['id', 'name', 'email'],
                colors: ['id', 'name', 'value'],
                styles: ['id', 'name'],
                quotes: ['id', 'clientId', 'total', 'status'],
                orders: ['id', 'quoteId', 'status'],
                categories: ['id', 'name'],
                priceLists: ['id', 'name', 'currency']
            },
            lazyFields: {
                products: ['description', 'specifications', 'images', 'category'],
                clients: ['address', 'notes', 'history', 'phone'],
                salespeople: ['phone', 'department', 'notes'],
                colors: ['hex', 'description'],
                styles: ['description', 'category'],
                quotes: ['items', 'notes', 'terms'],
                orders: ['items', 'shipping', 'notes'],
                categories: ['description', 'parent'],
                priceLists: ['details', 'terms', 'items']
            }
        };
        
        // Defer initialization to first use
        this.deferredInitialize();
        
        // Initialize selective loading cache
        this.selectiveLoadingCache = new Map();
        this.selectiveLoadingStats = {
            priorityLoads: 0,
            lazyLoads: 0,
            batchLoads: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Cache versioning settings
        this.cacheVersioning = {
            enabled: true,
            currentVersion: '2.0.0',
            schemaVersions: {
                products: '1.2.0',
                clients: '1.1.0',
                salespeople: '1.0.0',
                colors: '1.0.0',
                styles: '1.0.0',
                quotes: '1.3.0',
                orders: '1.1.0',
                categories: '1.0.0',
                priceLists: '1.2.0'
            },
            migrationRules: {
                '1.0.0': {
                    products: (data) => this.migrateProductsV1(data),
                    clients: (data) => this.migrateClientsV1(data)
                },
                '1.1.0': {
                    quotes: (data) => this.migrateQuotesV1_1(data)
                }
            }
        };
    }
    
    // Check if localStorage is available and working
    checkStorageAvailability() {
        try {
            const testKey = '__localStorage_test__';
            const testValue = 'test';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
                throw new Error('localStorage read/write test failed');
            }
            
            return true;
            
        } catch (error) {
            throw new Error(`localStorage not available: ${error.message}`);
        }
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
            // Check localStorage availability
            this.checkStorageAvailability();
            
            // Load existing metadata
            await this.loadMetadata();
            
            // Validate storage integrity
            await this.validateStorageIntegrity();
            
            // Check and clear incompatible cache versions
            await this.clearIncompatibleCache();
            
            this.isInitialized = true;
            
            // Start background sync
            this.startBackgroundSync();
            
        } catch (error) {
            throw error;
        }
    }
    
    // ==================== CORE DATA OPERATIONS ====================
    
    async saveData(collection, data, options = {}) {
        try {
            if (!this.collections[collection]) {
                throw new Error(`Unknown collection: ${collection}`);
            }
            
            // Validate data
            const validatedData = await this.validateData(collection, data);
            
            // Get existing data
            const existingData = await this.getData(collection) || [];
            
            // Handle duplicates
            const updatedData = this.handleDuplicates(existingData, validatedData, options);
            
            // Save to localStorage
            const storageKey = this.getStorageKey(collection);
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            
            // Update metadata
            await this.updateMetadata(collection, {
                lastUpdated: new Date().toISOString(),
                count: updatedData.length,
                integrity: await this.calculateIntegrity(updatedData)
            });
            
            this.emit('dataUpdated', { collection, data: updatedData });
            
            return updatedData;
            
        } catch (error) {
            throw error;
        }
    }
    
    async getData(collection, options = {}) {
        try {
            // Ensure system is initialized lazily
            await this.ensureInitialized();
            
            // Check cache first
            const cacheKey = `${collection}_${JSON.stringify(options)}`;
            const cached = this.collectionCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                this.stats.cacheHits++;
                
                // Apply selective loading if requested
                if (options.priorityOnly && this.selectiveLoading.enabled) {
                    this.selectiveLoadingStats.priorityLoads++;
                    return this.filterPriorityFields(cached.data, collection);
                }
                
                return cached.data;
            }
            
            this.stats.cacheMisses++;
            const result = await this._performGetData(collection, options);
            
            // Apply selective loading if requested
            let finalResult = result;
            if (result && this.selectiveLoading.enabled) {
                if (options.priorityOnly) {
                    this.selectiveLoadingStats.priorityLoads++;
                    finalResult = this.filterPriorityFields(result, collection);
                } else if (options.batchLoad && Array.isArray(result)) {
                    this.selectiveLoadingStats.batchLoads++;
                    finalResult = await this.loadDataInBatches(collection, result);
                }
            }
            
            // Cache the result
            this.collectionCache.set(cacheKey, {
                data: finalResult,
                timestamp: Date.now()
            });
            
            // Clean up old cache entries
            this._cleanupCache();
            
            return finalResult;
            
        } catch (error) {
            this.stats.errors++;
            throw error;
        }
    }
    
    async _performGetData(collection, options = {}) {
        const maxRetries = options.maxRetries || 2;
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (!this.collections[collection]) {
                    throw new Error(`Unknown collection: ${collection}`);
                }
                
                // Check cache freshness first
                if (!options.ignoreCache && !this.isCacheFresh(collection)) {
                    console.log(`Cache for ${collection} is stale, invalidating...`);
                    await this.invalidateCache(collection);
                    this.stats.cacheMisses++;
                    return null; // Return null to trigger fresh data fetch
                }
                
                const storageKey = this.getStorageKey(collection);
                const rawData = localStorage.getItem(storageKey);
                
                if (!rawData) {
                    return options.returnEmpty ? [] : null;
                }
                
                let data;
                try {
                    data = JSON.parse(rawData);
                } catch (parseError) {
                    
                    // Try to recover corrupted data
                    const recoveredData = await this.recoverCorruptedData(collection, rawData);
                    if (recoveredData) {
                        data = recoveredData;
                        this.emit('dataRecovered', { collection, method: 'json_repair' });
                    } else {
                        throw new Error(`Failed to parse and recover data for ${collection}: ${parseError.message}`);
                    }
                }
                
                // Validate data structure
                if (!Array.isArray(data) && typeof data !== 'object') {
                    throw new Error(`Invalid data structure for ${collection}: expected array or object`);
                }
                
                // Validate integrity if requested
                if (options.validateIntegrity) {
                    const isValid = await this.validateDataIntegrity(collection, data);
                    if (!isValid) {
                        this.emit('integrityError', { collection, data, attempt });
                        
                        // Try to repair data integrity
                        const repairedData = await this.repairDataIntegrity(collection, data);
                        if (repairedData) {
                            data = repairedData;
                            this.emit('dataRepaired', { collection, method: 'integrity_repair' });
                        }
                    }
                }
                
                // Emit successful recovery if this was a retry
                if (attempt > 0) {
                    this.emit('dataRetrieved', { collection, attempt });
                }
                
                return data;
                
            } catch (error) {
                lastError = error;
                
                // If this is the last attempt, return fallback
                if (attempt === maxRetries) {
                    this.emit('criticalError', { collection, error, attempts: attempt + 1 });
                    
                    // Return empty data or null based on options
                    return options.returnEmpty ? [] : null;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
        
        return options.returnEmpty ? [] : null;
    }
    
    _cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.collectionCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.collectionCache.delete(key);
            }
        }
        
        // Also cleanup selective loading cache
        for (const [key, value] of this.selectiveLoadingCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.selectiveLoadingCache.delete(key);
            }
        }
    }
    
    async recoverCorruptedData(collection, rawData) {
        try {
            // Try to fix common JSON corruption issues
            let fixedData = rawData;
            
            // Remove trailing commas
            fixedData = fixedData.replace(/,(\s*[}\]])/g, '$1');
            
            // Fix unclosed brackets/braces
            const openBrackets = (fixedData.match(/\[/g) || []).length;
            const closeBrackets = (fixedData.match(/\]/g) || []).length;
            const openBraces = (fixedData.match(/\{/g) || []).length;
            const closeBraces = (fixedData.match(/\}/g) || []).length;
            
            // Add missing closing brackets
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                fixedData += ']';
            }
            
            // Add missing closing braces
            for (let i = 0; i < openBraces - closeBraces; i++) {
                fixedData += '}';
            }
            
            // Try to parse the fixed data
            return JSON.parse(fixedData);
            
        } catch (error) {
            return null;
        }
    }
    
    async repairDataIntegrity(collection, data) {
        try {
            if (!Array.isArray(data)) {
                return data; // Can't repair non-array data
            }
            
            const schema = this.validationSchemas[collection];
            if (!schema) {
                return data; // No schema to validate against
            }
            
            const repairedData = data.filter(item => {
                // Remove items that are completely invalid
                if (!item || typeof item !== 'object') {
                    return false;
                }
                
                // Check if item has required fields
                const hasRequiredFields = schema.required.every(field => 
                    item.hasOwnProperty(field) && item[field] !== null && item[field] !== undefined
                );
                
                return hasRequiredFields;
            }).map(item => {
                // Repair individual items
                const repairedItem = { ...item };
                
                // Fix data types
                for (const [field, expectedType] of Object.entries(schema.types)) {
                    if (repairedItem[field] !== undefined) {
                        repairedItem[field] = this.convertType(repairedItem[field], expectedType);
                    }
                }
                
                return repairedItem;
            });
            
            // Save the repaired data
            await this.saveData(collection, repairedData, { skipValidation: true });
            
            return repairedData;
            
        } catch (error) {
            return null;
        }
    }
    
    async syncFromFirebase(firebaseData, options = {}) {
        try {
            const syncResults = {};
            
            for (const [collection, data] of Object.entries(firebaseData)) {
                if (this.collections[collection] && Array.isArray(data)) {
                    // Save Firebase data to local storage
                    const savedData = await this.saveData(collection, data, {
                        source: 'firebase',
                        overwrite: options.overwrite || false
                    });
                    
                    syncResults[collection] = {
                        count: savedData.length,
                        lastSync: new Date().toISOString()
                    };
                }
            }
            
            // Update sync metadata
            await this.updateMetadata('sync', {
                lastFirebaseSync: new Date().toISOString(),
                syncResults: syncResults,
                syncStatus: 'completed'
            });
            
            this.emit('firebaseSyncCompleted', syncResults);
            
            return syncResults;
            
        } catch (error) {
            await this.updateMetadata('sync', {
                syncStatus: 'failed',
                lastError: error.message
            });
            throw error;
        }
    }
    
    // ==================== DATA VALIDATION ====================
    
    async validateData(collection, data) {
        const schema = this.validationSchemas[collection];
        if (!schema) {
            return data; // No validation schema, return as-is
        }
        
        const validatedData = Array.isArray(data) ? data : [data];
        const results = [];
        
        for (const item of validatedData) {
            // Check required fields
            for (const field of schema.required) {
                if (!(field in item) || item[field] === null || item[field] === undefined) {
                    throw new Error(`Missing required field '${field}' in ${collection} data`);
                }
            }
            
            // Type validation
            const validatedItem = { ...item };
            for (const [field, expectedType] of Object.entries(schema.types)) {
                if (field in validatedItem) {
                    validatedItem[field] = this.convertType(validatedItem[field], expectedType);
                }
            }
            
            results.push(validatedItem);
        }
        
        return Array.isArray(data) ? results : results[0];
    }
    
    convertType(value, expectedType) {
        switch (expectedType) {
            case 'number':
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;
            case 'string':
                return String(value);
            case 'boolean':
                return Boolean(value);
            default:
                return value;
        }
    }
    
    async validateDataIntegrity(collection, data) {
        try {
            const metadata = await this.getMetadata(collection);
            if (!metadata || !metadata.integrity) {
                return true; // No integrity data to compare
            }
            
            const currentIntegrity = await this.calculateIntegrity(data);
            return currentIntegrity === metadata.integrity;
            
        } catch (error) {
            return false;
        }
    }
    
    async calculateIntegrity(data) {
        // Simple integrity check using data length and basic hash
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `${data.length}_${hash}`;
    }
    
    // ==================== DUPLICATE HANDLING ====================
    
    handleDuplicates(existingData, newData, options = {}) {
        const newDataArray = Array.isArray(newData) ? newData : [newData];
        
        if (options.overwrite) {
            return newDataArray;
        }
        
        const result = [...existingData];
        
        for (const newItem of newDataArray) {
            const existingIndex = result.findIndex(item => 
                this.isDuplicate(item, newItem)
            );
            
            if (existingIndex >= 0) {
                // Update existing item
                result[existingIndex] = { ...result[existingIndex], ...newItem };
            } else {
                // Add new item
                result.push(newItem);
            }
        }
        
        return result;
    }
    
    isDuplicate(item1, item2) {
        // Check by ID first
        if (item1.id && item2.id) {
            return item1.id === item2.id;
        }
        
        // Fallback to key field comparison
        const keyFields = ['Product', 'clientName', 'name', 'email'];
        for (const field of keyFields) {
            if (item1[field] && item2[field] && item1[field] === item2[field]) {
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== METADATA MANAGEMENT ====================
    
    async loadMetadata() {
        try {
            const metadataKey = this.getStorageKey('metadata');
            const rawMetadata = localStorage.getItem(metadataKey);
            
            if (rawMetadata) {
                this.metadata = { ...this.metadata, ...JSON.parse(rawMetadata) };
            }
        } catch (error) {
        }
    }
    
    async updateMetadata(collection, updates) {
        try {
            if (!this.metadata[collection]) {
                this.metadata[collection] = {};
            }
            
            // Add timestamp for cache invalidation
            const timestamp = Date.now();
            const metadataWithTimestamp = { 
                ...updates, 
                lastUpdated: timestamp,
                cacheVersion: this.metadata[collection]?.cacheVersion || 1
            };
            
            this.metadata[collection] = { ...this.metadata[collection], ...metadataWithTimestamp };
            
            const metadataKey = this.getStorageKey('metadata');
            localStorage.setItem(metadataKey, JSON.stringify(this.metadata));
            
        } catch (error) {
        }
    }

    // ==================== SMART CACHE INVALIDATION ====================
    
    /**
     * Check if cached data is still fresh based on collection-specific rules
     */
    isCacheFresh(collection) {
        try {
            const metadata = this.metadata[collection];
            if (!metadata || !metadata.lastUpdated) {
                return false;
            }
            
            const rule = this.cacheInvalidationRules[collection];
            if (!rule) {
                return true; // No rule means always fresh
            }
            
            const age = Date.now() - metadata.lastUpdated;
            return age < rule.maxAge;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get collections that need cache refresh based on priority and age
     */
    getStaleCollections() {
        const staleCollections = [];
        
        for (const [collection, rule] of Object.entries(this.cacheInvalidationRules)) {
            if (!this.isCacheFresh(collection)) {
                staleCollections.push({
                    collection,
                    priority: rule.priority,
                    age: this.getCacheAge(collection)
                });
            }
        }
        
        // Sort by priority (high first) then by age (oldest first)
        return staleCollections.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            return priorityDiff !== 0 ? priorityDiff : b.age - a.age;
        });
    }
    
    /**
     * Get cache age in milliseconds
     */
    getCacheAge(collection) {
        const metadata = this.metadata[collection];
        if (!metadata || !metadata.lastUpdated) {
            return Infinity;
        }
        return Date.now() - metadata.lastUpdated;
    }
    
    /**
     * Invalidate cache for specific collection
     */
    async invalidateCache(collection) {
        try {
            const storageKey = this.getStorageKey(collection);
            localStorage.removeItem(storageKey);
            
            // Update metadata to reflect invalidation
            await this.updateMetadata(collection, {
                lastInvalidated: Date.now(),
                cacheVersion: (this.metadata[collection]?.cacheVersion || 0) + 1
            });
            
            this.emit('cacheInvalidated', { collection, timestamp: Date.now() });
            
        } catch (error) {
             console.error(`Failed to invalidate cache for ${collection}:`, error);
         }
     }
     
     // ==================== BACKGROUND SYNC ====================
     
     /**
      * Start background sync process
      */
     startBackgroundSync() {
         if (!this.backgroundSync.enabled) {
             return;
         }
         
         // Initial sync check
         this.scheduleBackgroundSync();
         
         // Set up periodic sync
         this.backgroundSyncInterval = setInterval(() => {
             this.scheduleBackgroundSync();
         }, this.backgroundSync.interval);
         
         console.log('Background sync started');
     }
     
     /**
      * Stop background sync process
      */
     stopBackgroundSync() {
         if (this.backgroundSyncInterval) {
             clearInterval(this.backgroundSyncInterval);
             this.backgroundSyncInterval = null;
         }
         console.log('Background sync stopped');
     }
     
     /**
      * Schedule background sync for stale collections
      */
     async scheduleBackgroundSync() {
         try {
             const staleCollections = this.getStaleCollections();
             
             if (staleCollections.length === 0) {
                 return;
             }
             
             console.log(`Found ${staleCollections.length} stale collections for background sync`);
             
             // Add to sync queue
             for (const { collection, priority } of staleCollections) {
                 if (!this.backgroundSync.syncQueue.includes(collection)) {
                     this.backgroundSync.syncQueue.push(collection);
                 }
             }
             
             // Process sync queue
             this.processBackgroundSyncQueue();
             
         } catch (error) {
             console.error('Background sync scheduling failed:', error);
         }
     }
     
     /**
      * Process background sync queue
      */
     async processBackgroundSyncQueue() {
         if (this.backgroundSync.currentSyncs >= this.backgroundSync.maxConcurrentSyncs) {
             return; // Already at max concurrent syncs
         }
         
         const collection = this.backgroundSync.syncQueue.shift();
         if (!collection) {
             return; // Queue is empty
         }
         
         this.backgroundSync.currentSyncs++;
         
         try {
             await this.backgroundSyncCollection(collection);
         } catch (error) {
             console.error(`Background sync failed for ${collection}:`, error);
         } finally {
             this.backgroundSync.currentSyncs--;
             
             // Process next item in queue
             if (this.backgroundSync.syncQueue.length > 0) {
                 setTimeout(() => this.processBackgroundSyncQueue(), 100);
             }
         }
     }
     
     /**
      * Perform background sync for a specific collection
      */
     async backgroundSyncCollection(collection) {
         try {
             console.log(`Background syncing ${collection}...`);
             
             // Try to fetch fresh data from API or Firebase
             let freshData = null;
             
             if (window.universalDataManager && 
                 window.universalDataManager.isReady && 
                 window.universalDataManager.isReady() &&
                 typeof window.universalDataManager.getData === 'function') {
                 // Use universal data manager if available
                 try {
                     freshData = await window.universalDataManager.getData(collection);
                 } catch (udmError) {
                     console.warn(`Universal data manager failed for ${collection}:`, udmError.message);
                 }
             } else if (window.apiClient && typeof window.apiClient.get === 'function') {
                 // Fallback to API client
                 try {
                     freshData = await window.apiClient.get(`/api/${collection}`);
                 } catch (apiError) {
                     console.warn(`API client failed for ${collection}:`, apiError.message);
                 }
             }
             
             if (freshData && Array.isArray(freshData) && freshData.length > 0) {
                 // Update cache with fresh data
                 await this.saveData(collection, freshData, { 
                     source: 'backgroundSync',
                     skipValidation: false 
                 });
                 
                 console.log(`Background sync completed for ${collection}: ${freshData.length} items`);
                 this.emit('backgroundSyncCompleted', { collection, itemCount: freshData.length });
             } else {
                 console.log(`No fresh data available for background sync of ${collection}`);
             }
             
             this.backgroundSync.lastSyncTime = Date.now();
             
         } catch (error) {
             console.error(`Background sync failed for ${collection}:`, error);
             this.emit('backgroundSyncFailed', { collection, error: error.message });
         }
     }
     
     /**
      * Get background sync status
      */
     getBackgroundSyncStatus() {
         return {
             enabled: this.backgroundSync.enabled,
             currentSyncs: this.backgroundSync.currentSyncs,
             queueLength: this.backgroundSync.syncQueue.length,
             lastSyncTime: this.backgroundSync.lastSyncTime,
             nextSyncIn: this.backgroundSync.lastSyncTime ? 
                 Math.max(0, this.backgroundSync.interval - (Date.now() - this.backgroundSync.lastSyncTime)) : 0
         };
     }
     
     // ==================== SELECTIVE LOADING ====================
     
     /**
      * Filter data to only include priority fields for faster initial loading
      */
     filterPriorityFields(data, collectionName) {
         if (!this.selectiveLoading.enabled || !data) return data;
         
         const priorityFields = this.selectiveLoading.priorityFields[collectionName];
         if (!priorityFields) return data;
         
         if (Array.isArray(data)) {
             return data.map(item => this.extractFields(item, priorityFields));
         } else {
             return this.extractFields(data, priorityFields);
         }
     }

     /**
      * Extract specific fields from an object
      */
     extractFields(item, fields) {
         if (!item || typeof item !== 'object') return item;
         
         const filtered = {};
         fields.forEach(field => {
             if (item.hasOwnProperty(field)) {
                 filtered[field] = item[field];
             }
         });
         return filtered;
     }

     /**
      * Load lazy fields for a specific item on demand
      */
     async loadLazyFields(collectionName, itemId, fields = null) {
         if (!this.selectiveLoading.enabled) return null;
         
         const lazyFields = fields || this.selectiveLoading.lazyFields[collectionName];
         if (!lazyFields) return null;
         
         try {
             // Try to get from cache first
             const cacheKey = `${collectionName}_lazy_${itemId}`;
             const cached = this.collectionCache.get(cacheKey);
             if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                 return cached.data;
             }
             
             // Fetch lazy fields from storage
             const fullData = await this._performGetData(collectionName, { ignoreCache: true });
             if (fullData && Array.isArray(fullData)) {
                 const item = fullData.find(item => item.id === itemId || item._id === itemId);
                 if (item) {
                     const lazyData = this.extractFields(item, lazyFields);
                     this.collectionCache.set(cacheKey, {
                         data: lazyData,
                         timestamp: Date.now()
                     });
                     return lazyData;
                 }
             }
             
             return null;
         } catch (error) {
             console.warn(`Failed to load lazy fields for ${collectionName}:${itemId}:`, error);
             return null;
         }
     }

     /**
      * Load data in batches for better performance
      */
     async loadDataInBatches(collectionName, items) {
         if (!this.selectiveLoading.enabled || !Array.isArray(items)) return items;
         
         const batchSize = this.selectiveLoading.batchSize;
         const batches = [];
         
         for (let i = 0; i < items.length; i += batchSize) {
             batches.push(items.slice(i, i + batchSize));
         }
         
         const results = [];
         for (const batch of batches) {
             const batchResults = await Promise.all(
                 batch.map(item => this.processBatchItem(collectionName, item))
             );
             results.push(...batchResults);
         }
         
         return results;
     }

     /**
      * Process individual batch item
      */
     async processBatchItem(collectionName, item) {
         // Filter to priority fields for initial load
         const priorityData = this.filterPriorityFields(item, collectionName);
         
         // Mark that lazy fields are available
         if (this.selectiveLoading.lazyFields[collectionName]) {
             priorityData._hasLazyFields = true;
             priorityData._itemId = item.id || item._id;
         }
         
         return priorityData;
     }
     
     async getMetadata(collection) {
        return this.metadata[collection] || null;
    }
    
    // Initialize metadata if not exists
    get metadata() {
        if (!this._metadata) {
            this._metadata = {};
        }
        return this._metadata;
    }
    
    set metadata(value) {
        this._metadata = value;
    }
    
    // Initialize storage prefix
    get storagePrefix() {
        return this.storageKey + '_';
    }
    
    // Initialize validation schemas
    get validationSchemas() {
        if (!this._validationSchemas) {
            this._validationSchemas = {
                products: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string', price: 'number' }
                },
                clients: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string', email: 'string' }
                },
                salespeople: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string', email: 'string' }
                },
                colors: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string', value: 'string' }
                },
                styles: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string' }
                },
                quotes: {
                    required: ['id', 'clientId'],
                    types: { id: 'string', clientId: 'string' }
                },
                orders: {
                    required: ['id', 'quoteId'],
                    types: { id: 'string', quoteId: 'string' }
                },
                categories: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string' }
                },
                priceLists: {
                    required: ['id', 'name'],
                    types: { id: 'string', name: 'string' }
                }
            };
        }
        return this._validationSchemas;
    }
    
    // ==================== STORAGE UTILITIES ====================
    
    getStorageKey(collection) {
        return `${this.storagePrefix}${collection}`;
    }
    
    // Initialize version for compatibility
    get version() {
        return '1.0.0';
    }
    
    async validateStorageIntegrity() {
        try {
            // Check if localStorage is available
            if (typeof Storage === 'undefined') {
                throw new Error('localStorage is not available');
            }
            
            // Test localStorage functionality
            const testKey = `${this.storagePrefix}test`;
            localStorage.setItem(testKey, 'test');
            const testValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (testValue !== 'test') {
                throw new Error('localStorage is not functioning correctly');
            }
            
            return true;
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Get selective loading configuration
     */
    getSelectiveLoadingConfig() {
        return {
            enabled: this.selectiveLoading.enabled,
            batchSize: this.selectiveLoading.batchSize,
            priorityFields: this.selectiveLoading.priorityFields,
            lazyFields: this.selectiveLoading.lazyFields
        };
    }
    
    /**
     * Update selective loading configuration
     */
    updateSelectiveLoadingConfig(config) {
        this.selectiveLoading = {
            ...this.selectiveLoading,
            ...config
        };
    }
    
    async initializeCollections() {
        for (const collection of Object.keys(this.collections)) {
            const data = await this.getData(collection);
            if (!data) {
                await this.saveData(collection, [], { source: 'initialization' });
            }
        }
    }
    
    /**
     * Get data with selective loading support
     */
    async getDataSelective(collection, options = {}) {
        const data = await this.getData(collection, options);
        
        if (!data || !this.selectiveLoading.enabled) {
            return data;
        }
        
        // Apply selective loading if enabled
        if (options.priorityOnly) {
            return this.filterPriorityFields(data, collection);
        }
        
        if (options.batchLoad && Array.isArray(data)) {
            return await this.loadDataInBatches(collection, data);
        }
        
        return data;
    }
    
    // ==================== STATISTICS AND MONITORING ====================
    
    async getStatistics() {
        const stats = {};
        
        for (const collection of Object.keys(this.collections)) {
            try {
                const data = await this.getData(collection, { returnEmpty: true });
                const metadata = await this.getMetadata(collection);
                
                // Ensure data is an array
                const dataArray = Array.isArray(data) ? data : [];
                
                stats[collection] = {
                    count: dataArray.length,
                    lastUpdated: metadata?.lastUpdated || 'Never',
                    integrity: metadata?.integrity || 'Unknown',
                    source: metadata?.source || 'Unknown'
                };
            } catch (error) {
                stats[collection] = {
                    count: 0,
                    lastUpdated: 'Error',
                    integrity: 'Error',
                    source: 'Error'
                };
            }
        }
        
        return stats;
    }
    
    async getStorageUsage() {
        let totalSize = 0;
        const usage = {};
        
        for (const collection of Object.keys(this.collections)) {
            const storageKey = this.getStorageKey(collection);
            const data = localStorage.getItem(storageKey);
            const size = data ? new Blob([data]).size : 0;
            
            usage[collection] = {
                size: size,
                formatted: this.formatBytes(size)
            };
            totalSize += size;
        }
        
        return {
            total: totalSize,
            collections: usage,
            totalFormatted: this.formatBytes(totalSize),
            selectiveLoading: this.getSelectiveLoadingConfig()
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get performance metrics including selective loading stats
     */
    getPerformanceMetrics() {
        return {
            ...this.stats,
            selectiveLoading: {
                enabled: this.selectiveLoading.enabled,
                batchSize: this.selectiveLoading.batchSize,
                cacheSize: this.collectionCache.size
            },
            backgroundSync: this.getBackgroundSyncStatus(),
            cacheVersioning: this.getVersioningStatus()
        };
    }

    // ==================== CACHE VERSIONING ====================

    /**
     * Get versioning status for all collections
     */
    getVersioningStatus() {
        if (!this.cacheVersioning.enabled) {
            return { enabled: false };
        }

        const status = {
            enabled: true,
            currentVersion: this.cacheVersioning.currentVersion,
            collections: {}
        };

        for (const collection of Object.keys(this.collections)) {
            const cachedVersion = this.getCacheVersion(collection);
            const currentVersion = this.cacheVersioning.schemaVersions[collection];

            status.collections[collection] = {
                cached: cachedVersion,
                current: currentVersion,
                compatible: this.isVersionCompatible(cachedVersion, currentVersion)
            };
        }

        return status;
    }

    /**
     * Get cache version for a collection
     */
    getCacheVersion(collection) {
        const metadata = this.metadata[collection];
        return metadata?.version || '1.0.0';
    }

    /**
     * Check if cached version is compatible with current version
     */
    isVersionCompatible(cachedVersion, currentVersion) {
        if (!this.cacheVersioning.enabled) return true;
        if (!cachedVersion || !currentVersion) return false;

        const cached = this.parseVersion(cachedVersion);
        const current = this.parseVersion(currentVersion);

        // Major version must match
        if (cached.major !== current.major) return false;

        // Minor version can be older but not newer
        if (cached.minor > current.minor) return false;

        return true;
    }

    /**
     * Parse version string into components
     */
    parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }

    /**
     * Clear cache for collections with incompatible versions
     */
    async clearIncompatibleCache() {
        if (!this.cacheVersioning.enabled) return;

        const collectionsToMigrate = [];

        for (const collection of Object.keys(this.collections)) {
            const cachedVersion = this.getCacheVersion(collection);
            const currentVersion = this.cacheVersioning.schemaVersions[collection];

            if (!this.isVersionCompatible(cachedVersion, currentVersion)) {
                collectionsToMigrate.push(collection);
            }
        }

        if (collectionsToMigrate.length > 0) {
            console.log(`Clearing incompatible cache for collections: ${collectionsToMigrate.join(', ')}`);

            for (const collection of collectionsToMigrate) {
                await this.invalidateCache(collection);
            }
        }
    }
    
    // ==================== EVENT SYSTEM ====================
    
    on(event, callback) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                this.eventListeners = new Map();
            }
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        } catch (error) {
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
                const callbacks = this.eventListeners.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        } catch (error) {
            this.eventListeners = new Map();
        }
    }
    
    emit(event, data) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                this.eventListeners = new Map();
                return;
            }
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                    }
                });
            }
        } catch (error) {
            this.eventListeners = new Map();
        }
    }
    
    // ==================== CLEANUP AND MAINTENANCE ====================
    
    async clearCollection(collection) {
        try {
            if (!this.collections[collection]) {
                throw new Error(`Unknown collection: ${collection}`);
            }
            
            const storageKey = this.getStorageKey(collection);
            localStorage.removeItem(storageKey);
            
            await this.updateMetadata(collection, {
                lastCleared: new Date().toISOString(),
                count: 0
            });
            
            this.emit('collectionCleared', { collection });
            
        } catch (error) {
            throw error;
        }
    }
    
    async clearAllData() {
        try {
            for (const collection of Object.keys(this.collections)) {
                await this.clearCollection(collection);
            }
            
            // Clear metadata
            const metadataKey = this.getStorageKey('metadata');
            localStorage.removeItem(metadataKey);
            
            this.emit('allDataCleared');
            
        } catch (error) {
            throw error;
        }
    }
    
    async exportData() {
        try {
            const exportData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                metadata: this.metadata,
                collections: {},
                config: {
                    selectiveLoading: this.getSelectiveLoadingConfig(),
                    backgroundSync: this.getBackgroundSyncStatus()
                }
            };
            
            for (const collection of Object.keys(this.collections)) {
                exportData.collections[collection] = await this.getData(collection, { returnEmpty: true });
            }
            
            return exportData;
            
        } catch (error) {
            throw error;
        }
    }
    
    async importData(importData) {
        try {
            if (!importData.collections) {
                throw new Error('Invalid import data format');
            }
            
            // Import configuration if available
            if (importData.config) {
                if (importData.config.selectiveLoading) {
                    this.updateSelectiveLoadingConfig(importData.config.selectiveLoading);
                }
            }
            
            for (const [collection, data] of Object.entries(importData.collections)) {
                if (this.collections[collection]) {
                    await this.saveData(collection, data, { 
                        source: 'import',
                        overwrite: true 
                    });
                }
            }
            
            this.emit('dataImported', importData);
            
        } catch (error) {
            throw error;
        }
    }
}

// Global instance
window.localFallbackManager = new LocalFallbackManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalFallbackManager;
}

// Add selective loading utilities to global scope
if (typeof window !== 'undefined') {
    window.selectiveLoadingUtils = {
        filterPriorityFields: (data, collection) => window.localFallbackManager.filterPriorityFields(data, collection),
        loadLazyFields: (collection, itemId, fields) => window.localFallbackManager.loadLazyFields(collection, itemId, fields),
        getConfig: () => window.localFallbackManager.getSelectiveLoadingConfig(),
        updateConfig: (config) => window.localFallbackManager.updateSelectiveLoadingConfig(config)
    };
}