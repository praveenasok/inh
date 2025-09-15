const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('Checking for saved quotes in Firebase...');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

db.collection('quotes').get().then(snapshot => {
  console.log('Total quotes in Firebase:', snapshot.size);
  
  if (snapshot.size === 0) {
    console.log('No quotes found in Firebase.');
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('Quote ID:', doc.id);
      console.log('Client:', data.clientName || 'No client');
      console.log('Created:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('---');
    });
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error checking Firebase:', err.message);
  process.exit(1);
});