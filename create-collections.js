const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'inh-price-list-sync'
  });
}

const db = admin.firestore();

async function createCollections() {
  try {
    console.log('Creating necessary Firebase collections...');
    
    // Create products collection
    console.log('Creating products collection...');
    await db.collection('products').doc('_placeholder').set({
      name: 'Placeholder Product',
      price: 0,
      category: 'placeholder',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isPlaceholder: true
    });
    console.log('✓ Products collection created');
    
    // Create sync_logs collection
    console.log('Creating sync_logs collection...');
    await db.collection('sync_logs').doc('_placeholder').set({
      type: 'initialization',
      status: 'success',
      message: 'Collections initialized',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isPlaceholder: true
    });
    console.log('✓ Sync logs collection created');
    
    // Create config collection with salesmen document
    console.log('Creating config collection...');
    await db.collection('config').doc('salesmen').set({
      salesmen: [],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      initialized: true
    });
    console.log('✓ Config collection created');
    
    // Create clients collection (for future use)
    console.log('Creating clients collection...');
    await db.collection('clients').doc('_placeholder').set({
      name: 'Placeholder Client',
      email: 'placeholder@example.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isPlaceholder: true
    });
    console.log('✓ Clients collection created');
    
    console.log('\n🎉 All collections created successfully!');
    console.log('\nCollections created:');
    console.log('- products (for product data)');
    console.log('- sync_logs (for sync activity tracking)');
    console.log('- config (for system configuration)');
    console.log('- clients (for client management)');
    
    // Clean up placeholder documents
    console.log('\nCleaning up placeholder documents...');
    await db.collection('products').doc('_placeholder').delete();
    await db.collection('sync_logs').doc('_placeholder').delete();
    await db.collection('clients').doc('_placeholder').delete();
    console.log('✓ Placeholder documents removed');
    
    console.log('\n✅ Firebase collections setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating collections:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
  } finally {
    process.exit(0);
  }
}

createCollections();