/**
 * Collection Sync Diagnostic Script
 * Specifically tests Firebase collection access and sync issues
 */

class CollectionSyncDiagnostic {
    constructor() {
        this.collections = [
            'products', 'clients', 'salespeople', 'colors', 'styles', 
            'quotes', 'orders', 'config', 'sync_logs', 'storage'
        ];
        this.results = {};
        this.authStatus = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
        
        // Also log to page if available
        if (typeof window !== 'undefined' && window.log) {
            window.log(message, type);
        }
    }

    async runCollectionDiagnostic() {
        this.log('🔍 Starting Collection Sync Diagnostic');
        this.log('=' * 50);

        try {
            await this.checkFirebaseStatus();
            await this.checkAuthenticationStatus();
            await this.testAllCollections();
            await this.testSyncOperations();
            this.generateCollectionReport();
        } catch (error) {
            this.log(`❌ Diagnostic failed: ${error.message}`, 'error');
            console.error('Full error:', error);
        }
    }

    async checkFirebaseStatus() {
        this.log('Checking Firebase initialization status...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }

        if (!firebase.firestore) {
            throw new Error('Firestore not available');
        }

        this.db = firebase.firestore();
        this.log('✅ Firebase and Firestore initialized');
    }

    async checkAuthenticationStatus() {
        this.log('Checking authentication status...');
        
        try {
            const user = firebase.auth().currentUser;
            
            if (user) {
                this.authStatus = {
                    authenticated: true,
                    uid: user.uid,
                    email: user.email,
                    isAnonymous: user.isAnonymous,
                    provider: user.providerData[0]?.providerId || 'unknown'
                };
                this.log(`✅ Authenticated as: ${user.email || 'Anonymous'} (${user.uid})`);
            } else {
                this.authStatus = {
                    authenticated: false,
                    uid: null,
                    email: null,
                    isAnonymous: false,
                    provider: null
                };
                this.log('⚠️ Not authenticated - testing with public access only');
            }
        } catch (error) {
            this.log(`❌ Auth check failed: ${error.message}`, 'error');
            this.authStatus = { error: error.message };
        }
    }

    async testAllCollections() {
        this.log('Testing collection access...');
        
        for (const collectionName of this.collections) {
            await this.testCollection(collectionName);
        }
    }

    async testCollection(collectionName) {
        this.log(`Testing collection: ${collectionName}`);
        const result = {
            name: collectionName,
            readable: false,
            writable: false,
            documentCount: 0,
            sampleData: null,
            errors: []
        };

        try {
            // Test read access
            const readStart = Date.now();
            const snapshot = await this.db.collection(collectionName).limit(3).get();
            const readTime = Date.now() - readStart;
            
            result.readable = true;
            result.documentCount = snapshot.size;
            result.readTime = readTime;
            
            if (snapshot.size > 0) {
                const firstDoc = snapshot.docs[0];
                result.sampleData = {
                    id: firstDoc.id,
                    fields: Object.keys(firstDoc.data()),
                    sampleField: Object.entries(firstDoc.data())[0]
                };
            }
            
            this.log(`  ✅ Read: ${snapshot.size} docs (${readTime}ms)`);
            
        } catch (error) {
            result.errors.push(`Read error: ${error.message}`);
            this.log(`  ❌ Read failed: ${error.message}`, 'error');
        }

        try {
            // Test write access with a test document
            const writeStart = Date.now();
            const testDocRef = this.db.collection(collectionName).doc('_test_access_' + Date.now());
            
            await testDocRef.set({
                _test: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                testType: 'access_diagnostic'
            });
            
            const writeTime = Date.now() - writeStart;
            result.writable = true;
            result.writeTime = writeTime;
            
            // Clean up test document
            await testDocRef.delete();
            
            this.log(`  ✅ Write: success (${writeTime}ms)`);
            
        } catch (error) {
            result.errors.push(`Write error: ${error.message}`);
            this.log(`  ❌ Write failed: ${error.message}`, 'error');
        }

        this.results[collectionName] = result;
    }

    async testSyncOperations() {
        this.log('Testing sync operations...');
        
        try {
            // Test if FirebaseDatabase class is available
            if (typeof FirebaseDatabase === 'undefined') {
                this.log('⚠️ FirebaseDatabase class not found - sync operations unavailable', 'warning');
                return;
            }

            const fbDb = new FirebaseDatabase();
            
            // Test basic sync operations
            const syncTests = [
                { name: 'getProducts', method: () => fbDb.getProducts() },
                { name: 'getClients', method: () => fbDb.getClients() },
                { name: 'getSalespeople', method: () => fbDb.getSalespeople() },
                { name: 'getColors', method: () => fbDb.getColors() },
                { name: 'getStyles', method: () => fbDb.getStyles() }
            ];

            for (const test of syncTests) {
                try {
                    const startTime = Date.now();
                    const data = await test.method();
                    const duration = Date.now() - startTime;
                    
                    this.log(`  ✅ ${test.name}: ${Array.isArray(data) ? data.length : 'N/A'} items (${duration}ms)`);
                } catch (error) {
                    this.log(`  ❌ ${test.name}: ${error.message}`, 'error');
                }
            }
            
        } catch (error) {
            this.log(`❌ Sync operations test failed: ${error.message}`, 'error');
        }
    }

    generateCollectionReport() {
        this.log('=' * 50);
        this.log('📊 Collection Sync Diagnostic Report');
        this.log('=' * 50);

        // Summary statistics
        const totalCollections = this.collections.length;
        const readableCollections = Object.values(this.results).filter(r => r.readable).length;
        const writableCollections = Object.values(this.results).filter(r => r.writable).length;
        const collectionsWithData = Object.values(this.results).filter(r => r.documentCount > 0).length;

        this.log(`📈 Summary:`);
        this.log(`  Total Collections Tested: ${totalCollections}`);
        this.log(`  Readable Collections: ${readableCollections}/${totalCollections}`);
        this.log(`  Writable Collections: ${writableCollections}/${totalCollections}`);
        this.log(`  Collections with Data: ${collectionsWithData}/${totalCollections}`);

        // Authentication status
        this.log(`🔐 Authentication Status:`);
        if (this.authStatus) {
            if (this.authStatus.authenticated) {
                this.log(`  ✅ Authenticated as: ${this.authStatus.email || 'Anonymous'}`);
                this.log(`  Provider: ${this.authStatus.provider}`);
                this.log(`  Anonymous: ${this.authStatus.isAnonymous}`);
            } else {
                this.log(`  ⚠️ Not authenticated - using public access`);
            }
        }

        // Detailed collection results
        this.log(`📋 Detailed Collection Results:`);
        Object.values(this.results).forEach(result => {
            const status = result.readable ? '✅' : '❌';
            const writeStatus = result.writable ? '✅' : '❌';
            this.log(`  ${status} ${result.name}: Read ${writeStatus} Write (${result.documentCount} docs)`);
            
            if (result.errors.length > 0) {
                result.errors.forEach(error => {
                    this.log(`    ⚠️ ${error}`, 'warning');
                });
            }
        });

        // Recommendations
        this.log(`💡 Recommendations:`);
        
        const failedReads = Object.values(this.results).filter(r => !r.readable);
        if (failedReads.length > 0) {
            this.log(`  🔧 Fix read access for: ${failedReads.map(r => r.name).join(', ')}`);
        }
        
        const failedWrites = Object.values(this.results).filter(r => !r.writable);
        if (failedWrites.length > 0) {
            this.log(`  🔧 Fix write access for: ${failedWrites.map(r => r.name).join(', ')}`);
        }
        
        const emptyCollections = Object.values(this.results).filter(r => r.readable && r.documentCount === 0);
        if (emptyCollections.length > 0) {
            this.log(`  📥 Populate data for: ${emptyCollections.map(r => r.name).join(', ')}`);
        }

        if (!this.authStatus?.authenticated) {
            this.log(`  🔐 Consider implementing authentication for full access`);
        }

        // Store results globally
        if (typeof window !== 'undefined') {
            window.collectionSyncResults = {
                summary: {
                    total: totalCollections,
                    readable: readableCollections,
                    writable: writableCollections,
                    withData: collectionsWithData
                },
                authStatus: this.authStatus,
                collections: this.results,
                timestamp: new Date().toISOString()
            };
        }

        return this.results;
    }
}

// Auto-export for browser use
if (typeof window !== 'undefined') {
    window.CollectionSyncDiagnostic = CollectionSyncDiagnostic;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollectionSyncDiagnostic;
}