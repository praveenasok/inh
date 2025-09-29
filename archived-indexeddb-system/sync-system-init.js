/**
 * Sync System Initialization
 * Main entry point for the two-way Google Sheets ↔ IndexedDB synchronization system
 * Handles configuration, initialization, and provides easy setup for the application
 */

class SyncSystemInitializer {
    constructor() {
        this.config = null;
        this.syncSystem = null;
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize the sync system with configuration
     */
    async initialize(userConfig = {}) {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization(userConfig);
        return this.initializationPromise;
    }

    /**
     * Perform the actual initialization
     */
    async _performInitialization(userConfig) {
        try {
            console.log('🚀 Initializing Two-Way Sync System...');

            // 1. Load and validate configuration
            this.config = await this.loadConfiguration(userConfig);
            console.log('✅ Configuration loaded');

            // 2. Check dependencies
            await this.checkDependencies();
            console.log('✅ Dependencies verified');

            // 3. Initialize the sync system
            this.syncSystem = new SyncSystemIntegration(this.config);
            await this.syncSystem.initialize();
            console.log('✅ Sync system initialized');

            // 4. Perform migration if needed
            if (this.config.performMigration) {
                await this.performMigration();
                console.log('✅ Data migration completed');
            }

            // 5. Run validation tests if enabled
            if (this.config.runTests) {
                await this.runValidationTests();
                console.log('✅ Validation tests completed');
            }

            // 6. Start sync if auto-start is enabled
            if (this.config.autoStart) {
                await this.syncSystem.startSync();
                console.log('✅ Automatic sync started');
            }

            this.isInitialized = true;
            console.log('🎉 Two-Way Sync System fully initialized!');

            // Emit initialization complete event
            this.emitEvent('syncSystemInitialized', {
                config: this.config,
                status: await this.syncSystem.getStatus()
            });

            return this.syncSystem;

        } catch (error) {
            let errorMessage = 'Unknown error';
            try {
                errorMessage = error && error.message ? String(error.message) : 'Unknown error';
            } catch (e) {
                errorMessage = 'Error message could not be extracted';
            }
            this.emitEvent('syncSystemInitializationFailed', { error: errorMessage });
            throw new Error(errorMessage);
        }
    }

    /**
     * Load and merge configuration
     */
    async loadConfiguration(userConfig) {
        // Default configuration
        const defaultConfig = {
            // Database configuration
            dbName: 'SyncSystemDB',
            dbVersion: 1,
            
            // Google Sheets configuration
            sheetId: null,
            apiKey: null,
            
            // Sync configuration
            syncInterval: 300000, // 5 minutes
            autoStart: true,
            performMigration: true,
            runTests: false,
            
            // Logging configuration
            logLevel: 'info',
            
            // UI configuration
            statusUIElement: 'sync-status-container',
            enableStatusUI: true,
            
            // Data schema validation
            dataSchema: {
                products: ['id', 'name', 'category', 'priceList', 'price', 'active'],
                clients: ['id', 'name', 'email', 'salesperson', 'active'],
                salespeople: ['id', 'name', 'email', 'territory', 'active'],
                categories: ['id', 'name', 'description', 'active'],
                priceLists: ['id', 'name', 'description', 'active'],
                colors: ['id', 'name', 'hexCode', 'active'],
                styles: ['id', 'name', 'description', 'active']
            },
            
            // Performance configuration
            batchSize: 100,
            maxRetries: 3,
            retryDelay: 1000,
            
            // Error handling
            enableErrorReporting: true,
            maxErrorLogs: 100
        };

        // Try to load configuration from app-config.json
        let appConfig = {};
        try {
            const response = await fetch('./app-config.json');
            if (response.ok) {
                const config = await response.json();
                appConfig = config.syncSystemConfig || {};
            }
        } catch (error) {
        }

        // Merge configurations: defaults < app config < user config
        const mergedConfig = {
            ...defaultConfig,
            ...appConfig,
            ...userConfig
        };

        // Validate required configuration
        this.validateConfiguration(mergedConfig);

        return mergedConfig;
    }

    /**
     * Validate configuration
     */
    validateConfiguration(config) {
        const required = ['dbName'];
        const missing = required.filter(key => !config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        // Warn about missing optional but important config
        if (!config.sheetId) {
        }
        
        if (!config.apiKey) {
        }
    }

    /**
     * Check for required dependencies
     */
    async checkDependencies() {
        const requiredClasses = [
            'SyncSystemIntegration',
            'IndexedDBManager',
            'BidirectionalSyncCoordinator',
            'IndexedDBDropdownManager',
            'SheetsToIndexedDBSync',
            'IndexedDBToSheetsSync',
            'DropdownManagerMigration',
            'SyncStatusUI'
        ];

        const missing = requiredClasses.filter(className => typeof window[className] === 'undefined');
        
        if (missing.length > 0) {
        }

        // Check for IndexedDB support
        if (!window.indexedDB) {
            throw new Error('IndexedDB is not supported in this browser');
        }

        // Check for required DOM elements if UI is enabled
        if (this.config?.enableStatusUI && this.config?.statusUIElement) {
            const element = document.getElementById(this.config.statusUIElement);
            if (!element) {
                if (this.config) {
                    this.config.enableStatusUI = false;
                }
            }
        }
    }

    /**
     * Perform data migration from localStorage to IndexedDB
     */
    async performMigration() {
        console.log('🔄 Starting data migration...');
        
        try {
            const migration = new DropdownManagerMigration({
                indexedDBManager: this.syncSystem.indexedDBManager,
                logLevel: this.config.logLevel
            });

            const migrationResult = await migration.performMigration();
            
            if (migrationResult.success) {
                console.log(`✅ Migration completed: ${migrationResult.migratedCollections} collections migrated`);
            } else {
            }

        } catch (error) {
            // Don't throw - migration failure shouldn't prevent system initialization
        }
    }

    /**
     * Run validation tests
     */
    async runValidationTests() {
        console.log('🧪 Running validation tests...');
        
        try {
            if (typeof runSyncSystemTests === 'function') {
                const testResult = await runSyncSystemTests(this.syncSystem, {
                    logLevel: this.config.logLevel
                });

                if (testResult.success) {
                    console.log('✅ All validation tests passed');
                } else {
                }
            } else {
            }

        } catch (error) {
            // Don't throw - test failure shouldn't prevent system initialization
        }
    }

    /**
     * Get the initialized sync system
     */
    getSyncSystem() {
        if (!this.isInitialized) {
            throw new Error('Sync system not initialized. Call initialize() first.');
        }
        return this.syncSystem;
    }

    /**
     * Get system status
     */
    async getStatus() {
        if (!this.syncSystem) {
            return { initialized: false };
        }

        const status = await this.syncSystem.getStatus();
        return {
            ...status,
            initialized: this.isInitialized,
            config: this.config
        };
    }

    /**
     * Destroy the sync system
     */
    async destroy() {
        console.log('🔄 Destroying sync system...');
        
        try {
            if (this.syncSystem) {
                await this.syncSystem.destroy();
            }
            
            this.syncSystem = null;
            this.isInitialized = false;
            this.initializationPromise = null;
            
            console.log('✅ Sync system destroyed');
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Emit custom events
     */
    emitEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }
}

/**
 * Global sync system instance
 */
let globalSyncSystemInitializer = null;

/**
 * Initialize the sync system globally
 */
async function initializeSyncSystem(config = {}) {
    if (!globalSyncSystemInitializer) {
        globalSyncSystemInitializer = new SyncSystemInitializer();
    }

    return await globalSyncSystemInitializer.initialize(config);
}

/**
 * Get the global sync system
 */
function getSyncSystem() {
    if (!globalSyncSystemInitializer || !globalSyncSystemInitializer.isInitialized) {
        throw new Error('Sync system not initialized. Call initializeSyncSystem() first.');
    }
    return globalSyncSystemInitializer.getSyncSystem();
}

/**
 * Get sync system status
 */
async function getSyncSystemStatus() {
    if (!globalSyncSystemInitializer) {
        return { initialized: false };
    }
    return await globalSyncSystemInitializer.getStatus();
}

/**
 * Destroy the global sync system
 */
async function destroySyncSystem() {
    if (globalSyncSystemInitializer) {
        await globalSyncSystemInitializer.destroy();
        globalSyncSystemInitializer = null;
    }
}

/**
 * Auto-initialization when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check if auto-initialization is enabled
    const autoInit = document.querySelector('meta[name="sync-system-auto-init"]');
    
    if (autoInit && autoInit.content !== 'false') {
        try {
            console.log('🔄 Auto-initializing sync system...');
            await initializeSyncSystem();
        } catch (error) {
            let errorMessage = 'Unknown error';
            try {
                errorMessage = error && error.message ? String(error.message) : 'Unknown error';
            } catch (e) {
                errorMessage = 'Error message could not be extracted';
            }
        }
    }
});

// Export for global use
window.SyncSystemInitializer = SyncSystemInitializer;
window.initializeSyncSystem = initializeSyncSystem;
window.getSyncSystem = getSyncSystem;
window.getSyncSystemStatus = getSyncSystemStatus;
window.destroySyncSystem = destroySyncSystem;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SyncSystemInitializer,
        initializeSyncSystem,
        getSyncSystem,
        getSyncSystemStatus,
        destroySyncSystem
    };
}