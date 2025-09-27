/**
 * Firebase API Adapter
 * Replaces direct Firebase client calls with server API endpoints
 * This allows the client to work with service account authentication on the server
 */

class FirebaseAPIAdapter {
    constructor() {
        this.baseURL = window.location.origin;
        this.isInitialized = false;
        this.cache = new Map();
        this.listeners = new Map();
        this.pollIntervals = new Map();
    }

    /**
     * Initialize the adapter with retry mechanism
     */
    async initialize(maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Initializing Firebase API Adapter (attempt ${attempt}/${maxRetries})...`);
                
                const response = await this.fetchWithTimeout(`${this.baseURL}/api/status`, {}, 10000);
                
                if (response.ok) {
                    this.isInitialized = true;
                    console.log('✅ Firebase API Adapter initialized successfully');
                    return true;
                }
                
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Initialization attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ Failed to initialize Firebase API Adapter after all retries:', error);
                    this.isInitialized = false;
                    throw new Error(`Firebase API initialization failed: ${this.getErrorMessage(error)}`);
                }
            }
        }
    }

    /**
     * Fetch with timeout support
     */
    async fetchWithTimeout(url, options = {}, timeout = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('timeout')) {
            return 'Connection timeout. Please check your internet connection and try again.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return 'Network connection failed. Please check your internet connection.';
        } else if (error.message.includes('500')) {
            return 'Server error. Please try again later.';
        } else if (error.message.includes('404')) {
            return 'Service not found. Please contact support.';
        } else if (error.message.includes('403') || error.message.includes('401')) {
            return 'Access denied. Please check your permissions.';
        } else {
            return error.message || 'Unknown error occurred';
        }
    }

    /**
     * Check if adapter is available
     */
    isAvailable() {
        return this.isInitialized;
    }

    /**
     * Get data from server API with retry mechanism
     */
    async getData(endpoint, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Fetching data from ${endpoint} (attempt ${attempt}/${maxRetries})...`);
                
