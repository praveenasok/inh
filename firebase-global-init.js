/**
 * Firebase Global Initialization
 * This file provides centralized Firebase initialization for the entire application
 * Depends on firebase-config.js being loaded first
 */

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Global Firebase state (only if not already defined)
if (typeof window !== 'undefined') {
  window.firebaseGlobalInitialized = window.firebaseGlobalInitialized || false;
  window.firebaseGlobalApp = window.firebaseGlobalApp || null;
  window.firebaseGlobalInitPromise = window.firebaseGlobalInitPromise || null;
}

/**
 * Initialize Firebase App with enhanced configuration
 * @returns {Promise<firebase.app.App>} Firebase app instance
 */
async function initializeFirebaseApp() {
  // Return existing promise if initialization is already in progress
  if (window.firebaseGlobalInitPromise) {
    return window.firebaseGlobalInitPromise;
  }

  // Return existing app if already initialized
  if (window.firebaseGlobalInitialized && window.firebaseGlobalApp) {
    return window.firebaseGlobalApp;
  }

  // Check if firebase-config.js already initialized Firebase
  if (window.initializeFirebaseApp && window.initializeFirebaseApp !== initializeFirebaseApp) {
    try {
      const app = window.initializeFirebaseApp();
      window.firebaseGlobalApp = app;
      window.firebaseGlobalInitialized = true;
      return app;
    } catch (error) {
      console.warn('firebase-config.js initialization failed, trying manual init:', error);
    }
  }

  window.firebaseGlobalInitPromise = (async () => {
    try {
      // Check if Firebase SDK is loaded
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Please ensure Firebase scripts are included.');
      }

      // Initialize Firebase app if not already done
      if (!firebase.apps.length) {
        console.log('🔄 Initializing Firebase app...');
        
        // Use global firebaseConfig from firebase-config.js
        if (!window.firebaseConfig) {
          throw new Error('Firebase configuration not found. Please ensure firebase-config.js is loaded.');
        }
        
        const enhancedConfig = {
          ...window.firebaseConfig,
          experimentalForceLongPolling: true,
          useFetchStreams: false
        };
        
        window.firebaseGlobalApp = firebase.initializeApp(enhancedConfig);
        
        // Configure authentication if available
        if (firebase.auth) {
          firebase.auth().languageCode = 'en';
          
          // Enable anonymous authentication for unauthenticated users with retry
          try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
              console.log('🔐 Signing in anonymously...');
              await retryWithBackoff(async () => {
                await firebase.auth().signInAnonymously();
              }, 3, 1000);
              console.log('✅ Anonymous authentication successful');
            }
          } catch (authError) {
            console.warn('⚠️ Anonymous authentication failed after retries:', authError);
            // Continue without authentication - some operations may still work
          }
        }
        
        // Configure Firestore with offline persistence and retry settings
        if (firebase.firestore) {
          try {
            const firestore = firebase.firestore();
            
            // Enable offline persistence
            await firestore.enablePersistence({
              synchronizeTabs: true
            }).catch((err) => {
              if (err.code === 'failed-precondition') {
                console.warn('⚠️ Firestore persistence failed: Multiple tabs open');
              } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Firestore persistence not supported in this browser');
              }
            });
            
            // Configure network settings for better reliability
            firestore.settings({
              experimentalForceLongPolling: true, // Force long polling instead of WebSocket
              merge: true
            });
            
            console.log('✅ Firestore configured with offline persistence');
          } catch (firestoreError) {
            console.warn('⚠️ Firestore configuration failed:', firestoreError);
          }
        }
        
        console.log('✅ Firebase app initialized successfully');
      } else {
        window.firebaseGlobalApp = firebase.app();
        console.log('✅ Using existing Firebase app');
      }
      
      window.firebaseGlobalInitialized = true;
      
      // Dispatch global event for other scripts to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebase-initialized', {
          detail: { app: window.firebaseGlobalApp }
        }));
      }
      
      return window.firebaseGlobalApp;
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      window.firebaseGlobalInitialized = false;
      window.firebaseGlobalApp = null;
      
      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebase-initialization-failed', {
          detail: { error }
        }));
      }
      
      throw error;
    }
  })();

  return window.firebaseGlobalInitPromise;
}

/**
 * Check if Firebase is initialized
 * @returns {boolean} Firebase initialization status
 */
function isFirebaseInitialized() {
  return window.firebaseGlobalInitialized && window.firebaseGlobalApp !== null;
}

/**
 * Get Firebase app instance
 * @returns {firebase.app.App|null} Firebase app instance or null
 */
function getFirebaseApp() {
  if (!window.firebaseGlobalInitialized || !window.firebaseGlobalApp) {
    throw new Error('Firebase not initialized. Call initializeFirebaseApp() first.');
  }
  return window.firebaseGlobalApp;
}

/**
 * Wait for Firebase to be ready
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<firebase.app.App>} Firebase app instance
 */
async function waitForFirebase(timeout = 10000) {
  if (window.firebaseGlobalInitialized && window.firebaseGlobalApp) {
    return window.firebaseGlobalApp;
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Firebase initialization timeout'));
    }, timeout);
    
    const checkFirebase = () => {
      if (window.firebaseGlobalInitialized && window.firebaseGlobalApp) {
        clearTimeout(timeoutId);
        resolve(window.firebaseGlobalApp);
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    
    checkFirebase();
  });
}

// Auto-initialize Firebase when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure all Firebase scripts are loaded
      setTimeout(() => {
        initializeFirebaseApp().catch(error => {
          console.error('Auto-initialization failed:', error);
        });
      }, 100);
    });
  } else {
    // DOM is already ready
    setTimeout(() => {
      initializeFirebaseApp().catch(error => {
        console.error('Auto-initialization failed:', error);
      });
    }, 100);
  }
}

// Export for module systems (only new functions, config is handled by firebase-config.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeFirebaseApp,
    isFirebaseInitialized,
    getFirebaseApp,
    waitForFirebase
  };
}

// Global window exports (only new functions, config is handled by firebase-config.js)
if (typeof window !== 'undefined') {
  // Don't override existing config from firebase-config.js
  if (!window.initializeFirebaseApp) {
    window.initializeFirebaseApp = initializeFirebaseApp;
  }
  if (!window.isFirebaseInitialized) {
    window.isFirebaseInitialized = isFirebaseInitialized;
  }
  if (!window.getFirebaseApp) {
    window.getFirebaseApp = getFirebaseApp;
  }
  window.waitForFirebase = waitForFirebase;
}