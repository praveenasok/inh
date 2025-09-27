/**
 * Fallback Detection System
 * Implements fallback-first strategy for non-admin pages, Firebase monitoring for admin pages
 * Features: Fallback-first mode, admin-only Firebase sync, connection monitoring, status reporting
 */

class FallbackDetector {
    constructor() {
        // Determine page type and set strategy
        this.isAdminPage = this._isAdminPage();
        this.fallbackFirstMode = !this.isAdminPage;
        
        // Firebase availability (only relevant for admin pages)
        this.isFirebaseAvailable = this.isAdminPage ? true : false; // Force fallback for non-admin
        this.isMonitoring = false;
        this.checkInterval = null;
        this.checkIntervalMs = this.isAdminPage ? 30000 : 300000; // Less frequent checks for non-admin
        this.timeoutMs = 10000; // 10 second timeout for Firebase operations
        this.consecutiveFailures = 0;
        this.maxFailuresBeforeFallback = this.isAdminPage ? 2 : 0; // Immediate fallback for non-admin
        this.lastSuccessfulCheck = null;
        this.lastFailureReason = null;
        this.isInitialized = false;
        this.isInitializing = false;
        
        // Lazy loading optimization
        this.initializationPromise = null;
        this.deferredChecks = [];
        
        // Enhanced error tracking
        this.errorHistory = [];
        this.maxErrorHistory = 50;
        this.circuitBreakerState = 'closed'; // closed, open, half-open
        this.circuitBreakerTimeout = 60000; // 1 minute
        this.lastCircuitBreakerOpen = null;
        
        // Recovery tracking
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 5;
        this.recoveryBackoffMs = 5000; // Start with 5 seconds
        this.maxRecoveryBackoffMs = 300000; // Max 5 minutes
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Performance optimizations
        this.checkQueue = new Set();
        this.batchCheckDelay = 100; // Batch checks within 100ms
        this.lastBatchCheck = 0;
        
        // Status tracking
        this.status = {
            firebase: this.isAdminPage ? 'unknown' : 'disabled',
            fallback: 'unknown',
            currentSource: this.fallbackFirstMode ? 'fallback' : 'firebase',
            lastCheck: null,
            uptime: 0,
            circuitBreaker: this.isAdminPage ? 'closed' : 'disabled',
            errorRate: 0,
            recoveryMode: false,
            initialized: false,
            mode: this.fallbackFirstMode ? 'fallback-first' : 'admin',
            pageType: this.isAdminPage ? 'admin' : 'application'
        };
        
        // Defer initialization to first use
        this.deferredInitialize();
    }
    
    /**
     * Detect if current page is admin panel
     */
    _isAdminPage() {
        if (typeof window === 'undefined') return false;
        
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || '';
        
        return currentFile === 'admin-panel.html' || 
               currentFile === 'admin-sync-interface.html' ||
               currentPath.includes('admin');
    }
    
    // Deferred initialization - only sets up the promise
    deferredInitialize() {
        this.initializationPromise = null;
    }
    
    // Lazy initialization - called on first Firebase check
    async ensureInitialized() {
        if (this.isInitialized) {
            return;
        }
        
        if (this.isInitializing) {
            return this.initializationPromise;
        }
        
        this.isInitializing = true;
        this.initializationPromise = this.initialize();
        
        try {
            await this.initializationPromise;
        } finally {
            this.isInitializing = false;
        }
        
        return this.initializationPromise;
    }

    async initialize() {
        try {
            console.log(`🔄 Initializing Fallback Detector (${this.fallbackFirstMode ? 'Fallback-First Mode' : 'Admin Mode'})...`);
            
            if (this.isAdminPage) {
                // Initial Firebase availability check for admin pages
                await this.checkFirebaseAvailability();
                
                // Start periodic checks
                this.startPeriodicChecks();
            } else {
                // For non-admin pages, skip Firebase checks and use fallback
                console.log('📦 Non-admin page detected, using fallback-first strategy');
                this.updateStatus({
                    firebase: 'disabled',
                    fallback: 'active',
                    currentSource: 'fallback'
                });
            }
            
            this.isInitialized = true;
            this.status.initialized = true;
            
            console.log('✅ Fallback Detector initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Fallback Detector:', error);
            // Continue with fallback mode
            this.isFirebaseAvailable = false;
            this.status.firebase = false;
            this.status.initialized = true; // Mark as initialized even if Firebase is unavailable
        }
    }
    
