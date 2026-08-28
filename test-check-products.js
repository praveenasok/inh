const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
  const products = await db.collection("products").limit(1).get();
  console.log("Products count:", products.size);

  const pricelists = await db.collection("pricelists").limit(1).get();
  console.log("Pricelists count:", pricelists.size);
  
  process.exit();
}

checkCollections();
