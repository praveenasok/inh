const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'inh-price-list-sync'
});

const db = admin.firestore();

async function initializeCollections() {
  console.log('🔥 Initializing Firebase Collections...');
  
  try {
    // Create products collection with a sample document
    console.log('📦 Creating products collection...');
    await db.collection('products').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Placeholder document to initialize collection'
    });
    
    // Create salesmen collection
    console.log('👥 Creating salesmen collection...');
    await db.collection('salesmen').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Placeholder document to initialize collection'
    });
    
    // Create sync_logs collection
    console.log('📋 Creating sync_logs collection...');
    await db.collection('sync_logs').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Placeholder document to initialize collection'
    });
    
    // Create config collection for system configuration
    console.log('⚙️ Creating config collection...');
    await db.collection('config').doc('sync_settings').set({
      lastSync: null,
      syncInterval: 12, // hours
      autoSync: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ All collections initialized successfully!');
    console.log('\n📊 Created collections:');
    console.log('  - products (for product data from Google Sheets)');
    console.log('  - salesmen (for salesman data from Google Sheets)');
    console.log('  - sync_logs (for tracking sync activities)');
    console.log('  - config (for system configuration)');
    
    // Clean up placeholder documents
    console.log('\n🧹 Cleaning up placeholder documents...');
    await db.collection('products').doc('_init').delete();
    await db.collection('salesmen').doc('_init').delete();
    await db.collection('sync_logs').doc('_init').delete();
    
    console.log('✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error initializing collections:', error);
  } finally {
    process.exit(0);
  }
}

// List existing collections
async function listCollections() {
  try {
    console.log('📋 Listing existing collections...');
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('  No collections found.');
    } else {
      console.log('  Existing collections:');
      collections.forEach(collection => {
        console.log(`    - ${collection.id}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error listing collections:', error);
  }
}

// Main execution
async function main() {
  await listCollections();
  await initializeCollections();
}

main();