/**
 * Google Sheets Auto Configuration
 * Automatically configures Google Sheets API key and Sheet ID across the application
 * This file should be loaded before any other Google Sheets related scripts
 */

class GoogleSheetsAutoConfig {
    constructor() {
        // Default configuration - these will be automatically applied
        this.config = {
            apiKey: 'AIzaSyAdESdS-vNgXcvp0ZUv3AsYkryNdCemztI',
            sheetId: '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s',
            sheetUrl: 'https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s',
            
            // Sheet ranges for different data types
            ranges: {
                products: 'pricelists!A:Z',
                salesmen: 'salesmen!A:Z',
                clients: 'clients!A:Z',
                colors: 'colors!A:Z',
                styles: 'styles!A:Z',
                companies: 'companies!A:Z',
                orders: 'Orders!A:N',
                priceLists: 'pricelists!A:Z'
            },
            
            // API endpoints
            endpoints: {
                base: 'https://sheets.googleapis.com/v4/spreadsheets',
                discovery: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
            },
            
            // Scopes for different operations
            scopes: {
                readonly: 'https://www.googleapis.com/auth/spreadsheets.readonly',
                readwrite: 'https://www.googleapis.com/auth/spreadsheets'
            }
        };
        
        this.initialized = false;
        this.autoApply();
    }
    
    /**
     * Load configuration from localStorage if available
     */
    loadFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('googleSheetsConfig');
                if (stored) {
                    const config = JSON.parse(stored);
                    if (config.apiKey && config.sheetId) {
                        this.config.apiKey = config.apiKey;
                        this.config.sheetId = config.sheetId;
                        this.config.sheetUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}`;
                        this.log('📦 Google Sheets configuration loaded from localStorage', 'info');
                        return true;
                    }
                }
            }
        } catch (error) {
            this.log('⚠️ Error loading Google Sheets config from localStorage: ' + error.message, 'warn');
        }
        return false;
    }

    /**
     * Automatically apply configuration to global scope
     */
    autoApply() {
        try {
            // First try to load from localStorage
            this.loadFromStorage();
            
            // Set global window variables for browser environment
            if (typeof window !== 'undefined') {
                window.GOOGLE_SHEETS_API_KEY = this.config.apiKey;
                window.GOOGLE_SHEETS_SHEET_ID = this.config.sheetId;
                window.GOOGLE_SHEETS_SHEET_URL = this.config.sheetUrl;
                window.GOOGLE_SHEETS_CONFIG = this.config;
                
                // Legacy compatibility
                window.googleSheetsConfig = this.config;
            }
            
            // Set process environment variables for Node.js environment
            if (typeof process !== 'undefined' && process.env) {
                process.env.GOOGLE_SHEETS_API_KEY = this.config.apiKey;
                process.env.GOOGLE_SHEETS_SHEET_ID = this.config.sheetId;
            }
            
            this.initialized = true;
            this.log('✅ Google Sheets configuration automatically applied', 'info');
            
        } catch (error) {
            this.log('❌ Failed to apply Google Sheets configuration: ' + error.message, 'error');
        }
    }
    
    /**
     * Get API key with fallback
     */
    getApiKey() {
        if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_SHEETS_API_KEY) {
            return process.env.GOOGLE_SHEETS_API_KEY;
        }
        if (typeof window !== 'undefined' && window.GOOGLE_SHEETS_API_KEY) {
            return window.GOOGLE_SHEETS_API_KEY;
        }
        return this.config.apiKey;
    }
    
    /**
     * Get sheet ID with fallback
     */
    getSheetId() {
        if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_SHEETS_SHEET_ID) {
            return process.env.GOOGLE_SHEETS_SHEET_ID;
        }
        if (typeof window !== 'undefined' && window.GOOGLE_SHEETS_SHEET_ID) {
            return window.GOOGLE_SHEETS_SHEET_ID;
        }
        return this.config.sheetId;
    }
    
    /**
     * Get the configured sheet URL
     */
    getSheetUrl() {
        const sheetId = this.getSheetId();
        return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : this.config.sheetUrl;
    }
    
    /**
     * Get full configuration object
     */
    getConfig() {
        return {
            ...this.config,
            apiKey: this.getApiKey(),
            sheetId: this.getSheetId()
        };
    }
    
    /**
     * Build API URL for specific operations
     */
    buildApiUrl(operation, range = '', options = {}) {
        const baseUrl = `${this.config.endpoints.base}/${this.getSheetId()}`;
        const apiKey = this.getApiKey();
        
        switch (operation) {
            case 'read':
                return `${baseUrl}/values/${range}?key=${apiKey}`;
                
            case 'append':
                const valueInputOption = options.valueInputOption || 'RAW';
                return `${baseUrl}/values/${range}:append?valueInputOption=${valueInputOption}&key=${apiKey}`;
                
            case 'update':
                const updateOption = options.valueInputOption || 'RAW';
                return `${baseUrl}/values/${range}?valueInputOption=${updateOption}&key=${apiKey}`;
                
            case 'batchUpdate':
                return `${baseUrl}:batchUpdate?key=${apiKey}`;
                
            default:
                return `${baseUrl}?key=${apiKey}`;
        }
    }
    
    /**
     * Validate configuration
     */
    validate() {
        const apiKey = this.getApiKey();
        const sheetId = this.getSheetId();
        
        const issues = [];
        
        if (!apiKey || apiKey === 'YOUR_GOOGLE_SHEETS_API_KEY') {
            issues.push('API key is not configured or using placeholder value');
        }
        
        if (!sheetId || sheetId.length < 10) {
            issues.push('Sheet ID is not configured or invalid');
        }
        
        if (apiKey && !apiKey.startsWith('AIza')) {
            issues.push('API key format appears invalid (should start with "AIza")');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            config: this.getConfig()
        };
    }
    
    /**
     * Test connection to Google Sheets
     */
    async testConnection() {
        try {
            const validation = this.validate();
            if (!validation.valid) {
                throw new Error('Configuration validation failed: ' + validation.issues.join(', '));
            }
            
            const testUrl = this.buildApiUrl('read', 'A1:A1');
            const response = await fetch(testUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Connection successful',
                data: data
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Connection failed: ' + error.message,
                error: error
            };
        }
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.autoApply();
        this.log('🔄 Configuration updated and reapplied', 'info');
    }
    
    /**
     * Get status information
     */
    getStatus() {
        const validation = this.validate();
        return {
            initialized: this.initialized,
            validation: validation,
            apiKey: this.getApiKey() ? 'Present (' + this.getApiKey().substring(0, 10) + '...)' : 'Missing',
            sheetId: this.getSheetId() || 'Missing',
            sheetUrl: this.config.sheetUrl
        };
    }
    
    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = '[Google Sheets Auto Config]';
        
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

// Auto-initialize when script loads
const googleSheetsAutoConfig = new GoogleSheetsAutoConfig();

// Export for different environments
if (typeof window !== 'undefined') {
    window.GoogleSheetsAutoConfig = GoogleSheetsAutoConfig;
    window.googleSheetsAutoConfig = googleSheetsAutoConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GoogleSheetsAutoConfig,
        googleSheetsAutoConfig
    };
}

// Log initialization status
googleSheetsAutoConfig.log('🚀 Google Sheets Auto Configuration loaded and initialized', 'info');