    // ==================== FIREBASE AVAILABILITY CHECKING ====================
    
    async checkFirebaseAvailability() {
        try {
            const startTime = Date.now();
            
            // Test Firebase connection with timeout
            const isAvailable = await Promise.race([
                this.testFirebaseConnection(),
                this.createTimeout(this.timeoutMs)
            ]);
            
            const responseTime = Date.now() - startTime;
            
            if (isAvailable) {
                this.handleFirebaseSuccess(responseTime);
            } else {
                this.handleFirebaseFailure('connection_test_failed', 'Firebase connection test returned false');
            }
            
            return isAvailable;
            
        } catch (error) {
            this.handleFirebaseFailure('connection_error', error.message);
            return false;
        }
    }
    
    async testFirebaseConnection() {
        try {
            // Test if Firebase is available by checking if we can access the database
            if (typeof firebase === 'undefined' || !firebase.database) {
                return false;
            }
            
            // Try to get a reference and test connectivity
            const testRef = firebase.database().ref('.info/connected');
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 5000);
                
                testRef.once('value', (snapshot) => {
                    clearTimeout(timeout);
                    resolve(snapshot.val() === true);
                }, (error) => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });
            
        } catch (error) {
            console.error('Firebase connection test error:', error);
            return false;
        }
    }
    
    createTimeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
        });
    }
    
    // ==================== SUCCESS/FAILURE HANDLING ====================
    
    handleFirebaseSuccess(responseTime) {
        const wasUnavailable = !this.isFirebaseAvailable;
        const wasInRecovery = this.status.recoveryMode;
        
        this.isFirebaseAvailable = true;
        this.consecutiveFailures = 0;
        this.lastSuccessfulCheck = new Date().toISOString();
        this.lastFailureReason = null;
        
        // Handle circuit breaker recovery
        if (this.circuitBreakerState === 'half-open') {
            this.circuitBreakerState = 'closed';
            console.log('Circuit breaker closed - Firebase connection stable');
            this.emit('circuitBreakerClosed', { responseTime, timestamp: Date.now() });
        } else if (this.circuitBreakerState === 'open') {
            // Direct recovery from open state (shouldn't happen normally)
            this.circuitBreakerState = 'closed';
            console.log('Circuit breaker force-closed due to successful connection');
        }
        
        // Reset recovery tracking
        if (wasInRecovery) {
            this.recoveryAttempts = 0;
        }
        
        this.updateStatus({
            firebase: 'available',
            currentSource: 'firebase',
            lastCheck: new Date().toISOString(),
            responseTime: responseTime,
            circuitBreaker: this.circuitBreakerState,
            errorRate: 0,
            recoveryMode: false
        });
        
        if (wasUnavailable) {
            const downtime = this.calculateDowntime();
            console.log(`Firebase connection restored after ${Math.round(downtime / 1000)}s downtime`);
            
            this.emit('firebaseRestored', {
                responseTime: responseTime,
                downtime: downtime,
                recoveryAttempts: this.recoveryAttempts,
                wasInRecovery: wasInRecovery
            });
            
            // Trigger data sync from Firebase to local storage
            this.syncFromFirebaseToLocal();
        }
        
        this.emit('firebaseAvailable', { 
            responseTime,
            circuitBreakerState: this.circuitBreakerState,
            wasInRecovery: wasInRecovery
        });
    }
    
    handleFirebaseFailure(reason, details) {
        this.consecutiveFailures++;
        const errorEntry = { 
            reason, 
            details, 
            timestamp: new Date().toISOString(),
            consecutiveFailures: this.consecutiveFailures
        };
        
        this.lastFailureReason = errorEntry;
        
        // Add to error history
        this.errorHistory.push(errorEntry);
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
        
        // Calculate error rate (errors in last 10 minutes)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const recentErrors = this.errorHistory.filter(error => 
            new Date(error.timestamp).getTime() > tenMinutesAgo
        );
        const errorRate = recentErrors.length / 10; // errors per minute
        
        // Circuit breaker logic
        this.updateCircuitBreaker(errorRate);
        
        const shouldFallback = this.consecutiveFailures >= this.maxFailuresBeforeFallback;
        
        if (shouldFallback && this.isFirebaseAvailable) {
            this.isFirebaseAvailable = false;
            
            this.updateStatus({
                firebase: 'unavailable',
                currentSource: 'fallback',
                lastCheck: new Date().toISOString(),
                failureReason: reason,
                errorRate: errorRate,
                recoveryMode: true
            });
            
            console.warn('Firebase unavailable, switching to fallback data:', reason);
            this.emit('firebaseUnavailable', {
                reason: reason,
                details: details,
                consecutiveFailures: this.consecutiveFailures,
                errorRate: errorRate,
                circuitBreakerState: this.circuitBreakerState
            });
            
            // Ensure local fallback data is available
            this.validateFallbackData();
            
            // Start recovery process
            this.startRecoveryProcess();
        }
        
        this.updateStatus({
            lastCheck: new Date().toISOString(),
            consecutiveFailures: this.consecutiveFailures,
            errorRate: errorRate
        });
    }
    
    updateCircuitBreaker(errorRate) {
        const now = Date.now();
        
        switch (this.circuitBreakerState) {
            case 'closed':
                if (errorRate > 3) { // More than 3 errors per minute
                    this.circuitBreakerState = 'open';
                    this.lastCircuitBreakerOpen = now;
                    this.updateStatus({ circuitBreaker: 'open' });
                    console.warn('Circuit breaker opened due to high error rate:', errorRate);
                    this.emit('circuitBreakerOpened', { errorRate, timestamp: now });
                }
                break;
                
            case 'open':
                if (now - this.lastCircuitBreakerOpen > this.circuitBreakerTimeout) {
                    this.circuitBreakerState = 'half-open';
                    this.updateStatus({ circuitBreaker: 'half-open' });
                    console.log('Circuit breaker moved to half-open state');
                    this.emit('circuitBreakerHalfOpen', { timestamp: now });
                }
                break;
                
            case 'half-open':
                // Will be handled in handleFirebaseSuccess
                break;
        }
    }
    
    startRecoveryProcess() {
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            console.warn('Maximum recovery attempts reached, stopping recovery process');
            this.emit('recoveryFailed', { attempts: this.recoveryAttempts });
            return;
        }
        
        const backoffTime = Math.min(
            this.recoveryBackoffMs * Math.pow(2, this.recoveryAttempts),
            this.maxRecoveryBackoffMs
        );
        
        console.log(`Starting recovery attempt ${this.recoveryAttempts + 1} in ${backoffTime}ms`);
        
        setTimeout(async () => {
            this.recoveryAttempts++;
            
            try {
                console.log(`Recovery attempt ${this.recoveryAttempts}: Testing Firebase connection...`);
                const isAvailable = await this.checkFirebaseAvailability();
                
                if (!isAvailable) {
                    console.log(`Recovery attempt ${this.recoveryAttempts} failed, scheduling next attempt`);
                    this.startRecoveryProcess();
                } else {
                    console.log(`Recovery successful after ${this.recoveryAttempts} attempts`);
                    this.recoveryAttempts = 0;
                    this.updateStatus({ recoveryMode: false });
                    this.emit('recoverySuccessful', { attempts: this.recoveryAttempts });
                }
            } catch (error) {
                console.error(`Recovery attempt ${this.recoveryAttempts} failed:`, error);
                this.startRecoveryProcess();
            }
        }, backoffTime);
    }
    
    // ==================== MONITORING ====================
    
    startPeriodicChecks() {
        if (this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = true;
        this.checkInterval = setInterval(() => {
            this.checkFirebaseAvailability();
        }, this.checkIntervalMs);
        
        console.log(`Started Firebase monitoring (interval: ${this.checkIntervalMs}ms)`);
    }
    
    startMonitoring() {
        if (this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = true;
        this.checkInterval = setInterval(() => {
            this.checkFirebaseAvailability();
        }, this.checkIntervalMs);
        
        console.log(`Started Firebase monitoring (interval: ${this.checkIntervalMs}ms)`);
    }
    
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
        console.log('Stopped Firebase monitoring');
    }
    
    setupNetworkListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.checkFirebaseAvailability();
        });
        
        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.handleFirebaseFailure('network_offline', 'Device is offline');
        });
    }
    
    // ==================== DATA SYNCHRONIZATION ====================
    
    async syncFromFirebaseToLocal() {
        try {
            if (!this.isFirebaseAvailable || !window.localFallbackManager) {
                return;
            }
            
            console.log('Syncing data from Firebase to local storage...');
            
            // Get data from Firebase (assuming universalDataManager is available)
            if (window.universalDataManager && window.universalDataManager.isInitialized) {
                const firebaseData = {
                    products: (window.universalDataManager.products && Array.isArray(window.universalDataManager.products)) ? window.universalDataManager.products : [],
                    clients: (window.universalDataManager.clients && Array.isArray(window.universalDataManager.clients)) ? window.universalDataManager.clients : [],
                    salespeople: (window.universalDataManager.salespeople && Array.isArray(window.universalDataManager.salespeople)) ? window.universalDataManager.salespeople : [],
                    colors: (window.universalDataManager.colors && Array.isArray(window.universalDataManager.colors)) ? window.universalDataManager.colors : [],
                    styles: (window.universalDataManager.styles && Array.isArray(window.universalDataManager.styles)) ? window.universalDataManager.styles : []
                };
                
                // Sync to local storage
                await window.localFallbackManager.syncFromFirebase(firebaseData, {
                    overwrite: true
                });
                
                this.emit('syncCompleted', firebaseData);
                console.log('Firebase to local sync completed successfully');
            }
            
        } catch (error) {
            console.error('Error syncing from Firebase to local:', error);
            this.emit('syncError', error);
        }
    }
    
    async validateFallbackData() {
        try {
            if (!window.localFallbackManager) {
                throw new Error('Local fallback manager not available');
            }
            
            const stats = await window.localFallbackManager.getStatistics();
            const hasData = Object.values(stats).some(stat => stat.count > 0);
            
            if (!hasData) {
                console.warn('No fallback data available');
                this.emit('fallbackDataUnavailable');
                
                this.updateStatus({
                    fallback: 'unavailable',
                    warning: 'No local fallback data available'
                });
            } else {
                this.updateStatus({
                    fallback: 'available'
                });
                
                this.emit('fallbackDataAvailable', stats);
            }
            
            return hasData;
            
        } catch (error) {
            console.error('Error validating fallback data:', error);
            this.updateStatus({
                fallback: 'error',
                error: error.message
            });
            return false;
        }
    }
    
    // ==================== DATA ACCESS WRAPPER ====================
    
    async getData(collection, options = {}) {
        try {
            if (this.fallbackFirstMode) {
                // Fallback-first mode: Always use local data for non-admin pages
                if (window.localFallbackManager) {
                    const localData = await window.localFallbackManager.getData(collection, {
                        returnEmpty: true,
                        validateIntegrity: true
                    });
                    
                    return {
                        data: localData,
                        source: 'fallback',
                        timestamp: new Date().toISOString(),
                        mode: 'fallback-first'
                    };
                } else {
                    console.warn(`LocalFallbackManager not available for ${collection}`);
                    return {
                        data: [],
                        source: 'empty',
                        timestamp: new Date().toISOString(),
                        mode: 'fallback-first'
                    };
                }
            } else {
                // Admin mode: Try Firebase first if available
                if (this.isFirebaseAvailable && !options.forceLocal) {
                    try {
                        const firebaseData = await this.getFirebaseData(collection);
                        if (firebaseData) {
                            return {
                                data: firebaseData,
                                source: 'firebase',
                                timestamp: new Date().toISOString(),
                                mode: 'admin'
                            };
                        }
                    } catch (error) {
                        console.warn(`Firebase data access failed for ${collection}, falling back to local:`, error);
                        this.handleFirebaseFailure('data_access_error', error.message);
                    }
                }
                
                // Fallback to local data for admin pages
                if (window.localFallbackManager) {
                    const localData = await window.localFallbackManager.getData(collection, {
                        returnEmpty: true,
                        validateIntegrity: true
                    });
                    
                    return {
                        data: localData,
                        source: 'local',
                        timestamp: new Date().toISOString(),
                        mode: 'admin'
                    };
                }
                
                throw new Error('No data source available');
            }
            
        } catch (error) {
            console.error(`Error getting data for ${collection}:`, error);
            throw error;
        }
    }
    
    async getFirebaseData(collection) {
        // This would integrate with your existing Firebase data access
        // For now, we'll use the universalDataManager if available
        if (window.universalDataManager) {
            return window.universalDataManager[collection] || null;
        }
        return null;
    }
    
    // ==================== STATUS AND UTILITIES ====================
    
    updateStatus(updates) {
        this.status = { ...this.status, ...updates };
        this.emit('statusUpdated', this.status);
    }
    
    getStatus() {
        return {
            ...this.status,
            uptime: this.calculateUptime(),
            lastFailure: this.lastFailureReason,
            consecutiveFailures: this.consecutiveFailures,
            isMonitoring: this.isMonitoring
        };
    }
    
    calculateUptime() {
        if (!this.lastSuccessfulCheck) {
            return 0;
        }
        return Date.now() - new Date(this.lastSuccessfulCheck).getTime();
    }
    
    calculateDowntime() {
        if (!this.lastFailureReason) {
            return 0;
        }
        return Date.now() - new Date(this.lastFailureReason.timestamp).getTime();
    }
    
    // ==================== EVENT SYSTEM ====================
    
    on(event, callback) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map)) {
                console.warn('FallbackDetector: eventListeners not properly initialized in on(), recreating');
                this.eventListeners = new Map();
            }
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
        } catch (error) {
            console.error('FallbackDetector: Error in on() method:', error);
            this.eventListeners = new Map();
            this.eventListeners.set(event, [callback]);
        }
    }
    
    off(event, callback) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                return;
            }
            if (this.eventListeners.has(event)) {
                const callbacks = this.eventListeners.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        } catch (error) {
            console.error('FallbackDetector: Error in off() method:', error);
            this.eventListeners = new Map();
        }
    }
    
    emit(event, data) {
        try {
            if (!this.eventListeners || !(this.eventListeners instanceof Map) || typeof this.eventListeners.has !== 'function') {
                console.warn('FallbackDetector: eventListeners not properly initialized in emit(), recreating');
                this.eventListeners = new Map();
                return;
            }
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${event}:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('FallbackDetector: Error in emit() method:', error);
            this.eventListeners = new Map();
        }
    }
    
    // ==================== MANUAL CONTROLS ====================
    
    async forceFirebaseCheck() {
        console.log('Forcing Firebase availability check...');
        return await this.checkFirebaseAvailability();
    }
    
    async forceFallback() {
        console.log('Forcing fallback mode...');
        this.isFirebaseAvailable = false;
        this.updateStatus({
            firebase: 'forced_unavailable',
            currentSource: 'fallback'
        });
        this.emit('forcedFallback');
    }
    
    async forceFirebase() {
        console.log('Forcing Firebase mode...');
        const isAvailable = await this.checkFirebaseAvailability();
        if (isAvailable) {
            this.isFirebaseAvailable = true;
            this.updateStatus({
                firebase: 'forced_available',
                currentSource: 'firebase'
            });
            this.emit('forcedFirebase');
        }
        return isAvailable;
    }
    
    // ==================== CLEANUP ====================
    
    destroy() {
        this.stopMonitoring();
        this.eventListeners.clear();
        
        // Remove network listeners
        window.removeEventListener('online', this.checkFirebaseAvailability);
        window.removeEventListener('offline', this.handleFirebaseFailure);
        
        console.log('Fallback Detector destroyed');
    }
}

// Global instance
window.fallbackDetector = new FallbackDetector();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackDetector;
}