/**
 * Lazy Loading Manager
 * Implements lazy loading for non-critical data to improve initial page load performance
 * Features: Intersection Observer, priority-based loading, progressive enhancement
 */

class LazyLoadingManager {
    constructor(dataAccess, options = {}) {
        this.dataAccess = dataAccess;
        this.options = {
            rootMargin: '50px',
            threshold: 0.1,
            loadDelay: 100,
            batchSize: 5,
            maxConcurrentLoads: 3,
            ...options
        };
        
        this.observers = new Map();
        this.loadQueue = [];
        this.loadingItems = new Set();
        this.loadedItems = new Set();
        this.activeLoads = 0;
        
        // Priority levels for different types of content
        this.priorities = {
            critical: 1,    // Above the fold, immediately visible
            high: 2,        // Likely to be viewed soon
            medium: 3,      // Secondary content
            low: 4,         // Background/optional content
            deferred: 5     // Load only when specifically requested
        };
        
        // Data loading strategies
        this.loadingStrategies = {
            immediate: this.loadImmediate.bind(this),
            onVisible: this.loadOnVisible.bind(this),
            onInteraction: this.loadOnInteraction.bind(this),
            onIdle: this.loadOnIdle.bind(this),
            onDemand: this.loadOnDemand.bind(this)
        };
        
        this.initialized = false;
        this.stats = {
            totalItems: 0,
            loadedItems: 0,
            failedItems: 0,
            averageLoadTime: 0,
            totalLoadTime: 0
        };
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Setup intersection observers
            this.setupIntersectionObserver();
            
            // Setup idle callback for background loading
            this.setupIdleLoading();
            
            // Setup event listeners for interaction-based loading
            this.setupInteractionListeners();
            
            // Start processing load queue
            this.startQueueProcessor();
            
            this.initialized = true;
            
        } catch (error) {
            throw error;
        }
    }
    
    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            }
        );
    }
    
    setupIdleLoading() {
        if ('requestIdleCallback' in window) {
            this.scheduleIdleLoading();
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => this.processIdleQueue(), 1000);
        }
    }
    
    setupInteractionListeners() {
        // Listen for user interactions that might trigger loading
        const events = ['click', 'scroll', 'keydown', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, this.handleUserInteraction.bind(this), {
                passive: true,
                once: false
            });
        });
    }
    
    startQueueProcessor() {
        // Process load queue every 100ms
        this.queueProcessor = setInterval(() => {
            this.processLoadQueue();
        }, this.options.loadDelay);
    }
    
    // Register an element for lazy loading
    registerElement(element, config = {}) {
        const itemConfig = {
            element,
            strategy: config.strategy || 'onVisible',
            priority: config.priority || this.priorities.medium,
            dataType: config.dataType || 'generic',
            loadFunction: config.loadFunction,
            fallbackFunction: config.fallbackFunction,
            retryCount: 0,
            maxRetries: config.maxRetries || 3,
            ...config
        };
        
        const itemId = this.generateItemId(element);
        itemConfig.id = itemId;
        
        // Apply loading strategy
        this.applyLoadingStrategy(itemConfig);
        
        this.stats.totalItems++;
        
        return itemId;
    }
    
    // Register data for lazy loading
    registerData(dataConfig) {
        const config = {
            id: dataConfig.id || this.generateDataId(),
            collection: dataConfig.collection,
            strategy: dataConfig.strategy || 'onIdle',
            priority: dataConfig.priority || this.priorities.low,
            loadFunction: dataConfig.loadFunction || this.defaultDataLoader.bind(this),
            dependencies: dataConfig.dependencies || [],
            retryCount: 0,
            maxRetries: dataConfig.maxRetries || 3,
            ...dataConfig
        };
        
        this.applyLoadingStrategy(config);
        this.stats.totalItems++;
        
        return config.id;
    }
    
    applyLoadingStrategy(config) {
        const strategy = this.loadingStrategies[config.strategy];
        if (strategy) {
            strategy(config);
        } else {
            this.loadingStrategies.onVisible(config);
        }
    }
    
    loadImmediate(config) {
        // Load immediately with high priority
        this.addToLoadQueue(config, this.priorities.critical);
    }
    
    loadOnVisible(config) {
        // Load when element becomes visible
        if (config.element) {
            this.intersectionObserver.observe(config.element);
            this.observers.set(config.element, config);
        } else {
            // For data without elements, load on idle
            this.loadOnIdle(config);
        }
    }
    
    loadOnInteraction(config) {
        // Load after first user interaction
        config.waitingForInteraction = true;
        this.addToLoadQueue(config, this.priorities.high);
    }
    
    loadOnIdle(config) {
        // Load during browser idle time
        config.idleLoading = true;
        this.addToLoadQueue(config, this.priorities.low);
    }
    
    loadOnDemand(config) {
        // Load only when explicitly requested
        config.onDemand = true;
        // Don't add to queue automatically
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const config = this.observers.get(entry.target);
                if (config && !this.loadingItems.has(config.id)) {
                    this.addToLoadQueue(config, config.priority);
                    this.intersectionObserver.unobserve(entry.target);
                    this.observers.delete(entry.target);
                }
            }
        });
    }
    
    handleUserInteraction() {
        // Process items waiting for user interaction
        this.loadQueue.forEach(item => {
            if (item.waitingForInteraction) {
                item.waitingForInteraction = false;
                item.priority = Math.min(item.priority, this.priorities.high);
            }
        });
    }
    
    addToLoadQueue(config, priority = null) {
        if (this.loadedItems.has(config.id) || this.loadingItems.has(config.id)) {
            return;
        }
        
        if (priority !== null) {
            config.priority = priority;
        }
        
        // Insert into queue based on priority
        const insertIndex = this.loadQueue.findIndex(item => item.priority > config.priority);
        if (insertIndex === -1) {
            this.loadQueue.push(config);
        } else {
            this.loadQueue.splice(insertIndex, 0, config);
        }
    }
    
    async processLoadQueue() {
        if (this.activeLoads >= this.options.maxConcurrentLoads || this.loadQueue.length === 0) {
            return;
        }
        
        // Process items by priority
        const batch = [];
        while (batch.length < this.options.batchSize && this.loadQueue.length > 0 && 
               this.activeLoads < this.options.maxConcurrentLoads) {
            
            const item = this.loadQueue.shift();
            
            // Skip items waiting for interaction if no interaction occurred
            if (item.waitingForInteraction) {
                this.loadQueue.push(item); // Move to end
                continue;
            }
            
            // Skip idle items if browser is busy
            if (item.idleLoading && !this.isBrowserIdle()) {
                this.loadQueue.push(item); // Move to end
                continue;
            }
            
            batch.push(item);
        }
        
        // Load batch
        batch.forEach(item => this.loadItem(item));
    }
    
    async loadItem(config) {
        if (this.loadingItems.has(config.id)) return;
        
        this.loadingItems.add(config.id);
        this.activeLoads++;
        
        const startTime = performance.now();
        
        try {
            // Execute load function
            const result = await config.loadFunction(config);
            
            // Mark as loaded
            this.loadedItems.add(config.id);
            this.stats.loadedItems++;
            
            // Update load time statistics
            const loadTime = performance.now() - startTime;
            this.updateLoadTimeStats(loadTime);
            
            // Trigger success callback if provided
            if (config.onSuccess) {
                config.onSuccess(result, config);
            }
            
            return result;
            
        } catch (error) {
            
            // Handle retry logic
            if (config.retryCount < config.maxRetries) {
                config.retryCount++;
                setTimeout(() => {
                    this.loadingItems.delete(config.id);
                    this.addToLoadQueue(config, this.priorities.high);
                }, Math.pow(2, config.retryCount) * 1000); // Exponential backoff
            } else {
                this.stats.failedItems++;
                
                // Try fallback function
                if (config.fallbackFunction) {
                    try {
                        await config.fallbackFunction(config);
                    } catch (fallbackError) {
                    }
                }
                
                // Trigger error callback if provided
                if (config.onError) {
                    config.onError(error, config);
                }
            }
        } finally {
            this.loadingItems.delete(config.id);
            this.activeLoads--;
        }
    }
    
    async defaultDataLoader(config) {
        if (!this.dataAccess || !config.collection) {
            throw new Error('Data access or collection not specified');
        }
        
        return await this.dataAccess.getData(config.collection, config.options || {});
    }
    
    scheduleIdleLoading() {
        requestIdleCallback((deadline) => {
            this.processIdleQueue(deadline);
            this.scheduleIdleLoading(); // Schedule next idle callback
        });
    }
    
    processIdleQueue(deadline) {
        const idleItems = this.loadQueue.filter(item => item.idleLoading);
        
        idleItems.forEach(item => {
            if (deadline && deadline.timeRemaining() > 10) {
                this.loadItem(item);
            }
        });
    }
    
    isBrowserIdle() {
        // Simple heuristic to determine if browser is idle
        return this.activeLoads < this.options.maxConcurrentLoads / 2;
    }
    
    // Manually trigger loading of on-demand items
    async loadOnDemandItem(itemId) {
        const config = this.findConfigById(itemId);
        if (config && config.onDemand) {
            return await this.loadItem(config);
        }
        throw new Error(`On-demand item not found: ${itemId}`);
    }
    
    findConfigById(itemId) {
        // Search in queue
        const queueItem = this.loadQueue.find(item => item.id === itemId);
        if (queueItem) return queueItem;
        
        // Search in observers
        for (const [element, config] of this.observers.entries()) {
            if (config.id === itemId) return config;
        }
        
        return null;
    }
    
    updateLoadTimeStats(loadTime) {
        this.stats.totalLoadTime += loadTime;
        this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.loadedItems;
    }
    
    generateItemId(element) {
        return `lazy-${element.tagName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateDataId() {
        return `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getStats() {
        return {
            ...this.stats,
            queueLength: this.loadQueue.length,
            activeLoads: this.activeLoads,
            loadingItems: this.loadingItems.size,
            loadedItems: this.loadedItems.size,
            successRate: this.stats.totalItems > 0 ? 
                ((this.stats.loadedItems / this.stats.totalItems) * 100).toFixed(2) + '%' : '0%'
        };
    }
    
    // Preload critical data
    async preloadCritical(collections = []) {
        const criticalConfigs = collections.map(collection => ({
            collection,
            strategy: 'immediate',
            priority: this.priorities.critical,
            loadFunction: this.defaultDataLoader.bind(this)
        }));
        
        return Promise.all(criticalConfigs.map(config => this.loadItem(config)));
    }
    
    destroy() {
        // Clean up observers and intervals
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.queueProcessor) {
            clearInterval(this.queueProcessor);
        }
        
        // Clear all data structures
        this.observers.clear();
        this.loadQueue = [];
        this.loadingItems.clear();
        this.loadedItems.clear();

    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.LazyLoadingManager = LazyLoadingManager;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoadingManager;
}