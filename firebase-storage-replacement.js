// Firebase Storage Replacement System
// Completely replaces localStorage functionality with Firebase Firestore

class FirebaseStorageReplacement {
  constructor() {
    this.firebaseDB = window.firebaseDB;
    this.cache = new Map();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
  }

  // Initialize the storage replacement system
  async initialize() {
    try {
      if (!this.firebaseDB || !this.firebaseDB.isAvailable()) {
        console.warn('Firebase not available, using memory cache only');
        return false;
      }

      // Sync any pending data from localStorage to Firebase
      await this.migrateLocalStorageToFirebase();
      
      // Enable real-time synchronization
      this.firebaseDB.enableRealTimeSync();
      
      console.log('Firebase Storage Replacement initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Firebase Storage Replacement:', error);
      return false;
    }
  }

  // Set data (replaces localStorage.setItem)
  async setItem(key, value, options = {}) {
    try {
      const data = {
        key: key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        dataType: typeof value,
        timestamp: Date.now(),
        ...options
      };

      // Store in cache immediately
      this.cache.set(key, data);

      // Try to store in Firebase if available, but fall back to localStorage on permission errors
      if (this.firebaseDB && this.firebaseDB.isAvailable() && this.isOnline) {
        try {
          await this.firebaseDB.saveAllData('storage', data, {
            deviceId: this.getDeviceId(),
            sessionId: this.getSessionId()
          });
          console.log(`Data saved to Firebase: ${key}`);
        } catch (firebaseError) {
          if (firebaseError.code === 'permission-denied' || firebaseError.message.includes('insufficient permissions')) {
            console.warn(`Firebase permission denied for ${key}, falling back to localStorage`);
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          } else {
            throw firebaseError;
          }
        }
      } else {
        // Fallback to localStorage when Firebase is not available
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        console.log(`Data saved to localStorage: ${key}`);
      }

      return true;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      // Final fallback to localStorage
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      } catch (localStorageError) {
        console.error(`Failed to save to localStorage as well:`, localStorageError);
        throw error;
      }
    }
  }

  // Get data (replaces localStorage.getItem)
  async getItem(key, options = {}) {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        const cachedData = this.cache.get(key);
        return this.parseStoredValue(cachedData.value, cachedData.dataType);
      }

      // Try to fetch from Firebase if available, but fall back to localStorage on permission errors
      if (this.firebaseDB && this.firebaseDB.isAvailable()) {
        try {
          const firebaseData = await this.firebaseDB.getAllData('storage', {
            key: key,
            deviceId: options.deviceId || this.getDeviceId()
          });

          if (firebaseData && firebaseData.length > 0) {
            // Get the most recent entry
            const latestData = firebaseData.sort((a, b) => b.timestamp - a.timestamp)[0];
            
            // Update cache
            this.cache.set(key, latestData);

            return this.parseStoredValue(latestData.value, latestData.dataType);
          }
        } catch (firebaseError) {
          if (firebaseError.code === 'permission-denied' || firebaseError.message.includes('insufficient permissions')) {
            console.warn(`Firebase permission denied for ${key}, falling back to localStorage`);
            const localValue = localStorage.getItem(key);
            return localValue;
          } else {
            throw firebaseError;
          }
        }
      }

      // Fallback to localStorage when Firebase is not available or no data found
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        // Migrate to Firebase if possible
        try {
          await this.setItem(key, localValue);
        } catch (migrationError) {
          console.warn(`Could not migrate ${key} to Firebase:`, migrationError);
        }
        return localValue;
      }

      return null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      // Final fallback to localStorage
       try {
         return localStorage.getItem(key);
       } catch (localStorageError) {
         console.error(`Failed to get from localStorage as well:`, localStorageError);
         return null;
       }
    }
  }

  // Remove data (replaces localStorage.removeItem)
  async removeItem(key) {
    try {
      // Remove from cache
      this.cache.delete(key);

      // Remove from Firebase if available
      if (this.firebaseDB && this.firebaseDB.isAvailable() && this.isOnline) {
        const firebaseData = await this.firebaseDB.getAllData('storage', { key: key });
        
        for (const item of firebaseData) {
          await this.firebaseDB.deleteAllData('storage', item.id);
        }
        
        console.log(`Data removed from Firebase: ${key}`);
      } else {
        // Queue for later sync if offline
        this.syncQueue.push({ action: 'remove', key });
      }

      // Also remove from localStorage for cleanup
      localStorage.removeItem(key);
      
      return true;
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  // Clear all data (replaces localStorage.clear)
  async clear() {
    try {
      // Clear cache
      this.cache.clear();

      // Clear Firebase storage collection if available
      if (this.firebaseDB && this.firebaseDB.isAvailable() && this.isOnline) {
        const allData = await this.firebaseDB.getAllData('storage');
        
        for (const item of allData) {
          await this.firebaseDB.deleteAllData('storage', item.id);
        }
        
        console.log('All Firebase storage data cleared');
      }

      // Clear localStorage for cleanup
      localStorage.clear();
      
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Get all keys (replaces localStorage.key iteration)
  async getAllKeys() {
    try {
      const keys = new Set();

      // Add cache keys
      for (const key of this.cache.keys()) {
        keys.add(key);
      }

      // Add Firebase keys if available
      if (this.firebaseDB && this.firebaseDB.isAvailable()) {
        const firebaseData = await this.firebaseDB.getAllData('storage');
        firebaseData.forEach(item => keys.add(item.key));
      }

      return Array.from(keys);
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // Migrate existing localStorage data to Firebase
  async migrateLocalStorageToFirebase() {
    try {
      const localStorageKeys = Object.keys(localStorage);
      
      if (localStorageKeys.length === 0) {
        console.log('No localStorage data to migrate');
        return;
      }

      console.log(`Migrating ${localStorageKeys.length} items from localStorage to Firebase`);
      
      for (const key of localStorageKeys) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          await this.setItem(key, value, { migrated: true });
        }
      }

      console.log('localStorage migration completed');
    } catch (error) {
      console.error('Error migrating localStorage to Firebase:', error);
    }
  }

  // Sync queued operations when coming back online
  async syncQueuedOperations() {
    if (!this.firebaseDB || !this.firebaseDB.isAvailable() || !this.isOnline) {
      return;
    }

    console.log(`Syncing ${this.syncQueue.length} queued operations`);
    
    const operations = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of operations) {
      try {
        if (operation.action === 'set') {
          await this.firebaseDB.saveAllData('storage', operation.data);
        } else if (operation.action === 'remove') {
          const firebaseData = await this.firebaseDB.getAllData('storage', { key: operation.key });
          for (const item of firebaseData) {
            await this.firebaseDB.deleteAllData('storage', item.id);
          }
        }
      } catch (error) {
        console.error('Error syncing operation:', operation, error);
        // Re-queue failed operations
        this.syncQueue.push(operation);
      }
    }

    console.log('Sync completed');
  }

  // Setup event listeners for online/offline detection
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing queued operations');
      this.isOnline = true;
      this.syncQueuedOperations();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, operations will be queued');
      this.isOnline = false;
    });

    // Listen for Firebase data changes
    document.addEventListener('firebaseDataChange', (event) => {
      const { dataType, operation, data } = event.detail;
      if (dataType === 'storage') {
        this.handleFirebaseDataChange(operation, data);
      }
    });
  }

  // Handle real-time Firebase data changes
  handleFirebaseDataChange(operation, data) {
    if (operation === 'create' || operation === 'update') {
      this.cache.set(data.key, data);
    } else if (operation === 'delete') {
      this.cache.delete(data.key);
    }

    // Emit custom event for application to handle
    const event = new CustomEvent('storageChange', {
      detail: { operation, key: data.key, data }
    });
    document.dispatchEvent(event);
  }

  // Helper methods
  parseStoredValue(value, dataType) {
    if (dataType === 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  // Validation and consistency checks
  async validateDataConsistency() {
    try {
      const cacheKeys = Array.from(this.cache.keys());
      const firebaseData = await this.firebaseDB.getAllData('storage');
      const firebaseKeys = firebaseData.map(item => item.key);
      
      const inconsistencies = {
        missingInFirebase: cacheKeys.filter(key => !firebaseKeys.includes(key)),
        missingInCache: firebaseKeys.filter(key => !cacheKeys.includes(key)),
        conflicts: []
      };

      // Check for data conflicts
      for (const key of cacheKeys) {
        if (firebaseKeys.includes(key)) {
          const cacheData = this.cache.get(key);
          const firebaseItem = firebaseData.find(item => item.key === key);
          
          if (cacheData.value !== firebaseItem.value) {
            inconsistencies.conflicts.push({
              key,
              cache: cacheData,
              firebase: firebaseItem
            });
          }
        }
      }

      return inconsistencies;
    } catch (error) {
      console.error('Error validating data consistency:', error);
      throw error;
    }
  }
}

// Initialize the Firebase Storage Replacement system
window.firebaseStorage = new FirebaseStorageReplacement();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.firebaseStorage.initialize();
    console.log('Firebase Storage Replacement system ready');
  } catch (error) {
    console.error('Failed to initialize Firebase Storage Replacement:', error);
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseStorageReplacement;
}