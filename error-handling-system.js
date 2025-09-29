const { EventEmitter } = require('events');

/**
 * Error Handling System
 * Provides comprehensive error handling with retry mechanisms,
 * fallback strategies, and detailed error tracking
 */
class ErrorHandlingSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      exponentialBackoff: true,
      maxRetryDelay: 30000, // 30 seconds
      enableFallbacks: true,
      errorHistoryLimit: 1000,
      criticalErrorThreshold: 5, // 5 critical errors in 10 minutes
      criticalErrorWindow: 10 * 60 * 1000, // 10 minutes
      ...config
    };
    
    this.errorHistory = [];
    this.retryAttempts = new Map();
    this.fallbackStrategies = new Map();
    this.circuitBreakers = new Map();
    this.errorCategories = {
      NETWORK: 'network',
      AUTHENTICATION: 'authentication',
      PERMISSION: 'permission',
      DATA_VALIDATION: 'data_validation',
      RATE_LIMIT: 'rate_limit',
      SERVICE_UNAVAILABLE: 'service_unavailable',
      TIMEOUT: 'timeout',
      UNKNOWN: 'unknown'
    };
  }

  /**
   * Handle an error with retry and fallback mechanisms
   */
  async handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    this.logError(errorInfo);
    
    // Check if we should retry
    if (this.shouldRetry(errorInfo)) {
      return await this.retryOperation(errorInfo);
    }
    
    // Check if we should use fallback
    if (this.shouldUseFallback(errorInfo)) {
      return await this.executeFallback(errorInfo);
    }
    
    // Check if this is a critical error
    if (this.isCriticalError(errorInfo)) {
      this.handleCriticalError(errorInfo);
    }
    
    // Emit error event
    this.emit('error-handled', errorInfo);
    
    throw errorInfo;
  }

  /**
   * Analyze error and categorize it
   */
  analyzeError(error, context) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode || error.status,
      category: this.categorizeError(error),
      severity: this.assessSeverity(error),
      context: {
        operation: context.operation || 'unknown',
        service: context.service || 'unknown',
        collection: context.collection,
        itemId: context.itemId,
        ...context
      },
      retryable: this.isRetryable(error),
      fallbackAvailable: this.hasFallback(context.operation, context.service),
      originalError: error
    };
    
    return errorInfo;
  }

  /**
   * Categorize error based on type and message
   */
  categorizeError(error) {
    const message = (error.message || '').toLowerCase();
    const code = error.code || '';
    const statusCode = error.statusCode || error.status;
    
    // Network errors
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
      return this.errorCategories.NETWORK;
    }
    
    // Authentication errors
    if (statusCode === 401 || message.includes('unauthorized') ||
        message.includes('authentication') || message.includes('invalid token')) {
      return this.errorCategories.AUTHENTICATION;
    }
    
    // Permission errors
    if (statusCode === 403 || message.includes('forbidden') ||
        message.includes('permission') || message.includes('access denied')) {
      return this.errorCategories.PERMISSION;
    }
    
    // Rate limit errors
    if (statusCode === 429 || message.includes('rate limit') ||
        message.includes('quota exceeded') || message.includes('too many requests')) {
      return this.errorCategories.RATE_LIMIT;
    }
    
    // Service unavailable
    if (statusCode >= 500 || message.includes('service unavailable') ||
        message.includes('internal server error') || message.includes('bad gateway')) {
      return this.errorCategories.SERVICE_UNAVAILABLE;
    }
    
    // Timeout errors
    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return this.errorCategories.TIMEOUT;
    }
    
    // Data validation errors
    if (statusCode === 400 || message.includes('validation') ||
        message.includes('invalid data') || message.includes('bad request')) {
      return this.errorCategories.DATA_VALIDATION;
    }
    
    return this.errorCategories.UNKNOWN;
  }

  /**
   * Assess error severity
   */
  assessSeverity(error) {
    const category = this.categorizeError(error);
    const statusCode = error.statusCode || error.status;
    
    // Critical errors
    if (category === this.errorCategories.AUTHENTICATION ||
        category === this.errorCategories.PERMISSION ||
        statusCode >= 500) {
      return 'critical';
    }
    
    // High severity errors
    if (category === this.errorCategories.RATE_LIMIT ||
        category === this.errorCategories.SERVICE_UNAVAILABLE ||
        statusCode === 429) {
      return 'high';
    }
    
    // Medium severity errors
    if (category === this.errorCategories.NETWORK ||
        category === this.errorCategories.TIMEOUT ||
        statusCode >= 400) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    const category = this.categorizeError(error);
    const statusCode = error.statusCode || error.status;
    
    // Non-retryable errors
    if (category === this.errorCategories.AUTHENTICATION ||
        category === this.errorCategories.PERMISSION ||
        category === this.errorCategories.DATA_VALIDATION ||
        statusCode === 400 || statusCode === 401 || statusCode === 403) {
      return false;
    }
    
    // Retryable errors
    if (category === this.errorCategories.NETWORK ||
        category === this.errorCategories.TIMEOUT ||
        category === this.errorCategories.SERVICE_UNAVAILABLE ||
        category === this.errorCategories.RATE_LIMIT ||
        statusCode >= 500 || statusCode === 429) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if we should retry the operation
   */
  shouldRetry(errorInfo) {
    if (!errorInfo.retryable) return false;
    
    const retryKey = this.getRetryKey(errorInfo.context);
    const attempts = this.retryAttempts.get(retryKey) || 0;
    
    return attempts < this.config.maxRetries;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(errorInfo) {
    const retryKey = this.getRetryKey(errorInfo.context);
    const attempts = this.retryAttempts.get(retryKey) || 0;
    
    // Calculate delay with exponential backoff
    let delay = this.config.retryDelay;
    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.retryDelay * Math.pow(2, attempts),
        this.config.maxRetryDelay
      );
    }
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000;
    
    // Special handling for rate limit errors
    if (errorInfo.category === this.errorCategories.RATE_LIMIT) {
      delay = Math.max(delay, 60000); // Wait at least 1 minute for rate limits
    }
    
    // Update retry count
    this.retryAttempts.set(retryKey, attempts + 1);
    
    // Wait before retry
    await this.sleep(delay);
    
    // Emit retry event
    this.emit('operation-retry', {
      errorInfo,
      attempt: attempts + 1,
      delay
    });
    
    // The actual retry will be handled by the calling code
    throw new Error('RETRY_OPERATION');
  }

  /**
   * Check if fallback is available
   */
  shouldUseFallback(errorInfo) {
    return this.config.enableFallbacks && errorInfo.fallbackAvailable;
  }

  /**
   * Execute fallback strategy
   */
  async executeFallback(errorInfo) {
    const fallbackKey = this.getFallbackKey(errorInfo.context.operation, errorInfo.context.service);
    const fallbackStrategy = this.fallbackStrategies.get(fallbackKey);
    
    if (!fallbackStrategy) {
      return null;
    }
    
    try {
      const result = await fallbackStrategy(errorInfo);
      
      this.emit('fallback-executed', {
        errorInfo,
        fallbackKey,
        result
      });
      
      return result;
    } catch (fallbackError) {
      this.emit('fallback-failed', {
        errorInfo,
        fallbackKey,
        fallbackError: fallbackError.message
      });
      throw fallbackError;
    }
  }

  /**
   * Check if error is critical
   */
  isCriticalError(errorInfo) {
    if (errorInfo.severity === 'critical') return true;
    
    // Check if we've had too many critical errors recently
    const recentCriticalErrors = this.errorHistory.filter(err => 
      err.severity === 'critical' && 
      Date.now() - err.timestamp < this.config.criticalErrorWindow
    );
    
    return recentCriticalErrors.length >= this.config.criticalErrorThreshold;
  }

  /**
   * Handle critical errors
   */
  handleCriticalError(errorInfo) {
    
    // Activate circuit breaker
    this.activateCircuitBreaker(errorInfo.context.service);
    
    // Emit critical error event
    this.emit('critical-error', errorInfo);
    
    // Could trigger alerts, notifications, etc.
  }

  /**
   * Activate circuit breaker for a service
   */
  activateCircuitBreaker(service) {
    if (!service) return;
    
    const breakerKey = `circuit-breaker-${service}`;
    const breaker = {
      isOpen: true,
      openedAt: Date.now(),
      failureCount: 0,
      nextAttemptAt: Date.now() + 60000 // 1 minute
    };
    
    this.circuitBreakers.set(breakerKey, breaker);
    
    this.emit('circuit-breaker-opened', { service, breaker });
    
    // Auto-reset after timeout
    setTimeout(() => {
      this.resetCircuitBreaker(service);
    }, 300000); // 5 minutes
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(service) {
    const breakerKey = `circuit-breaker-${service}`;
    this.circuitBreakers.delete(breakerKey);
    
    this.emit('circuit-breaker-reset', { service });
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(service) {
    const breakerKey = `circuit-breaker-${service}`;
    const breaker = this.circuitBreakers.get(breakerKey);
    
    if (!breaker) return false;
    
    // Check if it's time to try again
    if (Date.now() > breaker.nextAttemptAt) {
      breaker.isOpen = false;
      breaker.nextAttemptAt = Date.now() + 30000; // 30 seconds
    }
    
    return breaker.isOpen;
  }

  /**
   * Register fallback strategy
   */
  registerFallback(operation, service, strategy) {
    const key = this.getFallbackKey(operation, service);
    this.fallbackStrategies.set(key, strategy);
  }

  /**
   * Check if fallback is available
   */
  hasFallback(operation, service) {
    const key = this.getFallbackKey(operation, service);
    return this.fallbackStrategies.has(key);
  }

  /**
   * Log error to history
   */
  logError(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    // Limit error history size
    if (this.errorHistory.length > this.config.errorHistoryLimit) {
      this.errorHistory.shift();
    }
    
    // Log to console based on severity
    const logMethod = errorInfo.severity === 'critical' ? 'error' : 
                     errorInfo.severity === 'high' ? 'warn' : 'log';
    
    console[logMethod](`[${errorInfo.severity.toUpperCase()}] ${errorInfo.category}: ${errorInfo.message}`, {
      context: errorInfo.context,
      timestamp: new Date(errorInfo.timestamp).toISOString()
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorHistory.filter(err => err.timestamp > cutoff);
    
    const stats = {
      total: recentErrors.length,
      byCategory: {},
      bySeverity: {},
      byService: {},
      retryRate: 0,
      fallbackRate: 0
    };
    
    recentErrors.forEach(err => {
      // By category
      stats.byCategory[err.category] = (stats.byCategory[err.category] || 0) + 1;
      
      // By severity
      stats.bySeverity[err.severity] = (stats.bySeverity[err.severity] || 0) + 1;
      
      // By service
      const service = err.context.service || 'unknown';
      stats.byService[service] = (stats.byService[service] || 0) + 1;
    });
    
    // Calculate rates
    const retriedErrors = recentErrors.filter(err => err.retryable);
    const fallbackErrors = recentErrors.filter(err => err.fallbackAvailable);
    
    stats.retryRate = recentErrors.length > 0 ? 
      (retriedErrors.length / recentErrors.length) * 100 : 0;
    stats.fallbackRate = recentErrors.length > 0 ? 
      (fallbackErrors.length / recentErrors.length) * 100 : 0;
    
    return stats;
  }

  /**
   * Clear retry attempts for a specific operation
   */
  clearRetryAttempts(context) {
    const retryKey = this.getRetryKey(context);
    this.retryAttempts.delete(retryKey);
  }

  /**
   * Clear all retry attempts
   */
  clearAllRetryAttempts() {
    this.retryAttempts.clear();
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50) {
    return this.errorHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.emit('error-history-cleared');
  }

  /**
   * Helper methods
   */
  generateErrorId() {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getRetryKey(context) {
    return `${context.operation || 'unknown'}-${context.service || 'unknown'}-${context.collection || ''}`;
  }

  getFallbackKey(operation, service) {
    return `${operation || 'unknown'}-${service || 'unknown'}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap a function with error handling
   */
  wrapWithErrorHandling(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return await this.handleError(error, context);
      }
    };
  }

  /**
   * Create a resilient function that automatically retries and uses fallbacks
   */
  createResilientFunction(fn, context = {}) {
    return async (...args) => {
      let lastError;
      
      while (true) {
        try {
          // Check circuit breaker
          if (this.isCircuitBreakerOpen(context.service)) {
            throw new Error(`Circuit breaker is open for service: ${context.service}`);
          }
          
          const result = await fn(...args);
          
          // Clear retry attempts on success
          this.clearRetryAttempts(context);
          
          return result;
        } catch (error) {
          lastError = error;
          
          if (error.message === 'RETRY_OPERATION') {
            continue; // Retry the operation
          }
          
          try {
            return await this.handleError(error, context);
          } catch (handledError) {
            if (handledError.message === 'RETRY_OPERATION') {
              continue; // Retry the operation
            }
            throw handledError;
          }
        }
      }
    };
  }
}

module.exports = ErrorHandlingSystem;