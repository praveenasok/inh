const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('Testing Firebase connection...');
console.log('Project ID from service account:', serviceAccount.project_id);
console.log('Client email:', serviceAccount.client_email);

try {
  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }

  const db = admin.firestore();
  console.log('Firebase Admin SDK initialized successfully');
  
  // Test basic connection
  console.log('Testing basic Firestore connection...');
  
  // Try to list collections (this should work even if no collections exist)
  db.listCollections()
    .then(collections => {
      console.log('✓ Successfully connected to Firestore');
      console.log('Existing collections:', collections.map(col => col.id));
      
      if (collections.length === 0) {
        console.log('No collections found - this is expected for a new project');
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to connect to Firestore:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  if (error.code) {
    console.error('Error code:', error.code);
  }
  process.exit(1);
}