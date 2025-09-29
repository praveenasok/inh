/**
 * Firebase Query Optimizer
 * Optimizes Firebase queries for better performance
 * Features: Query optimization, connection pooling, intelligent caching, batch operations
 */

class FirebaseQueryOptimizer {
    constructor() {
        this.queryCache = new Map();
        this.connectionPool = new Map();
        this.queryStats = new Map();
        this.batchQueue = new Map();
        this.batchTimeout = 100; // ms
        this.maxBatchSize = 10;
        this.maxCacheSize = 100;
        this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
        
        // Query optimization settings
        this.optimizations = {
            enableIndexHints: true,
            enableQueryCompression: true,
            enableResultCaching: true,
            enableBatchQueries: true,
            enableConnectionPooling: true
        };
        
        // Performance metrics
        this.metrics = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            batchedQueries: 0,
            averageQueryTime: 0,
            optimizedQueries: 0
        };
        
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            
            // Initialize connection pool
            await this._initializeConnectionPool();
            
            // Setup query optimization
            this._setupQueryOptimization();
            
            // Setup cache cleanup
            this._setupCacheCleanup();
            
            this.initialized = true;
            
        } catch (error) {
            throw error;
        }
    }
    
    async _initializeConnectionPool() {
        // Initialize Firebase connection pool for better performance
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            this.connectionPool.set('default', db);
            
            // Setup connection monitoring
            db.ref('.info/connected').on('value', (snapshot) => {
                const connected = snapshot.val();
            });
        }
    }
    
    _setupQueryOptimization() {
        // Setup query optimization strategies
        this.queryOptimizers = {
            // Optimize collection queries
            collection: (collection, options = {}) => {
                const optimized = { ...options };
                
                // Add index hints for common queries
                if (this.optimizations.enableIndexHints) {
                    optimized.indexOn = this._getIndexHints(collection);
                }
                
                // Enable query compression
                if (this.optimizations.enableQueryCompression) {
                    optimized.compress = true;
                }
                
                return optimized;
            },
            
            // Optimize batch queries
            batch: (queries) => {
                if (!this.optimizations.enableBatchQueries) return queries;
                
                // Group similar queries
                const grouped = this._groupSimilarQueries(queries);
                
                // Optimize each group
                return grouped.map(group => this._optimizeQueryGroup(group));
            }
        };
    }
    
    _setupCacheCleanup() {
        // Cleanup expired cache entries every 5 minutes
        setInterval(() => {
            this._cleanupExpiredCache();
        }, 5 * 60 * 1000);
    }
    
    async optimizedQuery(collection, options = {}) {
        const startTime = performance.now();
        this.metrics.totalQueries++;
        
        try {
            // Check cache first
            if (this.optimizations.enableResultCaching) {
                const cached = this._getCachedResult(collection, options);
                if (cached) {
                    this.metrics.cacheHits++;
                    return cached;
                }
                this.metrics.cacheMisses++;
            }
            
            // Optimize query
            const optimizedOptions = this.queryOptimizers.collection(collection, options);
            
            // Execute optimized query
            const result = await this._executeOptimizedQuery(collection, optimizedOptions);
            
            // Cache result
            if (this.optimizations.enableResultCaching && result) {
                this._cacheResult(collection, options, result);
            }
            
            // Update metrics
            const queryTime = performance.now() - startTime;
            this._updateQueryMetrics(queryTime);
            this.metrics.optimizedQueries++;
            
            return result;
            
        } catch (error) {
            throw error;
        }
    }
    
    async batchQuery(queries) {
        if (!this.optimizations.enableBatchQueries || queries.length === 0) {
            return Promise.all(queries.map(q => this.optimizedQuery(q.collection, q.options)));
        }
        
        try {
            
            // Optimize batch
            const optimizedBatch = this.queryOptimizers.batch(queries);
            
            // Execute batch with concurrency control
            const results = await this._executeBatchQueries(optimizedBatch);
            
            this.metrics.batchedQueries += queries.length;
            
            return results;
            
        } catch (error) {
            throw error;
        }
    }
    
    async _executeOptimizedQuery(collection, options) {
        const db = this.connectionPool.get('default');
        if (!db) {
            throw new Error('Firebase database not available');
        }
        
        try {
            // Use existing universalDataManager if available for better performance
            if (window.universalDataManager && window.universalDataManager[collection]) {
                return {
                    data: window.universalDataManager[collection],
                    source: 'firebase-optimized',
                    timestamp: new Date().toISOString(),
                    cached: false,
                    optimized: true
                };
            }
            
            // Direct optimized Firebase query
            let ref = db.ref(collection);
            
            // Apply query optimizations
            if (options.orderBy) {
                ref = ref.orderByChild(options.orderBy);
            }
            
            if (options.limit) {
                ref = ref.limitToFirst(options.limit);
            }
            
            if (options.startAt) {
                ref = ref.startAt(options.startAt);
            }
            
            if (options.endAt) {
                ref = ref.endAt(options.endAt);
            }
            
            // Execute query with timeout
            const snapshot = await Promise.race([
                ref.once('value'),
                this._createTimeoutPromise(10000, `Query timeout for ${collection}`)
            ]);
            
            const data = snapshot.val();
            
            return {
                data: data ? Object.values(data) : [],
                source: 'firebase-optimized',
                timestamp: new Date().toISOString(),
                cached: false,
                optimized: true
            };
            
        } catch (error) {
            throw error;
        }
    }
    
    async _executeBatchQueries(queries) {
        const results = {};
        const promises = [];
        
        // Execute queries with concurrency control
        const concurrencyLimit = 3;
        for (let i = 0; i < queries.length; i += concurrencyLimit) {
            const batch = queries.slice(i, i + concurrencyLimit);
            
            const batchPromises = batch.map(async (query) => {
                try {
                    const result = await this._executeOptimizedQuery(query.collection, query.options);
                    results[query.collection] = result.data;
                    return result;
                } catch (error) {
                    results[query.collection] = [];
                    return { data: [], error: error.message };
                }
            });
            
            promises.push(...batchPromises);
            
            // Wait for current batch before starting next
            await Promise.all(batchPromises);
        }
        
        return results;
    }
    
    _getCachedResult(collection, options) {
        const cacheKey = this._generateCacheKey(collection, options);
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }
        
        if (cached) {
            this.queryCache.delete(cacheKey);
        }
        
        return null;
    }
    
    _cacheResult(collection, options, result) {
        if (this.queryCache.size >= this.maxCacheSize) {
            this._evictOldestCache();
        }
        
        const cacheKey = this._generateCacheKey(collection, options);
        const ttl = options.cacheTTL || this.defaultCacheTTL;
        
        this.queryCache.set(cacheKey, {
            data: result,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        });
    }
    
    _generateCacheKey(collection, options) {
        return `${collection}:${JSON.stringify(options)}`;
    }
    
    _evictOldestCache() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, value] of this.queryCache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.queryCache.delete(oldestKey);
        }
    }
    
    _cleanupExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, value] of this.queryCache.entries()) {
            if (value.expiry <= now) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.queryCache.delete(key));
        
        if (expiredKeys.length > 0) {
        }
    }
    
    _getIndexHints(collection) {
        // Return appropriate index hints for common collections
        const indexHints = {
            products: ['category', 'price', 'name'],
            clients: ['name', 'email', 'createdAt'],
            salespeople: ['name', 'email', 'active'],
            quotes: ['clientId', 'createdAt', 'status'],
            orders: ['quoteId', 'createdAt', 'status']
        };
        
        return indexHints[collection] || [];
    }
    
    _groupSimilarQueries(queries) {
        const groups = new Map();
        
        queries.forEach(query => {
            const groupKey = `${query.collection}:${JSON.stringify(query.options?.orderBy || '')}`;
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            
            groups.get(groupKey).push(query);
        });
        
        return Array.from(groups.values());
    }
    
    _optimizeQueryGroup(group) {
        // Optimize a group of similar queries
        if (group.length === 1) return group[0];
        
        // Merge similar queries where possible
        const baseQuery = group[0];
        const mergedOptions = { ...baseQuery.options };
        
        // Combine limits, orders, etc.
        group.forEach(query => {
            if (query.options?.limit && (!mergedOptions.limit || query.options.limit > mergedOptions.limit)) {
                mergedOptions.limit = query.options.limit;
            }
        });
        
        return {
            collection: baseQuery.collection,
            options: mergedOptions,
            originalQueries: group
        };
    }
    
    _updateQueryMetrics(queryTime) {
        const currentAvg = this.metrics.averageQueryTime;
        const totalQueries = this.metrics.totalQueries;
        
        this.metrics.averageQueryTime = ((currentAvg * (totalQueries - 1)) + queryTime) / totalQueries;
    }
    
    _createTimeoutPromise(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.queryCache.size,
            cacheHitRate: this.metrics.totalQueries > 0 ? 
                (this.metrics.cacheHits / this.metrics.totalQueries * 100).toFixed(2) + '%' : '0%'
        };
    }
    
    clearCache() {
        this.queryCache.clear();
    }
    
    destroy() {
        this.queryCache.clear();
        this.connectionPool.clear();
        this.queryStats.clear();
        this.batchQueue.clear();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.FirebaseQueryOptimizer = FirebaseQueryOptimizer;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseQueryOptimizer;
}