/**
 * IndexedDB to Google Sheets Sync Service
 * Handles data synchronization from IndexedDB to Google Sheets
 * Includes conflict resolution, batch updates, and error handling
 */

class IndexedDBToSheetsSync {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.sheetId = config.sheetId || '';
        this.dbManager = config.dbManager || null;
        this.logLevel = config.logLevel || 'info';
        this.retryAttempts = config.retryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;
        this.batchSize = config.batchSize || 100;
        
        // Sheet configuration mapping
        this.sheetConfig = {
            products: {
                range: 'Products!A:Z',
                headers: ['ID', 'Name', 'Category', 'PriceList', 'Price', 'Description', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformProductForSheets.bind(this)
            },
            clients: {
                range: 'Clients!A:Z',
                headers: ['ID', 'Name', 'Email', 'Phone', 'Address', 'Salesperson', 'PriceList', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformClientForSheets.bind(this)
            },
            salespeople: {
                range: 'Salespeople!A:Z',
                headers: ['ID', 'Name', 'Email', 'Phone', 'Territory', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformSalespersonForSheets.bind(this)
            },
            priceLists: {
                range: 'PriceLists!A:Z',
                headers: ['ID', 'Name', 'Description', 'Active', 'EffectiveDate'],
                keyColumn: 'A', // ID column
                transform: this.transformPriceListForSheets.bind(this)
            },
            colors: {
                range: 'Colors!A:Z',
                headers: ['ID', 'Name', 'HexCode', 'Category', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformColorForSheets.bind(this)
            },
            styles: {
                range: 'Styles!A:Z',
                headers: ['ID', 'Name', 'Category', 'Description', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformStyleForSheets.bind(this)
            },
            categories: {
                range: 'Categories!A:Z',
                headers: ['ID', 'Name', 'PriceList', 'Description', 'Active'],
                keyColumn: 'A', // ID column
                transform: this.transformCategoryForSheets.bind(this)
            }
        };

        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            conflicts: 0,
            errors: [],
            startTime: null,
            endTime: null
        };

        this.conflictResolutionStrategy = config.conflictResolution || 'indexeddb-wins'; // 'indexeddb-wins', 'sheets-wins', 'manual'

        this.log('IndexedDB to Sheets Sync Service initialized', 'info');
    }

    /**
     * Sync all pending changes from IndexedDB to Google Sheets
     */
    async syncPendingChanges() {
        this.log('Starting sync of pending changes from IndexedDB to Google Sheets', 'info');
        this.resetSyncStats();
        this.syncStats.startTime = new Date().toISOString();

        const results = {};
        
        for (const [collection, config] of Object.entries(this.sheetConfig)) {
            try {
                this.log(`Checking pending changes for collection: ${collection}`, 'info');
                const result = await this.syncCollectionChanges(collection);
                results[collection] = result;
                
                this.syncStats.successfulRecords += result.recordCount;
                this.syncStats.conflicts += result.conflicts || 0;
                
                this.log(`Successfully synced ${result.recordCount} records for ${collection}`, 'info');
                
            } catch (error) {
                this.log(`Failed to sync collection ${collection}: ${error.message}`, 'error');
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
        this.syncStats.totalRecords = this.syncStats.successfulRecords + this.syncStats.failedRecords;

        this.log(`Sync completed. Total: ${this.syncStats.totalRecords}, Success: ${this.syncStats.successfulRecords}, Failed: ${this.syncStats.failedRecords}, Conflicts: ${this.syncStats.conflicts}`, 'info');

        return {
            success: this.syncStats.failedRecords === 0,
            results,
            stats: this.syncStats
        };
    }

    /**
     * Sync pending changes for a specific collection
     */
    async syncCollectionChanges(collection) {
        if (!this.sheetConfig[collection]) {
            throw new Error(`Unknown collection: ${collection}`);
        }

        if (!this.dbManager) {
            throw new Error('IndexedDB manager not configured');
        }

        // Get pending records from IndexedDB
        const pendingRecords = await this.dbManager.getPendingSync(collection);
        
        if (pendingRecords.length === 0) {
            this.log(`No pending changes for collection: ${collection}`, 'info');
            return { success: true, recordCount: 0, conflicts: 0 };
        }

        this.log(`Found ${pendingRecords.length} pending records for ${collection}`, 'info');

        const config = this.sheetConfig[collection];
        let conflicts = 0;
        let successCount = 0;

        // Process records in batches
        for (let i = 0; i < pendingRecords.length; i += this.batchSize) {
            const batch = pendingRecords.slice(i, i + this.batchSize);
            
            try {
                const batchResult = await this.processBatch(collection, batch, config);
                successCount += batchResult.successCount;
                conflicts += batchResult.conflicts;
                
                // Mark successfully synced records
                const syncedIds = batchResult.syncedRecords.map(record => record.id);
                if (syncedIds.length > 0) {
                    await this.dbManager.markAsSynced(collection, syncedIds);
                }
                
            } catch (error) {
                this.log(`Batch processing failed for ${collection}: ${error.message}`, 'error');
                throw error;
            }
        }

        // Update sync metadata
        await this.dbManager.updateSyncMetadata(collection, {
            recordCount: successCount,
            syncStatus: 'completed',
            syncType: 'indexeddb-to-sheets',
            conflicts: conflicts,
            errors: []
        });

        return {
            success: true,
            recordCount: successCount,
            conflicts: conflicts,
            collection
        };
    }

    /**
     * Process a batch of records
     */
    async processBatch(collection, records, config) {
        const transformedRecords = [];
        const syncedRecords = [];
        let conflicts = 0;

        // Transform records for Google Sheets format
        for (const record of records) {
            try {
                const transformedRecord = await config.transform(record);
                transformedRecords.push({
                    original: record,
                    transformed: transformedRecord
                });
            } catch (error) {
                this.log(`Failed to transform record ${record.id}: ${error.message}`, 'error');
                this.syncStats.errors.push({
                    collection,
                    recordId: record.id,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        if (transformedRecords.length === 0) {
            return { successCount: 0, conflicts: 0, syncedRecords: [] };
        }

        // Check for conflicts with existing data in Google Sheets
        const conflictResults = await this.checkForConflicts(collection, transformedRecords);
        
        // Resolve conflicts based on strategy
        const resolvedRecords = await this.resolveConflicts(conflictResults);
        conflicts = resolvedRecords.filter(r => r.hadConflict).length;

        // Update Google Sheets with resolved data
        const updateResult = await this.updateGoogleSheets(collection, resolvedRecords);
        
        if (updateResult.success) {
            syncedRecords.push(...resolvedRecords.map(r => r.original));
        }

        return {
            successCount: updateResult.success ? resolvedRecords.length : 0,
            conflicts: conflicts,
            syncedRecords: syncedRecords
        };
    }

    /**
     * Check for conflicts between IndexedDB and Google Sheets data
     */
    async checkForConflicts(collection, records) {
        const config = this.sheetConfig[collection];
        
        // Fetch current data from Google Sheets
        const currentSheetData = await this.fetchCurrentSheetData(config.range);
        const sheetDataMap = new Map();
        
        // Create a map of existing sheet data by ID
        if (currentSheetData.length > 1) {
            const headers = currentSheetData[0];
            const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
            
            if (idIndex >= 0) {
                for (let i = 1; i < currentSheetData.length; i++) {
                    const row = currentSheetData[i];
                    if (row[idIndex]) {
                        sheetDataMap.set(row[idIndex], {
                            rowIndex: i + 1, // 1-based indexing
                            data: row
                        });
                    }
                }
            }
        }

        // Check each record for conflicts
        const conflictResults = [];
        
        for (const recordData of records) {
            const record = recordData.original;
            const transformed = recordData.transformed;
            const existingSheetData = sheetDataMap.get(record.id);
            
            let hasConflict = false;
            let conflictDetails = null;
            
            if (existingSheetData) {
                // Compare data to detect conflicts
                const conflict = this.detectDataConflict(transformed, existingSheetData.data, config.headers);
                if (conflict) {
                    hasConflict = true;
                    conflictDetails = {
                        field: conflict.field,
                        indexeddbValue: conflict.indexeddbValue,
                        sheetsValue: conflict.sheetsValue,
                        rowIndex: existingSheetData.rowIndex
                    };
                }
            }

            conflictResults.push({
                original: record,
                transformed: transformed,
                hasConflict: hasConflict,
                conflictDetails: conflictDetails,
                existingData: existingSheetData
            });
        }

        return conflictResults;
    }

    /**
     * Detect data conflicts between IndexedDB and Google Sheets
     */
    detectDataConflict(indexeddbData, sheetsRow, headers) {
        for (let i = 0; i < headers.length && i < sheetsRow.length; i++) {
            const header = headers[i].toLowerCase();
            const indexeddbValue = String(indexeddbData[i] || '').trim();
            const sheetsValue = String(sheetsRow[i] || '').trim();
            
            // Skip ID field and empty values
            if (header === 'id' || (!indexeddbValue && !sheetsValue)) {
                continue;
            }
            
            // Compare values (case-insensitive for strings)
            if (indexeddbValue.toLowerCase() !== sheetsValue.toLowerCase()) {
                return {
                    field: header,
                    indexeddbValue: indexeddbValue,
                    sheetsValue: sheetsValue
                };
            }
        }
        
        return null;
    }

    /**
     * Resolve conflicts based on configured strategy
     */
    async resolveConflicts(conflictResults) {
        const resolvedRecords = [];
        
        for (const result of conflictResults) {
            let resolvedData = result.transformed;
            let hadConflict = result.hasConflict;
            
            if (result.hasConflict) {
                this.log(`Conflict detected for record ${result.original.id}: ${result.conflictDetails.field}`, 'warn');
                
                switch (this.conflictResolutionStrategy) {
                    case 'indexeddb-wins':
                        // Use IndexedDB data (default behavior)
                        resolvedData = result.transformed;
                        this.log(`Conflict resolved: IndexedDB wins for ${result.original.id}`, 'info');
                        break;
                        
                    case 'sheets-wins':
                        // Use Google Sheets data
                        if (result.existingData) {
                            resolvedData = result.existingData.data;
                            this.log(`Conflict resolved: Sheets wins for ${result.original.id}`, 'info');
                        }
                        break;
                        
                    case 'manual':
                        // Log conflict for manual resolution
                        this.log(`Manual conflict resolution required for ${result.original.id}`, 'warn');
                        this.syncStats.errors.push({
                            type: 'conflict',
                            recordId: result.original.id,
                            details: result.conflictDetails,
                            timestamp: new Date().toISOString()
                        });
                        continue; // Skip this record
                        
                    default:
                        // Default to IndexedDB wins
                        resolvedData = result.transformed;
                }
            }
            
            resolvedRecords.push({
                original: result.original,
                resolved: resolvedData,
                hadConflict: hadConflict,
                existingData: result.existingData
            });
        }
        
        return resolvedRecords;
    }

    /**
     * Update Google Sheets with resolved data
     */
    async updateGoogleSheets(collection, resolvedRecords) {
        if (resolvedRecords.length === 0) {
            return { success: true };
        }

        const config = this.sheetConfig[collection];
        
        try {
            // Prepare batch update data
            const updates = [];
            
            for (const record of resolvedRecords) {
                if (record.existingData) {
                    // Update existing row
                    const range = `${collection}!A${record.existingData.rowIndex}:${this.getColumnLetter(config.headers.length - 1)}${record.existingData.rowIndex}`;
                    updates.push({
                        range: range,
                        values: [record.resolved]
                    });
                } else {
                    // Append new row
                    const range = `${collection}!A:${this.getColumnLetter(config.headers.length - 1)}`;
                    updates.push({
                        range: range,
                        values: [record.resolved]
                    });
                }
            }

            // Execute batch update
            await this.executeBatchUpdate(updates);
            
            this.log(`Successfully updated ${resolvedRecords.length} records in Google Sheets for ${collection}`, 'info');
            return { success: true };
            
        } catch (error) {
            this.log(`Failed to update Google Sheets for ${collection}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Execute batch update to Google Sheets
     */
    async executeBatchUpdate(updates) {
        if (!this.apiKey || !this.sheetId) {
            throw new Error('Google Sheets API key and sheet ID are required');
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values:batchUpdate?key=${this.apiKey}`;
        
        const requestBody = {
            valueInputOption: 'RAW',
            data: updates
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                this.log(`Batch update successful: ${result.totalUpdatedCells} cells updated`, 'debug');
                return result;
                
            } catch (error) {
                lastError = error;
                this.log(`Batch update attempt ${attempt} failed: ${error.message}`, 'warn');
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        throw new Error(`Failed to update Google Sheets after ${this.retryAttempts} attempts: ${lastError.message}`);
    }

    /**
     * Fetch current data from Google Sheets
     */
    async fetchCurrentSheetData(range) {
        if (!this.apiKey || !this.sheetId) {
            throw new Error('Google Sheets API key and sheet ID are required');
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.values || [];
    }

    /**
     * Transform data methods for Google Sheets format
     */
    transformProductForSheets(data) {
        return [
            data.id,
            data.name,
            data.category,
            data.priceList,
            data.price,
            data.description,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    transformClientForSheets(data) {
        return [
            data.id,
            data.name,
            data.email,
            data.phone,
            data.address,
            data.salesperson,
            data.priceList,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    transformSalespersonForSheets(data) {
        return [
            data.id,
            data.name,
            data.email,
            data.phone,
            data.territory,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    transformPriceListForSheets(data) {
        return [
            data.id,
            data.name,
            data.description,
            data.active ? 'TRUE' : 'FALSE',
            data.effectiveDate || ''
        ];
    }

    transformColorForSheets(data) {
        return [
            data.id,
            data.name,
            data.hexCode,
            data.category,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    transformStyleForSheets(data) {
        return [
            data.id,
            data.name,
            data.category,
            data.description,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    transformCategoryForSheets(data) {
        return [
            data.id,
            data.name,
            data.priceList,
            data.description,
            data.active ? 'TRUE' : 'FALSE'
        ];
    }

    /**
     * Utility methods
     */
    getColumnLetter(columnIndex) {
        let letter = '';
        while (columnIndex >= 0) {
            letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
            columnIndex = Math.floor(columnIndex / 26) - 1;
        }
        return letter;
    }

    resetSyncStats() {
        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            conflicts: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSyncStats() {
        return { ...this.syncStats };
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[IndexedDB→Sheets ${level.toUpperCase()}] ${timestamp}:`;
            
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
    window.IndexedDBToSheetsSync = IndexedDBToSheetsSync;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBToSheetsSync;
}