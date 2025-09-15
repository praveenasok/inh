const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('Checking for orders in Firebase...');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

db.collection('orders').get().then(snapshot => {
  console.log('Total orders in Firebase:', snapshot.size);
  
  if (snapshot.size === 0) {
    console.log('No orders found in Firebase.');
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('Order ID:', doc.id);
      console.log('Client:', data.clientName || 'No client');
      console.log('Order Number:', data.orderNumber || 'No order number');
      console.log('Total Amount:', data.totalAmount || 'No amount');
      console.log('Created:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('Status:', data.status || 'No status');
      console.log('---');
    });
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error checking Firebase orders:', err.message);
  process.exit(1);
});