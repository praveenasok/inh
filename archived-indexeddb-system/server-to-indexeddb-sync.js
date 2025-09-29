/**
 * Server API to IndexedDB Sync Service
 * Handles data synchronization from server API endpoints to IndexedDB
 * This replaces direct Google Sheets access with server-side API calls
 */

class ServerToIndexedDBSync {
    constructor(config = {}) {
        this.baseURL = config.baseURL || 'http://localhost:3000';
        this.dbManager = config.dbManager || null;
        this.logLevel = config.logLevel || 'info';
        
        // API endpoint mapping
        this.endpoints = {
            products: '/api/products',
            clients: '/api/clients',
            salespeople: '/api/salespeople',
            colors: '/api/colors',
            styles: '/api/styles',
            categories: '/api/categories',
            priceLists: '/api/priceLists'
        };

        // Display names for UI (different from collection names)
        this.displayNames = {
            products: 'products',
            clients: 'clients',
            salespeople: 'salesmen',
            colors: 'colors',
            styles: 'styles',
            categories: 'categories',
            priceLists: 'price lists'
        };

        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            errors: [],
            startTime: null,
            endTime: null
        };

        this.log('Server to IndexedDB Sync Service initialized', 'info');
    }

    /**
     * Sync all collections from server API to IndexedDB
     */
    async syncAll() {
        this.log('Starting complete sync from server API to IndexedDB', 'info');
        this.resetSyncStats();
        this.syncStats.startTime = new Date().toISOString();

        const results = {};
        
        for (const [collection, endpoint] of Object.entries(this.endpoints)) {
            try {
                const displayName = this.displayNames[collection] || collection;
                this.log(`Syncing collection: ${displayName}`, 'info');
                const result = await this.syncCollection(collection, endpoint);
                results[collection] = result;
                
                this.syncStats.successfulRecords += result.recordCount;
                this.log(`Successfully synced ${result.recordCount} records for ${displayName}`, 'info');
                
            } catch (error) {
                const displayName = this.displayNames[collection] || collection;
                this.log(`Failed to sync collection ${displayName}: ${error.message}`, 'error');
                this.syncStats.errors.push({
                    collection,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                this.syncStats.failedRecords++;
                
                results[collection] = {
                    success: false,
                    error: error.message,
                    recordCount: 0
                };
            }
        }

        this.syncStats.endTime = new Date().toISOString();
        this.log(`Sync completed. Total: ${this.syncStats.totalRecords}, Success: ${this.syncStats.successfulRecords}, Failed: ${this.syncStats.failedRecords}`, 'info');

        return {
            success: this.syncStats.failedRecords === 0,
            results,
            stats: this.getSyncStats()
        };
    }

    /**
     * Sync a specific collection from server API to IndexedDB
     */
    async syncCollection(collection, endpoint) {
        if (!this.dbManager) {
            throw new Error('IndexedDB manager not configured');
        }

        const displayName = this.displayNames[collection] || collection;
        this.log(`Fetching ${displayName} data from ${endpoint}`, 'info');
        
        // Fetch data from server API
        const data = await this.fetchServerData(endpoint);
        
        if (!data || data.length === 0) {
            this.log(`No data received for ${displayName}`, 'warn');
            return { success: true, recordCount: 0 };
        }

        this.log(`Processing ${data.length} records for ${displayName}`, 'info');

        // Process records to ensure they have proper IDs
        const processedData = data.map(record => {
            if (!record.id) {
                record.id = this.generateId(collection, record);
            }
            return record;
        });

        // Save data using UnifiedDataAccess (this will handle both local and Firebase storage)
        try {
            await this.dbManager.saveData(collection, processedData, { 
                overwrite: true,
                source: 'server_sync'
            });
            
            this.log(`Successfully saved ${processedData.length} records to ${displayName}`, 'info');
            this.syncStats.totalRecords += processedData.length;

            return {
                success: true,
                recordCount: processedData.length,
                totalFetched: data.length
            };
            
        } catch (error) {
            this.log(`Failed to save data to ${displayName}: ${error.message}`, 'error');
            this.syncStats.errors.push({
                collection,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Fetch data from server API endpoint
     */
    async fetchServerData(endpoint) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            this.log(`Fetching from: ${url}`, 'debug');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle different response formats
            if (data.success && data.data) {
                return data.data;
            } else if (Array.isArray(data)) {
                return data;
            } else if (data.data) {
                return data.data;
            } else {
                return data;
            }

        } catch (error) {
            this.log(`Failed to fetch data from ${endpoint}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Generate ID for records that don't have one
     */
    generateId(collection, record) {
        // Try to use existing ID fields
        if (record.cust_id) return record.cust_id;
        if (record.name) return `${collection}_${record.name.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Fallback to timestamp-based ID
        return `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Reset sync statistics
     */
    resetSyncStats() {
        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    /**
     * Get sync statistics
     */
    getSyncStats() {
        return { ...this.syncStats };
    }

    /**
     * Check data counts in IndexedDB
     */
    async checkDataCounts() {
        if (!this.dbManager) {
            throw new Error('IndexedDB manager not configured');
        }

        const counts = {};
        
        for (const collection of Object.keys(this.endpoints)) {
            try {
                const displayName = this.displayNames[collection] || collection;
                const result = await this.dbManager.getData(collection, { returnEmpty: true });
                counts[displayName] = result.data ? result.data.length : 0;
            } catch (error) {
                const displayName = this.displayNames[collection] || collection;
                this.log(`Error checking ${displayName} count: ${error.message}`, 'error');
                counts[displayName] = 'Error';
            }
        }

        return counts;
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        if (this.logLevel === 'debug' || level !== 'debug') {
            const timestamp = new Date().toISOString();
            const prefix = `[ServerToIndexedDBSync] ${timestamp}`;
            
            switch (level) {
                case 'error':
                    break;
                case 'warn':
                    break;
                case 'debug':
                    break;
                default:
                    console.log(`${prefix} INFO: ${message}`);
            }
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ServerToIndexedDBSync = ServerToIndexedDBSync;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerToIndexedDBSync;
}