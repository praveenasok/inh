// Allow local override of Firebase config via window.APP_LOCAL_FIREBASE_CONFIG
const defaultFirebaseConfig = {
  projectId: "inhsuite",
  appId: "1:354912080861:web:05d3903253cdfdd78c1c34",
  storageBucket: "inhsuite.firebasestorage.app",
  apiKey: "AIzaSyB-38dsS5XPZA3lvtW7bqRzaWURTlSnWIk",
  authDomain: "inhsuite.firebaseapp.com",
  messagingSenderId: "354912080861",
  measurementId: "G-T0MTY8584L"
};

let __override = null;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem('APP_LOCAL_FIREBASE_CONFIG');
    if (raw) {
      const obj = JSON.parse(raw);
      const key = obj && obj.apiKey;
      const pid = obj && obj.projectId;
      if (key && typeof key === 'string' && key.startsWith('AIza') && key.length > 20 && pid) {
        __override = obj;
      }
    }
  }
} catch (_) {}

if (typeof window !== 'undefined' && __override && !window.APP_LOCAL_FIREBASE_CONFIG) {
  window.APP_LOCAL_FIREBASE_CONFIG = __override;
}

const firebaseConfig = (typeof window !== 'undefined' && window.APP_LOCAL_FIREBASE_CONFIG)
  ? { ...defaultFirebaseConfig, ...window.APP_LOCAL_FIREBASE_CONFIG }
  : defaultFirebaseConfig;

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
  // Firebase config already exists
} else {
  // Define Firebase functions

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
        experimentalForceLongPolling: true,
        useFetchStreams: false,
        merge: true,
        ignoreUndefinedProperties: true,
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      
      // Add connection state monitoring
      db.enableNetwork().catch(error => {
        console.warn('Firebase network error:', error);
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
