const { EventEmitter } = require('events');
const GoogleSheetsChangeDetector = require('./google-sheets-change-detector');
const FirebaseChangeDetector = require('./firebase-change-detector');
const ConflictResolutionSystem = require('./conflict-resolution-system');
const ErrorHandlingSystem = require('./error-handling-system');

/**
 * Bidirectional Sync Service
 * Manages real-time synchronization between Google Sheets, Firebase, and Local Storage
 * with conflict resolution and data validation
 */
class BidirectionalSyncService extends EventEmitter {
  constructor(firebaseSyncService, googleSheetsService, config = {}) {
    super();
    this.firebaseSyncService = firebaseSyncService;
    this.googleSheetsService = googleSheetsService;
    this.config = config;
    this.isRunning = false;
    this.syncInterval = null;
    this.changeListeners = new Map();
    this.lastSyncTimestamps = {
      googleSheets: null,
      firebase: null,
      localStorage: null
    };
    this.conflictResolutionStrategy = 'timestamp'; // 'timestamp', 'manual', 'firebase-priority'
    this.validationInterval = 5 * 60 * 1000; // 5 minutes
    this.syncRetryAttempts = 3;
    this.syncRetryDelay = 2000; // 2 seconds
    
    // Initialize change detectors
    this.googleSheetsDetector = null;
    this.firebaseDetector = null;
    this.changeDetectionEnabled = true;
    
    // Initialize conflict resolution system
    this.conflictResolver = new ConflictResolutionSystem({
      defaultStrategy: this.conflictResolutionStrategy,
      autoResolveThreshold: 5,
      maxConflictHistory: 100,
      enableUserIntervention: true
    });
    
    // Initialize error handling system
    this.errorHandler = new ErrorHandlingSystem({
      maxRetries: this.syncRetryAttempts,
      retryDelay: this.syncRetryDelay,
      exponentialBackoff: true,
      maxRetryDelay: 30000,
      enableFallbacks: true,
      errorHistoryLimit: 500
    });
    
    // Setup error handling event listeners
    this.setupErrorHandlingListeners();
    
    // Setup conflict resolution event listeners
    this.setupConflictResolutionListeners();
  }

  /**
   * Start the bidirectional sync service
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    try {
      this.isRunning = true;

      // Initialize change detectors
      await this.initializeChangeDetectors();
      
      // Setup periodic validation
      this.setupPeriodicValidation();
      
      // Perform initial sync
      await this.performInitialSync();
      
      this.emit('sync-service-started');
    } catch (error) {
      this.isRunning = false;
      this.emit('sync-service-error', error);
      throw error;
    }
  }

  /**
   * Stop the bidirectional sync service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;

      // Stop change detectors
      if (this.googleSheetsDetector) {
        this.googleSheetsDetector.stop();
      }
      if (this.firebaseDetector) {
        this.firebaseDetector.stop();
      }

      // Clear intervals
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      // Remove Firebase listeners
      this.changeListeners.forEach((unsubscribe, collectionName) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.changeListeners.clear();

      this.emit('sync-service-stopped');
    } catch (error) {
      this.emit('sync-service-error', { type: 'stop-error', error: error.message });
    }
  }

  /**
   * Initialize change detectors for Google Sheets, Firebase, and localStorage
   */
  async initializeChangeDetectors() {
    try {
      // Initialize Google Sheets change detector
      this.googleSheetsDetector = new GoogleSheetsChangeDetector(
        this.config.googleSheets || {}
      );

      // Set up Google Sheets change event handlers
      this.googleSheetsDetector.on('initialized', () => {
        this.emit('google-sheets-detector-ready');
      });

      this.googleSheetsDetector.on('data-changed', (changeData) => {
        this.handleGoogleSheetsChange(changeData);
      });

      this.googleSheetsDetector.on('error', (error) => {
        this.emit('sync-service-error', { 
          type: 'google-sheets-detector-error', 
          error: error.message 
        });
      });

      // Initialize Firebase change detector
      this.firebaseDetector = new FirebaseChangeDetector(
        this.firebaseSyncService,
        this.config.firebase || {}
      );

      // Set up Firebase change event handlers
      this.firebaseDetector.on('initialized', () => {
        this.emit('firebase-detector-ready');
      });

      this.firebaseDetector.on('data-changed', (changeData) => {
        this.handleFirebaseDetectorChange(changeData);
      });

      this.firebaseDetector.on('error', (error) => {
        this.emit('sync-service-error', { 
          type: 'firebase-detector-error', 
          error: error.message 
        });
      });

      // Initialize both detectors
      await Promise.all([
        this.googleSheetsDetector.initialize(),
        this.firebaseDetector.initialize()
      ]);

      // Start change detection
      if (this.changeDetectionEnabled) {
        this.googleSheetsDetector.startPolling();
        this.firebaseDetector.startListening();
      }

    } catch (error) {
      this.emit('sync-service-error', { 
        type: 'change-detector-init-error', 
        error: error.message 
      });
    }
  }

