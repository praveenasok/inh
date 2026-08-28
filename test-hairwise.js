const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const doc = await db.collection('ratioMixer').doc('sharedSettings').get();
    const data = doc.data();
    const clients = data.clients || [];
    clients.forEach(c => {
        if (c.tag && c.tag.toUpperCase() === 'HAIRWISE') {
            console.log(`List: ${c.name}, prices keys:`, Object.keys(c.customPrices || {}));
        }
    });
    process.exit(0);
}
run().catch(console.error);
