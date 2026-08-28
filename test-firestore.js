const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function check() {
  const rm = await db.collection('ratioMixer').limit(5).get();
  console.log("ratioMixer:");
  rm.forEach(d => console.log(d.id, Object.keys(d.data())));
  
  const pl = await db.collection('priceLists').limit(5).get();
  console.log("\npriceLists:");
  pl.forEach(d => console.log(d.id, Object.keys(d.data())));
  process.exit(0);
}
check();
