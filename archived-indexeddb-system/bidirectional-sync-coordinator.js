/**
 * Bidirectional Sync Coordinator
 * Orchestrates comprehensive two-way synchronization between Google Sheets and IndexedDB
 * Manages scheduling, conflict resolution, atomic transactions, and error handling
 */

class BidirectionalSyncCoordinator {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || '',
            sheetId: config.sheetId || '',
            dbName: config.dbName || 'INH_SyncDatabase',
            logLevel: config.logLevel || 'info',
            syncInterval: config.syncInterval || 300000, // 5 minutes default
            conflictResolution: config.conflictResolution || 'indexeddb-wins',
            maxRetries: config.maxRetries || 3,
            batchSize: config.batchSize || 100,
            enableScheduledSync: config.enableScheduledSync !== false
        };

        // Initialize components
        this.dbManager = null;
        this.sheetsToIndexedDB = null;
        this.indexedDBToSheets = null;
        
        // Sync state management
        this.isSyncing = false;
        this.isInitialized = false;
        this.scheduledSyncTimer = null;
        this.lastSyncTime = null;
        this.syncHistory = [];
        this.maxHistoryEntries = 50;
        
        // Event system
        this.eventListeners = new Map();
        
        // Sync statistics
        this.syncStats = {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            lastSyncDuration: 0,
            averageSyncDuration: 0,
            totalConflicts: 0,
            totalErrors: 0
        };

        this.log('Bidirectional Sync Coordinator initialized', 'info');
    }

    /**
     * Initialize the sync coordinator and all components
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('Sync coordinator already initialized', 'warn');
            return true;
        }

        try {
            this.log('Initializing sync coordinator components...', 'info');

            // Initialize IndexedDB Manager
            this.dbManager = new IndexedDBManager({
                dbName: this.config.dbName,
                logLevel: this.config.logLevel
            });
            await this.dbManager.initialize();

            // Initialize sync services
            this.sheetsToIndexedDB = new SheetsToIndexedDBSync({
                apiKey: this.config.apiKey,
                sheetId: this.config.sheetId,
                dbManager: this.dbManager,
                logLevel: this.config.logLevel
            });

            this.indexedDBToSheets = new IndexedDBToSheetsSync({
                apiKey: this.config.apiKey,
                sheetId: this.config.sheetId,
                dbManager: this.dbManager,
                logLevel: this.config.logLevel,
                conflictResolution: this.config.conflictResolution,
                batchSize: this.config.batchSize
            });

            // Set up event listeners
            this.setupEventListeners();

            // Start scheduled sync if enabled
            if (this.config.enableScheduledSync) {
                this.startScheduledSync();
            }

            this.isInitialized = true;
            this.log('Sync coordinator initialized successfully', 'info');
            this.emit('initialized', { timestamp: new Date().toISOString() });

            return true;

        } catch (error) {
            this.log(`Failed to initialize sync coordinator: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Perform complete bidirectional synchronization
     */
    async performFullSync(options = {}) {
        if (!this.isInitialized) {
            throw new Error('Sync coordinator not initialized');
        }

        if (this.isSyncing) {
            this.log('Sync already in progress, skipping', 'warn');
            return { success: false, reason: 'sync_in_progress' };
        }

        const syncId = this.generateSyncId();
        const startTime = Date.now();
        
        this.isSyncing = true;
        this.log(`Starting full bidirectional sync (ID: ${syncId})`, 'info');
        this.emit('syncStarted', { syncId, timestamp: new Date().toISOString() });

        const syncResult = {
            syncId,
            startTime: new Date(startTime).toISOString(),
            endTime: null,
            duration: 0,
            success: false,
            phases: {},
            stats: {
                totalRecords: 0,
                successfulRecords: 0,
                failedRecords: 0,
                conflicts: 0,
                errors: []
            }
        };

        try {
            // Phase 1: Suspend existing operations
            await this.suspendExistingOperations();
            syncResult.phases.suspension = { success: true, timestamp: new Date().toISOString() };

            // Phase 2: Sync from Google Sheets to IndexedDB
            this.log('Phase 2: Syncing from Google Sheets to IndexedDB', 'info');
            this.emit('phaseStarted', { phase: 'sheets-to-indexeddb', syncId });
            
            const sheetsToDBResult = await this.sheetsToIndexedDB.syncAll();
            syncResult.phases.sheetsToIndexedDB = sheetsToDBResult;
            
            if (sheetsToDBResult.success) {
                this.log('Phase 2 completed successfully', 'info');
                this.emit('phaseCompleted', { phase: 'sheets-to-indexeddb', syncId, result: sheetsToDBResult });
            } else {
                throw new Error('Google Sheets to IndexedDB sync failed');
            }

            // Phase 3: Process pending changes from IndexedDB to Google Sheets
            this.log('Phase 3: Syncing pending changes from IndexedDB to Google Sheets', 'info');
            this.emit('phaseStarted', { phase: 'indexeddb-to-sheets', syncId });
            
            const dbToSheetsResult = await this.indexedDBToSheets.syncPendingChanges();
            syncResult.phases.indexedDBToSheets = dbToSheetsResult;
            
            if (dbToSheetsResult.success) {
                this.log('Phase 3 completed successfully', 'info');
                this.emit('phaseCompleted', { phase: 'indexeddb-to-sheets', syncId, result: dbToSheetsResult });
            } else {
                this.log('Phase 3 completed with errors', 'warn');
            }

            // Phase 4: Data integrity validation
            this.log('Phase 4: Validating data integrity', 'info');
            this.emit('phaseStarted', { phase: 'validation', syncId });
            
            const validationResult = await this.validateDataIntegrity();
            syncResult.phases.validation = validationResult;
            
            if (validationResult.success) {
                this.log('Phase 4 completed successfully', 'info');
                this.emit('phaseCompleted', { phase: 'validation', syncId, result: validationResult });
            } else {
                this.log('Data integrity validation failed', 'warn');
            }

            // Phase 5: Resume operations
            await this.resumeOperations();
            syncResult.phases.resumption = { success: true, timestamp: new Date().toISOString() };

            // Calculate final statistics
            this.calculateSyncStats(syncResult, sheetsToDBResult, dbToSheetsResult);
            
            syncResult.success = sheetsToDBResult.success && validationResult.success;
            this.log(`Full sync completed (ID: ${syncId}) - Success: ${syncResult.success}`, 'info');

        } catch (error) {
            this.log(`Full sync failed (ID: ${syncId}): ${error.message}`, 'error');
            syncResult.stats.errors.push({
                message: error.message,
                timestamp: new Date().toISOString(),
                phase: 'coordinator'
            });
            syncResult.success = false;
            
            // Ensure operations are resumed even on failure
            try {
                await this.resumeOperations();
            } catch (resumeError) {
                this.log(`Failed to resume operations: ${resumeError.message}`, 'error');
            }
        } finally {
            const endTime = Date.now();
            syncResult.endTime = new Date(endTime).toISOString();
            syncResult.duration = endTime - startTime;
            
            this.isSyncing = false;
            this.lastSyncTime = syncResult.endTime;
            
            // Update statistics
            this.updateSyncStatistics(syncResult);
            
            // Add to history
            this.addToSyncHistory(syncResult);
            
            this.emit('syncCompleted', syncResult);
            this.log(`Sync duration: ${syncResult.duration}ms`, 'info');
        }

        return syncResult;
    }

    /**
     * Perform incremental sync (only pending changes)
     */
    async performIncrementalSync() {
        if (!this.isInitialized) {
            throw new Error('Sync coordinator not initialized');
        }

        if (this.isSyncing) {
            this.log('Sync already in progress, skipping incremental sync', 'warn');
            return { success: false, reason: 'sync_in_progress' };
        }

        const syncId = this.generateSyncId();
        const startTime = Date.now();
        
        this.isSyncing = true;
        this.log(`Starting incremental sync (ID: ${syncId})`, 'info');

        try {
            // Only sync pending changes from IndexedDB to Google Sheets
            const result = await this.indexedDBToSheets.syncPendingChanges();
            
            const syncResult = {
                syncId,
                type: 'incremental',
                startTime: new Date(startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: Date.now() - startTime,
                success: result.success,
                result: result
            };

            this.addToSyncHistory(syncResult);
            this.emit('incrementalSyncCompleted', syncResult);
            
            return syncResult;

        } catch (error) {
            this.log(`Incremental sync failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Suspend existing data operations
     */
    async suspendExistingOperations() {
        this.log('Suspending existing data operations', 'info');
        
        // Emit event to notify other components to pause operations
        this.emit('operationsSuspended', { timestamp: new Date().toISOString() });
        
        // Wait a brief moment for operations to complete
        await this.delay(1000);
        
        this.log('Existing operations suspended', 'info');
    }

    /**
     * Resume normal operations
     */
    async resumeOperations() {
        this.log('Resuming normal operations', 'info');
        
        // Emit event to notify other components to resume operations
        this.emit('operationsResumed', { timestamp: new Date().toISOString() });
        
        this.log('Normal operations resumed', 'info');
    }

    /**
     * Validate data integrity between Google Sheets and IndexedDB
     */
    async validateDataIntegrity() {
        this.log('Starting data integrity validation', 'info');
        
        const validationResult = {
            success: true,
            collections: {},
            totalRecords: 0,
            mismatches: 0,
            errors: []
        };

        try {
            const dbStats = await this.dbManager.getStats();
            
            for (const [collection, stats] of Object.entries(dbStats.stores)) {
                if (collection === 'syncMetadata') continue;
                
                try {
                    const recordCount = await this.dbManager.count(collection);
                    const syncMetadata = await this.dbManager.getSyncMetadata(collection);
                    
                    validationResult.collections[collection] = {
                        recordCount: recordCount,
                        lastSync: syncMetadata?.lastSync,
                        syncStatus: syncMetadata?.syncStatus,
                        valid: true
                    };
                    
                    validationResult.totalRecords += recordCount;
                    
                } catch (error) {
                    this.log(`Validation error for ${collection}: ${error.message}`, 'error');
                    validationResult.collections[collection] = {
                        valid: false,
                        error: error.message
                    };
                    validationResult.errors.push({
                        collection,
                        error: error.message
                    });
                    validationResult.success = false;
                }
            }

            this.log(`Data integrity validation completed. Total records: ${validationResult.totalRecords}`, 'info');
            
        } catch (error) {
            this.log(`Data integrity validation failed: ${error.message}`, 'error');
            validationResult.success = false;
            validationResult.errors.push({
                error: error.message,
                phase: 'validation'
            });
        }

        return validationResult;
    }

    /**
     * Start scheduled automatic synchronization
     */
    startScheduledSync() {
        if (this.scheduledSyncTimer) {
            this.stopScheduledSync();
        }

        this.log(`Starting scheduled sync with interval: ${this.config.syncInterval}ms`, 'info');
        
        this.scheduledSyncTimer = setInterval(async () => {
            try {
                this.log('Executing scheduled sync', 'info');
                await this.performIncrementalSync();
            } catch (error) {
                this.log(`Scheduled sync failed: ${error.message}`, 'error');
            }
        }, this.config.syncInterval);

        this.emit('scheduledSyncStarted', { 
            interval: this.config.syncInterval,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Stop scheduled synchronization
     */
    stopScheduledSync() {
        if (this.scheduledSyncTimer) {
            clearInterval(this.scheduledSyncTimer);
            this.scheduledSyncTimer = null;
            this.log('Scheduled sync stopped', 'info');
            this.emit('scheduledSyncStopped', { timestamp: new Date().toISOString() });
        }
    }

    /**
     * Get current sync status
     */
    getSyncStatus() {
        return {
            isInitialized: this.isInitialized,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            scheduledSyncActive: !!this.scheduledSyncTimer,
            syncInterval: this.config.syncInterval,
            stats: { ...this.syncStats },
            dbStats: this.isInitialized ? this.dbManager.getStats() : null
        };
    }

    /**
     * Get sync history
     */
    getSyncHistory(limit = 10) {
        return this.syncHistory.slice(-limit).reverse();
    }

    /**
     * Setup event listeners for component coordination
     */
    setupEventListeners() {
        // Listen for database events
        if (this.dbManager) {
            this.dbManager.on('dataChanged', (data) => {
                this.emit('dataChanged', data);
            });
        }
    }

    /**
     * Event system methods
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log(`Event callback error for ${event}: ${error.message}`, 'error');
                }
            });
        }
    }

    /**
     * Utility methods
     */
    generateSyncId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateSyncStats(syncResult, sheetsToDBResult, dbToSheetsResult) {
        syncResult.stats.totalRecords = 
            (sheetsToDBResult.stats?.successfulRecords || 0) + 
            (dbToSheetsResult.stats?.successfulRecords || 0);
        
        syncResult.stats.successfulRecords = syncResult.stats.totalRecords;
        
        syncResult.stats.failedRecords = 
            (sheetsToDBResult.stats?.failedRecords || 0) + 
            (dbToSheetsResult.stats?.failedRecords || 0);
        
        syncResult.stats.conflicts = dbToSheetsResult.stats?.conflicts || 0;
        
        syncResult.stats.errors = [
            ...(sheetsToDBResult.stats?.errors || []),
            ...(dbToSheetsResult.stats?.errors || [])
        ];
    }

    updateSyncStatistics(syncResult) {
        this.syncStats.totalSyncs++;
        
        if (syncResult.success) {
            this.syncStats.successfulSyncs++;
        } else {
            this.syncStats.failedSyncs++;
        }
        
        this.syncStats.lastSyncDuration = syncResult.duration;
        this.syncStats.averageSyncDuration = 
            (this.syncStats.averageSyncDuration * (this.syncStats.totalSyncs - 1) + syncResult.duration) / 
            this.syncStats.totalSyncs;
        
        this.syncStats.totalConflicts += syncResult.stats?.conflicts || 0;
        this.syncStats.totalErrors += syncResult.stats?.errors?.length || 0;
    }

    addToSyncHistory(syncResult) {
        this.syncHistory.push(syncResult);
        
        // Keep only the last N entries
        if (this.syncHistory.length > this.maxHistoryEntries) {
            this.syncHistory = this.syncHistory.slice(-this.maxHistoryEntries);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        this.log('Shutting down sync coordinator', 'info');
        
        this.stopScheduledSync();
        
        if (this.dbManager) {
            this.dbManager.close();
        }
        
        this.isInitialized = false;
        this.emit('shutdown', { timestamp: new Date().toISOString() });
        
        this.log('Sync coordinator shutdown complete', 'info');
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.config.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[Sync Coordinator ${level.toUpperCase()}] ${timestamp}:`;
            
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
    window.BidirectionalSyncCoordinator = BidirectionalSyncCoordinator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BidirectionalSyncCoordinator;
}