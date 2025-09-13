// Firebase Configuration
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
  // Firebase project configuration for inhpricelistgenerator
  // Get actual values from Firebase Console > Project Settings > General > Your apps
  apiKey: "AIzaSyBvOiE9rTXHiOsNjGfnK8gHQRLCgKOgAbc",
  authDomain: "inhpricelistgenerator.firebaseapp.com",
  projectId: "inhpricelistgenerator",
  storageBucket: "inhpricelistgenerator.appspot.com",
  messagingSenderId: "263357798472",
  appId: "1:263357798472:web:abc123def456ghi789",
  measurementId: "G-XXXXXXXXXX"
};

// Note: Replace the above values with your actual Firebase configuration
// from Firebase Console > Project Settings > General > Your apps

// Initialize Firebase
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Analytics (optional)
    if (typeof firebase.analytics !== 'undefined') {
      firebase.analytics();
    }
    
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