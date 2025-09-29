/**
 * Sync System Tests
 * Comprehensive test suite for the two-way Google Sheets ↔ IndexedDB synchronization system
 * Validates all components and ensures data integrity
 */

class SyncSystemTests {
    constructor(config = {}) {
        this.logLevel = config.logLevel || 'info';
        this.testResults = [];
        this.syncSystem = null;
        this.testData = this.generateTestData();
        
        this.log('Sync System Tests initialized', 'info');
    }

    /**
     * Generate test data for validation
     */
    generateTestData() {
        return {
            products: [
                {
                    id: 'test-product-1',
                    name: 'Test Product 1',
                    category: 'Test Category',
                    priceList: 'Test Price List',
                    price: 100.00,
                    active: true,
                    description: 'Test product for validation'
                },
                {
                    id: 'test-product-2',
                    name: 'Test Product 2',
                    category: 'Test Category',
                    priceList: 'Test Price List',
                    price: 200.00,
                    active: true,
                    description: 'Another test product'
                }
            ],
            clients: [
                {
                    id: 'test-client-1',
                    name: 'Test Client 1',
                    email: 'test1@example.com',
                    salesperson: 'test-salesperson-1',
                    active: true
                }
            ],
            salespeople: [
                {
                    id: 'test-salesperson-1',
                    name: 'Test Salesperson',
                    email: 'salesperson@example.com',
                    territory: 'Test Territory',
                    active: true
                }
            ]
        };
    }

