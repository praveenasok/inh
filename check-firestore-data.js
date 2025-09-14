// Script to check what data is currently in Firebase Firestore
// This will help identify what data needs to be cleared

async function checkFirestoreData() {
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

    console.log('🔄 Connecting to Firebase Firestore...');
    const db = firebase.firestore();
    
    // Check products collection
    console.log('\n📊 Checking products collection...');
    const productsSnapshot = await db.collection('products').get();
    console.log(`Found ${productsSnapshot.size} products`);
    
    if (!productsSnapshot.empty) {
      const products = [];
      productsSnapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      console.log('Products data:', products.slice(0, 3)); // Show first 3
      
      // Show categories
      const categories = [...new Set(products.map(p => p.Category))].filter(c => c);
      console.log('Categories found:', categories);
      
      // Show densities
      const densities = [...new Set(products.map(p => p.Density))].filter(d => d);
      console.log('Densities found:', densities);
      
      // Show lengths
      const lengths = [...new Set(products.map(p => p.Length))].filter(l => l);
      console.log('Lengths found:', lengths);
      
      // Show colors
      const colors = [...new Set(products.map(p => p.Colors))].filter(c => c);
      console.log('Colors found:', colors.slice(0, 10)); // Show first 10
    }
    
    // Check clients collection
    console.log('\n👥 Checking clients collection...');
    const clientsSnapshot = await db.collection('clients').get();
    console.log(`Found ${clientsSnapshot.size} clients`);
    
    // Check quotes collection
    console.log('\n📋 Checking quotes collection...');
    const quotesSnapshot = await db.collection('quotes').get();
    console.log(`Found ${quotesSnapshot.size} quotes`);
    
    // Check config collection (salesmen)
    console.log('\n👨‍💼 Checking config collection (salesmen)...');
    const configSnapshot = await db.collection('config').get();
    console.log(`Found ${configSnapshot.size} config documents`);
    
    if (!configSnapshot.empty) {
      configSnapshot.forEach(doc => {
        console.log(`Config doc ${doc.id}:`, doc.data());
      });
    }
    
    console.log('\n✅ Firestore data check completed');
    
  } catch (error) {
    console.error('❌ Error checking Firestore data:', error);
  }
}

// Run the check
checkFirestoreData();

console.log('\n🔧 To clear Firestore data:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com');
console.log('2. Select your project: inhpricelistgenerator');
console.log('3. Go to Firestore Database');
console.log('4. Delete collections: products, clients, quotes, config');
console.log('\nOr run: firebase firestore:delete --all-collections');