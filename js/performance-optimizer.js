/**
 * Performance Optimizer
 * Enhances data loading performance with lazy loading, batch operations, and intelligent preloading
 */

class PerformanceOptimizer {
    constructor(dataAccess, options = {}) {
        this.dataAccess = dataAccess;
        this.options = {
            batchSize: options.batchSize || 10,
            lazyLoadThreshold: options.lazyLoadThreshold || 100,
            preloadDelay: options.preloadDelay || 1000,
            maxConcurrentRequests: options.maxConcurrentRequests || 3,
            ...options
        };
        
        // Enhanced cache manager
        this.enhancedCache = new EnhancedCacheManager({
            maxSize: 200,
            defaultTTL: 5 * 60 * 1000,
            maxMemoryMB: 100
        });
        
        // Request management
        this.requestQueue = [];
        this.activeRequests = new Set();
        this.batchTimer = null;
        
        // Lazy loading management
        this.lazyLoadObserver = null;
        this.lazyLoadElements = new Map();
        
        // Preloading strategies
        this.preloadStrategies = new Map();
        this.userBehaviorTracker = new Map();
        
        // Performance metrics
        this.metrics = {
            totalRequests: 0,
            batchedRequests: 0,
            lazyLoadedItems: 0,
            preloadedItems: 0,
            averageLoadTime: 0,
            cacheHitRate: 0,
            memoryUsage: 0
        };
        
        this.initializeOptimizations();
    }
    
    /**
     * Initialize performance optimizations
     */
    initializeOptimizations() {
        this.setupLazyLoading();
        this.setupPreloadStrategies();
        this.setupCacheIntegration();
        this.startPerformanceMonitoring();
    }
    