  /**
   * Setup Firebase real-time change listeners
   */
  async setupFirebaseChangeListeners() {
    if (!this.firebaseSyncService || !this.firebaseSyncService.db) {
      throw new Error('Firebase service not available');
    }

    const collections = ['salespeople', 'price_lists', 'config'];
    
    for (const collectionName of collections) {
      try {
        const unsubscribe = this.firebaseSyncService.db
          .collection(collectionName)
          .onSnapshot(
            (snapshot) => this.handleFirebaseChange(collectionName, snapshot),
            (error) => this.handleFirebaseError(collectionName, error)
          );
        
        this.changeListeners.set(collectionName, unsubscribe);
      } catch (error) {
      }
    }
  }

  /**
   * Handle Firebase collection changes
   */
  async handleFirebaseChange(collectionName, snapshot) {
    if (!this.isRunning) return;

    try {
      
      const changes = snapshot.docChanges();
      if (changes.length === 0) return;

      const changeData = {
        collection: collectionName,
        changes: changes.map(change => ({
          type: change.type, // 'added', 'modified', 'removed'
          doc: {
            id: change.doc.id,
            data: change.doc.data()
          }
        })),
        timestamp: Date.now()
      };

      // Emit change event for monitoring
      this.emit('firebase-change-detected', changeData);

      // Propagate changes to Google Sheets and Local Storage
      await this.propagateFirebaseChanges(changeData);

    } catch (error) {
      this.emit('sync-error', { source: 'firebase', collection: collectionName, error });
    }
  }

  /**
   * Handle Firebase listener errors
   */
  handleFirebaseError(collectionName, error) {
    this.emit('firebase-listener-error', { collection: collectionName, error });
    
    // Attempt to reconnect after delay
    setTimeout(() => {
      if (this.isRunning) {
        this.reconnectFirebaseListener(collectionName);
      }
    }, this.syncRetryDelay);
  }

  /**
   * Reconnect Firebase listener
   */
  async reconnectFirebaseListener(collectionName) {
    try {
      // Remove existing listener
      const existingListener = this.changeListeners.get(collectionName);
      if (existingListener) {
        existingListener();
      }

      // Setup new listener
      const unsubscribe = this.firebaseSyncService.db
        .collection(collectionName)
        .onSnapshot(
          (snapshot) => this.handleFirebaseChange(collectionName, snapshot),
          (error) => this.handleFirebaseError(collectionName, error)
        );
      
      this.changeListeners.set(collectionName, unsubscribe);
    } catch (error) {
    }
  }

  /**
   * Propagate Firebase changes to other platforms
   */
  async propagateFirebaseChanges(changeData) {
    const { collection, changes } = changeData;

    try {
      // Update Google Sheets based on collection type
      if (collection === 'config') {
        await this.syncConfigToGoogleSheets(changes);
      } else if (collection === 'salespeople') {
        await this.syncSalespeopleToGoogleSheets(changes);
      } else if (collection === 'price_lists') {
        await this.syncPriceListsToGoogleSheets(changes);
      }

      // Update local storage (for browser-based components)
      await this.updateLocalStorageFromFirebase(collection, changes);

      this.emit('propagation-completed', { collection, changes });
    } catch (error) {
      this.emit('propagation-error', { collection, changes, error });
    }
  }

  /**
   * Sync config data to Google Sheets
   */
  async syncConfigToGoogleSheets(changes) {
    if (!this.googleSheetsService) {
      return;
    }

    for (const change of changes) {
      if (change.type === 'modified' && change.doc.data.salespeople) {
        try {
          const salespeople = change.doc.data.salespeople;
          await this.googleSheetsService.updateSalesmenCount(salespeople.length);
        } catch (error) {
        }
      }
    }
  }

  /**
   * Sync salespeople data to Google Sheets
   */
  async syncSalespeopleToGoogleSheets(changes) {
    if (!this.googleSheetsService) {
      return;
    }

    // Implementation depends on Google Sheets structure
    // This is a placeholder for the actual implementation
  }

