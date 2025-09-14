// Script to display Firebase pricelist data
// Run this in the browser console or as a standalone script

async function showFirebasePricelistData() {
  try {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded');
      return;
    }

    if (!firebase.apps.length) {
      console.error('❌ Firebase not initialized');
      return;
    }

    console.log('🔄 Connecting to Firebase...');
    const db = firebase.firestore();
    
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
    console.log('📋 Product Data:');
    console.table(products);

    // Group by categories
    const categories = {};
    products.forEach(product => {
      const category = product.Category || 'Unknown';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    console.log('📊 Products by Category:');
    Object.keys(categories).forEach(category => {
      console.log(`\n🏷️  ${category} (${categories[category].length} products):`);
      categories[category].forEach(product => {
        console.log(`   • ${product.Product || 'Unknown Product'} - ${product.Rate || 'No Rate'} ${product.Currency || ''}`);
      });
    });

    // Group by price lists
    const priceLists = {};
    products.forEach(product => {
      const priceList = product.PriceList || product['Price List Name'] || 'Unknown';
      if (!priceLists[priceList]) {
        priceLists[priceList] = [];
      }
      priceLists[priceList].push(product);
    });

    console.log('\n💰 Products by Price List:');
    Object.keys(priceLists).forEach(priceList => {
      console.log(`\n💳 ${priceList} (${priceLists[priceList].length} products):`);
      priceLists[priceList].slice(0, 5).forEach(product => {
        console.log(`   • ${product.Product || 'Unknown Product'} - ${product.Rate || 'No Rate'} ${product.Currency || ''}`);
      });
      if (priceLists[priceList].length > 5) {
        console.log(`   ... and ${priceLists[priceList].length - 5} more`);
      }
    });

    return products;

  } catch (error) {
    console.error('❌ Error fetching Firebase data:', error);
    
    // Check for specific error types
    if (error.code === 'permission-denied') {
      console.log('🔒 Permission denied. You may need to authenticate or check Firestore rules.');
    } else if (error.code === 'unavailable') {
      console.log('🌐 Firebase service unavailable. Check your internet connection.');
    }
    
    return null;
  }
}

// Also check for any cached Firebase data
function showCachedFirebaseData() {
  console.log('\n🗄️  Checking for cached Firebase data...');
  
  const cachedData = localStorage.getItem('firebaseProductData');
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      console.log('✅ Found cached Firebase data:');
      console.log(`📅 Loaded at: ${data.loadedAt}`);
      console.log(`📊 Products: ${data.products?.length || 0}`);
      console.log(`👥 Salesmen: ${data.salesmen?.length || 0}`);
      console.log(`🔗 Source: ${data.source}`);
      
      if (data.products && data.products.length > 0) {
        console.log('\n📋 Sample cached products:');
        console.table(data.products.slice(0, 5));
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error parsing cached data:', error);
    }
  } else {
    console.log('📭 No cached Firebase data found');
  }
  
  return null;
}

// Function to check Firebase connection status
function checkFirebaseStatus() {
  console.log('🔍 Firebase Status Check:');
  console.log(`Firebase SDK loaded: ${typeof firebase !== 'undefined'}`);
  
  if (typeof firebase !== 'undefined') {
    console.log(`Firebase apps initialized: ${firebase.apps.length}`);
    
    if (firebase.apps.length > 0) {
      const app = firebase.apps[0];
      console.log(`Project ID: ${app.options.projectId}`);
      console.log(`Auth Domain: ${app.options.authDomain}`);
      
      // Check if user is authenticated
      if (firebase.auth && firebase.auth().currentUser) {
        console.log(`✅ Authenticated as: ${firebase.auth().currentUser.email || 'Anonymous'}`);
      } else {
        console.log('🔓 Not authenticated (may still work with public rules)');
      }
    }
  }
}

// Export functions for use
if (typeof window !== 'undefined') {
  window.showFirebasePricelistData = showFirebasePricelistData;
  window.showCachedFirebaseData = showCachedFirebaseData;
  window.checkFirebaseStatus = checkFirebaseStatus;
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Firebase Data Viewer loaded');
  console.log('📝 Available functions:');
  console.log('   • showFirebasePricelistData() - Fetch live data from Firebase');
  console.log('   • showCachedFirebaseData() - Show cached data from localStorage');
  console.log('   • checkFirebaseStatus() - Check Firebase connection status');
  console.log('\n💡 Run any of these functions in the console to view data');
}

// If running in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showFirebasePricelistData,
    showCachedFirebaseData,
    checkFirebaseStatus
  };
}