    /**
     * Enhanced getData with performance optimizations
     */
    async getData(collection, options = {}) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        
        try {
            // Check enhanced cache first
            const cacheKey = this.generateCacheKey(collection, options);
            const cachedData = this.enhancedCache.get(cacheKey);
            
            if (cachedData && !options.skipCache) {
                this.updateMetrics(startTime, true);
                return cachedData;
            }
            
            // Check if this request can be batched
            if (this.shouldBatch(collection, options)) {
                return await this.addToBatch(collection, options);
            }
            
            // Check if this should be lazy loaded
            if (this.shouldLazyLoad(collection, options)) {
                return await this.lazyLoad(collection, options);
            }
            
            // Regular request with enhanced caching
            const data = await this.performOptimizedRequest(collection, options);
            
            // Cache the result
            this.enhancedCache.set(cacheKey, data, {
                source: 'optimized-request',
                priority: this.getRequestPriority(collection)
            });
            
            this.updateMetrics(startTime, false);
            return data;
            
        } catch (error) {
            // Fallback to original data access
            return await this.dataAccess.getData(collection, options);
        }
    }
    
    /**
     * Perform optimized request with concurrency control
     */
    async performOptimizedRequest(collection, options) {
        // Wait for available slot if at max concurrency
        while (this.activeRequests.size >= this.options.maxConcurrentRequests) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const requestId = `${collection}-${Date.now()}-${Math.random()}`;
        this.activeRequests.add(requestId);
        
        try {
            const data = await this.dataAccess.getData(collection, options);
            
            // Trigger intelligent preloading
            this.triggerIntelligentPreload(collection, data);
            
            return data;
        } finally {
            this.activeRequests.delete(requestId);
        }
    }
    
    /**
     * Batch multiple requests together
     */
    async addToBatch(collection, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                collection,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Clear existing timer and set new one
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
            }
            
            this.batchTimer = setTimeout(() => {
                this.processBatch();
            }, 50); // 50ms batch window
        });
    }
    
    /**
     * Process batched requests
     */
    async processBatch() {
        if (this.requestQueue.length === 0) return;
        
        const batch = this.requestQueue.splice(0, this.options.batchSize);
        this.metrics.batchedRequests += batch.length;
        
        // Group by collection for efficient processing
        const groupedRequests = new Map();
        batch.forEach(request => {
            const key = request.collection;
            if (!groupedRequests.has(key)) {
                groupedRequests.set(key, []);
            }
            groupedRequests.get(key).push(request);
        });
        
        // Process each group
        for (const [collection, requests] of groupedRequests) {
            try {
                const data = await this.dataAccess.getData(collection, requests[0].options);
                
                // Cache the result
                const cacheKey = this.generateCacheKey(collection, requests[0].options);
                this.enhancedCache.set(cacheKey, data, {
                    source: 'batch-request',
                    priority: this.getRequestPriority(collection)
                });
                
                // Resolve all requests in this group
                requests.forEach(request => request.resolve(data));
                
            } catch (error) {
                // Reject all requests in this group
                requests.forEach(request => request.reject(error));
            }
        }
    }
    
    /**
     * Setup lazy loading with Intersection Observer
     */
    setupLazyLoading() {
        if (typeof IntersectionObserver === 'undefined') return;
        
        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const lazyData = this.lazyLoadElements.get(element);
                    
                    if (lazyData && !lazyData.loaded) {
                        this.loadLazyData(lazyData);
                        this.lazyLoadObserver.unobserve(element);
                    }
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before element comes into view
        });
    }
    
    /**
     * Register element for lazy loading
     */
    registerLazyLoad(element, collection, options = {}) {
        if (!this.lazyLoadObserver) return;
        
        const lazyData = {
            element,
            collection,
            options,
            loaded: false,
            callback: options.callback
        };
        
        this.lazyLoadElements.set(element, lazyData);
        this.lazyLoadObserver.observe(element);
    }
    
    /**
     * Load lazy data when element becomes visible
     */
    async loadLazyData(lazyData) {
        try {
            lazyData.loaded = true;
            this.metrics.lazyLoadedItems++;
            
            const data = await this.getData(lazyData.collection, lazyData.options);
            
            if (lazyData.callback) {
                lazyData.callback(data, lazyData.element);
            }
            
        } catch (error) {
        }
    }
    
    /**
     * Setup intelligent preloading strategies
     */
    setupPreloadStrategies() {
        // User behavior tracking
        this.trackUserBehavior();
        
        // Preload strategies
        this.preloadStrategies.set('related-data', this.preloadRelatedData.bind(this));
        this.preloadStrategies.set('user-pattern', this.preloadByUserPattern.bind(this));
        this.preloadStrategies.set('time-based', this.preloadByTime.bind(this));
    }
    
    /**
     * Track user behavior for intelligent preloading
     */
    trackUserBehavior() {
        // Track page visits
        const currentPage = window.location.pathname;
        const visits = this.userBehaviorTracker.get(currentPage) || 0;
        this.userBehaviorTracker.set(currentPage, visits + 1);
        
        // Track data access patterns
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-collection]');
            if (target) {
                const collection = target.dataset.collection;
                this.recordDataAccess(collection);
            }
        });
    }
    
    /**
     * Record data access for pattern analysis
     */
    recordDataAccess(collection) {
        const pattern = this.userBehaviorTracker.get('access-pattern') || [];
        pattern.push({
            collection,
            timestamp: Date.now()
        });
        
        // Keep only last 50 accesses
        if (pattern.length > 50) {
            pattern.shift();
        }
        
        this.userBehaviorTracker.set('access-pattern', pattern);
    }
    
    /**
     * Trigger intelligent preloading
     */
    triggerIntelligentPreload(collection, data) {
        setTimeout(() => {
            this.preloadStrategies.forEach((strategy, name) => {
                try {
                    strategy(collection, data);
                } catch (error) {
                }
            });
        }, this.options.preloadDelay);
    }
    
    /**
     * Preload related data based on collection relationships
     */
    async preloadRelatedData(collection, data) {
        const relationships = {
            products: ['colors', 'styles', 'categories'],
            clients: ['salespeople'],
            quotes: ['products', 'clients'],
            orders: ['products', 'clients', 'salespeople']
        };
        
        const related = relationships[collection];
        if (related) {
            for (const relatedCollection of related) {
                const cacheKey = this.generateCacheKey(relatedCollection, {});
                
                if (!this.enhancedCache.get(cacheKey)) {
                    try {
                        const relatedData = await this.dataAccess.getData(relatedCollection, {});
                        this.enhancedCache.set(cacheKey, relatedData, {
                            source: 'preload-related',
                            prefetched: true
                        });
                        this.metrics.preloadedItems++;
                    } catch (error) {
                    }
                }
            }
        }
    }
    
    /**
     * Preload based on user access patterns
     */
    async preloadByUserPattern(collection, data) {
        const pattern = this.userBehaviorTracker.get('access-pattern') || [];
        
        // Find collections frequently accessed after current collection
        const recentAccesses = pattern.filter(access => 
            Date.now() - access.timestamp < 5 * 60 * 1000 // Last 5 minutes
        );
        
        const nextCollections = new Map();
        for (let i = 0; i < recentAccesses.length - 1; i++) {
            if (recentAccesses[i].collection === collection) {
                const next = recentAccesses[i + 1].collection;
                nextCollections.set(next, (nextCollections.get(next) || 0) + 1);
            }
        }
        
        // Preload most frequently accessed next collections
        const sortedNext = Array.from(nextCollections.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2); // Top 2
        
        for (const [nextCollection] of sortedNext) {
            const cacheKey = this.generateCacheKey(nextCollection, {});
            
            if (!this.enhancedCache.get(cacheKey)) {
                try {
                    const nextData = await this.dataAccess.getData(nextCollection, {});
                    this.enhancedCache.set(cacheKey, nextData, {
                        source: 'preload-pattern',
                        prefetched: true
                    });
                    this.metrics.preloadedItems++;
                } catch (error) {
                }
            }
        }
    }
    
    /**
     * Time-based preloading for frequently used data
     */
    async preloadByTime(collection, data) {
        const timeBasedCollections = ['products', 'clients', 'colors', 'styles'];
        const currentHour = new Date().getHours();
        
        // Preload core data during business hours
        if (currentHour >= 9 && currentHour <= 17) {
            for (const coll of timeBasedCollections) {
                if (coll !== collection) {
                    const cacheKey = this.generateCacheKey(coll, {});
                    
                    if (!this.enhancedCache.get(cacheKey)) {
                        try {
                            const collData = await this.dataAccess.getData(coll, {});
                            this.enhancedCache.set(cacheKey, collData, {
                                source: 'preload-time',
                                prefetched: true
                            });
                            this.metrics.preloadedItems++;
                        } catch (error) {
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Setup cache integration with enhanced cache
     */
    setupCacheIntegration() {
        // Listen for cache events
        this.enhancedCache.on('prefetchRequest', async (data) => {
            try {
                const collectionData = await this.dataAccess.getData(data.collection, {});
                const cacheKey = this.generateCacheKey(data.collection, {});
                this.enhancedCache.set(cacheKey, collectionData, {
                    source: 'prefetch',
                    prefetched: true
                });
            } catch (error) {
            }
        });
    }
    
    /**
     * Determine if request should be batched
     */
    shouldBatch(collection, options) {
        // Batch small, frequent requests
        return !options.urgent && 
               !options.skipCache && 
               this.requestQueue.length < this.options.batchSize;
    }
    
    /**
     * Determine if data should be lazy loaded
     */
    shouldLazyLoad(collection, options) {
        return options.lazy || 
               (collection === 'quotes' && !options.immediate) ||
               (collection === 'orders' && !options.immediate);
    }
    
    /**
     * Generate cache key
     */
    generateCacheKey(collection, options) {
        const optionsKey = JSON.stringify(options);
        return `${collection}-${optionsKey}`;
    }
    
    /**
     * Get request priority
     */
    getRequestPriority(collection) {
        const priorities = {
            products: 1,
            clients: 2,
            quotes: 1,
            orders: 1,
            colors: 3,
            styles: 3,
            salespeople: 4,
            categories: 5
        };
        return priorities[collection] || 5;
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics(startTime, cacheHit) {
        const loadTime = Date.now() - startTime;
        this.metrics.averageLoadTime = 
            (this.metrics.averageLoadTime + loadTime) / 2;
        
        if (cacheHit) {
            this.metrics.cacheHitRate = 
                (this.metrics.cacheHitRate + 1) / this.metrics.totalRequests;
        }
    }
    
    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.metrics.memoryUsage = this.enhancedCache.memoryUsage;
            
            // Log performance stats every 5 minutes
                ...this.metrics,
                cacheStats: this.enhancedCache.getStats()
            });
        }, 5 * 60 * 1000);
    }
    
    /**
     * Warm up cache with essential data
     */
    async warmUpCache() {
        
        await this.enhancedCache.warmUp(async (collection) => {
            return await this.dataAccess.getData(collection, {});
        });
        
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            optimizer: this.metrics,
            cache: this.enhancedCache.getStats(),
            activeRequests: this.activeRequests.size,
            queuedRequests: this.requestQueue.length,
            lazyLoadElements: this.lazyLoadElements.size
        };
    }
    
    /**
     * Batch request method for multiple collections
     * This is the method that quote-maker-v2-ver3.html is trying to call
     */
    async batchRequest(requests) {
        try {
            
            // Process all requests in parallel for better performance
            const promises = requests.map(async (request) => {
                const { collection, options = {} } = request;
                try {
                    const data = await this.getData(collection, options);
                    return { collection, data, success: true };
                } catch (error) {
                    return { collection, data: [], success: false, error: error.message };
                }
            });
            
            const results = await Promise.all(promises);
            
            // Convert results to the expected format
            const batchResults = {};
            results.forEach(result => {
                batchResults[result.collection] = result.data;
            });
            
            return batchResults;
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Destroy optimizer and clean up resources
     */
    destroy() {
        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.disconnect();
        }
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.enhancedCache.destroy();
        this.lazyLoadElements.clear();
        this.activeRequests.clear();
        this.requestQueue.length = 0;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PerformanceOptimizer = PerformanceOptimizer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}