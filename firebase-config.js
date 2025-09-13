// Firebase Configuration
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
  // TODO: Replace with your Firebase project configuration
  // You can find these values in your Firebase Console > Project Settings > General > Your apps
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

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