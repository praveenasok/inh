// Simple Firebase Web SDK Query Script
// This script uses the web SDK to query Firebase data

const firebaseConfig = require('./firebase-config.js');

console.log('🔥 Firebase Configuration:');
console.log(`   Project ID: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`   API Key: ${firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'Not set'}`);
console.log('=' .repeat(50));

console.log('\n📝 To view the Firebase pricelist database:');
console.log('\n🌐 Option 1: Use the Web Viewer');
console.log('   1. Open firebase-data-viewer.html in your browser');
console.log('   2. Click "Load Live Data" to fetch from Firebase');
console.log('   3. Click "Show Cached Data" to see local data');

console.log('\n🔧 Option 2: Use Firebase Console');
console.log('   1. Go to: https://console.firebase.google.com/');
console.log('   2. Select project: inhpricelistgenerator');
console.log('   3. Navigate to Firestore Database');
console.log('   4. Browse collections: products, clients, quotes, salesmen');

console.log('\n💻 Option 3: Use Browser Console');
console.log('   1. Open firebase-data-viewer.html in browser');
console.log('   2. Open Developer Tools (F12)');
console.log('   3. In console, run: loadFirebaseData()');
console.log('   4. Or run: showFirebasePricelistData()');

console.log('\n🔍 Option 4: Check Local Data Files');
console.log('   - data.json: Local product data');
console.log('   - users.json: User data');
console.log('   - PriceLists/productData.xlsx: Excel source');

console.log('\n📊 Database Collections Expected:');
console.log('   - products: Product catalog with prices');
console.log('   - clients: Customer information');
console.log('   - quotes: Generated quotes');
console.log('   - salesmen: Sales team data');

console.log('\n' + '='.repeat(50));
console.log('✅ Firebase query information displayed');
console.log('   Use the web viewer for interactive access!');
console.log('='.repeat(50));