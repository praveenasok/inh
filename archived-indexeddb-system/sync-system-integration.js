/**
 * Sync System Integration
 * Comprehensive integration script for the two-way Google Sheets ↔ IndexedDB synchronization system
 * Coordinates all components and provides a unified initialization interface
 */

class SyncSystemIntegration {
    constructor(config = {}) {
        this.config = {
            // Database configuration
            dbName: config.dbName || 'INH_SyncDatabase',
            
            // Google Sheets configuration
            sheetId: config.sheetId || null,
            apiKey: config.apiKey || null,
            
            // Sync configuration
            syncInterval: config.syncInterval || 300000, // 5 minutes
            logLevel: config.logLevel || 'info',
            
            // UI configuration
            enableStatusUI: config.enableStatusUI !== false,
            statusUIContainer: config.statusUIContainer || 'sync-status-container',
            
            // Migration configuration
            migrateFromLocalStorage: config.migrateFromLocalStorage !== false,
            cleanupOldData: config.cleanupOldData || false,
            
            // Data validation schema
            dataSchema: config.dataSchema || null,
            
            ...config
        };

        // Component instances
        this.indexedDBManager = null;
        this.sheetsToIndexedDBSync = null;
        this.indexedDBToSheetsSync = null;
        this.syncCoordinator = null;
        this.dropdownManager = null;
        this.statusUI = null;
        this.migration = null;

        // System state
        this.isInitialized = false;
        this.initializationPromise = null;
        this.errors = [];

        this.log('Sync System Integration created', 'info');
    }

    /**
     * Initialize the complete synchronization system
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('Sync system already initialized', 'warn');
            return this;
        }

        if (this.initializationPromise) {
            this.log('Initialization already in progress, waiting...', 'info');
            return await this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return await this.initializationPromise;
    }

    /**
     * Perform the actual initialization
     */
    async _performInitialization() {
        try {
            this.log('🚀 Starting sync system initialization...', 'info');

            // Validate configuration
            this.validateConfiguration();

            // Step 1: Initialize IndexedDB Manager
            await this.initializeIndexedDB();

            // Step 2: Initialize sync services
            await this.initializeSyncServices();

            // Step 3: Initialize sync coordinator
            await this.initializeSyncCoordinator();

            // Step 4: Migrate from localStorage if needed
            if (this.config.migrateFromLocalStorage) {
                await this.performMigration();
            }

            // Step 5: Initialize dropdown manager
            await this.initializeDropdownManager();

            // Step 6: Initialize status UI
            if (this.config.enableStatusUI) {
                await this.initializeStatusUI();
            }

            // Step 7: Start synchronization
            await this.startSynchronization();

            this.isInitialized = true;
            this.log('✅ Sync system initialization completed successfully', 'info');

            return this;

        } catch (error) {
            let errorMessage = 'Unknown error';
            try {
                errorMessage = error && error.message ? String(error.message) : 'Unknown error';
            } catch (e) {
                errorMessage = 'Error message could not be extracted';
            }
            this.log('❌ Sync system initialization failed: ' + errorMessage, 'error');
            
            // Safely add to errors array
            if (this.errors && Array.isArray(this.errors)) {
                this.errors.push({
                    timestamp: new Date().toISOString(),
                    message: `Initialization failed: ${errorMessage}`,
                    error: {
                        name: error?.name || 'Error',
                        message: errorMessage,
                        stack: error?.stack || 'No stack trace available'
                    }
                });
            }
            
            throw error;
        }
    }

