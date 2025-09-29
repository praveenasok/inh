/**
 * Client-side Sync Manager
 * Handles localStorage synchronization and real-time updates
 */
class ClientSyncManager {
  constructor() {
    this.isConnected = false;
    this.eventSource = null;
    this.syncStatus = {
      googleSheets: 'unknown',
      firebase: 'unknown',
      localStorage: 'unknown'
    };
    this.lastSyncTimestamps = {
      googleSheets: null,
      firebase: null,
      localStorage: null
    };
    this.changeDetectionInterval = null;
    this.localStorageKeys = [
      'fallback_salespeople',
      'fallback_price_lists',
      'fallback_products',
      'fallback_clients',
      'fallback_colors',
      'fallback_styles'
    ];
    this.localDataCache = new Map();
    this.conflictResolutionCallbacks = new Map();
  }

  /**
   * Initialize the client sync manager
   */
  async initialize() {
    try {
      // Setup Server-Sent Events connection for real-time updates
      await this.setupSSEConnection();
      
      // Initialize local storage monitoring
      this.setupLocalStorageMonitoring();
      
      // Cache current localStorage data
      this.cacheLocalStorageData();
      
      // Setup periodic sync status checks
      this.setupPeriodicStatusChecks();
      
      this.emit('sync-manager-initialized');
    } catch (error) {
      this.emit('sync-manager-error', error);
    }
  }

