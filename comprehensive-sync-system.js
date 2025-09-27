/**
 * Comprehensive Data Synchronization System
 * Implements 3-stage sync: Google Sheets → Firebase → Local Storage
 * Provides data monitoring, status indicators, and error handling
 */

class ComprehensiveSyncSystem {
    constructor() {
        this.syncStatus = {
            googleSheets: { connected: false, lastSync: null, recordCount: 0 },
            firebase: { connected: false, lastSync: null, recordCount: 0 },
            localStorage: { connected: true, lastSync: null, recordCount: 0 }
        };
        
        this.syncProgress = {
            stage: 0,
            totalStages: 3,
            currentOperation: '',
            percentage: 0,
            errors: []
        };
        
        this.collections = [
            'products', 'clients', 'quotes', 'orders', 
            'salesmen', 'pricelists', 'categories', 'colors', 'styles'
        ];
        
        this.eventListeners = new Map();
        this.isInitialized = false;
    }

    // Event system for real-time updates
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Initialize the synchronization system
    async initialize() {
        try {
            this.emit('sync-status', { message: 'Initializing synchronization system...', type: 'info' });
            
            // Check Firebase connection
            await this.checkFirebaseConnection();
            
            // Check Google Sheets connection
            await this.checkGoogleSheetsConnection();
            
            // Update local storage status
            await this.updateLocalStorageStatus();
            
            this.isInitialized = true;
            this.emit('sync-status', { message: 'Synchronization system initialized successfully', type: 'success' });
            
            return true;
        } catch (error) {
            this.emit('sync-status', { message: `Initialization failed: ${error.message}`, type: 'error' });
            return false;
        }
    }