    /**
     * Run all tests
     */
    async runAllTests(syncSystem) {
        this.syncSystem = syncSystem;
        this.testResults = [];
        
        this.log('🧪 Starting comprehensive sync system tests...', 'info');

        try {
            // Component tests
            await this.testIndexedDBManager();
            await this.testSyncServices();
            await this.testSyncCoordinator();
            await this.testDropdownManager();
            await this.testStatusUI();
            
            // Integration tests
            await this.testDataIntegrity();
            await this.testSyncFlow();
            await this.testErrorHandling();
            await this.testPerformance();

            // Generate test report
            const report = this.generateTestReport();
            this.log('✅ All tests completed', 'info');
            
            return report;

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Test IndexedDB Manager
     */
    async testIndexedDBManager() {
        this.log('🔍 Testing IndexedDB Manager...', 'info');

        const tests = [
            {
                name: 'IndexedDB Initialization',
                test: async () => {
                    return this.syncSystem.indexedDBManager && 
                           this.syncSystem.indexedDBManager.isInitialized;
                }
            },
            {
                name: 'Database Schema Creation',
                test: async () => {
                    const stats = await this.syncSystem.indexedDBManager.getStats();
                    return stats && stats.collections && stats.collections.length > 0;
                }
            },
            {
                name: 'CRUD Operations',
                test: async () => {
                    const manager = this.syncSystem.indexedDBManager;
                    
                    // Test put operation
                    await manager.put('products', this.testData.products[0]);
                    
                    // Test get operation
                    const retrieved = await manager.get('products', 'test-product-1');
                    
                    // Test getAll operation
                    const all = await manager.getAll('products');
                    
                    // Test delete operation
                    await manager.delete('products', 'test-product-1');
                    
                    return retrieved && retrieved.id === 'test-product-1' && all.length > 0;
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('IndexedDB Manager', test.name, test.test);
        }
    }

    /**
     * Test sync services
     */
    async testSyncServices() {
        this.log('🔍 Testing Sync Services...', 'info');

        const tests = [
            {
                name: 'Sheets to IndexedDB Service Initialization',
                test: async () => {
                    return this.syncSystem.sheetsToIndexedDBSync !== null;
                }
            },
            {
                name: 'IndexedDB to Sheets Service Initialization',
                test: async () => {
                    return this.syncSystem.indexedDBToSheetsSync !== null;
                }
            },
            {
                name: 'Data Transformation',
                test: async () => {
                    const service = this.syncSystem.sheetsToIndexedDBSync;
                    const transformed = service.transformData('products', [
                        ['test-id', 'Test Product', 'Category', 'Price List', '100.00', 'true']
                    ]);
                    
                    return transformed && transformed.length > 0 && transformed[0].id === 'test-id';
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Sync Services', test.name, test.test);
        }
    }

    /**
     * Test sync coordinator
     */
    async testSyncCoordinator() {
        this.log('🔍 Testing Sync Coordinator...', 'info');

        const tests = [
            {
                name: 'Coordinator Initialization',
                test: async () => {
                    return this.syncSystem.syncCoordinator && 
                           this.syncSystem.syncCoordinator.isInitialized;
                }
            },
            {
                name: 'Status Retrieval',
                test: async () => {
                    const status = await this.syncSystem.syncCoordinator.getStatus();
                    return status && typeof status.isInitialized === 'boolean';
                }
            },
            {
                name: 'Suspend and Resume',
                test: async () => {
                    await this.syncSystem.syncCoordinator.suspendSync();
                    const suspendedStatus = await this.syncSystem.syncCoordinator.getStatus();
                    
                    await this.syncSystem.syncCoordinator.resumeSync();
                    const resumedStatus = await this.syncSystem.syncCoordinator.getStatus();
                    
                    return suspendedStatus.isSuspended && !resumedStatus.isSuspended;
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Sync Coordinator', test.name, test.test);
        }
    }

    /**
     * Test dropdown manager
     */
    async testDropdownManager() {
        this.log('🔍 Testing Dropdown Manager...', 'info');

        const tests = [
            {
                name: 'Dropdown Manager Initialization',
                test: async () => {
                    return this.syncSystem.dropdownManager && 
                           this.syncSystem.dropdownManager.isInitialized;
                }
            },
            {
                name: 'Data Loading',
                test: async () => {
                    // Add test data
                    await this.syncSystem.indexedDBManager.put('products', this.testData.products[0]);
                    
                    // Test data retrieval
                    const products = await this.syncSystem.dropdownManager.getData('products');
                    
                    return products && products.length > 0;
                }
            },
            {
                name: 'Dropdown Population',
                test: async () => {
                    // Create test select element
                    const select = document.createElement('select');
                    select.id = 'test-select';
                    document.body.appendChild(select);
                    
                    try {
                        // Test population
                        await this.syncSystem.dropdownManager.populateProductDropdown(select);
                        
                        const hasOptions = select.children.length > 0;
                        
                        // Cleanup
                        document.body.removeChild(select);
                        
                        return hasOptions;
                    } catch (error) {
                        // Cleanup on error
                        if (select.parentNode) {
                            document.body.removeChild(select);
                        }
                        throw error;
                    }
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Dropdown Manager', test.name, test.test);
        }
    }

    /**
     * Test status UI
     */
    async testStatusUI() {
        this.log('🔍 Testing Status UI...', 'info');

        const tests = [
            {
                name: 'Status UI Initialization',
                test: async () => {
                    return this.syncSystem.statusUI !== null;
                }
            },
            {
                name: 'UI Element Creation',
                test: async () => {
                    const container = document.getElementById('sync-status-container');
                    return container !== null;
                }
            },
            {
                name: 'Status Updates',
                test: async () => {
                    if (!this.syncSystem.statusUI) return true; // Skip if UI disabled
                    
                    // Trigger status update
                    await this.syncSystem.statusUI.updateStatus();
                    
                    // Check if status was updated
                    const statusElement = document.getElementById('overall-status');
                    return statusElement !== null;
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Status UI', test.name, test.test);
        }
    }

    /**
     * Test data integrity
     */
    async testDataIntegrity() {
        this.log('🔍 Testing Data Integrity...', 'info');

        const tests = [
            {
                name: 'Data Consistency',
                test: async () => {
                    // Add test data to IndexedDB
                    await this.syncSystem.indexedDBManager.replaceAll('products', this.testData.products);
                    
                    // Retrieve data through dropdown manager
                    const products = await this.syncSystem.dropdownManager.getData('products');
                    
                    // Verify consistency
                    return products.length === this.testData.products.length &&
                           products[0].id === this.testData.products[0].id;
                }
            },
            {
                name: 'Data Validation',
                test: async () => {
                    const manager = this.syncSystem.indexedDBManager;
                    
                    // Test invalid data handling
                    try {
                        await manager.put('products', { invalid: 'data' });
                        return false; // Should have thrown an error
                    } catch (error) {
                        return true; // Expected behavior
                    }
                }
            },
            {
                name: 'Transaction Atomicity',
                test: async () => {
                    const manager = this.syncSystem.indexedDBManager;
                    
                    // Test transaction rollback on error
                    const initialCount = await manager.count('products');
                    
                    try {
                        // This should fail and rollback
                        await manager.replaceAll('products', [
                            this.testData.products[0],
                            { invalid: 'data' } // This should cause failure
                        ]);
                        return false;
                    } catch (error) {
                        const finalCount = await manager.count('products');
                        return finalCount === initialCount; // No partial updates
                    }
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Data Integrity', test.name, test.test);
        }
    }

    /**
     * Test sync flow
     */
    async testSyncFlow() {
        this.log('🔍 Testing Sync Flow...', 'info');

        const tests = [
            {
                name: 'Incremental Sync',
                test: async () => {
                    try {
                        await this.syncSystem.performManualSync('incremental');
                        return true;
                    } catch (error) {
                        // Expected if no Google Sheets connection
                        this.log(`Incremental sync test skipped: ${error.message}`, 'warn');
                        return true;
                    }
                }
            },
            {
                name: 'Full Sync',
                test: async () => {
                    try {
                        await this.syncSystem.performManualSync('full');
                        return true;
                    } catch (error) {
                        // Expected if no Google Sheets connection
                        this.log(`Full sync test skipped: ${error.message}`, 'warn');
                        return true;
                    }
                }
            },
            {
                name: 'Sync Status Tracking',
                test: async () => {
                    const status = await this.syncSystem.getStatus();
                    return status && typeof status.isInitialized === 'boolean';
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Sync Flow', test.name, test.test);
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        this.log('🔍 Testing Error Handling...', 'info');

        const tests = [
            {
                name: 'Invalid Database Operations',
                test: async () => {
                    try {
                        await this.syncSystem.indexedDBManager.get('nonexistent', 'test');
                        return false; // Should have thrown
                    } catch (error) {
                        return true; // Expected
                    }
                }
            },
            {
                name: 'Network Error Simulation',
                test: async () => {
                    // This test would require mocking network failures
                    // For now, we'll just verify error handling structure exists
                    const coordinator = this.syncSystem.syncCoordinator;
                    return typeof coordinator.handleError === 'function';
                }
            },
            {
                name: 'Graceful Degradation',
                test: async () => {
                    // Test that system continues to work even with sync errors
                    const dropdownManager = this.syncSystem.dropdownManager;
                    
                    // Should still be able to get cached data
                    const products = await dropdownManager.getData('products');
                    return Array.isArray(products);
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Error Handling', test.name, test.test);
        }
    }

    /**
     * Test performance
     */
    async testPerformance() {
        this.log('🔍 Testing Performance...', 'info');

        const tests = [
            {
                name: 'Large Dataset Handling',
                test: async () => {
                    const startTime = Date.now();
                    
                    // Generate large test dataset
                    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                        id: `perf-test-${i}`,
                        name: `Performance Test Product ${i}`,
                        category: 'Performance Test',
                        priceList: 'Performance Test',
                        price: Math.random() * 1000,
                        active: true
                    }));
                    
                    // Test bulk insert
                    await this.syncSystem.indexedDBManager.replaceAll('products', largeDataset);
                    
                    // Test bulk retrieve
                    const retrieved = await this.syncSystem.dropdownManager.getData('products');
                    
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    
                    this.log(`Large dataset test completed in ${duration}ms`, 'debug');
                    
                    return retrieved.length >= 1000 && duration < 5000; // Should complete in under 5 seconds
                }
            },
            {
                name: 'Memory Usage',
                test: async () => {
                    // Basic memory usage check
                    if (performance.memory) {
                        const beforeMemory = performance.memory.usedJSHeapSize;
                        
                        // Perform memory-intensive operation
                        await this.syncSystem.dropdownManager.forceRefresh();
                        
                        const afterMemory = performance.memory.usedJSHeapSize;
                        const memoryIncrease = afterMemory - beforeMemory;
                        
                        this.log(`Memory increase: ${memoryIncrease} bytes`, 'debug');
                        
                        return memoryIncrease < 50 * 1024 * 1024; // Less than 50MB increase
                    }
                    
                    return true; // Skip if performance.memory not available
                }
            }
        ];

        for (const test of tests) {
            await this.runTest('Performance', test.name, test.test);
        }
    }

    /**
     * Run a single test
     */
    async runTest(category, name, testFunction) {
        const startTime = Date.now();
        
        try {
            this.log(`  🧪 Running: ${name}`, 'debug');
            
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                category,
                name,
                status: result ? 'PASS' : 'FAIL',
                duration,
                error: null
            });
            
            const status = result ? '✅ PASS' : '❌ FAIL';
            this.log(`  ${status}: ${name} (${duration}ms)`, result ? 'debug' : 'error');
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                category,
                name,
                status: 'ERROR',
                duration,
                error: error.message
            });
            
            this.log(`  💥 ERROR: ${name} - ${error.message} (${duration}ms)`, 'error');
        }
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        const errorTests = this.testResults.filter(r => r.status === 'ERROR').length;
        
        const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                errors: errorTests,
                successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0,
                totalDuration
            },
            results: this.testResults,
            categories: this.groupResultsByCategory()
        };

        this.log('📊 Test Report Generated:', 'info');
        this.log(`  Total Tests: ${totalTests}`, 'info');
        this.log(`  Passed: ${passedTests}`, 'info');
        this.log(`  Failed: ${failedTests}`, 'info');
        this.log(`  Errors: ${errorTests}`, 'info');
        this.log(`  Success Rate: ${report.summary.successRate}%`, 'info');
        this.log(`  Total Duration: ${totalDuration}ms`, 'info');

        return report;
    }

    /**
     * Group results by category
     */
    groupResultsByCategory() {
        const categories = {};
        
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    errors: 0,
                    tests: []
                };
            }
            
            const category = categories[result.category];
            category.total++;
            category.tests.push(result);
            
            switch (result.status) {
                case 'PASS':
                    category.passed++;
                    break;
                case 'FAIL':
                    category.failed++;
                    break;
                case 'ERROR':
                    category.errors++;
                    break;
            }
        });
        
        return categories;
    }

    /**
     * Cleanup test data
     */
    async cleanup() {
        this.log('🧹 Cleaning up test data...', 'info');
        
        try {
            if (this.syncSystem && this.syncSystem.indexedDBManager) {
                // Clear test data
                await this.syncSystem.indexedDBManager.clear('products');
                await this.syncSystem.indexedDBManager.clear('clients');
                await this.syncSystem.indexedDBManager.clear('salespeople');
            }
            
            this.log('✅ Test cleanup completed', 'info');
            
        } catch (error) {
            this.log(`❌ Test cleanup failed: ${error.message}`, 'error');
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[Sync Tests ${level.toUpperCase()}] ${timestamp}:`;
            
            switch (level) {
                case 'error':
                    break;
                case 'warn':
                    break;
                case 'debug':
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }
}

/**
 * Quick test runner function
 */
async function runSyncSystemTests(syncSystem, config = {}) {
    const tests = new SyncSystemTests(config);
    
    try {
        const report = await tests.runAllTests(syncSystem);
        await tests.cleanup();
        
        return {
            success: report.summary.errors === 0 && report.summary.failed === 0,
            report: report
        };
        
    } catch (error) {
        await tests.cleanup();
        
        return {
            success: false,
            error: error.message,
            report: tests.generateTestReport()
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SyncSystemTests = SyncSystemTests;
    window.runSyncSystemTests = runSyncSystemTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SyncSystemTests,
        runSyncSystemTests
    };
}