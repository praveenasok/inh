// Firebase Configuration
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
  // Firebase project configuration for inhpricelistgenerator
  // Actual values from Firebase Console
  apiKey: "AIzaSyCW3FsY_QwFuqZiQaWg4jmmmjlSUR9DxNA",
  authDomain: "inhpricelistgenerator.firebaseapp.com",
  projectId: "inhpricelistgenerator",
  storageBucket: "inhpricelistgenerator.firebasestorage.app",
  messagingSenderId: "263357798472",
  appId: "1:263357798472:web:e03f4a7264a19fe4bfe07d",
  // measurementId: "G-XXXXXXXXXX" // Enable when Google Analytics is configured
};

// Note: Replace the above values with your actual Firebase configuration
// from Firebase Console > Project Settings > General > Your apps

// Initialize Firebase
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Analytics (optional) - Disabled until Google Analytics is configured
    // if (typeof firebase.analytics !== 'undefined') {
    //   firebase.analytics();
    // }
    
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase SDK not loaded');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}