                const response = await this.fetchWithTimeout(`${this.baseURL}/api/${endpoint}`, {}, 15000);
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const data = await response.json();
                console.log(`✅ Successfully fetched data from ${endpoint}`);
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Fetch attempt ${attempt} failed for ${endpoint}:`, error.message);
                
                if (attempt < maxRetries && this.isRetryableError(error)) {
                    const delay = Math.min(1000 * attempt, 3000); // Linear backoff, max 3s
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`❌ Failed to fetch data from ${endpoint} after all retries:`, error);
                    throw new Error(`Data fetch failed: ${this.getErrorMessage(error)}`);
                }
            }
        }
    }

    /**
     * Post data to server API with retry mechanism
     */
    async postData(endpoint, data, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Posting data to ${endpoint} (attempt ${attempt}/${maxRetries})...`);
                
                const response = await this.fetchWithTimeout(`${this.baseURL}/api/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                }, 20000);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log(`✅ Successfully posted data to ${endpoint}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Post attempt ${attempt} failed for ${endpoint}:`, error.message);
                
                if (attempt < maxRetries && this.isRetryableError(error)) {
                    const delay = Math.min(1000 * attempt, 3000); // Linear backoff, max 3s
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`❌ Failed to post data to ${endpoint} after all retries:`, error);
                    throw new Error(`Data post failed: ${this.getErrorMessage(error)}`);
                }
            }
        }
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'timeout',
            'Failed to fetch',
            'NetworkError',
            'HTTP 500',
            'HTTP 502',
            'HTTP 503',
            'HTTP 504'
        ];
        
        return retryableErrors.some(retryableError => 
            error.message.includes(retryableError)
        );
    }

    /**
     * Simulate Firebase collection.get() method
     */
    async collection(collectionName) {
        return {
            get: async () => {
                const data = await this.getData(`get-data?collection=${collectionName}`);
                return {
                    docs: data.map(item => ({
                        id: item.id,
                        data: () => item,
                        exists: true
                    })),
                    size: data.length,
                    empty: data.length === 0
                };
            },
            
            add: async (docData) => {
                const result = await this.postData('save-data', {
                    collection: collectionName,
                    data: docData
                });
                return {
                    id: result.id
                };
            },

            doc: (docId) => ({
                get: async () => {
                    const data = await this.getData(`get-data?collection=${collectionName}&id=${docId}`);
                    return {
                        id: docId,
                        data: () => data,
                        exists: !!data
                    };
                },
                
                set: async (docData, options = {}) => {
                    return await this.postData('save-data', {
                        collection: collectionName,
                        id: docId,
                        data: docData,
                        merge: options.merge || false
                    });
                },
                
                update: async (updates) => {
                    return await this.postData('save-data', {
                        collection: collectionName,
                        id: docId,
                        data: updates,
                        merge: true
                    });
                },
                
                delete: async () => {
                    return await this.postData('delete-data', {
                        collection: collectionName,
                        id: docId
                    });
                }
            }),

            // Simulate real-time listener with polling
            onSnapshot: (callback, errorCallback) => {
                const listenerId = `${collectionName}_${Date.now()}`;
                
                const pollData = async () => {
                    try {
                        const data = await this.getData(`get-data?collection=${collectionName}`);
                        const snapshot = {
                            docs: data.map(item => ({
                                id: item.id,
                                data: () => item
                            })),
                            size: data.length,
                            empty: data.length === 0,
                            forEach: (fn) => {
                                data.forEach((item, index) => {
                                    fn({
                                        id: item.id,
                                        data: () => item
                                    });
                                });
                            }
                        };
                        callback(snapshot);
                    } catch (error) {
                        if (errorCallback) {
                            errorCallback(error);
                        }
                    }
                };

                // Initial call
                pollData();
                
                // Set up polling interval (every 5 seconds)
                const intervalId = setInterval(pollData, 5000);
                this.pollIntervals.set(listenerId, intervalId);
                
                // Return unsubscribe function
                return () => {
                    const interval = this.pollIntervals.get(listenerId);
                    if (interval) {
                        clearInterval(interval);
                        this.pollIntervals.delete(listenerId);
                    }
                };
            }
        };
    }

    /**
     * Get styles data (specific endpoint)
     */
    async getStyles() {
        try {
            const data = await this.getData('get-styles');
            return data;
        } catch (error) {
            console.error('❌ Failed to get styles:', error);
            return [];
        }
    }

    /**
     * Trigger manual sync
     */
    async triggerSync(options = {}) {
        try {
            const result = await this.postData('sync/manual', options);
            return result;
        } catch (error) {
            console.error('❌ Failed to trigger sync:', error);
            throw error;
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus() {
        try {
            const data = await this.getData('sync/status');
            return data.status;
        } catch (error) {
            console.error('❌ Failed to get sync status:', error);
            return null;
        }
    }

    /**
     * Get sync logs
     */
    async getSyncLogs() {
        try {
            const data = await this.getData('sync/logs');
            return data.logs;
        } catch (error) {
            console.error('❌ Failed to get sync logs:', error);
            return [];
        }
    }

    /**
     * Sync specific data types
     */
    async syncProducts() {
        return await this.postData('sync/products', {});
    }

    async syncSalesmen() {
        return await this.postData('sync/salesmen', {});
    }

    async syncCompanies() {
        return await this.postData('sync/companies', {});
    }

    /**
     * Clear all data
     */
    async clearData() {
        return await this.postData('clear-data', {});
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Clear all polling intervals
        this.pollIntervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.pollIntervals.clear();
        this.listeners.clear();
        this.cache.clear();
    }
}

// Create global instance
window.firebaseAPIAdapter = new FirebaseAPIAdapter();

// Compatibility layer - replace Firebase methods with API adapter
window.createFirebaseCompatibilityLayer = function() {
    if (!window.firebase) {
        window.firebase = {};
    }

    // Mock Firebase app
    if (!window.firebase.app) {
        window.firebase.app = () => ({
            name: 'api-adapter',
            options: {}
        });
    }

    // Mock Firebase apps array
    if (!window.firebase.apps) {
        window.firebase.apps = [window.firebase.app()];
    }

    // Mock Firestore
    if (!window.firebase.firestore) {
        window.firebase.firestore = () => ({
            collection: (name) => window.firebaseAPIAdapter.collection(name),
            doc: (path) => {
                const parts = path.split('/');
                if (parts.length === 2) {
                    return window.firebaseAPIAdapter.collection(parts[0]).doc(parts[1]);
                }
                throw new Error('Complex document paths not supported in API adapter');
            }
        });
    }

    // Mock Auth (minimal implementation)
    if (!window.firebase.auth) {
        window.firebase.auth = () => ({
            currentUser: null,
            onAuthStateChanged: (callback) => {
                // Simulate anonymous user for compatibility
                setTimeout(() => callback({ uid: 'api-adapter-user', isAnonymous: true }), 100);
                return () => {}; // unsubscribe function
            },
            signInAnonymously: async () => ({ user: { uid: 'api-adapter-user', isAnonymous: true } }),
            signOut: async () => {}
        });
    }

    console.log('✅ Firebase compatibility layer created using API adapter');
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.firebaseAPIAdapter.initialize();
            window.createFirebaseCompatibilityLayer();
        } catch (error) {
            console.warn('⚠️ Firebase API Adapter initialization failed, falling back to direct Firebase');
        }
    });
} else {
    // DOM already loaded
    setTimeout(async () => {
        try {
            await window.firebaseAPIAdapter.initialize();
            window.createFirebaseCompatibilityLayer();
        } catch (error) {
            console.warn('⚠️ Firebase API Adapter initialization failed, falling back to direct Firebase');
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseAPIAdapter;
}