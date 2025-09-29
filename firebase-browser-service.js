// Browser-compatible Firebase service for admin panel
class FirebaseBrowserService {
    constructor() {
        this.isInitialized = false;
        this.db = null;
    }

    async initialize() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            // Initialize Firebase if not already done
            if (!firebase.apps.length) {
                // Use the initializeFirebaseApp function from firebase-config.js
                if (typeof window.initializeFirebaseApp === 'function') {
                    window.initializeFirebaseApp();
                } else {
                    throw new Error('Firebase config not available');
                }
            }

            this.db = firebase.firestore();
            this.isInitialized = true;
            return true;
        } catch (error) {
            this.isInitialized = false;
            return false;
        }
    }

    async getAll(collection) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const snapshot = await this.db.collection(collection).get();
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            throw error;
        }
    }

    async getAllData(collection) {
        // Alias for getAll method to maintain compatibility
        return await this.getAll(collection);
    }

    async getCount(collection) {
        try {
            const data = await this.getAll(collection);
            return data.length;
        } catch (error) {
            return 0;
        }
    }

    async testConnection() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            // Try to read from a collection to test connection
            await this.getCount('products');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.FirebaseBrowserService = FirebaseBrowserService;
    // Initialize the service
    window.firebaseSyncService = new FirebaseBrowserService();
}