/**
 * Google Sheets to IndexedDB Sync Service
 * Handles data synchronization from Google Sheets to IndexedDB
 * Includes data transformation, validation, and error handling
 */

class SheetsToIndexedDBSync {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.sheetId = config.sheetId || '';
        this.dbManager = config.dbManager || null;
        this.logLevel = config.logLevel || 'info';
        this.retryAttempts = config.retryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // Sheet configuration mapping
        this.sheetConfig = {
            clients: {
                range: 'clients!A:Z',
                headers: ['cust_id', 'name', 'company', 'contactperson', 'phone1', 'phone2', 'address1', 'address2', 'address3', 'state', 'postalcode', 'country', 'salesman', 'cust_pricelist', 'bill_ship_same', 'ship_name', 'ship_company', 'ship_contactperson', 'ship_phone1', 'ship_phone2', 'ship_address1', 'ship_address2', 'ship_address3', 'ship_state', 'ship_postalcode', 'ship_country'],
                required: ['cust_id', 'name'],
                transform: this.transformClient.bind(this)
            },
            salespeople: {
                range: 'salesmen!A:Z',
                headers: ['name', 'phonenumber', 'address', 'photoidtype', 'photoidnumber', 'photoidimage1'],
                required: ['name'],
                transform: this.transformSalesperson.bind(this)
            },
            priceLists: {
                range: 'pricelists!A:Z',
                headers: ['Length', 'Currency', 'Category', 'Density', 'Product', 'Colors', 'Standard Weight', 'Rate', 'Can Be Sold in KG?'],
                required: ['Product', 'Rate'],
                transform: this.transformPriceList.bind(this)
            },
            colors: {
                range: 'colors!A:Z',
                headers: ['colorname'],
                required: ['colorname'],
                transform: this.transformColor.bind(this)
            },
            styles: {
                range: 'styles!A:Z',
                headers: ['stylename'],
                required: ['stylename'],
                transform: this.transformStyle.bind(this)
            },
            company: {
                range: 'company!A:Z',
                headers: ['company4lettercode', 'companyname', 'companyaddress1', 'companyaddress2', 'companycity', 'companystate', 'companycountry', 'companyphone', 'companyemail', 'companywebsite', 'companytaxid', 'companybankname', 'companybankaddress', 'companybankaccount', 'account_type', 'ifsc_code', 'siwft_code', 'upi_id', 'pricelist_asigned'],
                required: ['company4lettercode', 'companyname'],
                transform: this.transformCategory.bind(this)
            }
        };

        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            errors: [],
            startTime: null,
            endTime: null
        };

        this.log('Sheets to IndexedDB Sync Service initialized', 'info');
    }

    /**
     * Sync all collections from Google Sheets to IndexedDB
     */
    async syncAll() {
        this.log('Starting complete sync from Google Sheets to IndexedDB', 'info');
        this.resetSyncStats();
        this.syncStats.startTime = new Date().toISOString();

        const results = {};
        
        for (const [collection, config] of Object.entries(this.sheetConfig)) {
            try {
                this.log(`Syncing collection: ${collection}`, 'info');
                const result = await this.syncCollection(collection);
                results[collection] = result;
                
                this.syncStats.successfulRecords += result.recordCount;
                this.log(`Successfully synced ${result.recordCount} records for ${collection}`, 'info');
                
            } catch (error) {
                this.log(`Failed to sync collection ${collection}: ${error.message}`, 'error');
                this.syncStats.errors.push({
                    collection,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                this.syncStats.failedRecords++;
                
                results[collection] = {
                    success: false,
                    error: error.message,
                    recordCount: 0
                };
            }
        }

        this.syncStats.endTime = new Date().toISOString();
        this.syncStats.totalRecords = this.syncStats.successfulRecords + this.syncStats.failedRecords;

        this.log(`Sync completed. Total: ${this.syncStats.totalRecords}, Success: ${this.syncStats.successfulRecords}, Failed: ${this.syncStats.failedRecords}`, 'info');

        return {
            success: this.syncStats.failedRecords === 0,
            results,
            stats: this.syncStats
        };
    }

    /**
     * Sync a specific collection from Google Sheets to IndexedDB
     */
    async syncCollection(collection) {
        if (!this.sheetConfig[collection]) {
            throw new Error(`Unknown collection: ${collection}`);
        }

        if (!this.dbManager) {
            throw new Error('IndexedDB manager not configured');
        }

        const config = this.sheetConfig[collection];
        
        // Fetch data from Google Sheets
        const rawData = await this.fetchSheetData(config.range);
        
        if (!rawData || rawData.length === 0) {
            this.log(`No data found for collection: ${collection}`, 'warn');
            return { success: true, recordCount: 0 };
        }

        // Transform and validate data
        const transformedData = await this.transformData(rawData, config);
        
        if (transformedData.length === 0) {
            this.log(`No valid records found for collection: ${collection}`, 'warn');
            return { success: true, recordCount: 0 };
        }

        // Replace all data in IndexedDB (atomic operation)
        await this.dbManager.replaceAll(collection, transformedData);
        
        // Update sync metadata
        await this.dbManager.updateSyncMetadata(collection, {
            recordCount: transformedData.length,
            syncStatus: 'completed',
            syncType: 'sheets-to-indexeddb',
            errors: []
        });

        this.log(`Successfully synced ${transformedData.length} records for ${collection}`, 'info');
        
        return {
            success: true,
            recordCount: transformedData.length,
            collection
        };
    }

    /**
     * Fetch data from Google Sheets
     */
    async fetchSheetData(range) {
        if (!this.apiKey || !this.sheetId) {
            throw new Error('Google Sheets API key and sheet ID are required');
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
        
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                this.log(`Fetching data from range: ${range} (attempt ${attempt})`, 'debug');
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                
                if (!data.values || data.values.length === 0) {
                    this.log(`No data found in range: ${range}`, 'warn');
                    return [];
                }

                this.log(`Successfully fetched ${data.values.length} rows from ${range}`, 'debug');
                return data.values;
                
            } catch (error) {
                lastError = error;
                this.log(`Attempt ${attempt} failed for range ${range}: ${error.message}`, 'warn');
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        throw new Error(`Failed to fetch data after ${this.retryAttempts} attempts: ${lastError.message}`);
    }

    /**
     * Transform raw sheet data to structured objects
     */
    /**
     * Enhanced data transformation with comprehensive validation
     */
    async transformData(rawData, config) {
        if (!rawData || rawData.length < 2) {
            return [];
        }

        const headers = rawData[0];
        const dataRows = rawData.slice(1);
        const transformedData = [];
        const errors = [];
        const validationStats = {
            totalRows: dataRows.length,
            validRows: 0,
            invalidRows: 0,
            skippedRows: 0,
            errors: []
        };

        // Validate headers first
        const headerValidation = this.validateHeaders(headers, config);
        if (!headerValidation.isValid) {
            throw new Error(`Header validation failed: ${headerValidation.errors.join(', ')}`);
        }

        for (let i = 0; i < dataRows.length; i++) {
            try {
                const row = dataRows[i];
                const rowNumber = i + 2; // +2 for header and 1-based indexing
                
                // Skip empty rows
                if (!row || row.every(cell => !cell || cell.trim() === '')) {
                    validationStats.skippedRows++;
                    continue;
                }

                // Create object from row data with enhanced validation
                const rowObject = this.createRowObject(headers, row, config);
                
                // Comprehensive validation
                const validation = this.validateRowData(rowObject, config, rowNumber);
                if (!validation.isValid) {
                    validationStats.invalidRows++;
                    validationStats.errors.push(...validation.errors);
                    this.log(`Row ${rowNumber} validation failed: ${validation.errors.join(', ')}`, 'warn');
                    continue;
                }

                // Apply transformation with error handling
                const transformedRecord = await this.applyTransformation(rowObject, config, rowNumber);
                
                if (transformedRecord) {
                    // Final validation of transformed record
                    const finalValidation = this.validateTransformedRecord(transformedRecord, config);
                    if (finalValidation.isValid) {
                        transformedData.push(transformedRecord);
                        validationStats.validRows++;
                    } else {
                        validationStats.invalidRows++;
                        validationStats.errors.push(...finalValidation.errors);
                        this.log(`Row ${rowNumber} final validation failed: ${finalValidation.errors.join(', ')}`, 'warn');
                    }
                }
                
            } catch (error) {
                const errorMsg = `Row ${i + 2}: ${error.message}`;
                this.log(errorMsg, 'error');
                errors.push(errorMsg);
                validationStats.invalidRows++;
                validationStats.errors.push(errorMsg);
            }
        }

        // Log validation statistics
        this.log(`Data transformation completed: ${validationStats.validRows} valid, ${validationStats.invalidRows} invalid, ${validationStats.skippedRows} skipped`, 'info');
        
        if (validationStats.errors.length > 0) {
            this.log(`Validation errors: ${validationStats.errors.length}`, 'warn');
        }

        // Store validation stats for reporting
        this.lastValidationStats = validationStats;

        return transformedData;
    }

    /**
     * Validate headers against configuration
     */
    validateHeaders(headers, config) {
        const errors = [];
        const requiredHeaders = config.headers || [];
        
        if (!headers || headers.length === 0) {
            errors.push('No headers found');
            return { isValid: false, errors };
        }

        // Check for required headers
        const normalizedHeaders = headers.map(h => h ? h.toLowerCase().trim() : '');
        const missingHeaders = requiredHeaders.filter(required => 
            !normalizedHeaders.includes(required.toLowerCase())
        );

        if (missingHeaders.length > 0) {
            errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        // Check for duplicate headers
        const duplicates = normalizedHeaders.filter((header, index) => 
            header && normalizedHeaders.indexOf(header) !== index
        );

        if (duplicates.length > 0) {
            errors.push(`Duplicate headers found: ${duplicates.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create row object with enhanced validation
     */
    createRowObject(headers, row, config) {
        const rowObject = {};
        
        headers.forEach((header, index) => {
            if (header && config.headers.includes(header.toLowerCase())) {
                const value = row[index] || '';
                rowObject[header.toLowerCase()] = typeof value === 'string' ? value.trim() : value;
            }
        });

        return rowObject;
    }

    /**
     * Validate row data against configuration
     */
    validateRowData(rowObject, config, rowNumber) {
        const errors = [];
        
        // Check required fields
        const missingFields = config.required.filter(field => {
            const value = rowObject[field];
            return !value || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
            errors.push(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Data type validation
        if (rowObject.id && typeof rowObject.id !== 'string' && typeof rowObject.id !== 'number') {
            errors.push('ID must be a string or number');
        }

        if (rowObject.email && rowObject.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(rowObject.email)) {
                errors.push(`Invalid email format: ${rowObject.email}`);
            }
        }

        if (rowObject.price && rowObject.price !== '') {
            const price = parseFloat(rowObject.price);
            if (isNaN(price) || price < 0) {
                errors.push(`Invalid price: ${rowObject.price}`);
            }
        }

        if (rowObject.phone && rowObject.phone.trim() !== '') {
            // Basic phone validation
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            const cleanPhone = rowObject.phone.replace(/[\s\-\(\)]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                errors.push(`Invalid phone format: ${rowObject.phone}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors.map(error => `Row ${rowNumber}: ${error}`)
        };
    }

    /**
     * Apply transformation with error handling
     */
    async applyTransformation(rowObject, config, rowNumber) {
        try {
            return await config.transform(rowObject, rowNumber);
        } catch (error) {
            throw new Error(`Transformation failed: ${error.message}`);
        }
    }

    /**
     * Validate transformed record
     */
    validateTransformedRecord(record, config) {
        const errors = [];
        
        // Check that all required fields are present after transformation
        if (config.required) {
            const missingFields = config.required.filter(field => {
                const value = record[field];
                return value === undefined || value === null || 
                       (typeof value === 'string' && value.trim() === '');
            });

            if (missingFields.length > 0) {
                errors.push(`Missing required fields after transformation: ${missingFields.join(', ')}`);
            }
        }

        // Validate ID is present and valid
        if (!record.id || (typeof record.id === 'string' && record.id.trim() === '')) {
            errors.push('Record ID is required');
        }

        // Validate lastModified timestamp
        if (record.lastModified) {
            try {
                new Date(record.lastModified);
            } catch (error) {
                errors.push('Invalid lastModified timestamp');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Transform product data
     */
    transformProduct(data, rowNumber) {
        return {
            id: this.sanitizeId(data.id),
            name: this.sanitizeString(data.name),
            category: this.sanitizeString(data.category),
            priceList: this.sanitizeString(data.pricelist || data.priceList),
            price: this.sanitizeNumber(data.price),
            description: this.sanitizeString(data.description),
            active: this.sanitizeBoolean(data.active, true),
            sourceRow: rowNumber,
            sourceSheet: 'Products'
        };
    }

    /**
     * Transform client data
     */
    transformClient(data, rowNumber) {
        return {
            id: this.sanitizeId(data.id),
            name: this.sanitizeString(data.name),
            email: this.sanitizeEmail(data.email),
            phone: this.sanitizeString(data.phone),
            address: this.sanitizeString(data.address),
            salesperson: this.sanitizeString(data.salesperson),
            priceList: this.sanitizeString(data.pricelist || data.priceList),
            active: this.sanitizeBoolean(data.active, true),
            sourceRow: rowNumber,
            sourceSheet: 'Clients'
        };
    }

    /**
     * Transform salesperson data
     */
    transformSalesperson(data, rowNumber) {
        return {
            id: this.sanitizeId(data.id),
            name: this.sanitizeString(data.name),
            email: this.sanitizeEmail(data.email),
            phone: this.sanitizeString(data.phone),
            territory: this.sanitizeString(data.territory),
            active: this.sanitizeBoolean(data.active, true),
            sourceRow: rowNumber,
            sourceSheet: 'Salespeople'
        };
    }

    /**
     * Transform price list data
     */
    transformPriceList(data, rowNumber) {
        return {
            id: `pricelist_${Date.now()}_${Math.random()}`,
            length: this.sanitizeString(data.Length),
            currency: this.sanitizeString(data.Currency),
            category: this.sanitizeString(data.Category),
            density: this.sanitizeString(data.Density),
            product: this.sanitizeString(data.Product),
            colors: this.sanitizeString(data.Colors),
            standardWeight: this.sanitizeNumber(data['Standard Weight']),
            rate: this.sanitizeNumber(data.Rate),
            canBeSoldInKg: this.sanitizeBoolean(data['Can Be Sold in KG?']),
            sourceRow: rowNumber,
            sourceSheet: 'PriceLists'
        };
    }

    /**
     * Transform color data
     */
    transformColor(data, rowNumber) {
        return {
            id: `color_${Date.now()}_${Math.random()}`,
            name: this.sanitizeString(data.colorname),
            colorname: this.sanitizeString(data.colorname),
            sourceRow: rowNumber,
            sourceSheet: 'Colors'
        };
    }

    /**
     * Transform style data
     */
    transformStyle(data, rowNumber) {
        return {
            id: `style_${Date.now()}_${Math.random()}`,
            name: this.sanitizeString(data.stylename),
            stylename: this.sanitizeString(data.stylename),
            sourceRow: rowNumber,
            sourceSheet: 'Styles'
        };
    }

    /**
     * Transform company data
     */
    transformCategory(data, rowNumber) {
        return {
            id: this.sanitizeString(data.company4lettercode) || `company_${Date.now()}_${Math.random()}`,
            code: this.sanitizeString(data.company4lettercode),
            name: this.sanitizeString(data.companyname),
            address1: this.sanitizeString(data.companyaddress1),
            address2: this.sanitizeString(data.companyaddress2),
            city: this.sanitizeString(data.companycity),
            state: this.sanitizeString(data.companystate),
            country: this.sanitizeString(data.companycountry),
            phone: this.sanitizeString(data.companyphone),
            email: this.sanitizeEmail(data.companyemail),
            website: this.sanitizeString(data.companywebsite),
            taxid: this.sanitizeString(data.companytaxid),
            bankname: this.sanitizeString(data.companybankname),
            bankaddress: this.sanitizeString(data.companybankaddress),
            bankaccount: this.sanitizeString(data.companybankaccount),
            account_type: this.sanitizeString(data.account_type),
            ifsc_code: this.sanitizeString(data.ifsc_code),
            swift_code: this.sanitizeString(data.siwft_code),
            upi_id: this.sanitizeString(data.upi_id),
            pricelist_assigned: this.sanitizeString(data.pricelist_asigned),
            sourceRow: rowNumber,
            sourceSheet: 'Company'
        };
    }

    /**
     * Data sanitization methods
     */
    sanitizeId(value) {
        if (!value && value !== 0) {
            throw new Error('ID is required and cannot be empty');
        }
        
        const sanitized = String(value).trim();
        if (sanitized === '') {
            throw new Error('ID cannot be empty after sanitization');
        }
        
        // Check for invalid characters
        if (sanitized.includes('\n') || sanitized.includes('\r') || sanitized.includes('\t')) {
            throw new Error('ID contains invalid characters');
        }
        
        return sanitized;
    }

    sanitizeString(value, maxLength = 1000) {
        if (!value) return '';
        
        const sanitized = String(value).trim();
        
        if (sanitized.length > maxLength) {
            this.log(`String truncated from ${sanitized.length} to ${maxLength} characters`, 'warn');
            return sanitized.substring(0, maxLength);
        }
        
        return sanitized;
    }

    sanitizeNumber(value, min = null, max = null) {
        if (!value || value === '') return 0;
        
        const num = parseFloat(value);
        if (isNaN(num)) {
            this.log(`Invalid number value: ${value}, defaulting to 0`, 'warn');
            return 0;
        }
        
        if (min !== null && num < min) {
            this.log(`Number ${num} below minimum ${min}, setting to minimum`, 'warn');
            return min;
        }
        
        if (max !== null && num > max) {
            this.log(`Number ${num} above maximum ${max}, setting to maximum`, 'warn');
            return max;
        }
        
        return num;
    }

    sanitizeBoolean(value, defaultValue = false) {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }
        
        if (typeof value === 'boolean') {
            return value;
        }
        
        const str = String(value).toLowerCase().trim();
        const truthyValues = ['true', '1', 'yes', 'y', 'active', 'enabled', 'on'];
        const falsyValues = ['false', '0', 'no', 'n', 'inactive', 'disabled', 'off'];
        
        if (truthyValues.includes(str)) {
            return true;
        } else if (falsyValues.includes(str)) {
            return false;
        } else {
            this.log(`Ambiguous boolean value: ${value}, using default: ${defaultValue}`, 'warn');
            return defaultValue;
        }
    }

    sanitizeEmail(value) {
        if (!value) return '';
        
        const email = String(value).trim().toLowerCase();
        
        if (email === '') return '';
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            throw new Error(`Invalid email format: ${email}`);
        }
        
        // Additional email validation
        if (email.length > 254) {
            throw new Error(`Email too long: ${email}`);
        }
        
        const [localPart, domain] = email.split('@');
        if (localPart.length > 64) {
            throw new Error(`Email local part too long: ${email}`);
        }
        
        return email;
    }

    sanitizeDate(value) {
        if (!value || value === '') return null;
        
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                this.log(`Invalid date value: ${value}`, 'warn');
                return null;
            }
            
            // Check for reasonable date range (1900 to 2100)
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                this.log(`Date out of reasonable range: ${value}`, 'warn');
                return null;
            }
            
            return date.toISOString();
        } catch (error) {
            this.log(`Date parsing error for value ${value}: ${error.message}`, 'warn');
            return null;
        }
    }

    sanitizeHexColor(value) {
        if (!value) return '';
        
        let color = String(value).trim();
        
        // Remove any whitespace
        color = color.replace(/\s/g, '');
        
        // Add # if missing
        color = '#' + color;
        
        // Validate hex color format
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(color)) {
            this.log(`Invalid hex color format: ${value}`, 'warn');
            return '';
        }
        
        // Convert 3-digit to 6-digit format
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        
        return color.toUpperCase();
    }

    /**
     * Get validation statistics from last transformation
     */
    getValidationStats() {
        return this.lastValidationStats || {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            skippedRows: 0,
            errors: []
        };
    }

    /**
     * Utility methods
     */
    resetSyncStats() {
        this.syncStats = {
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get sync statistics
     */
    getSyncStats() {
        return { ...this.syncStats };
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = `[Sheets→IndexedDB ${level.toUpperCase()}] ${timestamp}:`;
            
            switch (level) {
                case 'error':
                    break;
                case 'warn':
                    break;
                case 'debug':
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SheetsToIndexedDBSync = SheetsToIndexedDBSync;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetsToIndexedDBSync;
}