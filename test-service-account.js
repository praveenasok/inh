const admin = require('firebase-admin');
const path = require('path');

async function testServiceAccountAuth() {
  try {
    console.log('🔍 Testing Firebase Admin Service Account Authentication...');
    
    // Check if service account file exists
    const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
    console.log(`📁 Service account path: ${serviceAccountPath}`);
    
    try {
      const serviceAccount = require(serviceAccountPath);
      console.log('✅ Service account file loaded successfully');
      console.log(`📋 Project ID: ${serviceAccount.project_id}`);
      console.log(`📧 Client Email: ${serviceAccount.client_email}`);
    } catch (error) {
      console.error('❌ Failed to load service account file:', error.message);
      return;
    }
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      console.log('🚀 Initializing Firebase Admin...');
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'inhpricelistgenerator'
      });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('✅ Firebase Admin already initialized');
    }
    
    // Test Firestore connection
    console.log('🔗 Testing Firestore connection...');
    const db = admin.firestore();
    
    // Try to read from a collection
    console.log('📖 Testing read access to products collection...');
    const productsSnapshot = await db.collection('products').limit(1).get();
    console.log(`✅ Successfully connected to Firestore. Found ${productsSnapshot.size} documents in products collection.`);
    
    // Test write access
    console.log('✏️ Testing write access...');
    const testDoc = db.collection('test').doc('auth-test');
    await testDoc.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Service account authentication test',
      success: true
    });
    console.log('✅ Successfully wrote test document to Firestore');
    
    // Clean up test document
    await testDoc.delete();
    console.log('🧹 Cleaned up test document');
    
    console.log('🎉 Service account authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Service account authentication test failed:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

// Run the test
testServiceAccountAuth().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});