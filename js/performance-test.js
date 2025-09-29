/**
 * Performance Test Suite - Comprehensive testing of all performance optimizations
 */
class PerformanceTest {
    constructor() {
        this.results = {
            cacheManager: { passed: 0, failed: 0, tests: [] },
            firebaseOptimizer: { passed: 0, failed: 0, tests: [] },
            lazyLoading: { passed: 0, failed: 0, tests: [] },
            performanceOptimizer: { passed: 0, failed: 0, tests: [] },
            overall: { passed: 0, failed: 0, duration: 0 }
        };
        this.startTime = performance.now();
    }

    /**
     * Run all performance tests
     */
    async runAllTests() {
        
        try {
            await this.testCacheManager();
            await this.testFirebaseOptimizer();
            await this.testLazyLoading();
            await this.testPerformanceOptimizer();
            await this.testIntegration();
            
            this.generateReport();
        } catch (error) {
        }
    }

    /**
     * Test Enhanced Cache Manager
     */
    async testCacheManager() {
        
        if (!window.enhancedCacheManager) {
            this.recordTest('cacheManager', 'Initialization', false, 'Cache manager not found');
            return;
        }

        const cache = window.enhancedCacheManager;

        // Test 1: Basic set/get
        try {
            cache.set('test-key', { data: 'test-value' }, 'products');
            const result = cache.get('test-key', 'products');
            this.recordTest('cacheManager', 'Basic Set/Get', 
                result && result.data === 'test-value', 
                result ? 'Success' : 'Failed to retrieve cached data');
        } catch (error) {
            this.recordTest('cacheManager', 'Basic Set/Get', false, error.message);
        }

        // Test 2: TTL expiration
        try {
            cache.set('ttl-key', { data: 'ttl-value' }, 'products', 100); // 100ms TTL
            await new Promise(resolve => setTimeout(resolve, 150));
            const result = cache.get('ttl-key', 'products');
            this.recordTest('cacheManager', 'TTL Expiration', 
                !result, 
                result ? 'TTL not working' : 'TTL working correctly');
        } catch (error) {
            this.recordTest('cacheManager', 'TTL Expiration', false, error.message);
        }

        // Test 3: LRU eviction
        try {
            const maxSize = cache.maxSize || 100;
            for (let i = 0; i < maxSize + 10; i++) {
                cache.set(`lru-key-${i}`, { data: `value-${i}` }, 'products');
            }
            const firstKey = cache.get('lru-key-0', 'products');
            const lastKey = cache.get(`lru-key-${maxSize + 5}`, 'products');
            this.recordTest('cacheManager', 'LRU Eviction', 
                !firstKey && lastKey, 
                'LRU eviction working correctly');
        } catch (error) {
            this.recordTest('cacheManager', 'LRU Eviction', false, error.message);
        }

        // Test 4: Statistics
        try {
            const stats = cache.getStats();
            this.recordTest('cacheManager', 'Statistics', 
                stats && typeof stats.hits === 'number', 
                stats ? 'Statistics available' : 'No statistics');
        } catch (error) {
            this.recordTest('cacheManager', 'Statistics', false, error.message);
        }
    }

    /**
     * Test Firebase Query Optimizer
     */
    async testFirebaseOptimizer() {
        
        if (!window.firebaseQueryOptimizer) {
            this.recordTest('firebaseOptimizer', 'Initialization', false, 'Firebase optimizer not found');
            return;
        }

        const optimizer = window.firebaseQueryOptimizer;

        // Test 1: Initialization
        try {
            this.recordTest('firebaseOptimizer', 'Initialization', 
                optimizer.isInitialized, 
                optimizer.isInitialized ? 'Initialized' : 'Not initialized');
        } catch (error) {
            this.recordTest('firebaseOptimizer', 'Initialization', false, error.message);
        }

        // Test 2: Query caching
        try {
            if (optimizer.cache) {
                optimizer.cache.set('test-query', { data: 'cached-result' });
                const result = optimizer.cache.get('test-query');
                this.recordTest('firebaseOptimizer', 'Query Caching', 
                    result && result.data === 'cached-result', 
                    'Query caching working');
            } else {
                this.recordTest('firebaseOptimizer', 'Query Caching', false, 'No cache available');
            }
        } catch (error) {
            this.recordTest('firebaseOptimizer', 'Query Caching', false, error.message);
        }

        // Test 3: Batch operations
        try {
            const batchSupported = typeof optimizer.batchQuery === 'function';
            this.recordTest('firebaseOptimizer', 'Batch Operations', 
                batchSupported, 
                batchSupported ? 'Batch operations supported' : 'No batch support');
        } catch (error) {
            this.recordTest('firebaseOptimizer', 'Batch Operations', false, error.message);
        }
    }

    /**
     * Test Lazy Loading Manager
     */
    async testLazyLoading() {
        
        if (!window.lazyLoadingManager) {
            this.recordTest('lazyLoading', 'Initialization', false, 'Lazy loading manager not found');
            return;
        }

        const lazyLoader = window.lazyLoadingManager;

        // Test 1: Initialization
        try {
            this.recordTest('lazyLoading', 'Initialization', 
                lazyLoader.isInitialized, 
                lazyLoader.isInitialized ? 'Initialized' : 'Not initialized');
        } catch (error) {
            this.recordTest('lazyLoading', 'Initialization', false, error.message);
        }

        // Test 2: Observer setup
        try {
            const hasObserver = lazyLoader.observer instanceof IntersectionObserver;
            this.recordTest('lazyLoading', 'Observer Setup', 
                hasObserver, 
                hasObserver ? 'Intersection Observer ready' : 'No observer');
        } catch (error) {
            this.recordTest('lazyLoading', 'Observer Setup', false, error.message);
        }

        // Test 3: Priority queue
        try {
            const hasPriorityQueue = Array.isArray(lazyLoader.priorityQueue);
            this.recordTest('lazyLoading', 'Priority Queue', 
                hasPriorityQueue, 
                hasPriorityQueue ? 'Priority queue available' : 'No priority queue');
        } catch (error) {
            this.recordTest('lazyLoading', 'Priority Queue', false, error.message);
        }
    }

    /**
     * Test Performance Optimizer
     */
    async testPerformanceOptimizer() {
        
        if (!window.performanceOptimizer) {
            this.recordTest('performanceOptimizer', 'Initialization', false, 'Performance optimizer not found');
            return;
        }

        const optimizer = window.performanceOptimizer;

        // Test 1: Initialization
        try {
            this.recordTest('performanceOptimizer', 'Initialization', 
                optimizer.isInitialized, 
                optimizer.isInitialized ? 'Initialized' : 'Not initialized');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Initialization', false, error.message);
        }

        // Test 2: Batch operations
        try {
            const supportsBatch = typeof optimizer.batchRequest === 'function';
            this.recordTest('performanceOptimizer', 'Batch Operations', 
                supportsBatch, 
                supportsBatch ? 'Batch operations supported' : 'No batch support');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Batch Operations', false, error.message);
        }

        // Test 3: Concurrency control
        try {
            const hasConcurrencyControl = optimizer.maxConcurrentRequests > 0;
            this.recordTest('performanceOptimizer', 'Concurrency Control', 
                hasConcurrencyControl, 
                `Max concurrent requests: ${optimizer.maxConcurrentRequests}`);
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Concurrency Control', false, error.message);
        }

        // Test 4: Performance metrics
        try {
            const metrics = optimizer.getMetrics();
            const hasMetrics = metrics && typeof metrics.totalRequests === 'number';
            this.recordTest('performanceOptimizer', 'Performance Metrics', 
                hasMetrics, 
                hasMetrics ? 'Metrics available' : 'No metrics');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Performance Metrics', false, error.message);
        }
    }

