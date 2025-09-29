/**
 * Dropdown Manager Migration Script
 * Handles the transition from localStorage-based to IndexedDB-based dropdown management
 * Ensures data continuity and seamless migration
 */

class DropdownManagerMigration {
    constructor(config = {}) {
        this.logLevel = config.logLevel || 'info';
        this.oldManager = null;
        this.newManager = null;
        this.migrationStatus = {
            started: false,
            completed: false,
            errors: [],
            migratedTypes: []
        };
    }

    /**
     * Initialize migration process
     */
    async initialize() {
        try {
            this.log('🚀 Starting dropdown manager migration...', 'info');
            this.migrationStatus.started = true;

            // Initialize old localStorage manager
            if (typeof LocalStorageDropdownManager !== 'undefined') {
                this.oldManager = new LocalStorageDropdownManager();
                await this.oldManager.initialize();
                this.log('✅ Old localStorage manager initialized', 'info');
            } else {
                this.log('⚠️ LocalStorageDropdownManager not found, skipping data migration', 'warn');
            }

            // Initialize new IndexedDB manager
            this.newManager = new IndexedDBDropdownManager({
                logLevel: this.logLevel
            });
            await this.newManager.initialize();
            this.log('✅ New IndexedDB manager initialized', 'info');

            return true;
        } catch (error) {
            this.log(`❌ Migration initialization failed: ${error.message}`, 'error');
            this.migrationStatus.errors.push(`Initialization: ${error.message}`);
            throw error;
        }
    }