    /**
     * Validate configuration
     */
    validateConfiguration() {
        this.log('🔍 Validating configuration...', 'debug');

        const required = ['dbName'];
        const missing = required.filter(key => !this.config[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        // Warn about optional but recommended settings
        if (!this.config.sheetId) {
            this.log('⚠️ No Google Sheets ID provided - sync will be limited', 'warn');
        }

        if (!this.config.apiKey) {
            this.log('⚠️ No API key provided - Google Sheets sync may fail', 'warn');
        }

        this.log('✅ Configuration validated', 'debug');
    }

    /**
     * Initialize IndexedDB Manager
     */
    async initializeIndexedDB() {
        this.log('📦 Initializing IndexedDB Manager...', 'info');

        this.indexedDBManager = new IndexedDBManager({
            dbName: this.config.dbName,
            logLevel: this.config.logLevel
        });

        await this.indexedDBManager.initialize();
        this.log('✅ IndexedDB Manager initialized', 'info');
    }

    /**
     * Initialize sync services
     */
    async initializeSyncServices() {
        this.log('🔄 Initializing sync services...', 'info');

        // Initialize Sheets to IndexedDB sync
        this.sheetsToIndexedDBSync = new SheetsToIndexedDBSync({
            indexedDBManager: this.indexedDBManager,
            sheetId: this.config.sheetId,
            apiKey: this.config.apiKey,
            logLevel: this.config.logLevel
        });

        // Initialize IndexedDB to Sheets sync
        this.indexedDBToSheetsSync = new IndexedDBToSheetsSync({
            indexedDBManager: this.indexedDBManager,
            sheetId: this.config.sheetId,
            apiKey: this.config.apiKey,
            logLevel: this.config.logLevel
        });

        this.log('✅ Sync services initialized', 'info');
    }

    /**
     * Initialize sync coordinator
     */
    async initializeSyncCoordinator() {
        this.log('🎯 Initializing sync coordinator...', 'info');

        this.syncCoordinator = new BidirectionalSyncCoordinator({
            indexedDBManager: this.indexedDBManager,
            sheetsToIndexedDBSync: this.sheetsToIndexedDBSync,
            indexedDBToSheetsSync: this.indexedDBToSheetsSync,
            syncInterval: this.config.syncInterval,
            logLevel: this.config.logLevel
        });

        await this.syncCoordinator.initialize();
        this.log('✅ Sync coordinator initialized', 'info');
    }

    /**
     * Perform migration from localStorage
     */
    async performMigration() {
        this.log('🔄 Performing migration from localStorage...', 'info');

        this.migration = new DropdownManagerMigration({
            logLevel: this.config.logLevel
        });

        const migrationResult = await this.migration.performMigration({
            cleanupOldData: this.config.cleanupOldData,
            replaceGlobal: false // We'll handle this manually
        });

        if (migrationResult.success) {
            this.log('✅ Migration completed successfully', 'info');
        } else {
            this.log('⚠️ Migration completed with errors', 'warn');
            if (this.errors && Array.isArray(this.errors)) {
                this.errors.push({
                    timestamp: new Date().toISOString(),
                    message: 'Migration completed with errors',
                    details: migrationResult?.status?.errors || 'Unknown migration errors'
                });
            }
        }
    }

    /**
     * Initialize dropdown manager
     */
    async initializeDropdownManager() {
        this.log('📋 Initializing dropdown manager...', 'info');

        this.dropdownManager = new IndexedDBDropdownManager({
            logLevel: this.config.logLevel
        });

        // Set the IndexedDB manager reference
        this.dropdownManager.dbManager = this.indexedDBManager;

        await this.dropdownManager.initialize();

        // Replace global instance
        if (typeof window !== 'undefined') {
            window.dropdownManager = this.dropdownManager;
        }

        this.log('✅ Dropdown manager initialized and set as global instance', 'info');
    }

    /**
     * Initialize status UI
     */
    async initializeStatusUI() {
        this.log('🖥️ Initializing status UI...', 'info');

        this.statusUI = new SyncStatusUI({
            containerId: this.config.statusUIContainer,
            logLevel: this.config.logLevel
        });

        await this.statusUI.initialize(this.syncCoordinator);
        this.log('✅ Status UI initialized', 'info');
    }

    /**
     * Start synchronization
     */
    async startSynchronization() {
        this.log('▶️ Starting synchronization...', 'info');

        // Perform initial sync
        try {
            await this.syncCoordinator.performFullSync();
            this.log('✅ Initial sync completed', 'info');
        } catch (error) {
            const errorMessage = error?.message || 'Unknown error';
            this.log(`⚠️ Initial sync failed: ${errorMessage}`, 'warn');
            if (this.errors && Array.isArray(this.errors)) {
                this.errors.push({
                    timestamp: new Date().toISOString(),
                    message: `Initial sync failed: ${errorMessage}`,
                    error: {
                        name: error?.name || 'Error',
                        message: errorMessage,
                        stack: error?.stack || 'No stack trace available'
                    }
                });
            }
        }

        // Start scheduled sync
        await this.syncCoordinator.startScheduledSync();
        this.log('✅ Scheduled sync started', 'info');
    }

    /**
     * Get system status
     */
    async getStatus() {
        const status = {
            isInitialized: this.isInitialized,
            errors: this.errors || [],
            components: {
                indexedDBManager: !!this.indexedDBManager,
                sheetsToIndexedDBSync: !!this.sheetsToIndexedDBSync,
                indexedDBToSheetsSync: !!this.indexedDBToSheetsSync,
                syncCoordinator: !!this.syncCoordinator,
                dropdownManager: !!this.dropdownManager,
                statusUI: !!this.statusUI
            }
        };

        if (this.syncCoordinator) {
            status.syncStatus = await this.syncCoordinator.getStatus();
        }

        if (this.dropdownManager) {
            status.dropdownStatus = await this.dropdownManager.getSyncStatus();
        }

        return status;
    }

    /**
     * Suspend all sync operations
     */
    async suspendSync() {
        this.log('⏸️ Suspending sync operations...', 'info');

        if (this.syncCoordinator) {
            await this.syncCoordinator.suspendSync();
        }

        this.log('✅ Sync operations suspended', 'info');
    }

    /**
     * Resume sync operations
     */
    async resumeSync() {
        this.log('▶️ Resuming sync operations...', 'info');

        if (this.syncCoordinator) {
            await this.syncCoordinator.resumeSync();
        }

        this.log('✅ Sync operations resumed', 'info');
    }

    /**
     * Perform manual sync
     */
    async performManualSync(type = 'incremental') {
        this.log(`🔄 Performing manual ${type} sync...`, 'info');

        if (!this.syncCoordinator) {
            throw new Error('Sync coordinator not initialized');
        }

        try {
            if (type === 'full') {
                await this.syncCoordinator.performFullSync();
            } else {
                await this.syncCoordinator.performIncrementalSync();
            }

            this.log(`✅ Manual ${type} sync completed`, 'info');

        } catch (error) {
            this.log(`❌ Manual ${type} sync failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get data statistics
     */
    async getDataStats() {
        if (!this.dropdownManager) {
            return null;
        }

        return await this.dropdownManager.getDataStats();
    }

    /**
     * Force refresh all data
     */
    async forceRefresh() {
        this.log('🔄 Force refreshing all data...', 'info');

        if (this.dropdownManager) {
            await this.dropdownManager.forceRefresh();
        }

        this.log('✅ Force refresh completed', 'info');
    }

    /**
     * Destroy the sync system
     */
    async destroy() {
        this.log('🗑️ Destroying sync system...', 'info');

        try {
            // Stop sync coordinator
            if (this.syncCoordinator) {
                await this.syncCoordinator.stopScheduledSync();
            }

            // Destroy status UI
            if (this.statusUI) {
                this.statusUI.destroy();
            }

            // Clear references
            this.indexedDBManager = null;
            this.sheetsToIndexedDBSync = null;
            this.indexedDBToSheetsSync = null;
            this.syncCoordinator = null;
            this.dropdownManager = null;
            this.statusUI = null;
            this.migration = null;

            this.isInitialized = false;
            this.initializationPromise = null;

            this.log('✅ Sync system destroyed', 'info');

        } catch (error) {
            this.log(`❌ Error destroying sync system: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        try {
            const levels = { error: 0, warn: 1, info: 2, debug: 3 };
            const configLogLevel = this.config?.logLevel || 'info';
            const currentLevel = levels[configLogLevel] || 2;
            
            if (levels[level] <= currentLevel) {
                const timestamp = new Date().toISOString();
                const prefix = `[Sync System ${level.toUpperCase()}] ${timestamp}:`;
                
                // Ensure message is a string and handle any potential issues
                let safeMessage;
                try {
                    safeMessage = String(message || '');
                } catch (e) {
                    safeMessage = '[Message could not be converted to string]';
                }
                
                // Use a single console.log for all levels to avoid potential issues
                console.log(prefix, safeMessage);
            }
        } catch (logError) {
            // Fallback logging if there's an issue with the log method itself
            try {
                console.log('[Sync System LOG ERROR]:', String(logError?.message || 'Unknown log error'));
                console.log('[Original Message]:', String(message || 'No message'));
            } catch (fallbackError) {
                // Last resort - just log something
                console.log('[Sync System CRITICAL LOG ERROR]');
            }
        }
    }
}

/**
 * Quick initialization function for easy setup
 */
async function initializeSyncSystem(config = {}) {
    const syncSystem = new SyncSystemIntegration(config);
    
    try {
        await syncSystem.initialize();
        
        // Make available globally
        if (typeof window !== 'undefined') {
            window.syncSystem = syncSystem;
        }
        
        return {
            success: true,
            syncSystem: syncSystem,
            status: await syncSystem.getStatus()
        };
        
    } catch (error) {
        
        return {
            success: false,
            error: error.message,
            syncSystem: syncSystem
        };
    }
}

/**
 * Configuration helper for common setups
 */
const SyncSystemConfigs = {
    // Development configuration
    development: {
        logLevel: 'debug',
        syncInterval: 60000, // 1 minute
        enableStatusUI: true,
        migrateFromLocalStorage: true,
        cleanupOldData: false
    },
    
    // Production configuration
    production: {
        logLevel: 'info',
        syncInterval: 300000, // 5 minutes
        enableStatusUI: false,
        migrateFromLocalStorage: true,
        cleanupOldData: true
    },
    
    // Testing configuration
    testing: {
        logLevel: 'debug',
        syncInterval: 30000, // 30 seconds
        enableStatusUI: true,
        migrateFromLocalStorage: false,
        cleanupOldData: false
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SyncSystemIntegration = SyncSystemIntegration;
    window.initializeSyncSystem = initializeSyncSystem;
    window.SyncSystemConfigs = SyncSystemConfigs;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SyncSystemIntegration,
        initializeSyncSystem,
        SyncSystemConfigs
    };
}