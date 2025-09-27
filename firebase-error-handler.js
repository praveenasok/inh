/**
 * Firebase Error Handler
 * Provides centralized error handling for Firebase operations
 */

class FirebaseErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers for Firebase
   */
  setupGlobalErrorHandlers() {
    // Listen for Firebase initialization events
    if (typeof window !== 'undefined') {
      window.addEventListener('firebase-initialization-failed', (event) => {
        this.handleError('FIREBASE_INIT', event.detail.error, 'Firebase initialization failed');
      });

      // Handle unhandled promise rejections that might be Firebase-related
      window.addEventListener('unhandledrejection', (event) => {
        if (this.isFirebaseError(event.reason)) {
          this.handleError('FIREBASE_PROMISE', event.reason, 'Unhandled Firebase promise rejection');
          event.preventDefault(); // Prevent console error
        }
      });
    }
  }

  /**
   * Check if an error is Firebase-related
   * @param {Error} error - The error to check
   * @returns {boolean} True if Firebase-related
   */
  isFirebaseError(error) {
    if (!error) return false;
    
    const firebaseErrorPatterns = [
      'firebase',
      'firestore',
      'auth/',
      'storage/',
      'functions/',
      'app-compat',
      'permission-denied',
      'unavailable',
      'deadline-exceeded'
    ];

    const errorString = error.toString().toLowerCase();
    return firebaseErrorPatterns.some(pattern => errorString.includes(pattern));
  }

  /**
   * Handle Firebase errors with appropriate user feedback
   * @param {string} category - Error category
   * @param {Error} error - The error object
   * @param {string} context - Additional context
   * @param {boolean} showToUser - Whether to show error to user
   */
  handleError(category, error, context = '', showToUser = false) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      category,
      error: error.toString(),
      code: error.code || 'unknown',
      context,
      stack: error.stack
    };

    // Add to error log
    this.errorLog.push(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging
    console.group(`🔥 Firebase Error [${category}]`);
    console.error('Context:', context);
    console.error('Error:', error);
    console.error('Code:', error.code);
    console.groupEnd();

    // Handle specific error types
    this.handleSpecificError(error, showToUser);

    // Dispatch custom event for other components to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firebase-error', {
        detail: errorInfo
      }));
    }
  }

  /**
   * Handle specific Firebase error types
   * @param {Error} error - The error object
   * @param {boolean} showToUser - Whether to show error to user
   */
  handleSpecificError(error, showToUser) {
    const code = error.code || '';
    let userMessage = '';

    switch (code) {
      case 'permission-denied':
        userMessage = 'Access denied. Please check your permissions.';
        break;
      case 'unavailable':
        userMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      case 'deadline-exceeded':
        userMessage = 'Request timeout. Please check your connection and try again.';
        break;
      case 'unauthenticated':
        userMessage = 'Authentication required. Please sign in.';
        break;
      case 'not-found':
        userMessage = 'Requested data not found.';
        break;
      case 'already-exists':
        userMessage = 'Data already exists.';
        break;
      case 'resource-exhausted':
        userMessage = 'Service quota exceeded. Please try again later.';
        break;
      case 'failed-precondition':
        userMessage = 'Operation failed due to system state.';
        break;
      case 'aborted':
        userMessage = 'Operation was aborted. Please try again.';
        break;
      case 'out-of-range':
        userMessage = 'Invalid data range provided.';
        break;
      case 'internal':
        userMessage = 'Internal server error. Please try again later.';
        break;
      case 'data-loss':
        userMessage = 'Data corruption detected. Please contact support.';
        break;
      default:
        if (error.toString().includes('Firebase: No Firebase App')) {
          userMessage = 'Firebase connection failed. Please refresh the page.';
        } else if (error.toString().includes('network')) {
          userMessage = 'Network error. Please check your connection.';
        } else {
          userMessage = 'An unexpected error occurred. Please try again.';
        }
    }

    if (showToUser && userMessage) {
      this.showUserError(userMessage);
    }
  }

  /**
   * Show error message to user
   * @param {string} message - Error message to display
   */
  showUserError(message) {
    // Try to use existing notification system
    if (typeof window !== 'undefined') {
      if (window.showNotification) {
        window.showNotification(message, 'error');
      } else if (window.showError) {
        window.showError(message);
      } else {
        // Fallback to alert
        console.warn('No notification system found, using alert');
        alert(`Error: ${message}`);
      }
    }
  }

  /**
   * Get recent error logs
   * @param {number} limit - Number of recent errors to return
   * @returns {Array} Recent error logs
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      categories: {},
      codes: {},
      recent: this.errorLog.slice(-5)
    };

    this.errorLog.forEach(error => {
      stats.categories[error.category] = (stats.categories[error.category] || 0) + 1;
      stats.codes[error.code] = (stats.codes[error.code] || 0) + 1;
    });

    return stats;
  }
}

// Create global instance
const firebaseErrorHandler = new FirebaseErrorHandler();

// Global error handling functions
window.handleFirebaseError = (category, error, context, showToUser = false) => {
  firebaseErrorHandler.handleError(category, error, context, showToUser);
};

window.getFirebaseErrorStats = () => {
  return firebaseErrorHandler.getErrorStats();
};

window.clearFirebaseErrors = () => {
  firebaseErrorHandler.clearErrorLog();
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseErrorHandler;
}

// Make available globally
window.FirebaseErrorHandler = FirebaseErrorHandler;
window.firebaseErrorHandler = firebaseErrorHandler;