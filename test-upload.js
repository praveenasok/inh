const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'inhsuite.firebasestorage.app'
});
const bucket = admin.storage().bucket();
bucket.file('test_upload_2.txt').save('hello world', (err) => {
  if (err) {
    console.error('Upload failed:', err.message);
    process.exit(1);
  } else {
    console.log('Upload successful');
    process.exit(0);
  }
});