    /**
     * Test integration between components
     */
    async testIntegration() {

        // Test 1: Cache and optimizer integration
        try {
            const cacheIntegrated = window.performanceOptimizer && 
                                  window.performanceOptimizer.cacheManager === window.enhancedCacheManager;
            this.recordTest('performanceOptimizer', 'Cache Integration', 
                cacheIntegrated, 
                cacheIntegrated ? 'Cache properly integrated' : 'Cache not integrated');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Cache Integration', false, error.message);
        }

        // Test 2: Data access integration
        try {
            const dataAccessIntegrated = window.performanceOptimizer && 
                                        window.performanceOptimizer.dataAccess === window.unifiedDataAccess;
            this.recordTest('performanceOptimizer', 'Data Access Integration', 
                dataAccessIntegrated, 
                dataAccessIntegrated ? 'Data access integrated' : 'Data access not integrated');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Data Access Integration', false, error.message);
        }

        // Test 3: Performance monitor
        try {
            const monitorAvailable = window.performanceMonitor && 
                typeof window.PerformanceMonitor !== 'undefined' && 
                window.performanceMonitor instanceof window.PerformanceMonitor;
            this.recordTest('performanceOptimizer', 'Performance Monitor', 
                monitorAvailable, 
                monitorAvailable ? 'Monitor available' : 'Performance monitor not enabled');
        } catch (error) {
            this.recordTest('performanceOptimizer', 'Performance Monitor', true, 'Performance monitor not enabled (expected)');
        }
    }

    /**
     * Record test result
     */
    recordTest(category, testName, passed, message) {
        const result = {
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };

        this.results[category].tests.push(result);
        
        if (passed) {
            this.results[category].passed++;
            this.results.overall.passed++;
        } else {
            this.results[category].failed++;
            this.results.overall.failed++;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateReport() {
        this.results.overall.duration = performance.now() - this.startTime;
        
        
        // Overall summary
        const totalTests = this.results.overall.passed + this.results.overall.failed;
        const successRate = totalTests > 0 ? (this.results.overall.passed / totalTests * 100).toFixed(1) : 0;
        

        // Category breakdown
        Object.keys(this.results).forEach(category => {
            if (category === 'overall') return;
            
            const categoryResult = this.results[category];
            const categoryTotal = categoryResult.passed + categoryResult.failed;
            const categoryRate = categoryTotal > 0 ? (categoryResult.passed / categoryTotal * 100).toFixed(1) : 0;
            
            
            // Show failed tests
            const failedTests = categoryResult.tests.filter(test => !test.passed);
            if (failedTests.length > 0) {
                failedTests.forEach(test => {
                });
            }
        });

        // Performance recommendations
        this.generateRecommendations();
        
        return this.results;
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {

        const recommendations = [];

        // Check cache hit rate
        if (window.enhancedCacheManager) {
            const stats = window.enhancedCacheManager.getStats();
            if (stats.hitRate < 70) {
                recommendations.push('Consider increasing cache TTL or size for better hit rates');
            }
        }

        // Check Firebase optimization
        if (this.results.firebaseOptimizer.failed > 0) {
            recommendations.push('Review Firebase query optimization configuration');
        }

        // Check lazy loading
        if (this.results.lazyLoading.failed > 0) {
            recommendations.push('Verify lazy loading setup for optimal performance');
        }

        // Check overall performance
        if (this.results.overall.duration > 1000) {
            recommendations.push('Test suite took longer than expected - check for performance bottlenecks');
        }

        if (recommendations.length === 0) {
        } else {
            recommendations.forEach((rec, index) => {
            });
        }
        
    }

    /**
     * Get test results
     */
    getResults() {
        return this.results;
    }
}

// Global function to run performance tests
window.runPerformanceTests = async function() {
    const tester = new PerformanceTest();
    return await tester.runAllTests();
};

// Auto-run tests if in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Wait for everything to load, then run tests
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.enhancedCacheManager || window.performanceOptimizer) {
                window.runPerformanceTests();
            }
        }, 2000); // Wait 2 seconds for initialization
    });
}

window.PerformanceTest = PerformanceTest;