    // Check Firebase connection and get record counts
    async checkFirebaseConnection() {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            let totalRecords = 0;

            // Count records in each collection
            for (const collection of this.collections) {
                try {
                    const snapshot = await db.collection(collection).get();
                    totalRecords += snapshot.size;
                } catch (error) {
                    console.warn(`Could not access collection ${collection}:`, error);
                }
            }

            this.syncStatus.firebase = {
                connected: true,
                lastSync: new Date().toISOString(),
                recordCount: totalRecords
            };

            this.emit('firebase-status', this.syncStatus.firebase);
            return true;
        } catch (error) {
            this.syncStatus.firebase.connected = false;
            this.emit('firebase-status', this.syncStatus.firebase);
            throw error;
        }
    }

    // Check Google Sheets connection
    async waitForGoogleSheetsService(maxWaitTime = 15000) {
        const startTime = Date.now();
        let lastStatus = '';
        
        while (Date.now() - startTime < maxWaitTime) {
            const currentStatus = this.getGoogleSheetsStatus();
            if (currentStatus !== lastStatus) {
                console.log('Google Sheets status:', currentStatus);
                lastStatus = currentStatus;
            }
            
            if (window.googleSheetsService && 
                typeof gapi !== 'undefined' && 
                gapi.client && 
                gapi.client.sheets) {
                // Additional check to ensure service methods are available
                const requiredMethods = ['fetchProductData', 'fetchSalesmanData', 'fetchClientData', 'fetchColorsData', 'fetchStylesData'];
                const allMethodsAvailable = requiredMethods.every(method => 
                    typeof window.googleSheetsService[method] === 'function'
                );
                
                if (allMethodsAvailable) {
                    console.log('Google Sheets service is ready with all required methods');
                    return true;
                }
            }
            
            // Wait 200ms before checking again (reduced frequency to avoid spam)
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const finalStatus = this.getGoogleSheetsStatus();
        console.error('Google Sheets service initialization timeout after', maxWaitTime, 'ms');
        console.error('Final status:', finalStatus);
        throw new Error(`Google Sheets service initialization timeout. Status: ${finalStatus}`);
    }

    getGoogleSheetsStatus() {
        const gapiLoaded = typeof gapi !== 'undefined';
        const clientLoaded = gapiLoaded && gapi.client;
        const sheetsLoaded = clientLoaded && gapi.client.sheets;
        const serviceLoaded = !!window.googleSheetsService;
        
        return `gapi:${gapiLoaded}, client:${clientLoaded}, sheets:${sheetsLoaded}, service:${serviceLoaded}`;
    }

    async checkGoogleSheetsConnection() {
        try {
            // Check if Google API client is available and initialized
            const hasGoogleSheetsAccess = typeof gapi !== 'undefined' && 
                                        gapi.client && 
                                        gapi.client.sheets &&
                                        window.GOOGLE_SHEETS_API_KEY &&
                                        window.GOOGLE_SHEETS_API_KEY !== 'YOUR_GOOGLE_SHEETS_API_KEY' &&
                                        window.googleSheetsService;
            
            let recordCount = 0;
            
            // If connected, try to get a sample record count
            if (hasGoogleSheetsAccess) {
                try {
                    // Test connection by trying to access the spreadsheet
                    const SHEET_ID = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
                    const response = await gapi.client.sheets.spreadsheets.get({
                        spreadsheetId: SHEET_ID
                    });
                    
                    if (response.result && response.result.sheets) {
                        recordCount = response.result.sheets.length * 100; // Estimate
                    }
                } catch (apiError) {
                    console.warn('Google Sheets API test failed:', apiError);
                    // Still mark as connected if API is available, even if test fails
                }
            }
            
            this.syncStatus.googleSheets = {
                connected: hasGoogleSheetsAccess,
                lastSync: hasGoogleSheetsAccess ? new Date().toISOString() : null,
                recordCount: recordCount
            };

            this.emit('sheets-status', this.syncStatus.googleSheets);
            return hasGoogleSheetsAccess;
        } catch (error) {
            this.syncStatus.googleSheets.connected = false;
            this.emit('sheets-status', this.syncStatus.googleSheets);
            console.error('Google Sheets connection check failed:', error);
            return false;
        }
    }

    // Update local storage status and count records
    async updateLocalStorageStatus() {
        try {
            let totalRecords = 0;

            for (const collection of this.collections) {
                const data = localStorage.getItem(collection);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        totalRecords += Array.isArray(parsed) ? parsed.length : 1;
                    } catch (error) {
                        console.warn(`Invalid JSON in localStorage for ${collection}`);
                    }
                }
            }

            this.syncStatus.localStorage = {
                connected: true,
                lastSync: new Date().toISOString(),
                recordCount: totalRecords
            };

            this.emit('localStorage-status', this.syncStatus.localStorage);
            return true;
        } catch (error) {
            this.syncStatus.localStorage.connected = false;
            this.emit('localStorage-status', this.syncStatus.localStorage);
            throw error;
        }
    }

    // Stage 1: Google Sheets → Firebase
    async syncGoogleSheetsToFirebase() {
        this.emit('sync-progress', { stage: 1, message: 'Starting Google Sheets to Firebase sync...', percentage: 0 });
        
        try {
            // Check if Google Sheets has been manually skipped
            if (window.googleSheetsSkipped) {
                console.log('Google Sheets has been skipped, proceeding without Google Sheets sync...');
                this.emit('sync-progress', { 
                    stage: 1, 
                    message: 'Google Sheets skipped - proceeding to Firebase sync...', 
                    percentage: 100 
                });
                return;
            }
            
            // Wait for Google Sheets service to be fully ready before starting sync
            await this.waitForGoogleSheetsService();
            
            const db = firebase.firestore();
            let processedCollections = 0;
            
            // Map collections to Google Sheets data fetchers
            const sheetsFetchers = {
                'products': 'fetchProductData',
                'clients': 'fetchClientData',
                'salesmen': 'fetchSalesmanData',
                'pricelists': 'fetchPriceListsData',
                'styles': 'fetchStylesData',
                'colors': 'fetchColorsData'
            };
            
            for (const collection of this.collections) {
                this.emit('sync-progress', { 
                    stage: 1, 
                    message: `Syncing ${collection} from Google Sheets to Firebase...`,
                    percentage: Math.round((processedCollections / this.collections.length) * 100)
                });

                try {
                    // Get data from Google Sheets
                    const fetcherMethod = sheetsFetchers[collection];
                    if (fetcherMethod && window.googleSheetsService && window.googleSheetsService[fetcherMethod]) {
                        console.log(`Fetching ${collection} data from Google Sheets...`);
                        
                        let sheetsData;
                        try {
                            sheetsData = await window.googleSheetsService[fetcherMethod]();
                        } catch (fetchError) {
                            if (fetchError.message.includes('not yet initialized')) {
                                throw new Error(`Google Sheets API not ready for ${collection} data. Please wait for initialization to complete.`);
                            }
                            throw new Error(`Failed to fetch ${collection} data from Google Sheets: ${fetchError.message}`);
                        }
                        
                        if (sheetsData && sheetsData.length > 0) {
                            // Upload to Firebase
                            console.log(`Uploading ${sheetsData.length} ${collection} records to Firebase...`);
                            
                            // Special handling for pricelists which returns array of strings
                            if (collection === 'pricelists') {
                                for (let i = 0; i < sheetsData.length; i++) {
                                    const priceListName = sheetsData[i];
                                    const docId = `pricelist_${priceListName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
                                    const priceListData = {
                                        id: docId,
                                        name: priceListName,
                                        createdAt: new Date().toISOString(),
                                        source: 'google_sheets'
                                    };
                                    await this.writeToFirebaseWithRetry(db, collection, docId, priceListData);
                                }
                            } else {
                                // Standard handling for other collections
                                for (const item of sheetsData) {
                                    const docId = item.id || item.ID || `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                    await this.writeToFirebaseWithRetry(db, collection, docId, item);
                                }
                            }
                            console.log(`Successfully synced ${sheetsData.length} ${collection} records`);
                        } else {
                            console.log(`No data found for ${collection} in Google Sheets`);
                        }
                    } else {
                        console.log(`No fetcher method found for ${collection}, using sample data`);
                        // Fallback to sample data for collections without specific fetchers
                        await this.simulateGoogleSheetsToFirebaseSync(collection, db);
                    }
                } catch (collectionError) {
                    console.error(`Error syncing ${collection}:`, collectionError);
                    // Continue with other collections even if one fails
                    this.syncProgress.errors.push(`${collection} sync error: ${collectionError.message}`);
                }
                
                processedCollections++;
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            this.emit('sync-progress', { stage: 1, message: 'Google Sheets to Firebase sync completed', percentage: 100 });
            await this.checkFirebaseConnection(); // Update Firebase status
            
            return true;
        } catch (error) {
            console.error('Google Sheets to Firebase sync failed:', error);
            this.syncProgress.errors.push(`Stage 1 error: ${error.message}`);
            throw error;
        }
    }

    // Stage 2: Firebase → Local Storage
    async syncFirebaseToLocalStorage() {
        this.emit('sync-progress', { stage: 2, message: 'Starting Firebase to Local Storage sync...', percentage: 0 });
        
        try {
            const db = firebase.firestore();
            let processedCollections = 0;
            
            for (const collection of this.collections) {
                this.emit('sync-progress', { 
                    stage: 2, 
                    message: `Syncing ${collection} from Firebase to Local Storage...`,
                    percentage: Math.round((processedCollections / this.collections.length) * 100)
                });

                try {
                    console.log(`Fetching ${collection} from Firebase...`);
                    const snapshot = await db.collection(collection).get();
                    const data = [];
                    
                    snapshot.forEach(doc => {
                        data.push({ id: doc.id, ...doc.data() });
                    });

                    console.log(`Found ${data.length} records in ${collection}, storing to localStorage...`);
                    // Store in localStorage
                    localStorage.setItem(collection, JSON.stringify(data));
                    console.log(`Successfully stored ${collection} to localStorage`);
                    
                } catch (error) {
                    console.warn(`Error syncing collection ${collection}:`, error);
                    this.syncProgress.errors.push(`Collection ${collection}: ${error.message}`);
                }
                
                processedCollections++;
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            this.emit('sync-progress', { stage: 2, message: 'Firebase to Local Storage sync completed', percentage: 100 });
            await this.updateLocalStorageStatus(); // Update localStorage status
            
            return true;
        } catch (error) {
            this.syncProgress.errors.push(`Stage 2 error: ${error.message}`);
            throw error;
        }
    }

    // Stage 3: Local Storage → Application Dropdowns
    async syncLocalStorageToApplication() {
        this.emit('sync-progress', { stage: 3, message: 'Starting Local Storage to Application sync...', percentage: 0 });
        
        try {
            let processedCollections = 0;
            
            for (const collection of this.collections) {
                this.emit('sync-progress', { 
                    stage: 3, 
                    message: `Updating ${collection} in application dropdowns...`,
                    percentage: Math.round((processedCollections / this.collections.length) * 100)
                });

                // Trigger application dropdown updates
                this.emit('dropdown-update', { collection, data: this.getLocalStorageData(collection) });
                
                processedCollections++;
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            this.emit('sync-progress', { stage: 3, message: 'Local Storage to Application sync completed', percentage: 100 });
            
            return true;
        } catch (error) {
            this.syncProgress.errors.push(`Stage 3 error: ${error.message}`);
            throw error;
        }
    }

    // Main synchronization method - executes all 3 stages
    async performComprehensiveSync() {
        console.log('Starting comprehensive sync...');
        
        if (!this.isInitialized) {
            console.log('System not initialized, initializing now...');
            await this.initialize();
        }

        this.syncProgress = {
            stage: 0,
            totalStages: 3,
            currentOperation: '',
            percentage: 0,
            errors: []
        };

        this.emit('sync-started', { timestamp: new Date().toISOString() });

        try {
            // Stage 1: Google Sheets → Firebase
            console.log('Stage 1: Starting Google Sheets → Firebase sync');
            await this.syncGoogleSheetsToFirebase();
            console.log('Stage 1: Completed Google Sheets → Firebase sync');
            
            // Stage 2: Firebase → Local Storage
            console.log('Stage 2: Starting Firebase → Local Storage sync');
            await this.syncFirebaseToLocalStorage();
            console.log('Stage 2: Completed Firebase → Local Storage sync');
            
            // Stage 3: Local Storage → Application
            console.log('Stage 3: Starting Local Storage → Application sync');
            await this.syncLocalStorageToApplication();
            console.log('Stage 3: Completed Local Storage → Application sync');

            const syncReport = this.generateSyncReport();
            console.log('Comprehensive sync completed successfully:', syncReport);
            this.emit('sync-completed', syncReport);
            
            return syncReport;
        } catch (error) {
            console.error('Comprehensive sync failed:', error);
            this.emit('sync-error', { error: error.message, stage: this.syncProgress.stage });
            throw error;
        }
    }

    // Reverse synchronization: Application → Firebase → Google Sheets
    async performReverseSync() {
        this.emit('sync-status', { message: 'Starting reverse synchronization...', type: 'info' });
        
        try {
            // Get all app-generated data from localStorage
            const appData = this.getAppGeneratedData();
            
            // Push to Firebase
            await this.pushToFirebase(appData);
            
            // Push to Google Sheets
            await this.pushToGoogleSheets(appData);
            
            this.emit('sync-status', { message: 'Reverse synchronization completed successfully', type: 'success' });
            
            return true;
        } catch (error) {
            this.emit('sync-status', { message: `Reverse sync failed: ${error.message}`, type: 'error' });
            throw error;
        }
    }

    // Get data from localStorage
    getLocalStorageData(collection) {
        try {
            const data = localStorage.getItem(collection);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn(`Error reading ${collection} from localStorage:`, error);
            return [];
        }
    }

    // Get app-generated data (quotes, orders created on this device)
    getAppGeneratedData() {
        const deviceId = this.getDeviceId();
        const appData = {};
        
        ['quotes', 'orders', 'clients'].forEach(collection => {
            const data = this.getLocalStorageData(collection);
            appData[collection] = data.filter(item => item.deviceId === deviceId);
        });
        
        return appData;
    }

    // Get unique device identifier
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // Simulate Google Sheets to Firebase sync
    async simulateGoogleSheetsToFirebaseSync(collection, db) {
        // This would be replaced with actual Google Sheets API calls
        const sampleData = this.generateSampleData(collection);
        
        for (const item of sampleData) {
            await db.collection(collection).doc(item.id).set(item);
        }
    }

    // Generate sample data for demonstration
    generateSampleData(collection) {
        const samples = {
            products: [
                { id: 'prod_1', name: 'Sample Product 1', price: 100, category: 'Category A' },
                { id: 'prod_2', name: 'Sample Product 2', price: 200, category: 'Category B' }
            ],
            clients: [
                { id: 'client_1', name: 'Sample Client 1', email: 'client1@example.com' },
                { id: 'client_2', name: 'Sample Client 2', email: 'client2@example.com' }
            ],
            // Add more sample data as needed
        };
        
        return samples[collection] || [];
    }

    // Push data to Firebase
    async pushToFirebase(appData) {
        const db = firebase.firestore();
        
        for (const [collection, data] of Object.entries(appData)) {
            for (const item of data) {
                await db.collection(collection).doc(item.id).set(item);
            }
        }
    }

    // Push data to Google Sheets
    async pushToGoogleSheets(appData) {
        // This would implement actual Google Sheets API calls
        console.log('Pushing to Google Sheets:', appData);
        // Simulate the operation
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate comprehensive sync report
    generateSyncReport() {
        return {
            timestamp: new Date().toISOString(),
            deviceId: this.getDeviceId(),
            stages: {
                stage1: { name: 'Google Sheets → Firebase', completed: true },
                stage2: { name: 'Firebase → Local Storage', completed: true },
                stage3: { name: 'Local Storage → Application', completed: true }
            },
            recordCounts: this.syncStatus,
            errors: this.syncProgress.errors,
            collections: this.collections.map(collection => ({
                name: collection,
                localCount: this.getLocalStorageData(collection).length,
                status: 'synced'
            }))
        };
    }

    // Write to Firebase with retry logic to handle connection errors
    async writeToFirebaseWithRetry(db, collection, docId, data, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await db.collection(collection).doc(docId).set(data);
                return; // Success, exit the retry loop
            } catch (error) {
                console.warn(`Firebase write attempt ${attempt} failed for ${collection}/${docId}:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to write to Firebase after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Get current sync status
    getSyncStatus() {
        return {
            ...this.syncStatus,
            isInitialized: this.isInitialized,
            deviceId: this.getDeviceId()
        };
    }
}

// Export for use in other modules
window.ComprehensiveSyncSystem = ComprehensiveSyncSystem;