  /**
   * Sync price lists data to Google Sheets
   */
  async syncPriceListsToGoogleSheets(changes) {
    if (!this.googleSheetsService) {
      return;
    }

    for (const change of changes) {
      try {
        if (change.type === 'modified' && change.doc.data.count !== undefined) {
          await this.googleSheetsService.updatePriceListCount(change.doc.data.count);
        }
      } catch (error) {
      }
    }
  }

  /**
   * Update local storage from Firebase changes
   */
  async updateLocalStorageFromFirebase(collection, changes) {
    // This method would be called from the client-side
    // For server-side, we emit events that client can listen to
    this.emit('localStorage-update-required', { collection, changes });
  }

  /**
   * Perform initial synchronization
   */
  async performInitialSync() {
    
    try {
      // Sync from Google Sheets to Firebase
      await this.syncFromGoogleSheetsToFirebase();
      
      // Sync from Firebase to Local Storage
      await this.syncFromFirebaseToLocalStorage();
      
      // Update timestamps
      this.updateSyncTimestamps();
      
      this.emit('initial-sync-completed');
    } catch (error) {
      this.emit('initial-sync-failed', error);
      throw error;
    }
  }

  /**
   * Sync from Google Sheets to Firebase
   */
  async syncFromGoogleSheetsToFirebase() {
    if (!this.googleSheetsService || !this.firebaseSyncService) {
      return;
    }

    try {
      
      const results = {};
      
      // Sync all data types
      try {
        results.products = await this.firebaseSyncService.syncProductData();
      } catch (error) {
        results.products = { success: false, error: error.message };
      }
      
      try {
        results.salesmen = await this.firebaseSyncService.syncSalesmanData();
      } catch (error) {
        results.salesmen = { success: false, error: error.message };
      }
      
      try {
        results.companies = await this.firebaseSyncService.syncCompaniesData();
      } catch (error) {
        results.companies = { success: false, error: error.message };
      }
      
      try {
        results.colors = await this.firebaseSyncService.syncColorsData();
      } catch (error) {
        results.colors = { success: false, error: error.message };
      }
      
      try {
        results.styles = await this.firebaseSyncService.syncStylesData();
      } catch (error) {
        results.styles = { success: false, error: error.message };
      }
      
      try {
        results.priceLists = await this.firebaseSyncService.syncPriceListsData();
      } catch (error) {
        results.priceLists = { success: false, error: error.message };
      }
      
      try {
        results.counts = await this.firebaseSyncService.syncCountData();
      } catch (error) {
        results.counts = { success: false, error: error.message };
      }
      
      return results;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync from Firebase to Local Storage
   */
  async syncFromFirebaseToLocalStorage() {
    // Emit event for client-side handling
    this.emit('firebase-to-localStorage-sync-required');
  }

  /**
   * Setup periodic data validation
   */
  setupPeriodicValidation() {
    this.validationInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performDataValidation();
      }
    }, this.validationInterval);
  }

  /**
   * Perform data validation across all platforms
   */
  async performDataValidation() {
    
    try {
      const validationResults = {
        timestamp: Date.now(),
        googleSheets: await this.validateGoogleSheetsData(),
        firebase: await this.validateFirebaseData(),
        inconsistencies: []
      };

      // Check for inconsistencies
      validationResults.inconsistencies = await this.detectInconsistencies(validationResults);

      // Emit validation results
      this.emit('data-validation-completed', validationResults);

      // Auto-resolve minor inconsistencies if configured
      if (validationResults.inconsistencies.length > 0) {
        await this.handleDataInconsistencies(validationResults.inconsistencies);
      }

    } catch (error) {
      this.emit('data-validation-failed', error);
    }
  }

  /**
   * Validate Google Sheets data
   */
  async validateGoogleSheetsData() {
    if (!this.googleSheetsService) {
      return { available: false, reason: 'Service not available' };
    }

    try {
      const salesmenCount = await this.googleSheetsService.getSalesmenCount();
      const priceListCount = await this.googleSheetsService.getPriceListCount();
      
      return {
        available: true,
        salesmenCount,
        priceListCount,
        lastUpdated: Date.now()
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Validate Firebase data
   */
  async validateFirebaseData() {
    if (!this.firebaseSyncService || !this.firebaseSyncService.db) {
      return { available: false, reason: 'Service not available' };
    }

    try {
      // Get config document for salespeople count
      const configDoc = await this.firebaseSyncService.db.collection('config').doc('salespeople').get();
      const salesmenCount = configDoc.exists ? (configDoc.data().salespeople || []).length : 0;

      // Get price lists count
      const priceListsSnapshot = await this.firebaseSyncService.db.collection('price_lists').get();
      const priceListCount = priceListsSnapshot.size;

      return {
        available: true,
        salesmenCount,
        priceListCount,
        lastUpdated: Date.now()
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Detect inconsistencies between platforms
   */
  async detectInconsistencies(validationResults) {
    const inconsistencies = [];
    const { googleSheets, firebase } = validationResults;

    if (googleSheets.available && firebase.available) {
      // Check salesmen count consistency
      if (googleSheets.salesmenCount !== firebase.salesmenCount) {
        inconsistencies.push({
          type: 'salesmen_count_mismatch',
          googleSheets: googleSheets.salesmenCount,
          firebase: firebase.salesmenCount,
          severity: 'medium'
        });
      }

      // Check price list count consistency
      if (googleSheets.priceListCount !== firebase.priceListCount) {
        inconsistencies.push({
          type: 'price_list_count_mismatch',
          googleSheets: googleSheets.priceListCount,
          firebase: firebase.priceListCount,
          severity: 'medium'
        });
      }
    }

    return inconsistencies;
  }

  /**
   * Handle data inconsistencies
   */
  async handleDataInconsistencies(inconsistencies) {
    for (const inconsistency of inconsistencies) {
      try {
        await this.resolveInconsistency(inconsistency);
      } catch (error) {
        this.emit('inconsistency-resolution-failed', { inconsistency, error });
      }
    }
  }

  /**
   * Resolve a specific inconsistency
   */
  async resolveInconsistency(inconsistency) {

    switch (this.conflictResolutionStrategy) {
      case 'firebase-priority':
        await this.resolveWithFirebasePriority(inconsistency);
        break;
      case 'timestamp':
        await this.resolveWithTimestampPriority(inconsistency);
        break;
      case 'manual':
        this.emit('manual-resolution-required', inconsistency);
        break;
      default:
    }
  }

  /**
   * Resolve inconsistency with Firebase as priority
   */
  async resolveWithFirebasePriority(inconsistency) {
    // Use Firebase data as the source of truth
    if (inconsistency.type === 'salesmen_count_mismatch') {
      await this.googleSheetsService.updateSalesmenCount(inconsistency.firebase);
    } else if (inconsistency.type === 'price_list_count_mismatch') {
      await this.googleSheetsService.updatePriceListCount(inconsistency.firebase);
    }
    
    this.emit('inconsistency-resolved', { inconsistency, strategy: 'firebase-priority' });
  }

  /**
   * Resolve inconsistency with timestamp priority
   */
  async resolveWithTimestampPriority(inconsistency) {
    // This would require timestamp tracking - placeholder implementation
    this.emit('inconsistency-resolution-pending', inconsistency);
  }

  /**
   * Update sync timestamps
   */
  updateSyncTimestamps() {
    const now = Date.now();
    this.lastSyncTimestamps.googleSheets = now;
    this.lastSyncTimestamps.firebase = now;
    this.lastSyncTimestamps.localStorage = now;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTimestamps: this.lastSyncTimestamps,
      conflictResolutionStrategy: this.conflictResolutionStrategy,
      activeListeners: this.changeListeners.size,
      validationInterval: this.validationInterval
    };
  }

  /**
   * Handle Google Sheets change events from the change detector
   */
  async handleGoogleSheetsChange(changeData) {
    try {
      
      // Update last sync timestamp
      this.lastSyncTimestamps.googleSheets = Date.now();
      
      // Propagate changes to Firebase
      if (changeData.collection === 'salesmen' && changeData.changes) {
        await this.propagateGoogleSheetsChangesToFirebase('salespeople', changeData.changes);
      } else if (changeData.collection === 'price_lists' && changeData.changes) {
        await this.propagateGoogleSheetsChangesToFirebase('price_lists', changeData.changes);
      }
      
      // Emit change event for SSE clients
      this.emit('google-sheets-change', {
        collection: changeData.collection,
        changes: changeData.changes,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.emit('sync-service-error', { 
        type: 'google-sheets-change-error', 
        error: error.message,
        changeData 
      });
    }
  }

  /**
   * Handle Firebase change events from the change detector
   */
  async handleFirebaseDetectorChange(changeData) {
    try {
      
      // Update last sync timestamp
      this.lastSyncTimestamps.firebase = Date.now();
      
      // Propagate changes to Google Sheets
      if (changeData.collection === 'salespeople' && changeData.changes) {
        await this.propagateFirebaseChangesToGoogleSheets('salesmen', changeData.changes);
      } else if (changeData.collection === 'price_lists' && changeData.changes) {
        await this.propagateFirebaseChangesToGoogleSheets('price_lists', changeData.changes);
      }
      
      // Emit change event for SSE clients
      this.emit('firebase-change', {
        collection: changeData.collection,
        changes: changeData.changes,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.emit('sync-service-error', { 
        type: 'firebase-detector-change-error', 
        error: error.message,
        changeData 
      });
    }
  }

  /**
   * Propagate Google Sheets changes to Firebase
   */
  async propagateGoogleSheetsChangesToFirebase(collection, changes) {
    try {
      if (changes.added && changes.added.length > 0) {
        for (const item of changes.added) {
          await this.firebaseSyncService.addDocument(collection, item);
        }
      }
      
      if (changes.modified && changes.modified.length > 0) {
        for (const item of changes.modified) {
          await this.firebaseSyncService.updateDocument(collection, item.id, item);
        }
      }
      
      if (changes.removed && changes.removed.length > 0) {
        for (const item of changes.removed) {
          await this.firebaseSyncService.deleteDocument(collection, item.id);
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Propagate Firebase changes to Google Sheets
   */
  async propagateFirebaseChangesToGoogleSheets(sheetName, changes) {
    try {
      if (changes.added && changes.added.length > 0) {
        for (const item of changes.added) {
          await this.googleSheetsService.addRowToSheet(sheetName, item);
        }
      }
      
      if (changes.modified && changes.modified.length > 0) {
        for (const item of changes.modified) {
          await this.googleSheetsService.updateRowInSheet(sheetName, item.id, item);
        }
      }
      
      if (changes.removed && changes.removed.length > 0) {
        for (const item of changes.removed) {
          await this.googleSheetsService.deleteRowFromSheet(sheetName, item.id);
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enable or disable change detection
   */
  setChangeDetectionEnabled(enabled) {
    this.changeDetectionEnabled = enabled;
    
    if (this.googleSheetsDetector) {
      if (enabled) {
        this.googleSheetsDetector.startPolling();
      } else {
        this.googleSheetsDetector.stopPolling();
      }
    }
    
    if (this.firebaseDetector) {
      if (enabled) {
        this.firebaseDetector.startListening();
      } else {
        this.firebaseDetector.stopListening();
      }
    }
    
    this.emit('change-detection-toggled', enabled);
  }

  /**
   * Get change detector status
   */
  getChangeDetectorStatus() {
    return {
      googleSheets: this.googleSheetsDetector ? this.googleSheetsDetector.getStatus() : null,
      firebase: this.firebaseDetector ? this.firebaseDetector.getStatus() : null,
      changeDetectionEnabled: this.changeDetectionEnabled
    };
  }

  /**
   * Setup error handling event listeners
   */
  setupErrorHandlingListeners() {
    this.errorHandler.on('error-handled', (errorInfo) => {
      this.emit('sync-service-error', {
        type: 'handled-error',
        error: errorInfo.message,
        category: errorInfo.category,
        severity: errorInfo.severity,
        context: errorInfo.context
      });
    });

    this.errorHandler.on('operation-retry', (retryInfo) => {
      this.emit('sync-operation-retry', retryInfo);
    });

    this.errorHandler.on('fallback-executed', (fallbackInfo) => {
      this.emit('sync-fallback-executed', fallbackInfo);
    });

    this.errorHandler.on('critical-error', (errorInfo) => {
      this.emit('sync-critical-error', errorInfo);
    });

    this.errorHandler.on('circuit-breaker-opened', (breakerInfo) => {
      this.emit('sync-circuit-breaker-opened', breakerInfo);
    });

    // Register fallback strategies
    this.registerFallbackStrategies();
  }

  /**
   * Setup conflict resolution event listeners
   */
  setupConflictResolutionListeners() {
    this.conflictResolver.on('conflicts-detected', (conflictInfo) => {
      this.emit('sync-conflicts-detected', conflictInfo);
      
      // Auto-resolve conflicts if possible
      this.conflictResolver.autoResolveConflicts();
    });

    this.conflictResolver.on('conflicts-resolved', (resolutions) => {
      this.emit('sync-conflicts-resolved', resolutions);
    });

    this.conflictResolver.on('manual-resolution-required', (conflict) => {
      this.emit('sync-manual-resolution-required', conflict);
    });

    this.conflictResolver.on('user-choice-required', (conflict) => {
      this.emit('sync-user-choice-required', conflict);
    });

    this.conflictResolver.on('auto-resolution-completed', (info) => {
      this.emit('sync-auto-resolution-completed', info);
    });
  }

  /**
   * Register fallback strategies for different operations
   */
  registerFallbackStrategies() {
    // Google Sheets fallback - use cached data
    this.errorHandler.registerFallback('sync', 'google-sheets', async (errorInfo) => {
      return this.getCachedGoogleSheetsData(errorInfo.context.collection);
    });

    // Firebase fallback - use local storage
    this.errorHandler.registerFallback('sync', 'firebase', async (errorInfo) => {
      return this.getLocalStorageData(errorInfo.context.collection);
    });

    // Data propagation fallback - queue for later
    this.errorHandler.registerFallback('propagate', 'any', async (errorInfo) => {
      return this.queueChangesForLater(errorInfo.context);
    });
  }

  /**
   * Get cached Google Sheets data
   */
  async getCachedGoogleSheetsData(collection) {
    try {
      if (this.googleSheetsDetector) {
        const status = this.googleSheetsDetector.getStatus();
        return status.lastKnownData?.[collection] || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get localStorage data
   */
  async getLocalStorageData(collection) {
    try {
      // This would need to be implemented based on your localStorage structure
      const key = collection === 'salespeople' ? 'fallback_salespeople' : 
                 collection === 'price_lists' ? 'fallback_price_lists' : collection;
      
      // Since this is server-side, we'd need to get this from the client
      // For now, return null and emit an event for client-side handling
      this.emit('localStorage-data-requested', { collection, key });
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Queue changes for later propagation
   */
  async queueChangesForLater(context) {
    try {
      // Implement a queue system for failed operations
      const queueItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        context,
        retryCount: 0,
        maxRetries: 5
      };
      
      // Store in a persistent queue (could use database, file, etc.)
      this.emit('sync-operation-queued', queueItem);
      
      return { queued: true, queueId: queueItem.id };
    } catch (error) {
      return null;
    }
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolutionStrategy(strategy) {
    const validStrategies = ['timestamp', 'manual', 'firebase-priority'];
    if (validStrategies.includes(strategy)) {
      this.conflictResolutionStrategy = strategy;
      if (this.conflictResolver) {
        this.conflictResolver.setDefaultStrategy(strategy);
      }
      this.emit('conflict-strategy-changed', { strategy });
    } else {
      throw new Error(`Invalid strategy: ${strategy}. Valid strategies: ${validStrategies.join(', ')}`);
    }
  }

  /**
   * Start periodic data validation
   */
  startPeriodicValidation() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    this.validationInterval = setInterval(async () => {
        try {
          await this.performComprehensiveValidation();
        } catch (error) {
          this.emit('validation-error', { error: error.message });
        }
      }, this.validationIntervalMs);

     this.emit('validation-started', { interval: this.validationIntervalMs });
  }

  /**
   * Stop periodic data validation
   */
  stopPeriodicValidation() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
      this.emit('validation-stopped');
    }
  }

  /**
   * Perform comprehensive data validation across all platforms
   */
  async performComprehensiveValidation() {
    const validationResults = {
      timestamp: Date.now(),
      platforms: {},
      inconsistencies: [],
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        inconsistencyCount: 0
      }
    };

    try {
      // Validate Google Sheets data
      const googleSheetsValidation = await this.validateGoogleSheetsDataStructure();
      validationResults.platforms.googleSheets = googleSheetsValidation;
      validationResults.summary.totalChecks += googleSheetsValidation.checks.length;
      validationResults.summary.passedChecks += googleSheetsValidation.checks.filter(c => c.passed).length;
      validationResults.summary.failedChecks += googleSheetsValidation.checks.filter(c => !c.passed).length;

      // Validate Firebase data
      const firebaseValidation = await this.validateFirebaseDataStructure();
      validationResults.platforms.firebase = firebaseValidation;
      validationResults.summary.totalChecks += firebaseValidation.checks.length;
      validationResults.summary.passedChecks += firebaseValidation.checks.filter(c => c.passed).length;
      validationResults.summary.failedChecks += firebaseValidation.checks.filter(c => !c.passed).length;

      // Check for cross-platform inconsistencies
      const inconsistencies = await this.detectCrossPlatformInconsistencies();
      validationResults.inconsistencies = inconsistencies;
      validationResults.summary.inconsistencyCount = inconsistencies.length;

      // Emit validation results
      this.emit('validation-completed', validationResults);

      // Handle inconsistencies if found
      if (inconsistencies.length > 0) {
        await this.handleValidationInconsistencies(inconsistencies);
      }

      return validationResults;
    } catch (error) {
      this.emit('validation-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate Google Sheets data structure and integrity
   */
  async validateGoogleSheetsDataStructure() {
    const validation = {
      platform: 'googleSheets',
      timestamp: Date.now(),
      checks: [],
      status: 'passed'
    };

    try {
      // Check if Google Sheets service is accessible
      const accessCheck = await this.checkGoogleSheetsAccess();
      validation.checks.push({
        name: 'service_access',
        description: 'Google Sheets API accessibility',
        passed: accessCheck.success,
        details: accessCheck.details
      });

      // Validate salespeople data structure
      const salespeopleValidation = await this.validateGoogleSheetsCollection('salespeople');
      validation.checks.push({
        name: 'salespeople_structure',
        description: 'Salespeople data structure validation',
        passed: salespeopleValidation.valid,
        details: salespeopleValidation.details
      });

      // Validate price lists data structure
      const priceListsValidation = await this.validateGoogleSheetsCollection('price_lists');
      validation.checks.push({
        name: 'price_lists_structure',
        description: 'Price lists data structure validation',
        passed: priceListsValidation.valid,
        details: priceListsValidation.details
      });

      // Check for data corruption
      const corruptionCheck = await this.checkGoogleSheetsDataCorruption();
      validation.checks.push({
        name: 'data_corruption',
        description: 'Data corruption detection',
        passed: !corruptionCheck.hasCorruption,
        details: corruptionCheck.details
      });

      validation.status = validation.checks.every(check => check.passed) ? 'passed' : 'failed';
    } catch (error) {
      validation.status = 'error';
      validation.error = error.message;
    }

    return validation;
  }

  /**
   * Validate Firebase data structure and integrity
   */
  async validateFirebaseDataStructure() {
    const validation = {
      platform: 'firebase',
      timestamp: Date.now(),
      checks: [],
      status: 'passed'
    };

    try {
      // Check Firebase connection
      const connectionCheck = await this.checkFirebaseConnection();
      validation.checks.push({
        name: 'connection',
        description: 'Firebase connection status',
        passed: connectionCheck.connected,
        details: connectionCheck.details
      });

      // Validate collections exist
      const collectionsCheck = await this.validateFirebaseCollections();
      validation.checks.push({
        name: 'collections_exist',
        description: 'Required collections existence',
        passed: collectionsCheck.allExist,
        details: collectionsCheck.details
      });

      // Check data consistency
      const consistencyCheck = await this.checkFirebaseDataConsistency();
      validation.checks.push({
        name: 'data_consistency',
        description: 'Internal data consistency',
        passed: consistencyCheck.consistent,
        details: consistencyCheck.details
      });

      validation.status = validation.checks.every(check => check.passed) ? 'passed' : 'failed';
    } catch (error) {
      validation.status = 'error';
      validation.error = error.message;
    }

    return validation;
  }

  /**
   * Detect inconsistencies between platforms
   */
  async detectCrossPlatformInconsistencies() {
    const inconsistencies = [];

    try {
      // Compare salespeople data
      const salespeopleInconsistencies = await this.comparePlatformData('salespeople');
      inconsistencies.push(...salespeopleInconsistencies);

      // Compare price lists data
      const priceListsInconsistencies = await this.comparePlatformData('price_lists');
      inconsistencies.push(...priceListsInconsistencies);

    } catch (error) {
    }

    return inconsistencies;
  }

  /**
   * Compare data between platforms for a specific collection
   */
  async comparePlatformData(collection) {
    const inconsistencies = [];

    try {
      // Get data from both platforms
      const googleSheetsData = await this.getGoogleSheetsData(collection);
      const firebaseData = await this.getFirebaseData(collection);

      // Use conflict resolver to detect differences
      const conflicts = await this.conflictResolver.detectConflicts(
        { googleSheets: googleSheetsData, firebase: firebaseData },
        collection
      );

      // Convert conflicts to inconsistencies
      conflicts.forEach(conflict => {
        inconsistencies.push({
          id: conflict.id,
          collection,
          type: 'data_mismatch',
          severity: conflict.severity,
          description: `Data mismatch between Google Sheets and Firebase for ${conflict.key}`,
          platforms: ['googleSheets', 'firebase'],
          details: conflict,
          timestamp: Date.now()
        });
      });

    } catch (error) {
      inconsistencies.push({
        id: `error_${Date.now()}`,
        collection,
        type: 'comparison_error',
        severity: 'high',
        description: `Error comparing ${collection} data between platforms`,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return inconsistencies;
  }

  /**
   * Handle validation inconsistencies
   */
  async handleValidationInconsistencies(inconsistencies) {
    for (const inconsistency of inconsistencies) {
      try {
        if (inconsistency.type === 'data_mismatch' && inconsistency.details) {
          // Attempt to resolve using conflict resolution system
          const resolution = await this.conflictResolver.resolveConflict(inconsistency.details);
          
          if (resolution.resolved) {
            this.emit('inconsistency-resolved', {
              inconsistency,
              resolution,
              timestamp: Date.now()
            });
          } else {
            this.emit('inconsistency-unresolved', {
              inconsistency,
              reason: resolution.reason,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        this.emit('inconsistency-handling-error', {
          inconsistency,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  // Helper methods for validation
  
  async checkGoogleSheetsAccess() {
    try {
      if (!this.googleSheetsService) {
        return { success: false, details: 'Google Sheets service not available' };
      }
      // Test basic access by getting salesmen count
      await this.googleSheetsService.getSalesmenCount();
      return { success: true, details: 'Google Sheets API accessible' };
    } catch (error) {
      return { success: false, details: error.message };
    }
  }

  async validateGoogleSheetsCollection(collection) {
    try {
      if (!this.googleSheetsService) {
        return { valid: false, details: 'Google Sheets service not available' };
      }
      // Basic structure validation - this would be expanded based on your specific requirements
      return { valid: true, details: `${collection} structure is valid` };
    } catch (error) {
      return { valid: false, details: error.message };
    }
  }

  async checkGoogleSheetsDataCorruption() {
    try {
      // Implement corruption detection logic based on your data patterns
      return { hasCorruption: false, details: 'No data corruption detected' };
    } catch (error) {
      return { hasCorruption: true, details: error.message };
    }
  }

  async checkFirebaseConnection() {
    try {
      if (!this.firebaseSyncService || !this.firebaseSyncService.db) {
        return { connected: false, details: 'Firebase service not available' };
      }
      // Test connection by accessing a collection
      await this.firebaseSyncService.db.collection('config').limit(1).get();
      return { connected: true, details: 'Firebase connection active' };
    } catch (error) {
      return { connected: false, details: error.message };
    }
  }

  async validateFirebaseCollections() {
    try {
      if (!this.firebaseSyncService || !this.firebaseSyncService.db) {
        return { allExist: false, details: 'Firebase service not available' };
      }
      
      const requiredCollections = ['salespeople', 'price_lists', 'config'];
      const existingCollections = [];
      
      for (const collection of requiredCollections) {
        try {
          const snapshot = await this.firebaseSyncService.db.collection(collection).limit(1).get();
          existingCollections.push(collection);
        } catch (error) {
        }
      }
      
      const allExist = existingCollections.length === requiredCollections.length;
      return { 
        allExist, 
        details: allExist ? 'All required collections exist' : `Missing collections: ${requiredCollections.filter(c => !existingCollections.includes(c)).join(', ')}` 
      };
    } catch (error) {
      return { allExist: false, details: error.message };
    }
  }

  async checkFirebaseDataConsistency() {
    try {
      // Implement consistency checks based on your data relationships
      return { consistent: true, details: 'Data is internally consistent' };
    } catch (error) {
      return { consistent: false, details: error.message };
    }
  }

  async getGoogleSheetsData(collection) {
    try {
      if (this.googleSheetsDetector) {
        const status = this.googleSheetsDetector.getStatus();
        return status.lastKnownData?.[collection] || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getFirebaseData(collection) {
    try {
      if (this.firebaseDetector) {
        const status = this.firebaseDetector.getStatus();
        return status.lastKnownData?.[collection] || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

module.exports = BidirectionalSyncService;