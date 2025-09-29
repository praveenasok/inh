const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const EventEmitter = require('events');

class GoogleSheetsChangeDetector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.doc = null;
        this.isInitialized = false;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastKnownData = new Map();
        this.pollIntervalMs = config.pollIntervalMs || 30000; // 30 seconds default
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000;
    }

    async initialize() {
        try {
            
            // Initialize JWT auth
            const serviceAccountAuth = new JWT({
                email: this.config.client_email,
                key: this.config.private_key,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file',
                ],
            });

            // Initialize the sheet
            this.doc = new GoogleSpreadsheet(this.config.spreadsheetId, serviceAccountAuth);
            await this.doc.loadInfo();

            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            this.retryAttempts = 0;
            
            this.emit('initialized');
            
            return true;
        } catch (error) {
            this.emit('error', error);
            
            // Retry logic
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                setTimeout(() => this.initialize(), this.retryDelay);
            }
            
            return false;
        }
    }

    async loadInitialData() {
        try {
            // Load salesmen data
            const salesmenData = await this.getSalesmenData();
            this.lastKnownData.set('salesmen', {
                count: salesmenData.count,
                data: salesmenData.data,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(salesmenData.data)
            });

            // Load price lists data
            const priceListsData = await this.getPriceListsData();
            this.lastKnownData.set('priceLists', {
                count: priceListsData.count,
                data: priceListsData.data,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(priceListsData.data)
            });

            this.emit('initial-data-loaded', {
                salesmenCount: salesmenData.count,
                priceListsCount: priceListsData.count
            });
        } catch (error) {
            throw error;
        }
    }

    async getSalesmenData() {
        try {
            const sheet = this.doc.sheetsByTitle['Salespeople'] || this.doc.sheetsByIndex[0];
            if (!sheet) {
                throw new Error('Salespeople sheet not found');
            }

            const rows = await sheet.getRows();
            const salesmenData = rows.map(row => ({
                id: row.get('ID') || row.get('id'),
                name: row.get('Name') || row.get('name'),
                email: row.get('Email') || row.get('email'),
                phone: row.get('Phone') || row.get('phone'),
                territory: row.get('Territory') || row.get('territory'),
                lastModified: row.get('Last Modified') || Date.now()
            })).filter(salesman => salesman.id && salesman.name);

            return {
                count: salesmenData.length,
                data: salesmenData,
                timestamp: Date.now()
            };
        } catch (error) {
            throw error;
        }
    }

    async getPriceListsData() {
        try {
            const sheet = this.doc.sheetsByTitle['Price Lists'] || 
                         this.doc.sheetsByTitle['PriceLists'] ||
                         this.doc.sheetsByIndex[1];
            
            if (!sheet) {
                throw new Error('Price Lists sheet not found');
            }

            const rows = await sheet.getRows();
            const priceListsData = rows.map(row => ({
                id: row.get('ID') || row.get('id'),
                name: row.get('Name') || row.get('name'),
                category: row.get('Category') || row.get('category'),
                price: parseFloat(row.get('Price') || row.get('price')) || 0,
                currency: row.get('Currency') || row.get('currency') || 'USD',
                lastModified: row.get('Last Modified') || Date.now()
            })).filter(priceList => priceList.id && priceList.name);

            return {
                count: priceListsData.length,
                data: priceListsData,
                timestamp: Date.now()
            };
        } catch (error) {
            throw error;
        }
    }

    startPolling() {
        if (this.isPolling || !this.isInitialized) {
            return;
        }

        this.isPolling = true;
        
        this.pollingInterval = setInterval(async () => {
            await this.checkForChanges();
        }, this.pollIntervalMs);

        this.emit('polling-started');
    }

    stopPolling() {
        if (!this.isPolling) {
            return;
        }

        this.isPolling = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.emit('polling-stopped');
    }

    async checkForChanges() {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Check salesmen changes
            await this.checkSalesmenChanges();
            
            // Check price lists changes
            await this.checkPriceListsChanges();
            
        } catch (error) {
            this.emit('error', error);
        }
    }

    async checkSalesmenChanges() {
        try {
            const currentData = await this.getSalesmenData();
            const lastKnown = this.lastKnownData.get('salesmen');

            if (!lastKnown) {
                // First time checking
                this.lastKnownData.set('salesmen', {
                    count: currentData.count,
                    data: currentData.data,
                    lastModified: Date.now(),
                    checksum: this.calculateChecksum(currentData.data)
                });
                return;
            }

            const currentChecksum = this.calculateChecksum(currentData.data);
            
            // Check for changes
            if (currentData.count !== lastKnown.count || currentChecksum !== lastKnown.checksum) {
                this.emit('salesmen-changed', {
                    oldCount: lastKnown.count,
                    newCount: currentData.count,
                    oldChecksum: lastKnown.checksum,
                    newChecksum: currentChecksum
                });

                const changeDetails = this.analyzeChanges(lastKnown.data, currentData.data, 'salesmen');
                
                this.lastKnownData.set('salesmen', {
                    count: currentData.count,
                    data: currentData.data,
                    lastModified: Date.now(),
                    checksum: currentChecksum
                });

                this.emit('salesmen-changed', {
                    type: 'salesmen',
                    oldData: lastKnown,
                    newData: currentData,
                    changes: changeDetails,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    async checkPriceListsChanges() {
        try {
            const currentData = await this.getPriceListsData();
            const lastKnown = this.lastKnownData.get('priceLists');

            if (!lastKnown) {
                // First time checking
                this.lastKnownData.set('priceLists', {
                    count: currentData.count,
                    data: currentData.data,
                    lastModified: Date.now(),
                    checksum: this.calculateChecksum(currentData.data)
                });
                return;
            }

            const currentChecksum = this.calculateChecksum(currentData.data);
            
            // Check for changes
            if (currentData.count !== lastKnown.count || currentChecksum !== lastKnown.checksum) {
                this.emit('price-lists-changed', {
                    oldCount: lastKnown.count,
                    newCount: currentData.count,
                    oldChecksum: lastKnown.checksum,
                    newChecksum: currentChecksum
                });

                const changeDetails = this.analyzeChanges(lastKnown.data, currentData.data, 'priceLists');
                
                this.lastKnownData.set('priceLists', {
                    count: currentData.count,
                    data: currentData.data,
                    lastModified: Date.now(),
                    checksum: currentChecksum
                });

                this.emit('price-lists-changed', {
                    type: 'priceLists',
                    oldData: lastKnown,
                    newData: currentData,
                    changes: changeDetails,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    analyzeChanges(oldData, newData, type) {
        const changes = {
            added: [],
            modified: [],
            deleted: [],
            summary: {
                totalChanges: 0,
                addedCount: 0,
                modifiedCount: 0,
                deletedCount: 0
            }
        };

        // Create maps for easier comparison
        const oldMap = new Map(oldData.map(item => [item.id, item]));
        const newMap = new Map(newData.map(item => [item.id, item]));

        // Find added items
        for (const [id, item] of newMap) {
            if (!oldMap.has(id)) {
                changes.added.push(item);
            }
        }

        // Find deleted items
        for (const [id, item] of oldMap) {
            if (!newMap.has(id)) {
                changes.deleted.push(item);
            }
        }

        // Find modified items
        for (const [id, newItem] of newMap) {
            const oldItem = oldMap.get(id);
            if (oldItem && this.calculateChecksum([oldItem]) !== this.calculateChecksum([newItem])) {
                changes.modified.push({
                    id,
                    old: oldItem,
                    new: newItem,
                    changedFields: this.getChangedFields(oldItem, newItem)
                });
            }
        }

        // Update summary
        changes.summary.addedCount = changes.added.length;
        changes.summary.modifiedCount = changes.modified.length;
        changes.summary.deletedCount = changes.deleted.length;
        changes.summary.totalChanges = changes.summary.addedCount + 
                                      changes.summary.modifiedCount + 
                                      changes.summary.deletedCount;

        return changes;
    }

    getChangedFields(oldItem, newItem) {
        const changedFields = [];
        
        for (const key in newItem) {
            if (oldItem[key] !== newItem[key]) {
                changedFields.push({
                    field: key,
                    oldValue: oldItem[key],
                    newValue: newItem[key]
                });
            }
        }

        return changedFields;
    }

    calculateChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('md5').update(dataString).digest('hex');
    }

    async updateSalesmenData(salesmenData) {
        try {
            const sheet = this.doc.sheetsByTitle['Salespeople'] || this.doc.sheetsByIndex[0];
            if (!sheet) {
                throw new Error('Salespeople sheet not found');
            }

            // Clear existing data (except header)
            await sheet.clear();
            
            // Add header row
            await sheet.setHeaderRow(['ID', 'Name', 'Email', 'Phone', 'Territory', 'Last Modified']);

            // Add data rows
            const rows = salesmenData.map(salesman => ({
                'ID': salesman.id,
                'Name': salesman.name,
                'Email': salesman.email,
                'Phone': salesman.phone,
                'Territory': salesman.territory,
                'Last Modified': new Date().toISOString()
            }));

            await sheet.addRows(rows);
            
            
            // Update local cache
            this.lastKnownData.set('salesmen', {
                count: salesmenData.length,
                data: salesmenData,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(salesmenData)
            });

            this.emit('salesmen-updated', {
                count: salesmenData.length,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async updatePriceListsData(priceListsData) {
        try {
            const sheet = this.doc.sheetsByTitle['Price Lists'] || 
                         this.doc.sheetsByTitle['PriceLists'] ||
                         this.doc.sheetsByIndex[1];
            
            if (!sheet) {
                throw new Error('Price Lists sheet not found');
            }

            // Clear existing data (except header)
            await sheet.clear();
            
            // Add header row
            await sheet.setHeaderRow(['ID', 'Name', 'Category', 'Price', 'Currency', 'Last Modified']);

            // Add data rows
            const rows = priceListsData.map(priceList => ({
                'ID': priceList.id,
                'Name': priceList.name,
                'Category': priceList.category,
                'Price': priceList.price,
                'Currency': priceList.currency,
                'Last Modified': new Date().toISOString()
            }));

            await sheet.addRows(rows);
            
            
            // Update local cache
            this.lastKnownData.set('priceLists', {
                count: priceListsData.length,
                data: priceListsData,
                lastModified: Date.now(),
                checksum: this.calculateChecksum(priceListsData)
            });

            this.emit('price-lists-updated', {
                count: priceListsData.length,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isPolling: this.isPolling,
            pollIntervalMs: this.pollIntervalMs,
            lastKnownData: {
                salesmen: this.lastKnownData.get('salesmen') ? {
                    count: this.lastKnownData.get('salesmen').count,
                    lastModified: this.lastKnownData.get('salesmen').lastModified
                } : null,
                priceLists: this.lastKnownData.get('priceLists') ? {
                    count: this.lastKnownData.get('priceLists').count,
                    lastModified: this.lastKnownData.get('priceLists').lastModified
                } : null
            },
            retryAttempts: this.retryAttempts,
            maxRetries: this.maxRetries
        };
    }

    async forceRefresh() {
        await this.loadInitialData();
        this.emit('force-refreshed');
    }

    cleanup() {
        this.stopPolling();
        this.removeAllListeners();
        this.lastKnownData.clear();
        this.isInitialized = false;
    }
}

module.exports = GoogleSheetsChangeDetector;