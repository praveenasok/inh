const admin = require('firebase-admin');
const http = require('http');
const path = require('path');

async function embedFirebaseData() {
  try {
    // Initialize Firebase Admin if not already done
    if (!admin.apps.length) {
      const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'inhpricelistgenerator'
      });
    }
    
    const db = admin.firestore();
    
    // Fetch products from Firebase
    console.log('Fetching products from Firebase...');
    const productsSnapshot = await db.collection('products').get();
    const products = [];
    
    productsSnapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${products.length} products in Firebase`);
    
    if (products.length === 0) {
      console.log('No products found in Firebase');
      return;
    }
    
    // Prepare data for embedding
    const data = {
      products: products,
      salesmen: []
    };
    
    // Send to embed API
    const postData = JSON.stringify({ target: 'mainApp', data: data });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/embed-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log('Embed response:', responseData);
        console.log('Data embedding completed successfully!');
        process.exit(0);
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e.message);
      process.exit(1);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

embedFirebaseData();