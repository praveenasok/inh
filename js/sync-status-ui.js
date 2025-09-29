/**
 * Sync Status UI Component
 * Provides real-time synchronization status indicators and admin controls
 * for the two-way Google Sheets ↔ IndexedDB sync system
 */

class SyncStatusUI {
    constructor(config = {}) {
        this.containerId = config.containerId || 'sync-status-container';
        this.logLevel = config.logLevel || 'info';
        this.updateInterval = config.updateInterval || 5000; // 5 seconds
        this.syncCoordinator = null;
        this.updateTimer = null;
        this.isVisible = false;
        
        // UI state
        this.currentStatus = {
            isInitialized: false,
            isSyncing: false,
            lastSync: null,
            errors: [],
            stats: {}
        };

        this.log('Sync Status UI initialized', 'info');
    }

    /**
     * Initialize the sync status UI
     */
    async initialize(syncCoordinator) {
        try {
            this.syncCoordinator = syncCoordinator;
            
            // Create UI container if it doesn't exist
            this.createUIContainer();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start status updates
            this.startStatusUpdates();
            
            this.log('Sync Status UI initialized successfully', 'info');
            
        } catch (error) {
            this.log(`Failed to initialize Sync Status UI: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create the UI container and elements
     */
    createUIContainer() {
        // Check if container already exists
        let container = document.getElementById(this.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'sync-status-ui';
            
            // Add to body or specified parent
            document.body.appendChild(container);
        }

        // Create UI HTML
        container.innerHTML = `
            <div class="sync-status-panel" id="sync-status-panel">
                <div class="sync-status-header">
                    <h3>🔄 Sync Status</h3>
                    <div class="sync-status-controls">
                        <button id="sync-toggle-btn" class="btn btn-sm">Hide</button>
                        <button id="sync-refresh-btn" class="btn btn-sm btn-primary">Refresh</button>
                    </div>
                </div>
                
                <div class="sync-status-content">
                    <!-- Overall Status -->
                    <div class="sync-status-section">
                        <div class="sync-status-indicator" id="overall-status">
                            <span class="status-icon">⏳</span>
                            <span class="status-text">Initializing...</span>
                            <span class="status-timestamp" id="status-timestamp"></span>
                        </div>
                    </div>

                    <!-- Sync Actions -->
                    <div class="sync-status-section">
                        <h4>Actions</h4>
                        <div class="sync-actions">
                            <button id="manual-sync-btn" class="btn btn-sm btn-success" disabled>
                                Manual Sync
                            </button>
                            <button id="full-sync-btn" class="btn btn-sm btn-warning" disabled>
                                Full Sync
                            </button>
                            <button id="suspend-sync-btn" class="btn btn-sm btn-danger" disabled>
                                Suspend
                            </button>
                        </div>
                    </div>

                    <!-- Data Statistics -->
                    <div class="sync-status-section">
                        <h4>Data Statistics</h4>
                        <div class="data-stats" id="data-stats">
                            <div class="stats-loading">Loading statistics...</div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="sync-status-section">
                        <h4>Recent Activity</h4>
                        <div class="recent-activity" id="recent-activity">
                            <div class="activity-loading">Loading activity...</div>
                        </div>
                    </div>

                    <!-- Error Log -->
                    <div class="sync-status-section" id="error-section" style="display: none;">
                        <h4>⚠️ Errors</h4>
                        <div class="error-log" id="error-log"></div>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles
        this.addStyles();
        
        this.isVisible = true;
    }

    /**
     * Add CSS styles for the sync status UI
     */
    addStyles() {
        const styleId = 'sync-status-ui-styles';
        
        // Check if styles already exist
        if (document.getElementById(styleId)) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            .sync-status-ui {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                max-height: 80vh;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                overflow: hidden;
            }

            .sync-status-panel {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .sync-status-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
            }

            .sync-status-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }

            .sync-status-controls {
                display: flex;
                gap: 8px;
            }

            .sync-status-content {
                padding: 16px;
                overflow-y: auto;
                max-height: calc(80vh - 60px);
            }

            .sync-status-section {
                margin-bottom: 20px;
            }

            .sync-status-section h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                color: #555;
            }

            .sync-status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #6c757d;
            }

            .sync-status-indicator.success {
                border-left-color: #28a745;
                background: #d4edda;
            }

            .sync-status-indicator.warning {
                border-left-color: #ffc107;
                background: #fff3cd;
            }

            .sync-status-indicator.error {
                border-left-color: #dc3545;
                background: #f8d7da;
            }

            .sync-status-indicator.syncing {
                border-left-color: #007bff;
                background: #d1ecf1;
            }

            .status-icon {
                font-size: 16px;
            }

            .status-text {
                flex: 1;
                font-weight: 500;
            }

            .status-timestamp {
                font-size: 12px;
                color: #666;
            }

