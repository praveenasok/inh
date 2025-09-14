const admin = require('firebase-admin');
const path = require('path');

async function verifyFirebaseData() {
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
    
    console.log('🔄 Connecting to Firebase...');
    
    // Get products collection
    console.log('📊 Fetching products from Firebase...');
    const productsSnapshot = await db.collection('products').get();
    
    if (productsSnapshot.empty) {
      console.log('📭 No products found in Firebase database');
      return;
    }
    
    const products = [];
    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${products.length} products in Firebase`);
    
    // Group by price lists
    const priceLists = {};
    products.forEach(product => {
      const priceList = product.PriceListName || product.PriceList || product['Price List Name'] || 'Unknown';
      if (!priceLists[priceList]) {
        priceLists[priceList] = [];
      }
      priceLists[priceList].push(product);
    });
    
    console.log('\n📋 Price Lists in Firebase:');
    Object.entries(priceLists).forEach(([priceList, products]) => {
      console.log(`  ${priceList}: ${products.length} products`);
    });
    
    // Group by categories
    const categories = {};
    products.forEach(product => {
      const category = product.Category || 'Unknown';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });
    
    console.log('\n📂 Categories in Firebase:');
    Object.entries(categories).forEach(([category, products]) => {
      console.log(`  ${category}: ${products.length} products`);
    });
    
    // Show sample products
    console.log('\n📄 Sample Products:');
    products.slice(0, 3).forEach((product, index) => {
      console.log(`\n  Product ${index + 1}:`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Price List: ${product.PriceListName || product.PriceList || 'N/A'}`);
      console.log(`    Category: ${product.Category || 'N/A'}`);
      console.log(`    Product: ${product.Product || 'N/A'}`);
      console.log(`    Rate: ${product.Rate || 'N/A'}`);
      console.log(`    Length: ${product.Length || 'N/A'}`);
    });
    
    console.log('\n🎉 Firebase data verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying Firebase data:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifyFirebaseData();