const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using application default credentials
// This will use the Firebase CLI authentication
try {
  admin.initializeApp({
    projectId: 'inhpricelistgenerator'
  });
} catch (error) {
  console.log('Firebase already initialized');
}

const db = admin.firestore();

async function createMissingCollections() {
  try {
    console.log('Creating missing Firebase collections...');
    
    // Create sync_logs collection
    console.log('Creating sync_logs collection...');
    await db.collection('sync_logs').add({
      type: 'initialization',
      status: 'success',
      message: 'Sync logs collection created',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isSetup: true
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
    
    console.log('\n🎉 Missing collections created successfully!');
    console.log('\nExisting collections:');
    console.log('- products (already exists)');
    console.log('- clients (already exists)');
    console.log('- quotes (already exists)');
    console.log('\nNew collections:');
    console.log('- sync_logs (for sync activity tracking)');
    console.log('- config (for system configuration)');
    
  } catch (error) {
    console.error('❌ Error creating collections:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    process.exit(0);
  }
}

createMissingCollections();