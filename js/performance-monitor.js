/**
 * Performance Monitor - Real-time performance tracking and dashboard
 * Monitors and displays metrics from all performance optimization components
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: {
                startTime: performance.now(),
                domContentLoaded: null,
                fullyLoaded: null,
                firstPaint: null,
                firstContentfulPaint: null
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0,
                totalRequests: 0
            },
            firebase: {
                queries: 0,
                averageResponseTime: 0,
                totalResponseTime: 0,
                errors: 0
            },
            lazyLoading: {
                itemsLoaded: 0,
                itemsDeferred: 0,
                bytesLoaded: 0,
                bytesSaved: 0
            },
            network: {
                requests: 0,
                totalBytes: 0,
                averageLatency: 0
            }
        };
        
        this.observers = [];
        this.updateInterval = null;
        this.isVisible = false;
        
        this.initializePerformanceObservers();
        this.createDashboard();
    }

    /**
     * Initialize performance observers
     */
    initializePerformanceObservers() {
        // Performance Observer for navigation timing
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.processPerformanceEntry(entry);
                    }
                });
                
                observer.observe({ entryTypes: ['navigation', 'paint', 'measure', 'resource'] });
                this.observers.push(observer);
            } catch (error) {
            }
        }

        // DOM Content Loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.metrics.pageLoad.domContentLoaded = performance.now() - this.metrics.pageLoad.startTime;
                this.updateDashboard();
            });
        }

        // Window Load
        window.addEventListener('load', () => {
            this.metrics.pageLoad.fullyLoaded = performance.now() - this.metrics.pageLoad.startTime;
            this.updateDashboard();
        });
    }

    /**
     * Process performance entries
     */
    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.processNavigationEntry(entry);
                break;
            case 'paint':
                this.processPaintEntry(entry);
                break;
            case 'resource':
                this.processResourceEntry(entry);
                break;
            case 'measure':
                this.processMeasureEntry(entry);
                break;
        }
        this.updateDashboard();
    }

    /**
     * Process navigation timing
     */
    processNavigationEntry(entry) {
        this.metrics.pageLoad.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
        this.metrics.pageLoad.fullyLoaded = entry.loadEventEnd - entry.loadEventStart;
    }

    /**
     * Process paint timing
     */
    processPaintEntry(entry) {
        if (entry.name === 'first-paint') {
            this.metrics.pageLoad.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
            this.metrics.pageLoad.firstContentfulPaint = entry.startTime;
        }
    }

    /**
     * Process resource timing
     */
    processResourceEntry(entry) {
        this.metrics.network.requests++;
        this.metrics.network.totalBytes += entry.transferSize || 0;
        this.metrics.network.averageLatency = 
            (this.metrics.network.averageLatency * (this.metrics.network.requests - 1) + entry.duration) / 
            this.metrics.network.requests;
    }

    /**
     * Process custom measures
     */
    processMeasureEntry(entry) {
        // Handle custom performance measures
        if (entry.name.startsWith('cache-')) {
            this.updateCacheMetrics(entry);
        } else if (entry.name.startsWith('firebase-')) {
            this.updateFirebaseMetrics(entry);
        } else if (entry.name.startsWith('lazy-')) {
            this.updateLazyLoadingMetrics(entry);
        }
    }

    /**
     * Update cache metrics
     */
    updateCacheMetrics(entry) {
        if (entry.name === 'cache-hit') {
            this.metrics.cache.hits++;
        } else if (entry.name === 'cache-miss') {
            this.metrics.cache.misses++;
        }
        
        this.metrics.cache.totalRequests = this.metrics.cache.hits + this.metrics.cache.misses;
        this.metrics.cache.hitRate = this.metrics.cache.totalRequests > 0 ? 
            (this.metrics.cache.hits / this.metrics.cache.totalRequests * 100) : 0;
    }

    /**
     * Update Firebase metrics
     */
    updateFirebaseMetrics(entry) {
        if (entry.name === 'firebase-query') {
            this.metrics.firebase.queries++;
            this.metrics.firebase.totalResponseTime += entry.duration;
            this.metrics.firebase.averageResponseTime = 
                this.metrics.firebase.totalResponseTime / this.metrics.firebase.queries;
        } else if (entry.name === 'firebase-error') {
            this.metrics.firebase.errors++;
        }
    }

    /**
     * Update lazy loading metrics
     */
    updateLazyLoadingMetrics(entry) {
        if (entry.name === 'lazy-loaded') {
            this.metrics.lazyLoading.itemsLoaded++;
            this.metrics.lazyLoading.bytesLoaded += entry.detail?.bytes || 0;
        } else if (entry.name === 'lazy-deferred') {
            this.metrics.lazyLoading.itemsDeferred++;
            this.metrics.lazyLoading.bytesSaved += entry.detail?.bytes || 0;
        }
    }

    /**
     * Create performance dashboard
     */
    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performance-dashboard';
        dashboard.innerHTML = `
            <div class="perf-header">
                <h3>Performance Monitor</h3>
                <button id="perf-toggle" class="perf-toggle">📊</button>
                <button id="perf-close" class="perf-close">✕</button>
            </div>
            <div class="perf-content">
                <div class="perf-section">
                    <h4>Page Load</h4>
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span class="perf-label">DOM Ready:</span>
                            <span class="perf-value" id="dom-ready">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Fully Loaded:</span>
                            <span class="perf-value" id="fully-loaded">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">First Paint:</span>
                            <span class="perf-value" id="first-paint">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="perf-section">
                    <h4>Cache Performance</h4>
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span class="perf-label">Hit Rate:</span>
                            <span class="perf-value" id="cache-hit-rate">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Total Requests:</span>
                            <span class="perf-value" id="cache-requests">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="perf-section">
                    <h4>Firebase Queries</h4>
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span class="perf-label">Total Queries:</span>
                            <span class="perf-value" id="firebase-queries">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Avg Response:</span>
                            <span class="perf-value" id="firebase-response">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Errors:</span>
                            <span class="perf-value" id="firebase-errors">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="perf-section">
                    <h4>Lazy Loading</h4>
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span class="perf-label">Items Loaded:</span>
                            <span class="perf-value" id="lazy-loaded">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Bytes Saved:</span>
                            <span class="perf-value" id="lazy-saved">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="perf-section">
                    <h4>Network</h4>
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span class="perf-label">Requests:</span>
                            <span class="perf-value" id="network-requests">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Total Bytes:</span>
                            <span class="perf-value" id="network-bytes">-</span>
                        </div>
                        <div class="perf-metric">
                            <span class="perf-label">Avg Latency:</span>
                            <span class="perf-value" id="network-latency">-</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            #performance-dashboard {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            
            #performance-dashboard.visible {
                transform: translateX(0);
            }
            
            .perf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px 8px 0 0;
            }
            
            .perf-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: bold;
            }
            
            .perf-toggle, .perf-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
                border-radius: 3px;
            }
            
            .perf-toggle:hover, .perf-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .perf-content {
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .perf-section {
                margin-bottom: 15px;
            }
            
            .perf-section h4 {
                margin: 0 0 8px 0;
                font-size: 13px;
                color: #4CAF50;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 3px;
            }
            
            .perf-metrics {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .perf-metric {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .perf-label {
                color: #ccc;
            }
            
            .perf-value {
                color: #fff;
                font-weight: bold;
            }
            
            .perf-value.good {
                color: #4CAF50;
            }
            
            .perf-value.warning {
                color: #FF9800;
            }
            
            .perf-value.error {
                color: #F44336;
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(dashboard);

        // Add event listeners
        document.getElementById('perf-toggle').addEventListener('click', () => {
            this.toggleDashboard();
        });

        document.getElementById('perf-close').addEventListener('click', () => {
            this.hideDashboard();
        });

        // Start updating
        this.startUpdating();
    }

    /**
     * Toggle dashboard visibility
     */
    toggleDashboard() {
        const dashboard = document.getElementById('performance-dashboard');
        if (this.isVisible) {
            this.hideDashboard();
        } else {
            this.showDashboard();
        }
    }

    /**
     * Show dashboard
     */
    showDashboard() {
        const dashboard = document.getElementById('performance-dashboard');
        dashboard.classList.add('visible');
        this.isVisible = true;
    }

    /**
     * Hide dashboard
     */
    hideDashboard() {
        const dashboard = document.getElementById('performance-dashboard');
        dashboard.classList.remove('visible');
        this.isVisible = false;
    }

    /**
     * Start updating dashboard
     */
    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateDashboard();
        }, 1000);
    }

    /**
     * Stop updating dashboard
     */
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update dashboard display
     */
    updateDashboard() {
        // Page Load metrics
        this.updateElement('dom-ready', this.formatTime(this.metrics.pageLoad.domContentLoaded));
        this.updateElement('fully-loaded', this.formatTime(this.metrics.pageLoad.fullyLoaded));
        this.updateElement('first-paint', this.formatTime(this.metrics.pageLoad.firstPaint));

        // Cache metrics
        this.updateElement('cache-hit-rate', `${this.metrics.cache.hitRate.toFixed(1)}%`, 
            this.getPerformanceClass(this.metrics.cache.hitRate, 80, 60));
        this.updateElement('cache-requests', this.metrics.cache.totalRequests);

        // Firebase metrics
        this.updateElement('firebase-queries', this.metrics.firebase.queries);
        this.updateElement('firebase-response', this.formatTime(this.metrics.firebase.averageResponseTime));
        this.updateElement('firebase-errors', this.metrics.firebase.errors, 
            this.metrics.firebase.errors > 0 ? 'error' : 'good');

        // Lazy Loading metrics
        this.updateElement('lazy-loaded', this.metrics.lazyLoading.itemsLoaded);
        this.updateElement('lazy-saved', this.formatBytes(this.metrics.lazyLoading.bytesSaved));

        // Network metrics
        this.updateElement('network-requests', this.metrics.network.requests);
        this.updateElement('network-bytes', this.formatBytes(this.metrics.network.totalBytes));
        this.updateElement('network-latency', this.formatTime(this.metrics.network.averageLatency));
    }

    /**
     * Update element content and class
     */
    updateElement(id, value, className = '') {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '-';
            element.className = `perf-value ${className}`;
        }
    }

    /**
     * Get performance class based on thresholds
     */
    getPerformanceClass(value, goodThreshold, warningThreshold) {
        if (value >= goodThreshold) return 'good';
        if (value >= warningThreshold) return 'warning';
        return 'error';
    }

    /**
     * Format time in milliseconds
     */
    formatTime(ms) {
        if (ms === null || ms === undefined) return '-';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    /**
     * Format bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Record custom metric
     */
    recordMetric(name, value, category = 'custom') {
        try {
            performance.mark(`${category}-${name}-start`);
            performance.mark(`${category}-${name}-end`);
            performance.measure(`${category}-${name}`, `${category}-${name}-start`, `${category}-${name}-end`);
        } catch (error) {
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            pageLoad: {
                startTime: performance.now(),
                domContentLoaded: null,
                fullyLoaded: null,
                firstPaint: null,
                firstContentfulPaint: null
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0,
                totalRequests: 0
            },
            firebase: {
                queries: 0,
                averageResponseTime: 0,
                totalResponseTime: 0,
                errors: 0
            },
            lazyLoading: {
                itemsLoaded: 0,
                itemsDeferred: 0,
                bytesLoaded: 0,
                bytesSaved: 0
            },
            network: {
                requests: 0,
                totalBytes: 0,
                averageLatency: 0
            }
        };
        this.updateDashboard();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopUpdating();
        this.observers.forEach(observer => observer.disconnect());
        const dashboard = document.getElementById('performance-dashboard');
        if (dashboard) {
            dashboard.remove();
        }
    }
}

// Global instance
window.PerformanceMonitor = PerformanceMonitor;