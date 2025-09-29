/**
 * Enhanced Cache Manager
 * Advanced caching system with LRU eviction, intelligent prefetching, and memory optimization
 */

class EnhancedCacheManager {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100; // Maximum number of cached items
        this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
        this.maxMemoryMB = options.maxMemoryMB || 50; // 50MB memory limit
        
        // LRU Cache implementation
        this.cache = new Map();
        this.accessOrder = new Map(); // Track access order for LRU
        this.memoryUsage = 0;
        
        // Cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryEvictions: 0,
            prefetchHits: 0,
            totalRequests: 0
        };
        
        // Prefetch configuration
        this.prefetchPatterns = new Map();
        this.prefetchQueue = new Set();
        this.isPrefetching = false;
        
        // Collection-specific TTL settings
        this.collectionTTL = {
            products: 10 * 60 * 1000,    // 10 minutes - changes less frequently
            clients: 5 * 60 * 1000,     // 5 minutes - moderate changes
            salespeople: 15 * 60 * 1000, // 15 minutes - rarely changes
            colors: 30 * 60 * 1000,     // 30 minutes - static data
            styles: 30 * 60 * 1000,     // 30 minutes - static data
            quotes: 2 * 60 * 1000,      // 2 minutes - frequently updated
            orders: 2 * 60 * 1000,      // 2 minutes - frequently updated
            categories: 30 * 60 * 1000,  // 30 minutes - static data
            priceLists: 10 * 60 * 1000   // 10 minutes - moderate changes
        };
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
    }
    
    /**
     * Get data from cache with LRU tracking
     */
    get(key) {
        this.stats.totalRequests++;
        
        const item = this.cache.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        // Check if expired
        if (this.isExpired(item)) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }
        
        // Update access order for LRU
        this.updateAccessOrder(key);
        this.stats.hits++;
        
        // Check if this was a prefetch hit
        if (item.prefetched && !item.accessed) {
            this.stats.prefetchHits++;
            item.accessed = true;
        }
        
        return {
            ...item.data,
            cached: true,
            cacheAge: Date.now() - item.timestamp,
            source: item.source || 'cache'
        };
    }
    
    /**
     * Set data in cache with intelligent eviction
     */
    set(key, data, options = {}) {
        const collection = this.extractCollection(key);
        const ttl = options.ttl || this.collectionTTL[collection] || this.defaultTTL;
        const size = this.estimateSize(data);
        
        // Check memory limits
        if (this.memoryUsage + size > this.maxMemoryMB * 1024 * 1024) {
            this.evictByMemory(size);
        }
        
        // Check size limits
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl,
            size: size,
            source: options.source || 'unknown',
            prefetched: options.prefetched || false,
            accessed: false,
            priority: options.priority || this.getCollectionPriority(collection)
        };
        
        this.cache.set(key, item);
        this.updateAccessOrder(key);
        this.memoryUsage += size;
        
        // Trigger prefetch for related data
        this.triggerPrefetch(key, collection);
    }
    
    /**
     * Delete item from cache
     */
    delete(key) {
        const item = this.cache.get(key);
        if (item) {
            this.memoryUsage -= item.size;
            this.cache.delete(key);
            this.accessOrder.delete(key);
        }
    }
    
    /**
     * Check if cache item is expired
     */
    isExpired(item) {
        return Date.now() - item.timestamp > item.ttl;
    }
    
    /**
     * Update access order for LRU tracking
     */
    updateAccessOrder(key) {
        this.accessOrder.delete(key);
        this.accessOrder.set(key, Date.now());
    }
    
    /**
     * Evict least recently used items
     */
    evictLRU() {
        const oldestKey = this.accessOrder.keys().next().value;
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
        }
    }
    
    /**
     * Evict items to free memory
     */
    evictByMemory(requiredSize) {
        const targetMemory = (this.maxMemoryMB * 1024 * 1024) - requiredSize;
        
        // Sort by priority and access time
        const sortedEntries = Array.from(this.cache.entries())
            .sort((a, b) => {
                const priorityDiff = a[1].priority - b[1].priority;
                if (priorityDiff !== 0) return priorityDiff;
                return (this.accessOrder.get(a[0]) || 0) - (this.accessOrder.get(b[0]) || 0);
            });
        
        for (const [key, item] of sortedEntries) {
            if (this.memoryUsage <= targetMemory) break;
            this.delete(key);
            this.stats.memoryEvictions++;
        }
    }
    
    /**
     * Estimate memory size of data
     */
    estimateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch (error) {
            // Fallback estimation
            return JSON.stringify(data).length * 2; // Rough estimate
        }
    }
    
    /**
     * Extract collection name from cache key
     */
    extractCollection(key) {
        return key.split('-')[0] || 'unknown';
    }
    
    /**
     * Get priority for collection (lower = higher priority)
     */
    getCollectionPriority(collection) {
        const priorities = {
            products: 1,
            clients: 2,
            colors: 3,
            styles: 3,
            salespeople: 4,
            categories: 5,
            priceLists: 2,
            quotes: 1,
            orders: 1
        };
        return priorities[collection] || 5;
    }
    
    /**
     * Trigger intelligent prefetching
     */
    triggerPrefetch(key, collection) {
        if (this.isPrefetching) return;
        
        // Define prefetch patterns
        const patterns = {
            products: ['colors', 'styles', 'categories'],
            clients: ['salespeople'],
            quotes: ['products', 'clients'],
            orders: ['products', 'clients']
        };
        
        const relatedCollections = patterns[collection];
        if (relatedCollections) {
            relatedCollections.forEach(related => {
                this.prefetchQueue.add(related);
            });
            
            // Start prefetching after a short delay
            setTimeout(() => this.processPrefetchQueue(), 100);
        }
    }
    
    /**
     * Process prefetch queue
     */
    async processPrefetchQueue() {
        if (this.isPrefetching || this.prefetchQueue.size === 0) return;
        
        this.isPrefetching = true;
        
        try {
            for (const collection of this.prefetchQueue) {
                const key = `${collection}-{}`;
                
                // Only prefetch if not already cached
                if (!this.cache.has(key)) {
                    // Emit prefetch request
                    this.emit('prefetchRequest', { collection });
                }
            }
        } finally {
            this.prefetchQueue.clear();
            this.isPrefetching = false;
        }
    }
    
    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, item] of this.cache.entries()) {
            if (this.isExpired(item)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        if (expiredKeys.length > 0) {
        }
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 
            ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
            : 0;
        
        const prefetchEfficiency = this.stats.hits > 0
            ? (this.stats.prefetchHits / this.stats.hits * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            prefetchEfficiency: `${prefetchEfficiency}%`,
            cacheSize: this.cache.size,
            memoryUsageMB: (this.memoryUsage / (1024 * 1024)).toFixed(2),
            memoryUtilization: `${(this.memoryUsage / (this.maxMemoryMB * 1024 * 1024) * 100).toFixed(2)}%`
        };
    }
    
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.memoryUsage = 0;
        this.prefetchQueue.clear();
    }
    
    /**
     * Warm up cache with essential data
     */
    async warmUp(dataLoader) {
        const essentialCollections = ['products', 'clients', 'colors', 'styles'];
        
        
        for (const collection of essentialCollections) {
            try {
                const data = await dataLoader(collection);
                this.set(`${collection}-{}`, data, { 
                    source: 'warmup',
                    priority: this.getCollectionPriority(collection)
                });
            } catch (error) {
            }
        }
        
    }
    
    /**
     * Event emitter functionality
     */
    emit(event, data) {
        if (this.eventListeners && this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                }
            });
        }
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * Destroy cache manager
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedCacheManager = EnhancedCacheManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCacheManager;
}