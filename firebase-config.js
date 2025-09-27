const firebaseConfig = {
  apiKey: "AIzaSyCW3FsY_QwFuqZiQaWg4jmmmjlSUR9DxNA",
  authDomain: "inhpricelistgenerator.firebaseapp.com",
  projectId: "inhpricelistgenerator",
  storageBucket: "inhpricelistgenerator.firebasestorage.app",
  messagingSenderId: "263357798472",
  appId: "1:263357798472:web:e03f4a7264a19fe4bfe07d"
};

const firebaseCollections = {
  PRODUCTS: 'products',
  STYLES: 'styles',
  COLORS: 'colors',
  CLIENTS: 'clients',
  SALESMEN: 'salesmen',
  QUOTES: 'quotes',
  ORDERS: 'orders',
  STORAGE: 'storage'
};

let firebaseInitialized = false;
let firebaseApp = null;

if (typeof window !== 'undefined' && window.firebaseConfig) {
} else {

function initializeFirebaseApp() {
  try {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }

    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      
      // Configure Firestore with stable settings to reduce connection errors
      const db = firebase.firestore();
      db.settings({
        experimentalForceLongPolling: false,
        merge: true,
        ignoreUndefinedProperties: true,
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      
      // Add connection state monitoring
      db.enableNetwork().catch(error => {
        console.warn('Firebase network enable failed:', error);
      });
      
      if (firebase.auth) {
        if (firebase.auth) {
          firebase.auth().languageCode = 'en';
        }
      }
      
      firebaseInitialized = true;
    } else {
      firebaseApp = firebase.app();
      firebaseInitialized = true;
    }
    
    return firebaseApp;
  } catch (error) {
    firebaseInitialized = false;
    throw error;
  }
}

function isFirebaseInitialized() {
  return firebaseInitialized;
}

function getFirebaseApp() {
  return firebaseApp;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    firebaseConfig,
    firebaseCollections,
    initializeFirebaseApp,
    isFirebaseInitialized,
    getFirebaseApp
  };
}

window.firebaseConfig = firebaseConfig;
window.firebaseCollections = firebaseCollections;
window.initializeFirebaseApp = initializeFirebaseApp;
window.isFirebaseInitialized = isFirebaseInitialized;
window.getFirebaseApp = getFirebaseApp;

}