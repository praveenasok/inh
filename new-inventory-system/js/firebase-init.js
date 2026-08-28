// Firebase Configuration
const firebaseConfig = {
    projectId: "inhsuite",
    appId: "1:354912080861:web:05d3903253cdfdd78c1c34",
    storageBucket: "inhsuite.firebasestorage.app",
    apiKey: "AIzaSyB-38dsS5XPZA3lvtW7bqRzaWURTlSnWIk",
    authDomain: "inhsuite.firebaseapp.com",
    messagingSenderId: "354912080861",
    measurementId: "G-T0MTY8584L"
};

// Initialize Firebase only if it hasn't been initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
const db = firebase.firestore();

// Optional: Enable offline persistence
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});

// Expose db to global scope for modules to use
window.db = db;
