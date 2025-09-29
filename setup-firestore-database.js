/**
 * Firestore Database and Collections Setup Script
 * This script creates the necessary database structure for the INH application
 */

const admin = require('firebase-admin');
const path = require('path');

class FirestoreSetup {
    constructor() {
        this.db = null;
        this.collections = [
            'products',
            'salesmen', 
            'companies',
            'colors',
            'styles',
            'clients',
            'orders',
            'quotes',
            'pricelists'
        ];
    }

    async initialize() {

        try {
            // Initialize Firebase Admin
            const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
            const serviceAccount = require(serviceAccountPath);
            
            const app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            }, 'setup-app');
            
            this.db = admin.firestore(app);
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async createDatabase() {
        
        try {
            // Try to access Firestore (this will create the database if it doesn't exist)
            const collections = await this.db.listCollections();
            
            return true;
        } catch (error) {
            if (error.code === 5) { // NOT_FOUND
                return false;
            } else {
                return false;
            }
        }
    }

    async createCollections() {
        
        const sampleData = {
            products: {
                id: 'sample_product',
                name: 'Sample Product',
                category: 'DIY',
                density: 'Double Drawn',
                length: '4',
                price: 100,
                currency: 'INR',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            salesmen: {
                id: 'sample_salesman',
                name: 'Sample Salesman',
                email: 'salesman@example.com',
                territory: 'Sample Territory',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            companies: {
                id: 'sample_company',
                name: 'Sample Company',
                address: 'Sample Address',
                contact: 'Sample Contact',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            colors: {
                id: 'sample_color',
                name: 'Sample Color',
                code: '#000000',
                category: 'Basic',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            styles: {
                id: 'sample_style',
                name: 'Sample Style',
                description: 'Sample Style Description',
                category: 'Basic',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            clients: {
                id: 'sample_client',
                name: 'Sample Client',
                email: 'client@example.com',
                phone: '+1234567890',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            orders: {
                id: 'sample_order',
                client_id: 'sample_client',
                products: [],
                total: 0,
                status: 'pending',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            quotes: {
                id: 'sample_quote',
                client_id: 'sample_client',
                products: [],
                total: 0,
                status: 'draft',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            },
            pricelists: {
                id: 'sample_pricelist',
                name: 'Sample Pricelist',
                currency: 'INR',
                products: [],
                created_at: admin.firestore.FieldValue.serverTimestamp()
            }
        };

        for (const collectionName of this.collections) {
            try {
                
                // Create a sample document to initialize the collection
                const docRef = this.db.collection(collectionName).doc('sample_doc');
                await docRef.set(sampleData[collectionName] || {
                    id: 'sample',
                    name: `Sample ${collectionName}`,
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });
                
                
                // Immediately delete the sample document (we just needed it to create the collection)
                await docRef.delete();
                
            } catch (error) {
            }
        }
    }

    async verifySetup() {
        
        try {
            const collections = await this.db.listCollections();
            
            collections.forEach(collection => {
            });
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async runFullSetup() {
        
        // Step 1: Initialize
        const initialized = await this.initialize();
        if (!initialized) {
            return false;
        }
        
        // Step 2: Create/Access Database
        const databaseReady = await this.createDatabase();
        if (!databaseReady) {
            return false;
        }
        
        // Step 3: Create Collections
        await this.createCollections();
        
        // Step 4: Verify Setup
        const verified = await this.verifySetup();
        
        if (verified) {
        } else {
        }
        
        return verified;
    }
}

// Run the setup
async function main() {
    const setup = new FirestoreSetup();
    const success = await setup.runFullSetup();
    process.exit(success ? 0 : 1);
}

// Execute if run directly
if (require.main === module) {
    main().catch(error => {
        process.exit(1);
    });
}

module.exports = FirestoreSetup;