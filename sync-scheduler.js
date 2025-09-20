// Automated Synchronization Scheduler
// Handles automated syncing every 12 hours and provides manual trigger capabilities

const cron = require('node-cron');
const FirebaseSyncService = require('./firebase-sync-service');

class SyncScheduler {
  constructor() {
    this.syncService = new FirebaseSyncService();
    this.scheduledTask = null;
    this.isSchedulerRunning = false;
    
    // Google Sheets IDs from the provided URLs
    this.productSheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    this.salesmanSheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    this.companiesSheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    
    // Configuration
    this.config = {
      cronSchedule: '0 */12 * * *', // Every 12 hours
      timezone: 'UTC',
      retryAttempts: 3,
      retryDelay: 5000 // 5 seconds
    };
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    try {
      await this.syncService.initialize();
      console.log('Sync Scheduler initialized successfully');
      this.isInitialized = true;
      this.credentialsAvailable = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Sync Scheduler:', error.message);
      
      // Check if this is a credentials-related error
      if (this.isCredentialsError(error)) {
        console.warn('Sync Scheduler running in limited mode - Google Sheets sync disabled');
        console.warn('To enable full functionality, please configure Google Sheets credentials.');
        console.warn('See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for setup instructions.');
        
        this.isInitialized = true;
        this.credentialsAvailable = false;
        return true; // Allow system to continue in limited mode
      }
      
      throw error;
    }
  }

  /**
   * Check if error is related to missing or invalid credentials
   */
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

