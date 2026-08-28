const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'inhsuite.firebasestorage.app'
});
const bucket = admin.storage().bucket();
bucket.getFiles().then(results => {
  const files = results[0];
  files.forEach(file => console.log(file.name));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
