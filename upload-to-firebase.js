const FirebaseSyncService = require('./firebase-sync-service');
const fs = require('fs');
const path = require('path');

async function uploadProductsToFirebase() {
  const syncService = new FirebaseSyncService();
  
  try {
    console.log('🔥 Initializing Firebase Sync Service...');
    await syncService.initialize();
    
    // Read the pricelists data
    const pricelistsDataPath = path.join(__dirname, 'pricelists-data.json');
    const pricelistsData = JSON.parse(fs.readFileSync(pricelistsDataPath, 'utf8'));
    
    console.log(`📊 Found ${pricelistsData.length} products to upload`);
    
    // Transform the data to match Firebase schema
    const transformedProducts = pricelistsData.map((product, index) => {
      return {
        id: `product_${index + 1}`,
        ...product,
        PriceListName: product['Price List Name'] || product.PriceListName || product.PriceList,
        PriceList: product['Price List Name'] || product.PriceListName || product.PriceList,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    
    // Upload products in batches to avoid timeout
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < transformedProducts.length; i += batchSize) {
      batches.push(transformedProducts.slice(i, i + batchSize));
    }
    
    console.log(`📦 Uploading ${batches.length} batches of products...`);
    
    let totalUploaded = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`⬆️  Uploading batch ${i + 1}/${batches.length} (${batch.length} products)...`);
      
      // Use Firebase Admin SDK directly for batch upload
      const db = syncService.db;
      const batchWrite = db.batch();
      
      batch.forEach(product => {
        const docRef = db.collection('products').doc(product.id);
        batchWrite.set(docRef, product);
      });
      
      await batchWrite.commit();
      totalUploaded += batch.length;
      
      console.log(`✅ Batch ${i + 1} uploaded successfully. Total: ${totalUploaded}/${transformedProducts.length}`);
      
      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`🎉 Successfully uploaded ${totalUploaded} products to Firebase!`);
    
    // Show price list distribution
    const priceListCounts = {};
    transformedProducts.forEach(product => {
      const priceList = product.PriceListName || product.PriceList;
      if (priceList) {
        priceListCounts[priceList] = (priceListCounts[priceList] || 0) + 1;
      }
    });
    
    console.log('\n📋 Price List Distribution in Firebase:');
    Object.entries(priceListCounts).forEach(([priceList, count]) => {
      console.log(`  ${priceList}: ${count} products`);
    });
    
  } catch (error) {
    console.error('❌ Error uploading to Firebase:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadProductsToFirebase();