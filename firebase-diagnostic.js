/**
 * Firebase Comprehensive Diagnostic Script
 * Tests all aspects of Firebase connectivity and functionality
 */

class FirebaseDiagnostic {
    constructor() {
        this.results = {
            sdk: { status: 'pending', details: {} },
            config: { status: 'pending', details: {} },
            initialization: { status: 'pending', details: {} },
            firestore: { status: 'pending', details: {} },
            collections: { status: 'pending', details: {} },
            realtime: { status: 'pending', details: {} },
            performance: { status: 'pending', details: {} }
        };
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }

    async runFullDiagnostic() {
        this.log('🔥 Starting Firebase Comprehensive Diagnostic');
        this.log('='.repeat(50));

        try {
            await this.testSDKLoading();
            await this.testConfiguration();
            await this.testInitialization();
            await this.testFirestoreConnection();
            await this.testCollections();
            await this.testRealTimeSync();
            await this.testPerformance();
            
            this.generateReport();
        } catch (error) {
            this.log(`Diagnostic failed: ${error.message}`, 'error');
        }
    }

    async testSDKLoading() {
        this.log('Testing Firebase SDK Loading...');
        
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            // Check individual services
            const services = {
                app: firebase.app ? '✅' : '❌',
                firestore: firebase.firestore ? '✅' : '❌',
                auth: firebase.auth ? '✅' : '❌',
                storage: firebase.storage ? '✅' : '❌',
                analytics: firebase.analytics ? '✅' : '❌'
            };

            this.results.sdk = {
                status: 'success',
                details: {
                    version: firebase.SDK_VERSION || 'unknown',
                    services: services,
                    loadedServices: Object.keys(services).filter(s => services[s] === '✅')
                }
            };

            this.log(`Firebase SDK v${firebase.SDK_VERSION} loaded successfully`);
            this.log(`Services: ${Object.entries(services).map(([k,v]) => `${k}${v}`).join(' ')}`);

        } catch (error) {
            this.results.sdk = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`SDK Loading failed: ${error.message}`, 'error');
        }
    }

    async testConfiguration() {
        this.log('Testing Firebase Configuration...');
        
        try {
            if (typeof firebaseConfig === 'undefined') {
                throw new Error('Firebase configuration not found');
            }

            const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
            const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing configuration fields: ${missingFields.join(', ')}`);
            }

            this.results.config = {
                status: 'success',
                details: {
                    projectId: firebaseConfig.projectId,
                    authDomain: firebaseConfig.authDomain,
                    hasAllFields: missingFields.length === 0,
                    configFields: Object.keys(firebaseConfig)
                }
            };

            this.log(`Configuration valid for project: ${firebaseConfig.projectId}`);

        } catch (error) {
            this.results.config = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`Configuration test failed: ${error.message}`, 'error');
        }
    }

    async testInitialization() {
        this.log('Testing Firebase Initialization...');
        
        try {
            // Test if initialization functions exist
            if (typeof initializeFirebaseApp !== 'function') {
                throw new Error('initializeFirebaseApp function not found');
            }

            // Try to initialize
            await initializeFirebaseApp();

            // Check if initialized
            const isInitialized = isFirebaseInitialized && isFirebaseInitialized();
            
            if (!isInitialized) {
                throw new Error('Firebase not marked as initialized');
            }

            // Get app instance
            const app = getFirebaseApp && getFirebaseApp();
            
            this.results.initialization = {
                status: 'success',
                details: {
                    isInitialized: isInitialized,
                    hasApp: !!app,
                    appName: app ? app.name : 'unknown',
                    initFunctionExists: typeof initializeFirebaseApp === 'function'
                }
            };

            this.log('Firebase initialization successful');

        } catch (error) {
            this.results.initialization = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`Initialization failed: ${error.message}`, 'error');
        }
    }

    async testFirestoreConnection() {
        this.log('Testing Firestore Connection...');
        
        try {
            if (!firebase.firestore) {
                throw new Error('Firestore not available');
            }

            const db = firebase.firestore();
            const startTime = Date.now();

            // Test basic connectivity with a simple query
            const testQuery = await db.collection('products').limit(1).get();
            const connectionTime = Date.now() - startTime;

            this.results.firestore = {
                status: 'success',
                details: {
                    connectionTime: connectionTime,
                    canQuery: true,
                    testQuerySize: testQuery.size,
                    firestoreSettings: db._settings || {}
                }
            };

            this.log(`Firestore connection successful (${connectionTime}ms)`);

        } catch (error) {
            this.results.firestore = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`Firestore connection failed: ${error.message}`, 'error');
        }
    }

    async testCollections() {
        this.log('Testing Firebase Collections...');
        
        try {
            const db = firebase.firestore();
            const collections = ['products', 'clients', 'salespeople', 'colors', 'styles', 'quotes', 'orders'];
            const collectionResults = {};

            for (const collectionName of collections) {
                const startTime = Date.now();
                try {
                    const snapshot = await db.collection(collectionName).limit(5).get();
                    const queryTime = Date.now() - startTime;
                    
                    collectionResults[collectionName] = {
                        accessible: true,
                        documentCount: snapshot.size,
                        queryTime: queryTime,
                        hasData: snapshot.size > 0,
                        sampleFields: snapshot.size > 0 ? Object.keys(snapshot.docs[0].data()) : []
                    };
                    
                    this.log(`  ${collectionName}: ${snapshot.size} docs (${queryTime}ms)`);
                } catch (error) {
                    collectionResults[collectionName] = {
                        accessible: false,
                        error: error.message
                    };
                    this.log(`  ${collectionName}: Error - ${error.message}`, 'warning');
                }
            }

            const accessibleCount = Object.values(collectionResults).filter(r => r.accessible).length;
            
            this.results.collections = {
                status: accessibleCount > 0 ? 'success' : 'error',
                details: {
                    totalCollections: collections.length,
                    accessibleCollections: accessibleCount,
                    collections: collectionResults
                }
            };

            this.log(`Collections test: ${accessibleCount}/${collections.length} accessible`);

        } catch (error) {
            this.results.collections = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`Collections test failed: ${error.message}`, 'error');
        }
    }

    async testRealTimeSync() {
        this.log('Testing Real-time Synchronization...');
        
        return new Promise((resolve) => {
            try {
                const db = firebase.firestore();
                const startTime = Date.now();
                let updateCount = 0;

                const unsubscribe = db.collection('products').limit(1).onSnapshot(
                    (snapshot) => {
                        updateCount++;
                        const syncTime = Date.now() - startTime;
                        
                        this.results.realtime = {
                            status: 'success',
                            details: {
                                initialSyncTime: syncTime,
                                updateCount: updateCount,
                                snapshotSize: snapshot.size,
                                hasMetadata: !!snapshot.metadata
                            }
                        };

                        this.log(`Real-time sync working (${syncTime}ms, update #${updateCount})`);
                        
                        // Clean up after first successful update
                        setTimeout(() => {
                            unsubscribe();
                            resolve();
                        }, 1000);
                    },
                    (error) => {
                        this.results.realtime = {
                            status: 'error',
                            details: { error: error.message }
                        };
                        this.log(`Real-time sync failed: ${error.message}`, 'error');
                        resolve();
                    }
                );

                // Timeout after 10 seconds
                setTimeout(() => {
                    if (this.results.realtime.status === 'pending') {
                        unsubscribe();
                        this.results.realtime = {
                            status: 'error',
                            details: { error: 'Real-time sync timeout' }
                        };
                        this.log('Real-time sync timeout', 'error');
                    }
                    resolve();
                }, 10000);

            } catch (error) {
                this.results.realtime = {
                    status: 'error',
                    details: { error: error.message }
                };
                this.log(`Real-time sync test failed: ${error.message}`, 'error');
                resolve();
            }
        });
    }

    async testPerformance() {
        this.log('Testing Firebase Performance...');
        
        try {
            const db = firebase.firestore();
            const tests = [];

            // Test 1: Single document read
            const singleDocStart = Date.now();
            await db.collection('products').limit(1).get();
            tests.push({ name: 'Single Document Read', time: Date.now() - singleDocStart });

            // Test 2: Multiple documents read
            const multiDocStart = Date.now();
            await db.collection('products').limit(10).get();
            tests.push({ name: 'Multiple Documents Read', time: Date.now() - multiDocStart });

            // Test 3: Query with where clause
            const queryStart = Date.now();
            try {
                await db.collection('products').where('Category', '!=', '').limit(5).get();
                tests.push({ name: 'Query with Filter', time: Date.now() - queryStart });
            } catch (error) {
                tests.push({ name: 'Query with Filter', time: -1, error: error.message });
            }

            this.results.performance = {
                status: 'success',
                details: {
                    tests: tests,
                    averageQueryTime: tests.filter(t => t.time > 0).reduce((sum, t) => sum + t.time, 0) / tests.filter(t => t.time > 0).length
                }
            };

            this.log('Performance tests completed');
            tests.forEach(test => {
                if (test.time > 0) {
                    this.log(`  ${test.name}: ${test.time}ms`);
                } else {
                    this.log(`  ${test.name}: Failed - ${test.error}`, 'warning');
                }
            });

        } catch (error) {
            this.results.performance = {
                status: 'error',
                details: { error: error.message }
            };
            this.log(`Performance test failed: ${error.message}`, 'error');
        }
    }

    generateReport() {
        const totalTime = Date.now() - this.startTime;
        
        this.log('='.repeat(50));
        this.log('🔥 Firebase Diagnostic Report');
        this.log('='.repeat(50));

        const statusEmoji = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            pending: '⏳'
        };

        Object.entries(this.results).forEach(([test, result]) => {
            const emoji = statusEmoji[result.status] || '❓';
            this.log(`${emoji} ${test.toUpperCase()}: ${result.status}`);
            
            if (result.details.error) {
                this.log(`   Error: ${result.details.error}`);
            }
        });

        const successCount = Object.values(this.results).filter(r => r.status === 'success').length;
        const totalTests = Object.keys(this.results).length;

        this.log('='.repeat(50));
        this.log(`📊 Summary: ${successCount}/${totalTests} tests passed`);
        this.log(`⏱️ Total diagnostic time: ${totalTime}ms`);
        
        if (successCount === totalTests) {
            this.log('🎉 All Firebase tests passed! Your setup is working perfectly.');
        } else {
            this.log(`⚠️ ${totalTests - successCount} test(s) failed. Check the details above.`);
        }

        // Return results for programmatic use
        return {
            success: successCount === totalTests,
            results: this.results,
            summary: {
                passed: successCount,
                total: totalTests,
                duration: totalTime
            }
        };
    }
}

// Auto-run diagnostic if this script is loaded in a browser
if (typeof window !== 'undefined') {
    window.FirebaseDiagnostic = FirebaseDiagnostic;
    
    // Auto-run after a short delay to ensure all scripts are loaded
    window.addEventListener('load', () => {
        setTimeout(async () => {
            const diagnostic = new FirebaseDiagnostic();
            window.firebaseDiagnosticResults = await diagnostic.runFullDiagnostic();
        }, 2000);
    });
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDiagnostic;
}