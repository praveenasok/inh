const cron = require('node-cron');
const FirebaseSyncService = require('./firebase-sync-service');
const GoogleSheetsService = require('./google-sheets-service');
const { googleSheetsAutoConfig } = require('./js/google-sheets-auto-config');

class SyncScheduler {
  constructor() {
    this.syncService = new FirebaseSyncService();
    this.scheduledTask = null;
    this.isSchedulerRunning = false;
    
    this.productSheetId = googleSheetsAutoConfig.getSheetId();
    this.salesmanSheetId = googleSheetsAutoConfig.getSheetId();
    this.companiesSheetId = googleSheetsAutoConfig.getSheetId();
    
    this.config = {
      cronSchedule: '0 */12 * * *',
      timezone: 'UTC',
      retryAttempts: 3,
      retryDelay: 5000
    };
  }

  async initialize() {
    try {
      await this.syncService.initialize();
      this.isInitialized = true;
      this.credentialsAvailable = true;
      return true;
    } catch (error) {
      if (this.isCredentialsError(error)) {
        this.isInitialized = true;
        this.credentialsAvailable = false;
        return true;
      }
      
      throw error;
    }
  }

  isCredentialsError(error) {
    const credentialErrorPatterns = [
      'service account key file not found',
      'invalid pem formatted message',
      'failed to parse private key',
      'placeholder values',
      'invalid json format',
      'missing required fields',
      'invalid credential type',
      'invalid service account email'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return credentialErrorPatterns.some(pattern => errorMessage.includes(pattern));
  }

  startScheduler() {
    if (this.isSchedulerRunning) {
      return;
    }

    try {
      this.scheduledTask = cron.schedule(this.config.cronSchedule, async () => {
        await this.performAutomatedSync();
      }, {
        scheduled: true,
        timezone: this.config.timezone
      });

      this.isSchedulerRunning = true;
      
    } catch (error) {
      throw error;
    }
  }

  stopScheduler() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask.destroy();
      this.scheduledTask = null;
      this.isSchedulerRunning = false;
    }
  }

  async performAutomatedSync() {
    if (!this.credentialsAvailable) {
      return {
        success: false,
        error: 'Google Sheets credentials not available',
        timestamp: new Date().toISOString()
      };
    }

    const syncResults = {
      timestamp: new Date().toISOString(),
      success: false,
      results: {},
      errors: []
    };

    try {
      const syncOperations = [
        { name: 'products', method: 'syncProductData' },
        { name: 'salesmen', method: 'syncSalesmanData' },
        { name: 'companies', method: 'syncCompaniesData' },
        { name: 'colors', method: 'syncColorsData' },
        { name: 'styles', method: 'syncStylesData' }
      ];

      for (const operation of syncOperations) {
        let attempts = 0;
        let success = false;

        while (attempts < this.config.retryAttempts && !success) {
          try {
            attempts++;
            
            const result = await this.syncService[operation.method]();
            syncResults.results[operation.name] = {
              success: true,
              recordsProcessed: result.recordsProcessed || 0,
              changes: result.changes || 0,
              attempt: attempts
            };
            success = true;

          } catch (error) {
            if (attempts === this.config.retryAttempts) {
              syncResults.results[operation.name] = {
                success: false,
                error: error.message,
                attempts: attempts
              };
              syncResults.errors.push(`${operation.name}: ${error.message}`);
            } else {
              await this.delay(this.config.retryDelay * attempts);
            }
          }
        }
      }

      syncResults.success = Object.values(syncResults.results).every(result => result.success);

      await this.syncService.logSyncActivity({
        type: 'automated',
        ...syncResults
      });

      return syncResults;

    } catch (error) {
      syncResults.error = error.message;
      syncResults.errors.push(error.message);
      
      try {
        await this.syncService.logSyncActivity({
          type: 'automated',
          ...syncResults
        });
      } catch (logError) {
      }

      return syncResults;
    }
  }

  async triggerManualSync(options = {}) {
    if (!this.credentialsAvailable) {
      return {
        success: false,
        error: 'Google Sheets credentials not available',
        timestamp: new Date().toISOString()
      };
    }

    const {
      syncTypes = ['products', 'salesmen', 'companies', 'colors', 'styles'],
      forceSync = false
    } = options;

    const syncResults = {
      timestamp: new Date().toISOString(),
      type: 'manual',
      success: false,
      results: {},
      errors: []
    };

    try {
      const syncOperations = [
        { name: 'products', method: 'syncProductData' },
        { name: 'salesmen', method: 'syncSalesmanData' },
        { name: 'companies', method: 'syncCompaniesData' },
        { name: 'colors', method: 'syncColorsData' },
        { name: 'styles', method: 'syncStylesData' }
      ].filter(op => syncTypes.includes(op.name));

      for (const operation of syncOperations) {
        try {
          const result = await this.syncService[operation.method](forceSync);
          syncResults.results[operation.name] = {
            success: true,
            recordsProcessed: result.recordsProcessed || 0,
            changes: result.changes || 0
          };

        } catch (error) {
          syncResults.results[operation.name] = {
            success: false,
            error: error.message
          };
          syncResults.errors.push(`${operation.name}: ${error.message}`);
        }
      }

      // Add count data synchronization
      try {
        const countData = await this.syncCountData();
        syncResults.results.countData = {
          success: true,
          salesmenCount: countData.salesmenCount,
          priceListsCount: countData.priceListsCount
        };
      } catch (error) {
        syncResults.results.countData = {
          success: false,
          error: error.message
        };
        syncResults.errors.push(`Count data sync: ${error.message}`);
      }

      syncResults.success = Object.values(syncResults.results).every(result => result.success);

      await this.syncService.logSyncActivity(syncResults);

      return syncResults;

    } catch (error) {
      syncResults.error = error.message;
      syncResults.errors.push(error.message);
      
      try {
        await this.syncService.logSyncActivity(syncResults);
      } catch (logError) {
      }

      return syncResults;
    }
  }

  async syncCountData() {
    try {
      // Fetch salesmen count
      let salesmenCount = 0;
      try {
        const salesmenData = await this.syncService.googleSheetsService.fetchSalesmanData(this.salesmanSheetId);
        salesmenCount = salesmenData ? salesmenData.length : 0;
      } catch (error) {
      }

      // Fetch price lists count
      let priceListsCount = 0;
      try {
        const productData = await this.syncService.googleSheetsService.fetchProductData(this.productSheetId);
        if (productData && productData.length > 0) {
          const uniquePriceLists = new Set();
          productData.forEach(product => {
            if (product['Price List Name']) {
              uniquePriceLists.add(product['Price List Name']);
            }
          });
          priceListsCount = uniquePriceLists.size;
        }
      } catch (error) {
      }

      const countData = {
        salesmenCount,
        priceListsCount,
        lastUpdated: new Date().toISOString()
      };

      // Also store count data in Firebase
      try {
        const firebaseResult = await this.syncService.syncCountData();
        countData.firebaseSync = firebaseResult;
      } catch (firebaseError) {
        countData.firebaseSync = { success: false, error: firebaseError.message };
      }

      return countData;

    } catch (error) {
      throw error;
    }
  }

  getSchedulerStatus() {
    return {
      isRunning: this.isSchedulerRunning,
      isInitialized: this.isInitialized,
      credentialsAvailable: this.credentialsAvailable,
      nextRun: this.scheduledTask ? 'Scheduled according to cron pattern' : null,
      cronPattern: this.config.cronPattern,
      config: this.config
    };
  }

  updateConfig(newConfig) {
    const wasRunning = this.isSchedulerRunning;
    
    if (wasRunning) {
      this.stopScheduler();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.startScheduler();
    }
    
    return this.config;
  }

  async getSyncLogs(limit = 50) {
    try {
      return await this.syncService.getSyncStatus(limit);
    } catch (error) {
      return [];
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shutdown() {
    this.stopScheduler();
  }
}

process.on('SIGINT', () => {
  if (global.syncScheduler) {
    global.syncScheduler.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (global.syncScheduler) {
    global.syncScheduler.shutdown();
  }
  process.exit(0);
});

module.exports = SyncScheduler;