            .sync-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }

            .btn:hover:not(:disabled) {
                background: #f8f9fa;
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .btn-primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }

            .btn-success {
                background: #28a745;
                color: white;
                border-color: #28a745;
            }

            .btn-warning {
                background: #ffc107;
                color: #212529;
                border-color: #ffc107;
            }

            .btn-danger {
                background: #dc3545;
                color: white;
                border-color: #dc3545;
            }

            .data-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }

            .stat-item {
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                text-align: center;
            }

            .stat-value {
                font-size: 18px;
                font-weight: 600;
                color: #007bff;
            }

            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 2px;
            }

            .recent-activity {
                max-height: 150px;
                overflow-y: auto;
            }

            .activity-item {
                padding: 6px 0;
                border-bottom: 1px solid #eee;
                font-size: 12px;
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-time {
                color: #666;
                font-weight: 500;
            }

            .activity-message {
                margin-top: 2px;
                color: #333;
            }

            .error-log {
                max-height: 120px;
                overflow-y: auto;
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 8px;
            }

            .error-item {
                font-size: 12px;
                color: #721c24;
                margin-bottom: 4px;
            }

            .error-item:last-child {
                margin-bottom: 0;
            }

            .stats-loading, .activity-loading {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 20px;
            }

            .sync-status-ui.hidden {
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .spinning {
                animation: spin 1s linear infinite;
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Toggle visibility
        const toggleBtn = document.getElementById('sync-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleVisibility());
        }

        // Refresh status
        const refreshBtn = document.getElementById('sync-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshStatus());
        }

        // Manual sync
        const manualSyncBtn = document.getElementById('manual-sync-btn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.triggerManualSync());
        }

        // Full sync
        const fullSyncBtn = document.getElementById('full-sync-btn');
        if (fullSyncBtn) {
            fullSyncBtn.addEventListener('click', () => this.triggerFullSync());
        }

        // Suspend sync
        const suspendBtn = document.getElementById('suspend-sync-btn');
        if (suspendBtn) {
            suspendBtn.addEventListener('click', () => this.toggleSuspend());
        }
    }

    /**
     * Start automatic status updates
     */
    startStatusUpdates() {
        this.updateStatus();
        
        this.updateTimer = setInterval(() => {
            this.updateStatus();
        }, this.updateInterval);
    }

    /**
     * Stop automatic status updates
     */
    stopStatusUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Update sync status
     */
    async updateStatus() {
        if (!this.syncCoordinator) {
            return;
        }

        try {
            // Get current status from sync coordinator
            const status = await this.syncCoordinator.getStatus();
            
            // Update UI elements
            this.updateOverallStatus(status);
            this.updateDataStats(status);
            this.updateRecentActivity(status);
            this.updateErrorLog(status);
            this.updateActionButtons(status);
            
            this.currentStatus = status;
            
        } catch (error) {
            this.log(`Failed to update status: ${error.message}`, 'error');
            this.showError('Failed to update sync status');
        }
    }

    /**
     * Update overall status indicator
     */
    updateOverallStatus(status) {
        const indicator = document.getElementById('overall-status');
        const timestamp = document.getElementById('status-timestamp');
        
        if (!indicator) return;

        let statusClass = '';
        let statusIcon = '';
        let statusText = '';

        if (!status.isInitialized) {
            statusClass = 'warning';
            statusIcon = '⚠️';
            statusText = 'Not Initialized';
        } else if (status.isSyncing) {
            statusClass = 'syncing';
            statusIcon = '🔄';
            statusText = 'Syncing...';
        } else if (status.errors && status.errors.length > 0) {
            statusClass = 'error';
            statusIcon = '❌';
            statusText = 'Sync Errors';
        } else if (status.lastSync) {
            statusClass = 'success';
            statusIcon = '✅';
            statusText = 'Sync Complete';
        } else {
            statusClass = '';
            statusIcon = '⏳';
            statusText = 'Ready';
        }

        // Update classes
        indicator.className = `sync-status-indicator ${statusClass}`;
        
        // Update content
        const iconElement = indicator.querySelector('.status-icon');
        const textElement = indicator.querySelector('.status-text');
        
        if (iconElement) {
            iconElement.textContent = statusIcon;
            iconElement.className = status.isSyncing ? 'status-icon spinning' : 'status-icon';
        }
        
        if (textElement) {
            textElement.textContent = statusText;
        }

        // Update timestamp
        if (timestamp && status.lastSync) {
            const lastSyncTime = new Date(status.lastSync).toLocaleTimeString();
            timestamp.textContent = `Last sync: ${lastSyncTime}`;
        }
    }

    /**
     * Update data statistics
     */
    updateDataStats(status) {
        const statsContainer = document.getElementById('data-stats');
        if (!statsContainer || !status.stats) return;

        const stats = status.stats;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.totalRecords || 0}</div>
                <div class="stat-label">Total Records</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.pendingChanges || 0}</div>
                <div class="stat-label">Pending Changes</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.successfulSyncs || 0}</div>
                <div class="stat-label">Successful Syncs</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.failedSyncs || 0}</div>
                <div class="stat-label">Failed Syncs</div>
            </div>
        `;
    }

    /**
     * Update recent activity
     */
    updateRecentActivity(status) {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        const activities = status.recentActivity || [];
        
        if (activities.length === 0) {
            activityContainer.innerHTML = '<div class="activity-loading">No recent activity</div>';
            return;
        }

        const activityHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
                <div class="activity-message">${activity.message}</div>
            </div>
        `).join('');

        activityContainer.innerHTML = activityHTML;
    }

    /**
     * Update error log
     */
    updateErrorLog(status) {
        const errorSection = document.getElementById('error-section');
        const errorLog = document.getElementById('error-log');
        
        if (!errorSection || !errorLog) return;

        const errors = status.errors || [];
        
        if (errors.length === 0) {
            errorSection.style.display = 'none';
            return;
        }

        errorSection.style.display = 'block';
        
        const errorHTML = errors.slice(0, 3).map(error => `
            <div class="error-item">
                <strong>${new Date(error.timestamp).toLocaleTimeString()}:</strong> ${error.message}
            </div>
        `).join('');

        errorLog.innerHTML = errorHTML;
    }

    /**
     * Update action buttons
     */
    updateActionButtons(status) {
        const manualSyncBtn = document.getElementById('manual-sync-btn');
        const fullSyncBtn = document.getElementById('full-sync-btn');
        const suspendBtn = document.getElementById('suspend-sync-btn');

        const isInitialized = status.isInitialized;
        const isSyncing = status.isSyncing;
        const isSuspended = status.isSuspended;

        if (manualSyncBtn) {
            manualSyncBtn.disabled = !isInitialized || isSyncing;
        }

        if (fullSyncBtn) {
            fullSyncBtn.disabled = !isInitialized || isSyncing;
        }

        if (suspendBtn) {
            suspendBtn.disabled = !isInitialized;
            suspendBtn.textContent = isSuspended ? 'Resume' : 'Suspend';
            suspendBtn.className = isSuspended ? 'btn btn-sm btn-success' : 'btn btn-sm btn-danger';
        }
    }

    /**
     * Toggle UI visibility
     */
    toggleVisibility() {
        const container = document.getElementById(this.containerId);
        const toggleBtn = document.getElementById('sync-toggle-btn');
        
        if (!container) return;

        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            container.classList.remove('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Hide';
            this.startStatusUpdates();
        } else {
            container.classList.add('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Show';
            this.stopStatusUpdates();
        }
    }

    /**
     * Refresh status manually
     */
    async refreshStatus() {
        const refreshBtn = document.getElementById('sync-refresh-btn');
        
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            await this.updateStatus();
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        }
    }

    /**
     * Trigger manual sync
     */
    async triggerManualSync() {
        if (!this.syncCoordinator) return;

        const manualSyncBtn = document.getElementById('manual-sync-btn');
        
        if (manualSyncBtn) {
            manualSyncBtn.disabled = true;
            manualSyncBtn.textContent = 'Syncing...';
        }

        try {
            await this.syncCoordinator.performIncrementalSync();
            this.showSuccess('Manual sync completed');
        } catch (error) {
            this.showError(`Manual sync failed: ${error.message}`);
        } finally {
            if (manualSyncBtn) {
                manualSyncBtn.disabled = false;
                manualSyncBtn.textContent = 'Manual Sync';
            }
        }
    }

    /**
     * Trigger full sync
     */
    async triggerFullSync() {
        if (!this.syncCoordinator) return;

        const fullSyncBtn = document.getElementById('full-sync-btn');
        
        if (fullSyncBtn) {
            fullSyncBtn.disabled = true;
            fullSyncBtn.textContent = 'Full Syncing...';
        }

        try {
            await this.syncCoordinator.performFullSync();
            this.showSuccess('Full sync completed');
        } catch (error) {
            this.showError(`Full sync failed: ${error.message}`);
        } finally {
            if (fullSyncBtn) {
                fullSyncBtn.disabled = false;
                fullSyncBtn.textContent = 'Full Sync';
            }
        }
    }

    /**
     * Toggle sync suspension
     */
    async toggleSuspend() {
        if (!this.syncCoordinator) return;

        const suspendBtn = document.getElementById('suspend-sync-btn');
        const currentStatus = await this.syncCoordinator.getStatus();
        
        try {
            if (currentStatus.isSuspended) {
                await this.syncCoordinator.resumeSync();
                this.showSuccess('Sync resumed');
            } else {
                await this.syncCoordinator.suspendSync();
                this.showSuccess('Sync suspended');
            }
        } catch (error) {
            this.showError(`Failed to toggle sync: ${error.message}`);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.log(message, 'info');
        // Could add toast notification here
    }

    /**
     * Show error message
     */
    showError(message) {
        this.log(message, 'error');
        // Could add toast notification here
    }

    /**
     * Destroy the UI
     */
    destroy() {
        this.stopStatusUpdates();
        
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }

        const styles = document.getElementById('sync-status-ui-styles');
        if (styles) {
            styles.remove();
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[Sync Status UI ${level.toUpperCase()}] ${timestamp}:`;
            
            switch (level) {
                case 'error':
                    break;
                case 'warn':
                    break;
                case 'debug':
                    break;
                default:
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SyncStatusUI = SyncStatusUI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncStatusUI;
}