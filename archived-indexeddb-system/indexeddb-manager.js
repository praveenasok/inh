/**
 * IndexedDB Manager
 * Comprehensive IndexedDB management system for Google Sheets synchronization
 * Provides structured data storage, CRUD operations, and transaction management
 */

class IndexedDBManager {
    constructor(config = {}) {
        this.dbName = config.dbName || 'INH_SyncDatabase';
        this.dbVersion = config.dbVersion || 1;
        this.db = null;
        this.isInitialized = false;
        this.logLevel = config.logLevel || 'info';
        
        // Define data schema for all collections
        this.schema = {
            products: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'priceList', keyPath: 'priceList', unique: false },
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            clients: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'email', keyPath: 'email', unique: false },
                    { name: 'salesperson', keyPath: 'salesperson', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            salespeople: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'email', keyPath: 'email', unique: false },
                    { name: 'active', keyPath: 'active', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            priceLists: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'active', keyPath: 'active', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            colors: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            styles: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            categories: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'priceList', keyPath: 'priceList', unique: false },
                    { name: 'lastModified', keyPath: 'lastModified', unique: false }
                ]
            },
            syncMetadata: {
                keyPath: 'collection',
                autoIncrement: false,
                indexes: [
                    { name: 'lastSync', keyPath: 'lastSync', unique: false },
                    { name: 'syncStatus', keyPath: 'syncStatus', unique: false },
                    { name: 'recordCount', keyPath: 'recordCount', unique: false }
                ]
            }
        };

        this.eventListeners = new Map();
        this.transactionQueue = [];
        this.isProcessingQueue = false;
        
        this.log('IndexedDB Manager initialized', 'info');
    }

    /**
     * Initialize the IndexedDB database
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized) {
                resolve(true);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                const error = new Error(`Failed to open IndexedDB: ${request.error}`);
                this.log(error.message, 'error');
                reject(error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                this.log(`IndexedDB ${this.dbName} opened successfully`, 'info');
                
                // Set up error handling
                this.db.onerror = (event) => {
                    this.log(`Database error: ${event.target.error}`, 'error');
                };

                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.log(`Upgrading database from version ${event.oldVersion} to ${event.newVersion}`, 'info');
                
                try {
                    this.createObjectStores();
                    this.log('Database schema created successfully', 'info');
                } catch (error) {
                    this.log(`Error creating database schema: ${error.message}`, 'error');
                    reject(error);
                }
            };
        });
    }

    /**
     * Create object stores and indexes based on schema
     */
    createObjectStores() {
        for (const [storeName, storeConfig] of Object.entries(this.schema)) {
            // Delete existing store if it exists (for upgrades)
            if (this.db.objectStoreNames.contains(storeName)) {
                this.db.deleteObjectStore(storeName);
                this.log(`Deleted existing object store: ${storeName}`, 'debug');
            }

            // Create object store
            const objectStore = this.db.createObjectStore(storeName, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement
            });

            // Create indexes
            for (const index of storeConfig.indexes) {
                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
                this.log(`Created index ${index.name} for store ${storeName}`, 'debug');
            }

            this.log(`Created object store: ${storeName}`, 'debug');
        }
    }

    /**
     * Add or update a single record
     */
    async put(storeName, data) {
        this.validateStore(storeName);
        
        // Add metadata
        const record = {
            ...data,
            lastModified: new Date().toISOString(),
            syncStatus: 'pending'
        };

        return this.executeTransaction([storeName], 'readwrite', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.put(record);
        });
    }

    /**
     * Add multiple records in a single transaction
     */
    async putBatch(storeName, dataArray) {
        this.validateStore(storeName);
        
        if (!Array.isArray(dataArray)) {
            throw new Error('Data must be an array for batch operations');
        }

        const timestamp = new Date().toISOString();
        const records = dataArray.map(data => ({
            ...data,
            lastModified: timestamp,
            syncStatus: 'pending'
        }));

        return this.executeTransaction([storeName], 'readwrite', (transaction) => {
            const store = transaction.objectStore(storeName);
            const promises = records.map(record => store.put(record));
            return Promise.all(promises);
        });
    }

    /**
     * Get a single record by key
     */
    async get(storeName, key) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readonly', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.get(key);
        });
    }

    /**
     * Get all records from a store
     */
    async getAll(storeName, query = null, count = null) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readonly', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.getAll(query, count);
        });
    }

    /**
     * Get records by index
     */
    async getByIndex(storeName, indexName, value) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readonly', (transaction) => {
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            return index.getAll(value);
        });
    }

    /**
     * Delete a record by key
     */
    async delete(storeName, key) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readwrite', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.delete(key);
        });
    }

    /**
     * Clear all records from a store
     */
    async clear(storeName) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readwrite', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.clear();
        });
    }

    /**
     * Count records in a store
     */
    async count(storeName, query = null) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readonly', (transaction) => {
            const store = transaction.objectStore(storeName);
            return store.count(query);
        });
    }

    /**
     * Replace all data in a store (atomic operation)
     */
    async replaceAll(storeName, dataArray) {
        this.validateStore(storeName);
        
        if (!Array.isArray(dataArray)) {
            throw new Error('Data must be an array for replace operations');
        }

        const timestamp = new Date().toISOString();
        const records = dataArray.map(data => ({
            ...data,
            lastModified: timestamp,
            syncStatus: 'synced'
        }));

        return this.executeTransaction([storeName], 'readwrite', (transaction) => {
            const store = transaction.objectStore(storeName);
            
            // Clear existing data
            store.clear();
            
            // Add new data
            const promises = records.map(record => store.put(record));
            return Promise.all(promises);
        });
    }

    /**
     * Get records that need synchronization
     */
    async getPendingSync(storeName) {
        this.validateStore(storeName);
        
        return this.executeTransaction([storeName], 'readonly', (transaction) => {
            const store = transaction.objectStore(storeName);
            const index = store.index('syncStatus');
            return index.getAll('pending');
        });
    }

    /**
     * Mark records as synced
     */
    async markAsSynced(storeName, keys) {
        this.validateStore(storeName);
        
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        return this.executeTransaction([storeName], 'readwrite', async (transaction) => {
            const store = transaction.objectStore(storeName);
            const promises = keyArray.map(async (key) => {
                const record = await store.get(key);
                if (record) {
                    record.syncStatus = 'synced';
                    record.lastSynced = new Date().toISOString();
                    return store.put(record);
                }
            });
            return Promise.all(promises);
        });
    }

    /**
     * Update sync metadata
     */
    async updateSyncMetadata(collection, metadata) {
        const syncData = {
            collection,
            lastSync: new Date().toISOString(),
            recordCount: metadata.recordCount || 0,
            syncStatus: metadata.syncStatus || 'completed',
            errors: metadata.errors || [],
            ...metadata
        };

        return this.put('syncMetadata', syncData);
    }

    /**
     * Get sync metadata for a collection
     */
    async getSyncMetadata(collection) {
        return this.get('syncMetadata', collection);
    }

    /**
     * Execute a transaction with proper error handling
     */
    async executeTransaction(storeNames, mode, operation) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeNames, mode);
            
            transaction.onerror = () => {
                const error = new Error(`Transaction failed: ${transaction.error}`);
                this.log(error.message, 'error');
                reject(error);
            };

            transaction.onabort = () => {
                const error = new Error('Transaction aborted');
                this.log(error.message, 'error');
                reject(error);
            };

            try {
                const result = operation(transaction);
                
                if (result && typeof result.then === 'function') {
                    // Handle promise-based operations
                    result.then(resolve).catch(reject);
                } else if (result && result.onsuccess !== undefined) {
                    // Handle IDBRequest objects
                    result.onsuccess = () => resolve(result.result);
                    result.onerror = () => reject(new Error(`Operation failed: ${result.error}`));
                } else {
                    // Handle direct values
                    resolve(result);
                }
            } catch (error) {
                this.log(`Transaction operation error: ${error.message}`, 'error');
                reject(error);
            }
        });
    }

    /**
     * Validate store name
     */
    validateStore(storeName) {
        if (!this.schema[storeName]) {
            throw new Error(`Unknown store: ${storeName}`);
        }
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const stats = {
            dbName: this.dbName,
            dbVersion: this.dbVersion,
            isInitialized: this.isInitialized,
            stores: {}
        };

        for (const storeName of Object.keys(this.schema)) {
            try {
                const count = await this.count(storeName);
                const syncMetadata = await this.getSyncMetadata(storeName);
                
                stats.stores[storeName] = {
                    recordCount: count,
                    lastSync: syncMetadata?.lastSync || null,
                    syncStatus: syncMetadata?.syncStatus || 'unknown'
                };
            } catch (error) {
                stats.stores[storeName] = {
                    recordCount: 0,
                    error: error.message
                };
            }
        }

        return stats;
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            this.log('Database connection closed', 'info');
        }
    }

    /**
     * Delete the entire database
     */
    async deleteDatabase() {
        this.close();
        
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            
            deleteRequest.onsuccess = () => {
                this.log(`Database ${this.dbName} deleted successfully`, 'info');
                resolve(true);
            };
            
            deleteRequest.onerror = () => {
                const error = new Error(`Failed to delete database: ${deleteRequest.error}`);
                this.log(error.message, 'error');
                reject(error);
            };
        });
    }

    /**
     * Event system for synchronization notifications
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log(`Event callback error: ${error.message}`, 'error');
                }
            });
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
            const prefix = `[IndexedDB Manager ${level.toUpperCase()}] ${timestamp}:`;
            
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
    window.IndexedDBManager = IndexedDBManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBManager;
}