  /**
   * Setup Server-Sent Events connection
   */
  async setupSSEConnection() {
    try {
      this.eventSource = new EventSource('/api/sync/events');
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.emit('connection-established');
      };

      this.eventSource.onmessage = (event) => {
        this.handleServerEvent(JSON.parse(event.data));
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        this.emit('connection-error', error);
        
        // Attempt to reconnect after delay
        setTimeout(() => this.reconnectSSE(), 5000);
      };

      // Setup specific event listeners
      this.setupSSEEventListeners();
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Setup SSE event listeners for specific sync events
   */
  setupSSEEventListeners() {
    const eventTypes = [
      'firebase-change-detected',
      'localStorage-update-required',
      'data-validation-completed',
      'inconsistency-resolution-required',
      'sync-status-update'
    ];

    eventTypes.forEach(eventType => {
      this.eventSource.addEventListener(eventType, (event) => {
        const data = JSON.parse(event.data);
        this.handleSpecificEvent(eventType, data);
      });
    });
  }

  /**
   * Handle specific server events
   */
  handleSpecificEvent(eventType, data) {
    switch (eventType) {
      case 'firebase-change-detected':
        this.handleFirebaseChangeEvent(data);
        break;
      case 'localStorage-update-required':
        this.handleLocalStorageUpdateEvent(data);
        break;
      case 'data-validation-completed':
        this.handleDataValidationEvent(data);
        break;
      case 'inconsistency-resolution-required':
        this.handleInconsistencyResolutionEvent(data);
        break;
      case 'sync-status-update':
        this.handleSyncStatusUpdateEvent(data);
        break;
    }
  }

  /**
   * Handle Firebase change events
   */
  handleFirebaseChangeEvent(data) {
    const { collection, changes } = data;
    
    // Update UI indicators
    this.updateSyncStatus('firebase', 'syncing');
    
    // Emit event for UI components to handle
    this.emit('firebase-data-changed', { collection, changes });
    
    // Update sync timestamp
    this.lastSyncTimestamps.firebase = Date.now();
    this.updateSyncStatus('firebase', 'synced');
  }

  /**
   * Handle localStorage update events
   */
  async handleLocalStorageUpdateEvent(data) {
    const { collection, changes } = data;
    
    try {
      this.updateSyncStatus('localStorage', 'syncing');
      
      // Fetch latest data from Firebase and update localStorage
      await this.syncFirebaseToLocalStorage(collection);
      
      this.lastSyncTimestamps.localStorage = Date.now();
      this.updateSyncStatus('localStorage', 'synced');
      
      this.emit('localStorage-updated', { collection, changes });
    } catch (error) {
      this.updateSyncStatus('localStorage', 'error');
      this.emit('localStorage-update-error', { collection, error });
    }
  }

  /**
   * Handle data validation events
   */
  handleDataValidationEvent(data) {
    if (data.inconsistencies && data.inconsistencies.length > 0) {
      this.emit('data-inconsistencies-detected', data.inconsistencies);
      
      // Show notification to user
      this.showNotification('Data inconsistencies detected. Review sync status.', 'warning');
    } else {
      this.emit('data-validation-passed', data);
    }
  }

  /**
   * Handle inconsistency resolution events
   */
  handleInconsistencyResolutionEvent(data) {
    // Show modal or notification for user intervention
    this.showInconsistencyResolutionDialog(data);
  }

  /**
   * Handle sync status update events
   */
  handleSyncStatusUpdateEvent(data) {
    Object.assign(this.syncStatus, data);
    this.emit('sync-status-changed', this.syncStatus);
  }

  /**
   * Sync Firebase data to localStorage
   */
  async syncFirebaseToLocalStorage(collection) {
    try {
      const response = await fetch(`/api/get-data?collection=${collection}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${collection} data: ${response.statusText}`);
      }
      
      const data = await response.json();
      const storageKey = `fallback_${collection}`;
      
      // Store in localStorage with timestamp
      const storageData = {
        data: data,
        timestamp: Date.now(),
        source: 'firebase'
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      
      // Update cache
      this.localDataCache.set(storageKey, storageData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Setup localStorage monitoring for changes
   */
  setupLocalStorageMonitoring() {
    // Monitor localStorage changes
    this.changeDetectionInterval = setInterval(() => {
      this.detectLocalStorageChanges();
    }, 2000); // Check every 2 seconds

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', (event) => {
      if (this.localStorageKeys.includes(event.key)) {
        this.handleExternalLocalStorageChange(event);
      }
    });
  }

  /**
   * Detect localStorage changes
   */
  detectLocalStorageChanges() {
    for (const key of this.localStorageKeys) {
      try {
        const currentData = localStorage.getItem(key);
        const cachedData = this.localDataCache.get(key);
        
        if (currentData !== JSON.stringify(cachedData)) {
          this.handleLocalStorageChange(key, currentData);
        }
      } catch (error) {
      }
    }
  }

  /**
   * Handle localStorage changes
   */
  handleLocalStorageChange(key, newData) {
    try {
      const parsedData = newData ? JSON.parse(newData) : null;
      
      // Update cache
      this.localDataCache.set(key, parsedData);
      
      // Emit change event
      this.emit('localStorage-changed', { key, data: parsedData });
      
      // If this is a user-initiated change, propagate to Firebase
      if (parsedData && parsedData.source !== 'firebase') {
        this.propagateLocalStorageChangeToFirebase(key, parsedData);
      }
    } catch (error) {
    }
  }

  /**
   * Handle external localStorage changes (from other tabs)
   */
  handleExternalLocalStorageChange(event) {
    this.handleLocalStorageChange(event.key, event.newValue);
  }

  /**
   * Propagate localStorage changes to Firebase
   */
  async propagateLocalStorageChangeToFirebase(key, data) {
    try {
      const collection = key.replace('fallback_', '');
      
      const response = await fetch('/api/sync/localStorage-to-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collection,
          data: data.data,
          timestamp: data.timestamp
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync ${collection} to Firebase: ${response.statusText}`);
      }

      this.emit('localStorage-to-firebase-synced', { collection, data });
    } catch (error) {
      this.emit('localStorage-to-firebase-error', { key, error });
    }
  }

  /**
   * Cache current localStorage data
   */
  cacheLocalStorageData() {
    for (const key of this.localStorageKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          this.localDataCache.set(key, JSON.parse(data));
        }
      } catch (error) {
      }
    }
  }

  /**
   * Setup periodic sync status checks
   */
  setupPeriodicStatusChecks() {
    setInterval(async () => {
      await this.checkSyncStatus();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check sync status
   */
  async checkSyncStatus() {
    try {
      const response = await fetch('/api/sync/status');
      if (response.ok) {
        const status = await response.json();
        this.handleSyncStatusUpdateEvent(status);
      }
    } catch (error) {
    }
  }

  /**
   * Update sync status
   */
  updateSyncStatus(platform, status) {
    this.syncStatus[platform] = status;
    this.emit('sync-status-changed', this.syncStatus);
    
    // Update UI indicators
    this.updateSyncIndicators();
  }

  /**
   * Update sync indicators in UI
   */
  updateSyncIndicators() {
    // Update status indicators for each platform
    Object.keys(this.syncStatus).forEach(platform => {
      const indicator = document.querySelector(`#${platform}-status`);
      if (indicator) {
        indicator.className = `status-indicator ${this.syncStatus[platform]}`;
        indicator.textContent = this.syncStatus[platform].toUpperCase();
      }
    });
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // Create or update notification element
    let notification = document.getElementById('sync-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'sync-notification';
      notification.className = 'sync-notification';
      document.body.appendChild(notification);
    }
    
    notification.className = `sync-notification ${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }

  /**
   * Show inconsistency resolution dialog
   */
  showInconsistencyResolutionDialog(inconsistency) {
    // Create modal for user to resolve inconsistency
    const modal = document.createElement('div');
    modal.className = 'inconsistency-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Data Inconsistency Detected</h3>
        <p>Type: ${inconsistency.type}</p>
        <p>Google Sheets: ${inconsistency.googleSheets}</p>
        <p>Firebase: ${inconsistency.firebase}</p>
        <div class="modal-actions">
          <button onclick="clientSyncManager.resolveInconsistency('${inconsistency.type}', 'googleSheets')">
            Use Google Sheets Value
          </button>
          <button onclick="clientSyncManager.resolveInconsistency('${inconsistency.type}', 'firebase')">
            Use Firebase Value
          </button>
          <button onclick="clientSyncManager.dismissInconsistency('${inconsistency.type}')">
            Dismiss
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Resolve inconsistency with user choice
   */
  async resolveInconsistency(type, source) {
    try {
      const response = await fetch('/api/sync/resolve-inconsistency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, source })
      });

      if (response.ok) {
        this.showNotification('Inconsistency resolved successfully', 'success');
      } else {
        throw new Error('Failed to resolve inconsistency');
      }
    } catch (error) {
      this.showNotification('Failed to resolve inconsistency', 'error');
    }
    
    // Remove modal
    this.dismissInconsistency(type);
  }

  /**
   * Dismiss inconsistency dialog
   */
  dismissInconsistency(type) {
    const modal = document.querySelector('.inconsistency-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Reconnect SSE connection
   */
  reconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.setupSSEConnection();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
    }
    
    window.removeEventListener('storage', this.handleExternalLocalStorageChange);
  }

  /**
   * Event emitter functionality
   */
  emit(eventName, data) {
    const event = new CustomEvent(`sync-manager-${eventName}`, { detail: data });
    document.dispatchEvent(event);
  }

  /**
   * Event listener functionality
   */
  on(eventName, callback) {
    document.addEventListener(`sync-manager-${eventName}`, (event) => {
      callback(event.detail);
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    return {
      isConnected: this.isConnected,
      syncStatus: this.syncStatus,
      lastSyncTimestamps: this.lastSyncTimestamps
    };
  }
}

// Global instance
window.clientSyncManager = new ClientSyncManager();