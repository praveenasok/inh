const admin = require('firebase-admin');
const EventEmitter = require('events');

class FirebaseChangeDetector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.db = null;
        this.isInitialized = false;
        this.listeners = new Map();
        this.lastKnownData = new Map();
        this.isListening = false;
    }

    async initialize() {
        try {
            // Initialize Firebase if not already done
            if (!window.firebase || !window.firebase.apps.length) {
                throw new Error('Firebase not initialized');
            }

            this.db = window.firebase.firestore();
            this.isInitialized = true;

            // Load initial data
            await this.loadInitialData();

        } catch (error) {
            throw error;
        }
    }

    async loadInitialData() {
        try {
            // Load salesmen data
            const salesmenData = await this.getSalesmenData();
            this.lastKnownData.set('salesmen', {
                count: salesmenData.count,
                data: salesmenData.data,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(salesmenData.data)
            });

            // Load price lists data
            const priceListsData = await this.getPriceListsData();
            this.lastKnownData.set('priceLists', {
                count: priceListsData.count,
                data: priceListsData.data,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(priceListsData.data)
            });


        } catch (error) {
            throw error;
        }
    }

    async getSalesmenData() {
        try {
            // Try to get from config document first
            const configDoc = await this.db.collection('config').doc('salespeople').get();
            
            if (configDoc.exists) {
                const data = configDoc.data();
                const salesmenArray = data.salespeople || [];
                
                return {
                    count: salesmenArray.length,
                    data: salesmenArray,
                    timestamp: Date.now(),
                    source: 'config'
                };
            }

            // Fallback to salespeople collection
            const snapshot = await this.db.collection('salespeople').get();
            const salesmenData = [];
            
            snapshot.forEach(doc => {
                salesmenData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return {
                count: salesmenData.length,
                data: salesmenData,
                timestamp: Date.now(),
                source: 'collection'
            };
        } catch (error) {
            throw error;
        }
    }

    async getPriceListsData() {
        try {
            // Try to get from config document first
            const configDoc = await this.db.collection('config').doc('price_lists').get();
            
            if (configDoc.exists) {
                const data = configDoc.data();
                const priceListsArray = data.price_lists || [];
                
                return {
                    count: priceListsArray.length,
                    data: priceListsArray,
                    timestamp: Date.now(),
                    source: 'config'
                };
            }

            // Fallback to price_lists collection
            const snapshot = await this.db.collection('price_lists').get();
            const priceListsData = [];
            
            snapshot.forEach(doc => {
                priceListsData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return {
                count: priceListsData.length,
                data: priceListsData,
                timestamp: Date.now(),
                source: 'collection'
            };
        } catch (error) {
            throw error;
        }
    }

    startListening() {
        if (this.isListening || !this.isInitialized) {
            return;
        }

        this.isListening = true;

        // Listen to salesmen collection
        this.listeners.salesmen = this.db.collection('salesmen').onSnapshot(
            (snapshot) => this.handleDataChange('salesmen', snapshot),
        );

        // Listen to price_lists collection
        this.listeners.priceListsData = this.db.collection('price_lists').onSnapshot(
            (snapshot) => this.handleDataChange('priceListsData', snapshot),
        );
    }

    handleDataChange(type, snapshot) {
        try {
            const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const oldData = this.lastData[type] || [];

            // Check if data actually changed
            if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
                this.lastData[type] = newData;

                // Emit change event
                this.emit('dataChanged', {
                    type,
                    data: newData,
                    previousData: oldData,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
        }
    }

    async updateSalesmenData(salesmenData) {
        try {
            // Update config document
            await this.db.collection('config').doc('salespeople').set({
                salespeople: salesmenData,
                lastModified: admin.firestore.FieldValue.serverTimestamp(),
                count: salesmenData.length
            });

            // Optionally update individual documents in collection
            const batch = this.db.batch();
            
            // Clear existing documents
            const existingDocs = await this.db.collection('salespeople').get();
            existingDocs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add new documents
            salesmenData.forEach(salesman => {
                const docRef = this.db.collection('salespeople').doc(salesman.id);
                batch.set(docRef, {
                    ...salesman,
                    lastModified: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            
            this.emit('salesmen-updated', {
                count: salesmenData.length,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async updatePriceListsData(priceListsData) {
        try {
            // Update config document
            await this.db.collection('config').doc('price_lists').set({
                price_lists: priceListsData,
                lastModified: admin.firestore.FieldValue.serverTimestamp(),
                count: priceListsData.length
            });

            // Optionally update individual documents in collection
            const batch = this.db.batch();
            
            // Clear existing documents
            const existingDocs = await this.db.collection('price_lists').get();
            existingDocs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add new documents
            priceListsData.forEach(priceList => {
                const docRef = this.db.collection('price_lists').doc(priceList.id);
                batch.set(docRef, {
                    ...priceList,
                    lastModified: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            
            this.emit('price-lists-updated', {
                count: priceListsData.length,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    stopListening() {
        if (!this.isListening) {
            return;
        }

        Object.entries(this.listeners).forEach(([name, unsubscribe]) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });

        this.listeners = {};
        this.isListening = false;
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            activeListeners: Array.from(this.listeners.keys()),
            lastKnownData: {
                salesmen: this.lastKnownData.get('salesmen') ? {
                    count: this.lastKnownData.get('salesmen').count,
                    lastModified: this.lastKnownData.get('salesmen').lastModified
                } : null,
                priceLists: this.lastKnownData.get('priceLists') ? {
                    count: this.lastKnownData.get('priceLists').count,
                    lastModified: this.lastKnownData.get('priceLists').lastModified
                } : null
            }
        };
    }

    async forceRefresh() {
        if (!this.isInitialized) {
            throw new Error('Firebase Change Detector not initialized');
        }

        await this.loadInitialData();
        this.emit('dataRefreshed', {
            timestamp: new Date().toISOString()
        });
    }

    cleanup() {
        this.stopListening();
        this.removeAllListeners();
        this.isInitialized = false;
        this.db = null;
        this.lastData = {};
    }
}

module.exports = FirebaseChangeDetector;