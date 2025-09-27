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
        
        // Event system initialization
        this.eventListeners = new Map();
        
        // Defer initialization to first use
        this.deferredInitialize();
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
            
            console.log('✅ localStorage is available and working');
            return true;
            
        } catch (error) {
            console.error('❌ localStorage is not available:', error);
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
            console.log('🔄 Initializing Local Fallback Manager...');
            
            // Check localStorage availability
            this.checkStorageAvailability();
            
            // Load existing metadata
            await this.loadMetadata();
            
            // Validate storage integrity
            await this.validateStorageIntegrity();
            
            this.isInitialized = true;
            console.log('✅ Local Fallback Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Local Fallback Manager:', error);
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
            console.error(`Error saving data to ${collection}:`, error);
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
                return cached.data;
            }
            
            this.stats.cacheMisses++;
            const result = await this._performGetData(collection, options);
            
            // Cache the result
            this.collectionCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            // Clean up old cache entries
            this._cleanupCache();
            
            return result;
            
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
                
                const storageKey = this.getStorageKey(collection);
                const rawData = localStorage.getItem(storageKey);
                
                if (!rawData) {
                    return options.returnEmpty ? [] : null;
                }
                
                let data;
                try {
                    data = JSON.parse(rawData);
                } catch (parseError) {
                    console.warn(`JSON parse error for ${collection}, attempting recovery...`);
                    
                    // Try to recover corrupted data
                    const recoveredData = await this.recoverCorruptedData(collection, rawData);
                    if (recoveredData) {
                        data = recoveredData;
                        console.log(`Successfully recovered data for ${collection}`);
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
                        console.warn(`Data integrity check failed for ${collection}`);
                        this.emit('integrityError', { collection, data, attempt });
                        
                        // Try to repair data integrity
                        const repairedData = await this.repairDataIntegrity(collection, data);
                        if (repairedData) {
                            data = repairedData;
                            console.log(`Data integrity repaired for ${collection}`);
                            this.emit('dataRepaired', { collection, method: 'integrity_repair' });
                        }
                    }
                }
                
                // Log successful recovery if this was a retry
                if (attempt > 0) {
                    console.log(`Successfully retrieved data for ${collection} on attempt ${attempt + 1}`);
                    this.emit('dataRetrieved', { collection, attempt });
                }
                
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt + 1} failed for ${collection}:`, error.message);
                
                // If this is the last attempt, return fallback
                if (attempt === maxRetries) {
                    console.error(`All attempts failed for ${collection}:`, error);
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
            console.warn(`Failed to recover corrupted data for ${collection}:`, error);
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
            console.error(`Failed to repair data integrity for ${collection}:`, error);
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
            console.error('Error syncing from Firebase:', error);
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
            console.error(`Error validating integrity for ${collection}:`, error);
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
            console.error('Error loading metadata:', error);
        }
    }
    
    async updateMetadata(collection, updates) {
        try {
            if (!this.metadata[collection]) {
                this.metadata[collection] = {};
            }
            
            this.metadata[collection] = { ...this.metadata[collection], ...updates };
            
            const metadataKey = this.getStorageKey('metadata');
            localStorage.setItem(metadataKey, JSON.stringify(this.metadata));
            
        } catch (error) {
            console.error('Error updating metadata:', error);
        }
    }
    
    async getMetadata(collection) {
        return this.metadata[collection] || null;
    }
    
    // ==================== STORAGE UTILITIES ====================
    
    getStorageKey(collection) {
        return `${this.storagePrefix}${collection}`;
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
            console.error('Storage integrity validation failed:', error);
            throw error;
        }
    }
    
    async initializeCollections() {
        for (const collection of Object.keys(this.collections)) {
            const data = await this.getData(collection);
            if (!data) {
                await this.saveData(collection, [], { source: 'initialization' });
            }
        }
    }
    
    // ==================== STATISTICS AND MONITORING ====================
    
    async getStatistics() {
        const stats = {};
        
        for (const collection of Object.keys(this.collections)) {
            const data = await this.getData(collection, { returnEmpty: true });
            const metadata = await this.getMetadata(collection);
            
            stats[collection] = {
                count: data.length,
                lastUpdated: metadata?.lastUpdated || 'Never',
                integrity: metadata?.integrity || 'Unknown',
                source: metadata?.source || 'Unknown'
            };
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
            
            usage[collection] = size;
            totalSize += size;
        }
        
        return {
            total: totalSize,
            collections: usage,
            totalFormatted: this.formatBytes(totalSize)
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // ==================== EVENT SYSTEM ====================
    
    on(event, callback) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                console.warn('LocalFallbackManager: eventListeners not properly initialized in on(), recreating');
                this.eventListeners = new Map();
            }
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        } catch (error) {
            console.error('LocalFallbackManager: Error in on() method:', error);
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
            console.error('LocalFallbackManager: Error in off() method:', error);
            this.eventListeners = new Map();
        }
    }
    
    emit(event, data) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                console.warn('LocalFallbackManager: eventListeners not properly initialized in emit(), recreating');
                this.eventListeners = new Map();
                return;
            }
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${event}:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('LocalFallbackManager: Error in emit() method:', error);
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
            console.error(`Error clearing collection ${collection}:`, error);
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
            console.error('Error clearing all data:', error);
            throw error;
        }
    }
    
    async exportData() {
        try {
            const exportData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                metadata: this.metadata,
                collections: {}
            };
            
            for (const collection of Object.keys(this.collections)) {
                exportData.collections[collection] = await this.getData(collection, { returnEmpty: true });
            }
            
            return exportData;
            
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }
    
    async importData(importData) {
        try {
            if (!importData.collections) {
                throw new Error('Invalid import data format');
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
            console.error('Error importing data:', error);
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