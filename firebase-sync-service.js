// Firebase Synchronization Service
// Handles data synchronization between Google Sheets and Firebase

const admin = require('firebase-admin');
const crypto = require('crypto');
const GoogleSheetsService = require('./google-sheets-service');

class FirebaseSyncService {
  constructor() {
    this.db = null;
    this.googleSheetsService = new GoogleSheetsService();
    this.isInitialized = false;
    this.syncStatus = {
      isRunning: false,
      lastSync: null,
      lastError: null,
      totalSynced: 0
    };
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    try {
      // Initialize Firebase Admin if not already done
      if (!admin.apps.length) {
        const serviceAccountPath = require('path').join(__dirname, 'service-account-key.json');
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'inhpricelistgenerator'
      });
      }
      
      this.db = admin.firestore();
      await this.googleSheetsService.initialize();
      this.isInitialized = true;
      
      console.log('Firebase Sync Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase Sync Service:', error.message);
      throw error;
    }
  }

  /**
   * Generate hash for data integrity checking
   * @param {Object} data - Data to hash
   * @returns {string} SHA256 hash
   */
  generateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Compare two datasets and identify changes
   * @param {Array} currentData - Current Firebase data
   * @param {Array} newData - New Google Sheets data
   * @returns {Object} Changes object with added, updated, deleted items
   */
  compareData(currentData, newData) {
    const changes = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: 0
    };

    // Create maps for efficient lookup
    const currentMap = new Map();
    const newMap = new Map();

    console.log(`Comparing data: ${currentData.length} current items vs ${newData.length} new items`);

    // Map current data by a unique identifier (name or id)
    currentData.forEach((item, index) => {
      if (index < 3) {
        console.log(`Sample current item ${index}:`, Object.keys(item));
      }
      // Create the same composite key for current data
      const productName = item.name || item.Name || item.product_name || item.Product;
      const category = item.Category || item.category;
      const length = item.Length || item.length;
      const density = item.Density || item.density;
      const colors = item.Colors || item.colors;
      
      const key = productName ? `${productName}_${category || ''}_${length || ''}_${density || ''}_${colors || ''}` : null;
      
      if (key) {
        currentMap.set(key, item);
      }
    });

    // Map new data
    let validKeyCount = 0;
    let invalidKeyCount = 0;
    newData.forEach((item, index) => {
      if (index < 10) {
        console.log(`Item ${index} Product value:`, item.Product);
      }
      // Create a more unique key by combining multiple fields
      const productName = item.name || item.Name || item.product_name || item.Product;
      const category = item.Category || item.category;
      const length = item.Length || item.length;
      const density = item.Density || item.density;
      const colors = item.Colors || item.colors;
      
      // Create composite key to ensure uniqueness
      const key = productName ? `${productName}_${category || ''}_${length || ''}_${density || ''}_${colors || ''}` : null;
      
      if (key) {
        newMap.set(key, item);
        validKeyCount++;
      } else {
        invalidKeyCount++;
        if (invalidKeyCount <= 5) {
          console.log(`Item ${index} has no valid key. Product:`, item.Product, 'Keys:', Object.keys(item));
        }
      }
    });
    console.log(`Valid keys: ${validKeyCount}, Invalid keys: ${invalidKeyCount}`);
    console.log(`Unique keys in newMap: ${Array.from(newMap.keys()).slice(0, 10)}`);

    console.log(`Mapped ${currentMap.size} current items and ${newMap.size} new items`);
    
    // Debug: Show first few keys from each map
    const currentKeys = Array.from(currentMap.keys()).slice(0, 3);
    const newKeys = Array.from(newMap.keys()).slice(0, 3);
    console.log('Sample current keys:', currentKeys);
    console.log('Sample new keys:', newKeys);

    // Find added and updated items
    newMap.forEach((newItem, key) => {
      const currentItem = currentMap.get(key);
      
      if (!currentItem) {
        // New item
        changes.added.push(newItem);
      } else {
        // Check if item has changed
        const currentHash = this.generateDataHash(currentItem);
        const newHash = this.generateDataHash(newItem);
        
        if (currentHash !== newHash) {
          changes.updated.push({ ...newItem, _firebaseId: currentItem.id });
        } else {
          changes.unchanged++;
        }
      }
    });

    // Find deleted items
    currentMap.forEach((currentItem, key) => {
      if (!newMap.has(key)) {
        changes.deleted.push(currentItem);
      }
    });

    console.log(`Comparison result: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.deleted.length} deleted, ${changes.unchanged} unchanged`);
    return changes;
  }

  /**
   * Sync product data from Google Sheets to Firebase
   * @param {string} spreadsheetId - Google Sheets ID
   * @returns {Promise<Object>} Sync result
   */
  async syncProductData(spreadsheetId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running');
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastError = null;

    try {
      console.log('Starting product data synchronization...');
      
      // Fetch data from Google Sheets
      const sheetsData = await this.googleSheetsService.fetchProductData(spreadsheetId);
      
      if (!this.googleSheetsService.validateData(sheetsData)) {
        throw new Error('Invalid data received from Google Sheets');
      }

      // Fetch current Firebase data
      const productsRef = this.db.collection('products');
      const snapshot = await productsRef.get();
      const currentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Compare data and identify changes
      const changes = this.compareData(currentData, sheetsData);
      
      console.log(`Sync analysis: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.deleted.length} deleted, ${changes.unchanged} unchanged`);

      // Apply changes to Firebase
      const batch = this.db.batch();
      let operationCount = 0;

      // Add new products
      changes.added.forEach(product => {
        const docRef = productsRef.doc();
        batch.set(docRef, {
          ...product,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Update existing products
      changes.updated.forEach(product => {
        const docRef = productsRef.doc(product._firebaseId);
        const { _firebaseId, ...updateData } = product;
        batch.update(docRef, {
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Delete removed products (optional - you might want to mark as inactive instead)
      changes.deleted.forEach(product => {
        const docRef = productsRef.doc(product.id);
        batch.update(docRef, {
          isActive: false,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Commit batch operations
      if (operationCount > 0) {
        try {
          await batch.commit();
          console.log(`Successfully applied ${operationCount} changes to Firebase`);
        } catch (batchError) {
          if (batchError.code === 5 || batchError.message.includes('NOT_FOUND')) {
            console.log('Creating products collection...');
            // Create products collection by adding the first product
            if (changes.added.length > 0) {
              const firstProduct = changes.added[0];
              await productsRef.add({
                ...firstProduct,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                syncedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log('Products collection created with first product');
            }
          } else {
            throw batchError;
          }
        }
      }

      // Update sync status
      this.syncStatus.lastSync = new Date();
      this.syncStatus.totalSynced = changes.added.length + changes.updated.length;
      
      // Log sync activity
      await this.logSyncActivity({
        type: 'product_sync',
        timestamp: new Date(),
        changes,
        success: true
      });

      const result = {
        success: true,
        timestamp: new Date(),
        changes,
        totalOperations: operationCount
      };

      console.log('Product synchronization completed successfully');
      return result;

    } catch (error) {
      this.syncStatus.lastError = error.message;
      
      // Log error
      await this.logSyncActivity({
        type: 'product_sync',
        timestamp: new Date(),
        error: error.message,
        success: false
      });

      console.error('Product synchronization failed:', error.message);
      throw error;
    } finally {
      this.syncStatus.isRunning = false;
    }
  }

  /**
   * Sync salesman data from Google Sheets to Firebase
   * @param {string} spreadsheetId - Google Sheets ID
   * @returns {Promise<Object>} Sync result
   */
  async syncSalesmanData(spreadsheetId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('Starting salesman data synchronization...');
      
      // Fetch data from Google Sheets
      const sheetsData = await this.googleSheetsService.fetchSalesmanData(spreadsheetId);
      
      if (!this.googleSheetsService.validateData(sheetsData)) {
        throw new Error('Invalid salesman data received from Google Sheets');
      }

      // Fetch current Firebase data
      const salesmenRef = this.db.collection('config').doc('salesmen');
      const doc = await salesmenRef.get();
      const currentData = doc.exists ? doc.data().list || [] : [];

      // Compare and update
      const changes = this.compareData(currentData, sheetsData);
      
      // Update salesmen data in Firebase
      try {
        await salesmenRef.set({
          list: sheetsData,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (setError) {
        if (setError.code === 5 || setError.message.includes('NOT_FOUND')) {
          console.log('Creating config collection...');
          // Create config collection by setting the document
          await this.db.collection('config').doc('salesmen').set({
            list: sheetsData,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Config collection created with salesmen data');
        } else {
          throw setError;
        }
      }

      console.log('Salesman synchronization completed successfully');
      return {
        success: true,
        timestamp: new Date(),
        changes,
        totalSalesmen: sheetsData.length
      };

    } catch (error) {
      console.error('Salesman synchronization failed:', error.message);
      throw error;
    }
  }

  /**
   * Log sync activity for audit trail
   * @param {Object} activity - Activity details
   */
  async logSyncActivity(activity) {
    try {
      // Ensure sync_logs collection exists by creating it if needed
      const syncLogsRef = this.db.collection('sync_logs');
      
      const logEntry = {
        ...activity,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        id: crypto.randomUUID()
      };
      
      await syncLogsRef.add(logEntry);
      console.log('Sync activity logged successfully');
    } catch (error) {
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
        console.log('Creating sync_logs collection...');
        try {
          // Create the collection by adding a document
          await this.db.collection('sync_logs').add({
            ...activity,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            id: crypto.randomUUID()
          });
          console.log('Sync activity logged successfully (collection created)');
        } catch (createError) {
          console.error('Failed to create sync_logs collection:', createError.message);
        }
      } else {
        console.error('Failed to log sync activity:', error.message);
      }
    }
  }

  /**
   * Get sync status
   * @returns {Object} Current sync status
   */
  async getSyncStatus() {
    try {
      const status = { ...this.syncStatus };
      
      // Get data counts from Firebase
      if (this.db) {
        // Get products count
        try {
          const productsSnapshot = await this.db.collection('products').get();
          status.productsCount = productsSnapshot.size;
        } catch (error) {
          console.warn('Could not fetch products count:', error.message);
          status.productsCount = 0;
        }
        
        // Get salesmen count
        try {
          const salesmenSnapshot = await this.db.collection('config').doc('salesmen').get();
          if (salesmenSnapshot.exists) {
            const salesmenData = salesmenSnapshot.data();
            status.salesmenCount = salesmenData.salesmen ? salesmenData.salesmen.length : 0;
          } else {
            status.salesmenCount = 0;
          }
        } catch (error) {
          console.warn('Could not fetch salesmen count:', error.message);
          status.salesmenCount = 0;
        }
      } else {
        status.productsCount = 0;
        status.salesmenCount = 0;
      }
      
      return status;
    } catch (error) {
      console.error('Error getting sync status:', error.message);
      return { ...this.syncStatus, productsCount: 0, salesmenCount: 0 };
    }
  }

  /**
   * Sync companies data from Google Sheets to Firebase
   * @param {string} spreadsheetId - Google Sheets ID
   * @returns {Promise<Object>} Sync results
   */
  async syncCompaniesData(spreadsheetId) {
    try {
      console.log('Starting companies data sync...');
      
      // Fetch data from Google Sheets
      const companiesData = await this.googleSheetsService.fetchCompaniesData(spreadsheetId);
      
      if (!companiesData || companiesData.length === 0) {
        console.log('No companies data to sync');
        return { added: 0, updated: 0, deleted: 0, total: 0 };
      }

      // Get current Firebase data
      const snapshot = await this.db.collection('companies').get();
      const currentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Compare and identify changes
      const changes = this.compareCompaniesData(currentData, companiesData);

      // Apply changes to Firebase
      const batch = this.db.batch();
      let operationCount = 0;

      // Add new companies
      for (const company of changes.added) {
        const docRef = this.db.collection('companies').doc();
        batch.set(docRef, {
          ...company,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      }

      // Update existing companies
      for (const company of changes.updated) {
        const docRef = this.db.collection('companies').doc(company.id);
        const { id, ...updateData } = company;
        batch.update(docRef, {
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      }

      // Delete removed companies
      for (const company of changes.deleted) {
        const docRef = this.db.collection('companies').doc(company.id);
        batch.delete(docRef);
        operationCount++;
      }

      // Commit batch operations
      if (operationCount > 0) {
        await batch.commit();
        console.log(`Companies sync completed: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.deleted.length} deleted`);
      } else {
        console.log('No changes detected in companies data');
      }

      // Log sync activity
      await this.logSyncActivity({
        type: 'companies',
        status: 'success',
        changes: {
          added: changes.added.length,
          updated: changes.updated.length,
          deleted: changes.deleted.length,
          total: companiesData.length
        }
      });

      return {
        added: changes.added.length,
        updated: changes.updated.length,
        deleted: changes.deleted.length,
        total: companiesData.length
      };

    } catch (error) {
      console.error('Companies sync failed:', error.message);
      
      await this.logSyncActivity({
        type: 'companies',
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Compare companies data for changes
   * @param {Array} currentData - Current Firebase data
   * @param {Array} newData - New Google Sheets data
   * @returns {Object} Changes object
   */
  compareCompaniesData(currentData, newData) {
    const changes = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: 0
    };

    // Create maps for efficient lookup
    const currentMap = new Map();
    const newMap = new Map();

    // Map current data by company name
    currentData.forEach(company => {
      const name = company.name || company.Name || company.company_name;
      if (name) {
        currentMap.set(name.toLowerCase(), company);
      }
    });

    // Map new data and identify additions/updates
    newData.forEach(company => {
      const name = company.name || company.Name || company.company_name;
      if (name) {
        const key = name.toLowerCase();
        newMap.set(key, company);
        
        const existing = currentMap.get(key);
        if (existing) {
          // Check if data has changed
          const existingHash = this.generateDataHash(existing);
          const newHash = this.generateDataHash(company);
          
          if (existingHash !== newHash) {
            changes.updated.push({ ...company, id: existing.id });
          } else {
            changes.unchanged++;
          }
        } else {
          changes.added.push(company);
        }
      }
    });

    // Identify deletions
    currentData.forEach(company => {
      const name = company.name || company.Name || company.company_name;
      if (name && !newMap.has(name.toLowerCase())) {
        changes.deleted.push(company);
      }
    });

    return changes;
  }

  /**
   * Sync colors data from Google Sheets to Firebase
   * @param {string} spreadsheetId - The Google Sheets ID
   * @returns {Promise<Object>} Sync result
   */
  async syncColorsData(spreadsheetId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running');
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastError = null;

    try {
      console.log('Starting colors data synchronization...');
      
      // Fetch data from Google Sheets Colors tab
      const sheetsData = await this.googleSheetsService.fetchColorsData(spreadsheetId);
      
      if (!this.googleSheetsService.validateData(sheetsData)) {
        throw new Error('Invalid colors data received from Google Sheets');
      }

      // Fetch current Firebase data
      const colorsRef = this.db.collection('colors');
      const snapshot = await colorsRef.get();
      const currentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Compare data and identify changes
      const changes = this.compareColorsData(currentData, sheetsData);
      
      console.log(`Colors sync analysis: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.deleted.length} deleted, ${changes.unchanged} unchanged`);

      // Apply changes to Firebase
      const batch = this.db.batch();
      let operationCount = 0;

      // Add new colors
      changes.added.forEach(color => {
        const docRef = colorsRef.doc();
        batch.set(docRef, {
          ...color,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Update existing colors
      changes.updated.forEach(color => {
        const docRef = colorsRef.doc(color._firebaseId);
        const { _firebaseId, ...updateData } = color;
        batch.update(docRef, {
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Delete removed colors
      changes.deleted.forEach(color => {
        const docRef = colorsRef.doc(color.id);
        batch.delete(docRef);
        operationCount++;
      });

      // Commit batch operations
      if (operationCount > 0) {
        await batch.commit();
        console.log(`✅ Colors sync completed: ${operationCount} operations executed`);
      } else {
        console.log('✅ Colors sync completed: No changes detected');
      }

      // Log sync activity
      await this.logSyncActivity({
        type: 'colors',
        status: 'success',
        changes: {
          added: changes.added.length,
          updated: changes.updated.length,
          deleted: changes.deleted.length,
          unchanged: changes.unchanged
        },
        operationCount,
        spreadsheetId
      });

      this.syncStatus.isRunning = false;
      this.syncStatus.lastSync = new Date();

      return {
        success: true,
        changes,
        operationCount,
        message: `Colors sync completed successfully. ${operationCount} operations executed.`
      };

    } catch (error) {
      console.error('❌ Colors sync failed:', error.message);
      this.syncStatus.isRunning = false;
      this.syncStatus.lastError = error.message;

      // Log sync failure
      await this.logSyncActivity({
        type: 'colors',
        status: 'error',
        error: error.message,
        spreadsheetId
      });

      throw error;
    }
  }

  /**
   * Compare current colors data with new data from Google Sheets
   * @param {Array} currentData - Current Firebase data
   * @param {Array} newData - New data from Google Sheets
   * @returns {Object} Changes object
   */
  compareColorsData(currentData, newData) {
    const changes = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: 0
    };

    // Create maps for efficient comparison
    const currentMap = new Map();
    const newMap = new Map();

    // Map current data by color name
    currentData.forEach(color => {
      const name = color.colorname;
      if (name) {
        currentMap.set(name.toLowerCase(), color);
      }
    });

    // Map new data by color name
    newData.forEach(color => {
      const name = color.colorname;
      if (name) {
        newMap.set(name.toLowerCase(), color);
      }
    });

    // Find added and updated items
    newMap.forEach((newColor, key) => {
      const currentColor = currentMap.get(key);
      
      if (!currentColor) {
        // New color
        changes.added.push(newColor);
      } else {
        // Check if color has changed
        const currentHash = this.generateDataHash(currentColor);
        const newHash = this.generateDataHash(newColor);
        
        if (currentHash !== newHash) {
          changes.updated.push({ ...newColor, _firebaseId: currentColor.id });
        } else {
          changes.unchanged++;
        }
      }
    });

    // Find deleted items
    currentData.forEach(color => {
      const name = color.colorname;
      if (name && !newMap.has(name.toLowerCase())) {
        changes.deleted.push(color);
      }
    });

    return changes;
  }

  /**
   * Sync styles data from Google Sheets to Firebase
   * @param {string} spreadsheetId - The Google Sheets ID
   * @returns {Promise<Object>} Sync result
   */
  async syncStylesData(spreadsheetId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running');
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastError = null;

    try {
      console.log('Starting styles data synchronization...');
      
      // Fetch data from Google Sheets Styles tab
      const sheetsData = await this.googleSheetsService.fetchStylesData(spreadsheetId);
      
      if (!this.googleSheetsService.validateData(sheetsData)) {
        throw new Error('Invalid styles data received from Google Sheets');
      }

      // Fetch current Firebase data
      const stylesRef = this.db.collection('styles');
      const snapshot = await stylesRef.get();
      const currentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Compare data and identify changes
      const changes = this.compareStylesData(currentData, sheetsData);
      
      console.log(`Styles sync analysis: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.deleted.length} deleted, ${changes.unchanged} unchanged`);

      // Apply changes to Firebase
      const batch = this.db.batch();
      let operationCount = 0;

      // Add new styles
      changes.added.forEach(style => {
        const docRef = stylesRef.doc();
        batch.set(docRef, {
          ...style,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Update existing styles
      changes.updated.forEach(style => {
        const docRef = stylesRef.doc(style._firebaseId);
        const { _firebaseId, ...updateData } = style;
        batch.update(docRef, {
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      // Delete removed styles
      changes.deleted.forEach(style => {
        const docRef = stylesRef.doc(style.id);
        batch.delete(docRef);
        operationCount++;
      });

      // Commit batch operations
      if (operationCount > 0) {
        await batch.commit();
        console.log(`✅ Styles sync completed: ${operationCount} operations executed`);
      } else {
        console.log('✅ Styles sync completed: No changes detected');
      }

      // Log sync activity
      await this.logSyncActivity({
        type: 'styles',
        status: 'success',
        changes: {
          added: changes.added.length,
          updated: changes.updated.length,
          deleted: changes.deleted.length,
          unchanged: changes.unchanged
        },
        operationCount,
        spreadsheetId
      });

      this.syncStatus.isRunning = false;
      this.syncStatus.lastSync = new Date();

      return {
        success: true,
        changes,
        operationCount,
        message: `Styles sync completed successfully. ${operationCount} operations executed.`
      };

    } catch (error) {
      console.error('❌ Styles sync failed:', error.message);
      this.syncStatus.isRunning = false;
      this.syncStatus.lastError = error.message;

      // Log sync failure
      await this.logSyncActivity({
        type: 'styles',
        status: 'error',
        error: error.message,
        spreadsheetId
      });

      throw error;
    }
  }

  /**
   * Compare current styles data with new data from Google Sheets
   * @param {Array} currentData - Current Firebase data
   * @param {Array} newData - New data from Google Sheets
   * @returns {Object} Changes object
   */
  compareStylesData(currentData, newData) {
    const changes = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: 0
    };

    // Create maps for efficient comparison
    const currentMap = new Map();
    const newMap = new Map();

    // Map current data by style name
    currentData.forEach(style => {
      const name = style.stylename;
      if (name) {
        currentMap.set(name.toLowerCase(), style);
      }
    });

    // Map new data by style name
    newData.forEach(style => {
      const name = style.stylename;
      if (name) {
        newMap.set(name.toLowerCase(), style);
      }
    });

    // Find added and updated items
    newMap.forEach((newStyle, key) => {
      const currentStyle = currentMap.get(key);
      
      if (!currentStyle) {
        // New style
        changes.added.push(newStyle);
      } else {
        // Check if style has changed
        const currentHash = this.generateDataHash(currentStyle);
        const newHash = this.generateDataHash(newStyle);
        
        if (currentHash !== newHash) {
          changes.updated.push({ ...newStyle, _firebaseId: currentStyle.id });
        } else {
          changes.unchanged++;
        }
      }
    });

    // Find deleted items
    currentData.forEach(style => {
      const name = style.stylename;
      if (name && !newMap.has(name.toLowerCase())) {
        changes.deleted.push(style);
      }
    });

    return changes;
  }

  /**
   * Get sync logs
   * @param {number} limit - Number of logs to retrieve
   * @returns {Promise<Array>} Sync logs
   */
  async getSyncLogs(limit = 50) {
    try {
      const snapshot = await this.db.collection('sync_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Failed to fetch sync logs:', error.message);
      return [];
    }
  }
}

module.exports = FirebaseSyncService;