const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Use the existing service account key
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'inhpricelistgenerator'
});

const db = getFirestore(app);

async function setupCollections() {
  try {
    console.log('Setting up Firebase collections...');
    
    // Create products collection
    console.log('Creating products collection...');
    await db.collection('products').doc('_init').set({
      name: 'Initial Product',
      price: 0,
      category: 'setup',
      createdAt: new Date(),
      isSetup: true
    });
    console.log('✓ Products collection created');
    
    // Create sync_logs collection
    console.log('Creating sync_logs collection...');
    await db.collection('sync_logs').doc('_init').set({
      type: 'setup',
      status: 'success',
      message: 'Collections setup completed',
      timestamp: new Date(),
      isSetup: true
    });
    console.log('✓ Sync logs collection created');
    
    // Create config collection
    console.log('Creating config collection...');
    await db.collection('config').doc('salesmen').set({
      salesmen: [],
      lastUpdated: new Date(),
      initialized: true
    });
    console.log('✓ Config collection created');
    
    // Create clients collection
    console.log('Creating clients collection...');
    await db.collection('clients').doc('_init').set({
      name: 'Initial Client',
      email: 'setup@example.com',
      createdAt: new Date(),
      isSetup: true
    });
    console.log('✓ Clients collection created');
    
    console.log('\n🎉 All collections created successfully!');
    
    // Clean up setup documents
    console.log('\nCleaning up setup documents...');
    await db.collection('products').doc('_init').delete();
    await db.collection('sync_logs').doc('_init').delete();
    await db.collection('clients').doc('_init').delete();
    console.log('✓ Setup documents removed');
    
    console.log('\n✅ Firebase collections are ready for use!');
    
  } catch (error) {
    console.error('❌ Error setting up collections:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    process.exit(0);
  }
}

setupCollections();