  /**
   * Start the automated synchronization scheduler
   */
  startScheduler() {
    if (this.isSchedulerRunning) {
      console.log('Scheduler is already running');
      return;
    }

    try {
      this.scheduledTask = cron.schedule(this.config.cronSchedule, async () => {
        console.log('Automated sync triggered at:', new Date().toISOString());
        await this.performAutomatedSync();
      }, {
        scheduled: true,
        timezone: this.config.timezone
      });

      this.isSchedulerRunning = true;
      console.log(`Automated sync scheduler started. Next sync will run every 12 hours.`);
      console.log(`Current time: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.error('Failed to start scheduler:', error.message);
      throw error;
    }
  }

  /**
   * Stop the automated synchronization scheduler
   */
  stopScheduler() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      this.isSchedulerRunning = false;
      console.log('Automated sync scheduler stopped');
    }
  }

  /**
   * Perform automated synchronization with retry logic
   */
  async performAutomatedSync() {
    let attempt = 1;
    
    while (attempt <= this.config.retryAttempts) {
      try {
        console.log(`Automated sync attempt ${attempt}/${this.config.retryAttempts}`);
        
        // Sync product data
        const productResult = await this.syncService.syncProductData(this.productSheetId);
        console.log('Product sync result:', {
          success: productResult.success,
          totalOperations: productResult.totalOperations,
          timestamp: productResult.timestamp
        });

        // Sync salesman data
        const salesmanResult = await this.syncService.syncSalesmanData(this.salesmanSheetId);
        console.log('Salesman sync result:', {
          success: salesmanResult.success,
          totalSalesmen: salesmanResult.totalSalesmen,
          timestamp: salesmanResult.timestamp
        });

        // Sync companies data
        const companiesResult = await this.syncService.syncCompaniesData(this.companiesSheetId);
        console.log('Companies sync result:', {
          added: companiesResult.added,
          updated: companiesResult.updated,
          deleted: companiesResult.deleted,
          total: companiesResult.total
        });

        // Sync colors data
        const colorsResult = await this.syncService.syncColorsData(this.productSheetId);
        console.log('Colors sync result:', {
          success: colorsResult.success,
          operationCount: colorsResult.operationCount,
          message: colorsResult.message
        });

        // Sync styles data
        const stylesResult = await this.syncService.syncStylesData(this.productSheetId);
        console.log('Styles sync result:', {
          success: stylesResult.success,
          operationCount: stylesResult.operationCount,
          message: stylesResult.message
        });

        console.log('Automated synchronization completed successfully');
        return {
          success: true,
          productResult,
          salesmanResult,
          companiesResult,
          colorsResult,
          stylesResult,
          attempt
        };

      } catch (error) {
        console.error(`Automated sync attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.config.retryAttempts) {
          console.error('All automated sync attempts failed');
          
          // Log critical failure
          await this.syncService.logSyncActivity({
            type: 'automated_sync_failure',
            timestamp: new Date(),
            error: error.message,
            attempts: this.config.retryAttempts,
            success: false
          });
          
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);
        attempt++;
      }
    }
  }

  /**
   * Manual synchronization trigger
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async triggerManualSync(options = {}) {
    try {
      console.log('Manual sync triggered at:', new Date().toISOString());
      
      // Check if credentials are available
      if (!this.credentialsAvailable) {
        const errorMessage = 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality. See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for setup instructions.';
        console.warn(errorMessage);
        throw new Error(errorMessage);
      }
      
      const results = {};
      
      // Sync products if requested (default: true)
      if (options.syncProducts !== false) {
        console.log('Starting manual product sync...');
        results.productResult = await this.syncService.syncProductData(this.productSheetId);
      }
      
      // Sync salesmen if requested (default: true)
      if (options.syncSalesmen !== false) {
        console.log('Starting manual salesman sync...');
        results.salesmanResult = await this.syncService.syncSalesmanData(this.salesmanSheetId);
      }
      
      // Sync companies if requested (default: true)
      if (options.syncCompanies !== false) {
        console.log('Starting manual companies sync...');
        results.companiesResult = await this.syncService.syncCompaniesData(this.companiesSheetId);
      }
      
      // Sync colors if requested (default: true)
      if (options.syncColors !== false) {
        console.log('Starting manual colors sync...');
        results.colorsResult = await this.syncService.syncColorsData(this.productSheetId);
      }

      // Sync styles if requested (default: true)
      if (options.syncStyles !== false) {
        console.log('Starting manual styles sync...');
        results.stylesResult = await this.syncService.syncStylesData(this.productSheetId);
      }

      console.log('Manual synchronization completed successfully');
      
      // Log manual sync
      await this.syncService.logSyncActivity({
        type: 'manual_sync',
        timestamp: new Date(),
        options,
        results,
        success: true
      });
      
      return {
        success: true,
        timestamp: new Date(),
        ...results
      };
      
    } catch (error) {
      console.error('Manual synchronization failed:', error.message);
      
      // Only try to log if we have service access
      if (this.syncService && this.credentialsAvailable) {
        try {
          await this.syncService.logSyncActivity({
            type: 'manual_sync_failure',
            timestamp: new Date(),
            error: error.message,
            options,
            success: false
          });
        } catch (logError) {
          console.warn('Failed to log sync activity:', logError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getSchedulerStatus() {
    return {
      isRunning: this.isSchedulerRunning,
      cronSchedule: this.config.cronSchedule,
      timezone: this.config.timezone,
      nextRun: this.isSchedulerRunning ? 'Every 12 hours' : null
    };
  }

  /**
   * Update scheduler configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart scheduler if running and schedule changed
    if (this.isSchedulerRunning && newConfig.cronSchedule) {
      this.stopScheduler();
      this.startScheduler();
    }
    
    console.log('Scheduler configuration updated:', this.config);
  }

  /**
   * Get sync logs
   * @param {number} limit - Number of logs to retrieve
   * @returns {Promise<Array>} Sync logs
   */
  async getSyncLogs(limit = 50) {
    return await this.syncService.getSyncLogs(limit);
  }

  /**
   * Utility function to delay execution
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('Shutting down sync scheduler...');
    this.stopScheduler();
    console.log('Sync scheduler shutdown complete');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (global.syncScheduler) {
    global.syncScheduler.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (global.syncScheduler) {
    global.syncScheduler.shutdown();
  }
  process.exit(0);
});

module.exports = SyncScheduler;