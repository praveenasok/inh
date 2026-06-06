const admin = require('firebase-admin');

async function test() {
  console.log('Initializing Firebase Admin...');
  try {
    const serviceAccount = require('/Users/praveenasok/Desktop/inhsuite/service-account-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    const sheetId = '1-5mGLKf94MSLW9phoBNsqY7QoJSqkAh29YxVQs-Bf_s';
    
    console.log(`Reading storage/${sheetId}_delegations...`);
    const delegationsDoc = await db.collection('storage').doc(`${sheetId}_delegations`).get();
    if (delegationsDoc.exists) {
      console.log('Delegations Doc Data:', delegationsDoc.data());
    } else {
      console.log('Delegations Doc does not exist!');
    }
    
    console.log(`Reading storage/${sheetId}_remarks...`);
    const remarksDoc = await db.collection('storage').doc(`${sheetId}_remarks`).get();
    if (remarksDoc.exists) {
      console.log('Remarks Doc Data:', remarksDoc.data());
    } else {
      console.log('Remarks Doc does not exist!');
    }

    console.log(`Reading storage/${sheetId}_employees...`);
    const employeesDoc = await db.collection('storage').doc(`${sheetId}_employees`).get();
    if (employeesDoc.exists) {
      console.log('Employees Doc Data:', employeesDoc.data());
    } else {
      console.log('Employees Doc does not exist!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to read Firestore doc:', err);
    process.exit(1);
  }
}

test();
