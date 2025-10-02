/**
 * Enhanced Firebase Authentication Handler
 * Provides better error handling and fallback options for authentication issues
 */

class FirebaseAuthHandler {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authStateListeners = [];
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    /**
     * Initialize authentication with comprehensive error handling
     */
    async initialize() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            const auth = firebase.auth();
            
            // Set up auth state listener
            auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.isAuthenticated = !!user;
                this.notifyAuthStateListeners(user);
            });

            // Attempt authentication
            await this.authenticateUser();
            
            return true;
        } catch (error) {
            console.error('Firebase authentication initialization failed:', error);
            this.handleAuthError(error);
            return false;
        }
    }

    /**
     * Attempt to authenticate user with multiple strategies
     */
    async authenticateUser() {
        const auth = firebase.auth();
        
        // Check if already authenticated
        if (auth.currentUser) {
            console.log('User already authenticated:', auth.currentUser.uid);
            return auth.currentUser;
        }

        // Try anonymous authentication
        try {
            const userCredential = await this.retryOperation(() => 
                auth.signInAnonymously()
            );
            
            console.log('Anonymous authentication successful:', userCredential.user.uid);
            return userCredential.user;
            
        } catch (error) {
            this.handleAuthError(error);
            throw error;
        }
    }

    /**
     * Handle authentication errors with specific guidance
     */
    handleAuthError(error) {
        const errorMessages = {
            'auth/operation-not-allowed': {
                message: 'Anonymous authentication is disabled in Firebase Console',
                solution: 'Enable anonymous authentication in Firebase Console > Authentication > Sign-in method',
                action: 'ENABLE_ANONYMOUS_AUTH'
            },
            'auth/network-request-failed': {
                message: 'Network connection failed',
                solution: 'Check your internet connection and try again',
                action: 'RETRY_CONNECTION'
            },
            'auth/too-many-requests': {
                message: 'Too many authentication attempts',
                solution: 'Wait a few minutes before trying again',
                action: 'WAIT_AND_RETRY'
            },
            'auth/api-key-not-valid': {
                message: 'Invalid Firebase API key',
                solution: 'Check your Firebase configuration',
                action: 'CHECK_CONFIG'
            }
        };

        const errorInfo = errorMessages[error.code] || {
            message: error.message,
            solution: 'Check Firebase Console and project configuration',
            action: 'CHECK_CONSOLE'
        };

        console.error('🚨 Firebase Authentication Error:', {
            code: error.code,
            message: errorInfo.message,
            solution: errorInfo.solution,
            action: errorInfo.action
        });

        // Display user-friendly error message
        this.displayAuthError(errorInfo);
        
        return errorInfo;
    }

    /**
     * Display authentication error to user
     */
    displayAuthError(errorInfo) {
        // Create or update error display element
        let errorElement = document.getElementById('firebase-auth-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'firebase-auth-error';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 5px;
                padding: 15px;
                max-width: 400px;
                z-index: 10000;
                font-family: Arial, sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(errorElement);
        }

        errorElement.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">
                🚨 Firebase Authentication Error
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Problem:</strong> ${errorInfo.message}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Solution:</strong> ${errorInfo.solution}
            </div>
            <button onclick="this.parentElement.style.display='none'" 
                    style="background: #721c24; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Close
            </button>
        `;

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorElement && errorElement.parentElement) {
                errorElement.style.display = 'none';
            }
        }, 10000);
    }

    /**
     * Retry operation with exponential backoff
     */
    async retryOperation(operation, maxRetries = this.maxRetries) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Don't retry certain errors
                if (error.code === 'auth/operation-not-allowed') {
                    throw error;
                }
                
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`Authentication attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    /**
     * Add auth state change listener
     */
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // Call immediately if already authenticated
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }

    /**
     * Notify all auth state listeners
     */
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    /**
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            uid: this.currentUser?.uid || null,
            isAnonymous: this.currentUser?.isAnonymous || false
        };
    }

    /**
     * Wait for authentication to complete
     */
    async waitForAuth(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, timeout);

            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                clearTimeout(timeoutId);
                unsubscribe();
                resolve(user);
            });
        });
    }
}

// Global instance
window.firebaseAuthHandler = new FirebaseAuthHandler();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.firebaseAuthHandler.initialize();
    });
} else {
    window.firebaseAuthHandler.initialize();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseAuthHandler;
}