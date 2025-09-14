const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearFirebaseCollections() {
  try {
    console.log('🗑️ Starting to clear Firebase collections...');
    
    // Clear products collection
    console.log('📦 Clearing products collection...');
    const productsSnapshot = await db.collection('products').get();
    console.log(`Found ${productsSnapshot.size} products to delete`);
    
    const productBatch = db.batch();
    productsSnapshot.docs.forEach(doc => {
      productBatch.delete(doc.ref);
    });
    
    if (productsSnapshot.size > 0) {
      await productBatch.commit();
      console.log(`✅ Deleted ${productsSnapshot.size} products`);
    } else {
      console.log('📦 Products collection is already empty');
    }
    
    // Clear salesmen collection
    console.log('👥 Clearing salesmen collection...');
    const salesmenSnapshot = await db.collection('salesmen').get();
    console.log(`Found ${salesmenSnapshot.size} salesmen to delete`);
    
    const salesmenBatch = db.batch();
    salesmenSnapshot.docs.forEach(doc => {
      salesmenBatch.delete(doc.ref);
    });
    
    if (salesmenSnapshot.size > 0) {
      await salesmenBatch.commit();
      console.log(`✅ Deleted ${salesmenSnapshot.size} salesmen`);
    } else {
      console.log('👥 Salesmen collection is already empty');
    }
    
    // Clear clients collection if it exists
    console.log('👤 Clearing clients collection...');
    const clientsSnapshot = await db.collection('clients').get();
    console.log(`Found ${clientsSnapshot.size} clients to delete`);
    
    const clientsBatch = db.batch();
    clientsSnapshot.docs.forEach(doc => {
      clientsBatch.delete(doc.ref);
    });
    
    if (clientsSnapshot.size > 0) {
      await clientsBatch.commit();
      console.log(`✅ Deleted ${clientsSnapshot.size} clients`);
    } else {
      console.log('👤 Clients collection is already empty');
    }
    
    console.log('🎉 All Firebase collections have been cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing Firebase collections:', error);
    process.exit(1);
  }
}

// Run the clearing process
clearFirebaseCollections()
  .then(() => {
    console.log('✨ Firebase data clearing completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Failed to clear Firebase data:', error);
    process.exit(1);
  });