    /**
     * Migrate data from localStorage to IndexedDB
     */
    async migrateData() {
        if (!this.newManager) {
            throw new Error('New manager not initialized');
        }

        try {
            this.log('📦 Starting data migration...', 'info');

            // If old manager exists, migrate existing data
            if (this.oldManager) {
                await this.migrateFromLocalStorage();
            }

            // Verify migration
            await this.verifyMigration();

            this.migrationStatus.completed = true;
            this.log('✅ Data migration completed successfully', 'info');

        } catch (error) {
            this.log(`❌ Data migration failed: ${error.message}`, 'error');
            this.migrationStatus.errors.push(`Migration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Migrate data from localStorage to IndexedDB
     */
    async migrateFromLocalStorage() {
        const dataTypes = Object.keys(this.oldManager.dataKeys);
        
        for (const dataType of dataTypes) {
            try {
                this.log(`🔄 Migrating ${dataType}...`, 'debug');

                // Get data from localStorage
                const oldData = await this.oldManager.getData(dataType);
                
                if (oldData && oldData.length > 0) {
                    // Store data in IndexedDB
                    await this.newManager.dbManager.replaceAll(dataType, oldData);
                    
                    // Refresh cache in new manager
                    await this.newManager.refreshData(dataType);
                    
                    this.migrationStatus.migratedTypes.push(dataType);
                    this.log(`✅ Migrated ${oldData.length} ${dataType} records`, 'info');
                } else {
                    this.log(`⚠️ No ${dataType} data found in localStorage`, 'warn');
                }

            } catch (error) {
                this.log(`❌ Failed to migrate ${dataType}: ${error.message}`, 'error');
                this.migrationStatus.errors.push(`${dataType}: ${error.message}`);
            }
        }
    }

    /**
     * Verify migration success
     */
    async verifyMigration() {
        this.log('🔍 Verifying migration...', 'info');

        const newStats = await this.newManager.getDataStats();
        let totalRecords = 0;

        for (const [dataType, stats] of Object.entries(newStats)) {
            if (stats.available) {
                totalRecords += stats.count;
                this.log(`✅ ${dataType}: ${stats.count} records available`, 'debug');
            } else {
                this.log(`⚠️ ${dataType}: No data available`, 'warn');
            }
        }

        this.log(`📊 Migration verification complete: ${totalRecords} total records`, 'info');
        return totalRecords > 0;
    }

    /**
     * Replace global dropdown manager instance
     */
    replaceGlobalInstance() {
        try {
            this.log('🔄 Replacing global dropdown manager instance...', 'info');

            // Store reference to old manager if it exists
            if (typeof window !== 'undefined' && window.dropdownManager) {
                window.oldDropdownManager = window.dropdownManager;
            }

            // Replace with new IndexedDB manager
            if (typeof window !== 'undefined') {
                window.dropdownManager = this.newManager;
                window.IndexedDBDropdownManager = IndexedDBDropdownManager;
            }

            this.log('✅ Global dropdown manager instance replaced', 'info');

        } catch (error) {
            this.log(`❌ Failed to replace global instance: ${error.message}`, 'error');
            this.migrationStatus.errors.push(`Global replacement: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up old localStorage data (optional)
     */
    async cleanupOldData(confirm = false) {
        if (!confirm) {
            this.log('⚠️ Cleanup not confirmed, skipping localStorage cleanup', 'warn');
            return;
        }

        if (!this.oldManager) {
            this.log('⚠️ No old manager available for cleanup', 'warn');
            return;
        }

        try {
            this.log('🧹 Cleaning up old localStorage data...', 'info');

            const dataTypes = Object.keys(this.oldManager.dataKeys);
            let cleanedKeys = 0;

            for (const dataType of dataTypes) {
                const keys = this.oldManager.dataKeys[dataType];
                
                for (const key of keys) {
                    if (localStorage.getItem(key)) {
                        localStorage.removeItem(key);
                        cleanedKeys++;
                        this.log(`🗑️ Removed localStorage key: ${key}`, 'debug');
                    }
                }
            }

            this.log(`✅ Cleanup completed: ${cleanedKeys} localStorage keys removed`, 'info');

        } catch (error) {
            this.log(`❌ Cleanup failed: ${error.message}`, 'error');
            this.migrationStatus.errors.push(`Cleanup: ${error.message}`);
        }
    }

    /**
     * Get migration status
     */
    getStatus() {
        return {
            ...this.migrationStatus,
            hasErrors: this.migrationStatus.errors.length > 0,
            isSuccessful: this.migrationStatus.completed && this.migrationStatus.errors.length === 0
        };
    }

    /**
     * Perform complete migration
     */
    async performMigration(options = {}) {
        const {
            cleanupOldData = false,
            replaceGlobal = true
        } = options;

        try {
            this.log('🚀 Starting complete dropdown manager migration...', 'info');

            // Initialize managers
            await this.initialize();

            // Migrate data
            await this.migrateData();

            // Replace global instance if requested
            if (replaceGlobal) {
                this.replaceGlobalInstance();
            }

            // Cleanup old data if requested
            if (cleanupOldData) {
                await this.cleanupOldData(true);
            }

            const status = this.getStatus();
            
            if (status.isSuccessful) {
                this.log('🎉 Migration completed successfully!', 'info');
                this.log(`📊 Migrated data types: ${status.migratedTypes.join(', ')}`, 'info');
            } else {
                this.log('⚠️ Migration completed with errors', 'warn');
                this.log(`❌ Errors: ${status.errors.join(', ')}`, 'error');
            }

            return status;

        } catch (error) {
            this.log(`💥 Migration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Rollback migration (restore localStorage manager)
     */
    rollback() {
        try {
            this.log('🔄 Rolling back migration...', 'warn');

            if (typeof window !== 'undefined' && window.oldDropdownManager) {
                window.dropdownManager = window.oldDropdownManager;
                delete window.oldDropdownManager;
                this.log('✅ Rollback completed: localStorage manager restored', 'info');
            } else {
                this.log('⚠️ No old manager available for rollback', 'warn');
            }

        } catch (error) {
            this.log(`❌ Rollback failed: ${error.message}`, 'error');
            throw error;
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
            const prefix = `[Migration ${level.toUpperCase()}] ${timestamp}:`;
            
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

// Auto-migration function for easy integration
async function migrateToIndexedDBDropdowns(options = {}) {
    const migration = new DropdownManagerMigration({
        logLevel: options.logLevel || 'info'
    });

    try {
        const status = await migration.performMigration({
            cleanupOldData: options.cleanupOldData || false,
            replaceGlobal: options.replaceGlobal !== false
        });

        return {
            success: status.isSuccessful,
            status: status,
            manager: migration.newManager
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: migration.getStatus()
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DropdownManagerMigration = DropdownManagerMigration;
    window.migrateToIndexedDBDropdowns = migrateToIndexedDBDropdowns;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DropdownManagerMigration,
        migrateToIndexedDBDropdowns
    };
}