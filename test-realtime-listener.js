const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('🧪 Testing Firebase Real-time Listener...');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

console.log('📡 Setting up real-time listener for quotes collection...');

const unsubscribe = db.collection('quotes').onSnapshot(snapshot => {
  console.log('🔄 Real-time update detected!');
  console.log('📊 Current quote count:', snapshot.size);
  
  snapshot.docChanges().forEach(change => {
    const quoteData = change.doc.data();
    const clientName = quoteData.clientName || quoteData.customerName || 'Unknown';
    
    switch(change.type) {
      case 'added':
        console.log('➕ Quote ADDED:', change.doc.id, '- Client:', clientName);
        break;
      case 'modified':
        console.log('✏️  Quote MODIFIED:', change.doc.id, '- Client:', clientName);
        break;
      case 'removed':
        console.log('🗑️  Quote DELETED:', change.doc.id, '- Client:', clientName);
        break;
    }
  });
  
  if (snapshot.docChanges().length === 0) {
    console.log('📋 Initial snapshot loaded, no changes detected');
  }
  
}, error => {
  console.error('❌ Listener error:', error.message);
  console.error('Error code:', error.code);
});

console.log('⏰ Listener active for 10 seconds...');
console.log('💡 Try deleting a quote from the web interface to test real-time updates!');

setTimeout(() => {
  console.log('\n🏁 Test completed, unsubscribing listener...');
  unsubscribe();
  process.exit(0);
}, 10000);