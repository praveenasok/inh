// Firebase Error Handler
// Centralized error handling for Firebase operations

class FirebaseErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Handle Firebase errors with context
  handleError(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        stack: error.stack
      },
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log error
    this.logError(errorInfo);

    // Determine error type and provide user-friendly message
    const userMessage = this.getUserFriendlyMessage(error);
    const recovery = this.getRecoveryAction(error);

    return {
      userMessage,
      recovery,
      canRetry: this.canRetry(error),
      errorInfo
    };
  }

  // Log error to local storage and console
  logError(errorInfo) {
    console.error('🔥 Firebase Error:', errorInfo);
    
    // Add to error log
    this.errorLog.unshift(errorInfo);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
    
    // Store in localStorage for debugging
    try {
      localStorage.setItem('firebaseErrorLog', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('Failed to store error log in localStorage');
    }
    
    // Send to Firebase if available (for production monitoring)
    this.sendErrorToFirebase(errorInfo);
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error) {
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    // Authentication errors
    if (errorCode.includes('auth/')) {
      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          return 'Invalid email address. Please check your credentials.';
        case 'auth/wrong-password':
          return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection.';
        default:
          return 'Authentication failed. Please try logging in again.';
      }
    }

    // Firestore errors
    if (errorCode.includes('firestore/')) {
      switch (errorCode) {
        case 'firestore/permission-denied':
          return 'Access denied. You may not have permission to perform this action.';
        case 'firestore/unavailable':
          return 'Database temporarily unavailable. Please try again.';
        case 'firestore/deadline-exceeded':
          return 'Operation timed out. Please try again.';
        case 'firestore/resource-exhausted':
          return 'Service temporarily overloaded. Please try again later.';
        default:
          return 'Database error occurred. Please try again.';
      }
    }

    // Storage errors
    if (errorCode.includes('storage/')) {
      switch (errorCode) {
        case 'storage/unauthorized':
          return 'Upload permission denied. Please check your access rights.';
        case 'storage/canceled':
          return 'Upload was canceled.';
        case 'storage/quota-exceeded':
          return 'Storage quota exceeded. Please contact administrator.';
        case 'storage/invalid-format':
          return 'Invalid file format. Please select a valid Excel file.';
        case 'storage/object-not-found':
          return 'File not found.';
        default:
          return 'File upload error. Please try again.';
      }
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('offline')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    // File parsing errors
    if (errorMessage.includes('parse') || errorMessage.includes('Excel')) {
      return 'Failed to read Excel file. Please ensure the file is not corrupted and try again.';
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('required')) {
      return 'Data validation failed. Please check your file format and required fields.';
    }

    // Generic error
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  // Get recovery action
  getRecoveryAction(error) {
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    if (errorCode.includes('auth/')) {
      return {
        action: 'reauthenticate',
        description: 'Please log in again',
        buttonText: 'Log In'
      };
    }

    if (errorCode.includes('network') || errorMessage.includes('offline')) {
      return {
        action: 'retry',
        description: 'Check your connection and try again',
        buttonText: 'Retry'
      };
    }

    if (errorCode.includes('permission-denied')) {
      return {
        action: 'contact_admin',
        description: 'Contact administrator for access',
        buttonText: 'Contact Support'
      };
    }

    return {
      action: 'retry',
      description: 'Try the operation again',
      buttonText: 'Retry'
    };
  }

  // Check if error can be retried
  canRetry(error) {
    const errorCode = error.code || '';
    const nonRetryableErrors = [
      'auth/user-not-found',
      'auth/invalid-email',
      'auth/wrong-password',
      'firestore/permission-denied',
      'storage/unauthorized',
      'storage/quota-exceeded'
    ];

    return !nonRetryableErrors.some(code => errorCode.includes(code));
  }

  // Retry operation with exponential backoff
  async retryOperation(operation, context = {}, maxAttempts = this.retryAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxAttempts} for operation: ${context.operation || 'unknown'}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        const errorInfo = this.handleError(error, { ...context, attempt });
        
        if (!errorInfo.canRetry || attempt === maxAttempts) {
          console.error(`❌ Operation failed after ${attempt} attempts`);
          throw error;
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Send error to Firebase for monitoring (if available)
  async sendErrorToFirebase(errorInfo) {
    try {
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        await firebase.firestore().collection('error_logs').add({
          ...errorInfo,
          reportedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      // Silently fail - don't create error loops
      console.warn('Failed to send error to Firebase:', e);
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      byContext: {},
      recent: this.errorLog.slice(0, 10)
    };

    this.errorLog.forEach(log => {
      const errorType = log.error.code || 'unknown';
      const context = log.context.operation || 'unknown';
      
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
      stats.byContext[context] = (stats.byContext[context] || 0) + 1;
    });

    return stats;
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('firebaseErrorLog');
    console.log('🧹 Error log cleared');
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Show error to user with recovery options
  showErrorToUser(error, context = {}) {
    const errorInfo = this.handleError(error, context);
    
    // Try to use existing admin message system
    if (typeof showAdminMessage === 'function') {
      showAdminMessage(errorInfo.userMessage, 'error');
    } else {
      // Fallback to alert
      alert(`Error: ${errorInfo.userMessage}`);
    }
    
    return errorInfo;
  }
}

// Global error handler instance
window.firebaseErrorHandler = new FirebaseErrorHandler();

// Global error event listeners
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('Firebase')) {
    window.firebaseErrorHandler.handleError(event.error, {
      operation: 'global_error',
      filename: event.filename,
      lineno: event.lineno
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Firebase')) {
    window.firebaseErrorHandler.handleError(event.reason, {
      operation: 'unhandled_promise_rejection'
    });
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseErrorHandler;
}

console.log('🛡️ Firebase Error Handler initialized');