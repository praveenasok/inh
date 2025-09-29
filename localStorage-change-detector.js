class LocalStorageChangeDetector {
    constructor(config = {}) {
        this.config = {
            pollIntervalMs: config.pollIntervalMs || 5000, // 5 seconds default
            storageKeys: config.storageKeys || [
                'fallback_salespeople',
                'fallback_price_lists',
                'salespeople',
                'price_lists'
            ],
            ...config
        };
        
        this.isInitialized = false;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastKnownData = new Map();
        this.eventListeners = new Map();
        this.mutationObserver = null;
        this.storageEventListener = null;
    }

    initialize() {
        try {
            
            // Load initial data
            this.loadInitialData();
            
            // Setup storage event listener for cross-tab changes
            this.setupStorageEventListener();
            
            // Setup mutation observer for DOM changes that might affect localStorage
            this.setupMutationObserver();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            return true;
        } catch (error) {
            this.emit('error', error);
            return false;
        }
    }

    loadInitialData() {
        this.config.storageKeys.forEach(key => {
            try {
                const data = this.getStorageData(key);
                this.lastKnownData.set(key, {
                    data: data,
                    checksum: this.calculateChecksum(data),
                    lastModified: Date.now(),
                    size: this.calculateDataSize(data)
                });
            } catch (error) {
                this.lastKnownData.set(key, {
                    data: null,
                    checksum: null,
                    lastModified: Date.now(),
                    size: 0
                });
            }
        });

            keys: Array.from(this.lastKnownData.keys()),
            totalSize: this.getTotalStorageSize()
        });
    }

    setupStorageEventListener() {
        this.storageEventListener = (event) => {
            if (this.config.storageKeys.includes(event.key)) {
                this.handleStorageChange(event.key, event.newValue, event.oldValue);
            }
        };

        window.addEventListener('storage', this.storageEventListener);
    }

    setupMutationObserver() {
        // Monitor DOM changes that might indicate localStorage modifications
        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                // Check for script additions or modifications that might affect localStorage
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT' || 
                            (node.nodeType === Node.ELEMENT_NODE && node.querySelector('script'))) {
                            shouldCheck = true;
                        }
                    });
                }
            });

            if (shouldCheck) {
                // Debounce the check to avoid excessive polling
                clearTimeout(this.mutationCheckTimeout);
                this.mutationCheckTimeout = setTimeout(() => {
                    this.checkForChanges();
                }, 1000);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    startPolling() {
        if (this.isPolling || !this.isInitialized) {
            return;
        }

        this.isPolling = true;
        
        this.pollingInterval = setInterval(() => {
            this.checkForChanges();
        }, this.config.pollIntervalMs);

        this.emit('polling-started');
    }

    stopPolling() {
        if (!this.isPolling) {
            return;
        }

        this.isPolling = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.emit('polling-stopped');
    }

    checkForChanges() {
        if (!this.isInitialized) {
            return;
        }

        this.config.storageKeys.forEach(key => {
            this.checkKeyForChanges(key);
        });
    }

    checkKeyForChanges(key) {
        try {
            const currentData = this.getStorageData(key);
            const lastKnown = this.lastKnownData.get(key);

            if (!lastKnown) {
                // First time checking this key
                this.lastKnownData.set(key, {
                    data: currentData,
                    checksum: this.calculateChecksum(currentData),
                    lastModified: Date.now(),
                    size: this.calculateDataSize(currentData)
                });
                return;
            }

            const currentChecksum = this.calculateChecksum(currentData);
            const currentSize = this.calculateDataSize(currentData);
            
            // Check for changes
            if (currentChecksum !== lastKnown.checksum || currentSize !== lastKnown.size) {
                    oldChecksum: lastKnown.checksum,
                    newChecksum: currentChecksum,
                    oldSize: lastKnown.size,
                    newSize: currentSize
                });

                const changeDetails = this.analyzeChanges(key, lastKnown.data, currentData);
                
                this.lastKnownData.set(key, {
                    data: currentData,
                    checksum: currentChecksum,
                    lastModified: Date.now(),
                    size: currentSize
                });

                this.emit('data-changed', {
                    key,
                    type: this.getDataType(key),
                    oldData: lastKnown.data,
                    newData: currentData,
                    changes: changeDetails,
                    timestamp: Date.now()
                });

                // Emit specific events based on data type
                const dataType = this.getDataType(key);
                if (dataType) {
                    this.emit(`${dataType}-changed`, {
                        key,
                        type: dataType,
                        oldData: lastKnown.data,
                        newData: currentData,
                        changes: changeDetails,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    handleStorageChange(key, newValue, oldValue) {
        try {
            const newData = newValue ? JSON.parse(newValue) : null;
            const oldData = oldValue ? JSON.parse(oldValue) : null;
            
            const changeDetails = this.analyzeChanges(key, oldData, newData);
            
            this.lastKnownData.set(key, {
                data: newData,
                checksum: this.calculateChecksum(newData),
                lastModified: Date.now(),
                size: this.calculateDataSize(newData)
            });

            this.emit('storage-event-changed', {
                key,
                type: this.getDataType(key),
                oldData: oldData,
                newData: newData,
                changes: changeDetails,
                timestamp: Date.now(),
                source: 'storage-event'
            });

            // Emit specific events based on data type
            const dataType = this.getDataType(key);
            if (dataType) {
                this.emit(`${dataType}-changed`, {
                    key,
                    type: dataType,
                    oldData: oldData,
                    newData: newData,
                    changes: changeDetails,
                    timestamp: Date.now(),
                    source: 'storage-event'
                });
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    getStorageData(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            return null;
        }
    }

    getDataType(key) {
        if (key.includes('salespeople') || key.includes('salesman')) {
            return 'salesmen';
        } else if (key.includes('price_lists') || key.includes('pricelist')) {
            return 'priceLists';
        }
        return null;
    }

    analyzeChanges(key, oldData, newData) {
        const changes = {
            type: 'data-change',
            key: key,
            hasData: {
                old: oldData !== null,
                new: newData !== null
            },
            summary: {
                dataAdded: oldData === null && newData !== null,
                dataRemoved: oldData !== null && newData === null,
                dataModified: oldData !== null && newData !== null,
                sizeChange: 0,
                countChange: 0
            }
        };

        // Calculate size changes
        const oldSize = this.calculateDataSize(oldData);
        const newSize = this.calculateDataSize(newData);
        changes.summary.sizeChange = newSize - oldSize;

        // For array data, calculate count changes
        if (oldData && Array.isArray(oldData.data) && newData && Array.isArray(newData.data)) {
            changes.summary.countChange = newData.data.length - oldData.data.length;
            changes.counts = {
                old: oldData.data.length,
                new: newData.data.length
            };
        } else if (oldData && Array.isArray(oldData) && newData && Array.isArray(newData)) {
            changes.summary.countChange = newData.length - oldData.length;
            changes.counts = {
                old: oldData.length,
                new: newData.length
            };
        }

        return changes;
    }

    calculateChecksum(data) {
        if (!data) return null;
        
        try {
            const dataString = JSON.stringify(data, Object.keys(data).sort());
            
            // Simple hash function for browser compatibility
            let hash = 0;
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch (error) {
            return null;
        }
    }

    calculateDataSize(data) {
        if (!data) return 0;
        
        try {
            return JSON.stringify(data).length;
        } catch (error) {
            return 0;
        }
    }

    getTotalStorageSize() {
        let totalSize = 0;
        this.lastKnownData.forEach(item => {
            totalSize += item.size;
        });
        return totalSize;
    }

    updateLocalStorage(key, data) {
        try {
            if (data === null || data === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(data));
                    size: this.calculateDataSize(data)
                });
            }

            // Update our cache
            this.lastKnownData.set(key, {
                data: data,
                checksum: this.calculateChecksum(data),
                lastModified: Date.now(),
                size: this.calculateDataSize(data)
            });

            this.emit('data-updated', {
                key,
                data,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            this.emit('error', error);
            return false;
        }
    }

    getStatus() {
        const status = {
            isInitialized: this.isInitialized,
            isPolling: this.isPolling,
            pollIntervalMs: this.config.pollIntervalMs,
            monitoredKeys: this.config.storageKeys,
            totalStorageSize: this.getTotalStorageSize(),
            keyStatuses: {}
        };

        this.lastKnownData.forEach((value, key) => {
            status.keyStatuses[key] = {
                hasData: value.data !== null,
                size: value.size,
                lastModified: value.lastModified,
                checksum: value.checksum
            };
        });

        return status;
    }

    forceRefresh() {
        this.loadInitialData();
        this.emit('force-refreshed');
    }

    cleanup() {
        
        this.stopPolling();
        
        // Remove storage event listener
        if (this.storageEventListener) {
            window.removeEventListener('storage', this.storageEventListener);
            this.storageEventListener = null;
        }
        
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        // Clear timeouts
        if (this.mutationCheckTimeout) {
            clearTimeout(this.mutationCheckTimeout);
        }
        
        this.removeAllListeners();
        this.lastKnownData.clear();
        this.isInitialized = false;
    }

    // Event emitter methods
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                }
            });
        }
    }

    removeAllListeners() {
        this.eventListeners.clear();
    }

    removeListener(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageChangeDetector;
} else if (typeof window !== 'undefined') {
    window.LocalStorageChangeDetector = LocalStorageChangeDetector;
}