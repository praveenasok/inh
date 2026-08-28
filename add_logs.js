const fs = require('fs');

let conf = fs.readFileSync('firebase-config.js', 'utf8');
conf = conf.replace('function initializeFirebaseApp() {', 'function initializeFirebaseApp() {\n  console.log("==> firebase-config.js initializeFirebaseApp called");');
fs.writeFileSync('firebase-config.js', conf);

let global = fs.readFileSync('firebase-global-init.js', 'utf8');
global = global.replace('async function initializeFirebaseApp() {', 'async function initializeFirebaseApp() {\n  console.log("==> firebase-global-init.js initializeFirebaseApp called");');
global = global.replace('await firestore.enablePersistence({', 'console.log("==> executing enablePersistence in firebase-global-init.js");\n            await firestore.enablePersistence({');
fs.writeFileSync('firebase-global-init.js', global);

console.log('Logs added');
