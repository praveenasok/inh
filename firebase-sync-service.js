const admin = require('firebase-admin');
const crypto = require('crypto');
const GoogleSheetsService = require('./google-sheets-service');
const { googleSheetsAutoConfig } = require('./js/google-sheets-auto-config');

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

  async initialize() {
    try {
      // Check if service account key exists
      const serviceAccountPath = require('path').join(__dirname, 'service-account-key.json');
      const fs = require('fs');
      
      if (!fs.existsSync(serviceAccountPath)) {
        
        // Initialize in fallback mode
        this.isInitialized = false;
        this.fallbackMode = true;
        await this.googleSheetsService.initialize();
        return false;
      }

      if (!admin.apps.length) {
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      }
      
      this.db = admin.firestore();
      await this.googleSheetsService.initialize();
      this.isInitialized = true;
      this.fallbackMode = false;
      
      return true;
    } catch (error) {
      
      // Initialize in fallback mode
      this.isInitialized = false;
      this.fallbackMode = true;
      try {
        await this.googleSheetsService.initialize();
      } catch (gsError) {
      }
      return false;
    }
  }

  generateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  compareData(currentData, newData) {
    const changes = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: 0
    };

    const currentMap = new Map();
    const newMap = new Map();

    currentData.forEach((item, index) => {
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

    let validKeyCount = 0;
    let invalidKeyCount = 0;
    newData.forEach((item, index) => {
      const productName = item.name || item.Name || item.product_name || item.Product;
      const category = item.Category || item.category;
      const length = item.Length || item.length;
      const density = item.Density || item.density;
      const colors = item.Colors || item.colors;
      
      const key = productName ? `${productName}_${category || ''}_${length || ''}_${density || ''}_${colors || ''}` : null;
      
      if (key) {
        newMap.set(key, item);
        validKeyCount++;
      } else {
        invalidKeyCount++;
      }
    });
    
    newMap.forEach((newItem, key) => {
      const currentItem = currentMap.get(key);
      
      if (!currentItem) {
        changes.added.push(newItem);
      } else {
        const currentHash = this.generateDataHash(currentItem);
        const newHash = this.generateDataHash(newItem);
        
        if (currentHash !== newHash) {
          changes.updated.push({ ...newItem, _firebaseId: currentItem.id });
        } else {
          changes.unchanged++;
        }
      }
    });

    currentMap.forEach((currentItem, key) => {
      if (!newMap.has(key)) {
        changes.deleted.push(currentItem);
      }
    });

    return changes;
  }

  async syncProductData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    if (!this.isInitialized && !this.fallbackMode) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      return {
        success: false,
        message: 'Firebase not available',
        changes: { added: [], updated: [], deleted: [], unchanged: 0 }
      };
    }

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running');
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastError = null;

    try {
      const sheetsData = await this.googleSheetsService.fetchProductData(spreadsheetId);
      
      if (!this.googleSheetsService.validateData(sheetsData)) {
        throw new Error('Invalid data received from Google Sheets');
      }

      const productsRef = this.db.collection('products');
      const snapshot = await productsRef.get();
      const currentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const changes = this.compareData(currentData, sheetsData);

      const batch = this.db.batch();
      let operationCount = 0;

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

      changes.deleted.forEach(product => {
        const docRef = productsRef.doc(product.id);
        batch.update(docRef, {
          isActive: false,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
      });

      if (operationCount > 0) {
        try {
          await batch.commit();
        } catch (batchError) {
          if (batchError.code === 5 || batchError.message.includes('NOT_FOUND')) {
            if (changes.added.length > 0) {
              const firstProduct = changes.added[0];
              await productsRef.add({
                ...firstProduct,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                syncedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          } else {
            throw batchError;
          }
        }
      }

      this.syncStatus.lastSync = new Date();
      this.syncStatus.totalSynced = changes.added.length + changes.updated.length;
      
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

      return result;

    } catch (error) {
      this.syncStatus.lastError = error.message;
      
      await this.logSyncActivity({
        type: 'product_sync',
        timestamp: new Date(),
        error: error.message,
        success: false
      });

      throw error;
    } finally {
      this.syncStatus.isRunning = false;
    }
  }

  async syncSalesmanData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const salesmanData = await this.googleSheetsService.fetchSalesmanData(spreadsheetId);
      
      if (!salesmanData || salesmanData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      // Get existing salesmen from the salesmen collection
      const salesmenCollection = this.db.collection('salesmen');
      const existingSnapshot = await salesmenCollection.get();
      const existingData = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let changes = 0;
      
      if (this.compareData(existingData, salesmanData)) {
        // Clear existing salesmen collection
        const batch = this.db.batch();
        existingSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Add new salesmen data
        salesmanData.forEach((salesman, index) => {
          const docRef = salesmenCollection.doc(`salesman_${index + 1}`);
          batch.set(docRef, salesman);
        });
        
        await batch.commit();
        changes = salesmanData.length;
      }

      return { recordsProcessed: salesmanData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync salesman data: ${error.message}`);
    }
  }

  async syncCompaniesData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const companiesData = await this.googleSheetsService.fetchCompaniesData(spreadsheetId);
      
      if (!companiesData || companiesData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      const configRef = this.db.collection('config').doc('companies');
      const existingDoc = await configRef.get();
      
      let changes = 0;
      const existingData = existingDoc.exists ? existingDoc.data().companies || [] : [];
      
      if (this.compareData(existingData, companiesData)) {
        await configRef.set({ companies: companiesData }, { merge: true });
        changes = companiesData.length;
      }

      return { recordsProcessed: companiesData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync companies data: ${error.message}`);
    }
  }

  async syncColorsData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    if (this.fallbackMode) {
      return { success: false, message: 'Firebase not available' };
    }
    
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const colorsData = await this.googleSheetsService.fetchColorsData(spreadsheetId);
      
      if (!colorsData || colorsData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      // Get existing colors from the colors collection
      const colorsCollection = this.db.collection('colors');
      const existingSnapshot = await colorsCollection.get();
      const existingData = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let changes = 0;
      
      if (this.compareData(existingData, colorsData)) {
        // Clear existing colors collection
        const batch = this.db.batch();
        existingSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Add new colors data
        colorsData.forEach((color, index) => {
          const docRef = colorsCollection.doc(`color_${index + 1}`);
          batch.set(docRef, color);
        });
        
        await batch.commit();
        changes = colorsData.length;
      }

      return { recordsProcessed: colorsData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync colors data: ${error.message}`);
    }
  }

  async syncStylesData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    if (this.fallbackMode) {
      return { success: false, message: 'Firebase not available' };
    }
    
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const stylesData = await this.googleSheetsService.fetchStylesData(spreadsheetId);
      
      if (!stylesData || stylesData.length === 0) {
        return { recordsProcessed: stylesData.length, changes: 0 };
      }

      // Get existing styles from the styles collection
      const stylesCollection = this.db.collection('styles');
      const existingSnapshot = await stylesCollection.get();
      const existingData = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let changes = 0;
      
      if (this.compareData(existingData, stylesData)) {
        // Clear existing styles collection
        const batch = this.db.batch();
        existingSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Add new styles data
        stylesData.forEach((style, index) => {
          const docRef = stylesCollection.doc(`style_${index + 1}`);
          batch.set(docRef, style);
        });
        
        await batch.commit();
        changes = stylesData.length;
      }

      return { recordsProcessed: stylesData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync styles data: ${error.message}`);
    }
  }

  async syncCountData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      // Fetch salesmen count
      const salesmenData = await this.googleSheetsService.fetchSalesmanData(spreadsheetId);
      const salesmenCount = salesmenData ? salesmenData.length : 0;

      // Fetch price lists count
      const productsData = await this.googleSheetsService.fetchProductData(spreadsheetId);
      const priceListNames = new Set();
      
      if (productsData && Array.isArray(productsData)) {
        productsData.forEach(product => {
          const priceListName = product['Price List Name'] || product.PriceList || product.pricelist;
          if (priceListName && priceListName.trim()) {
            priceListNames.add(priceListName.trim());
          }
        });
      }
      
      const priceListsCount = priceListNames.size;
      const priceListsArray = Array.from(priceListNames);

      // Store count data in Firebase
      const countData = {
        salesmenCount,
        priceListsCount,
        priceListNames: priceListsArray,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const configRef = this.db.collection('config').doc('counts');
      await configRef.set(countData, { merge: true });

      return {
        success: true,
        salesmenCount,
        priceListsCount,
        priceListNames: priceListsArray
      };

    } catch (error) {
      throw new Error(`Failed to sync count data: ${error.message}`);
    }
  }

  async syncPriceListsData(spreadsheetId = googleSheetsAutoConfig.getSheetId()) {
    if (this.fallbackMode) {
      return { success: false, message: 'Firebase not available' };
    }
    
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      // Fetch product data to extract price list names
      const productsData = await this.googleSheetsService.fetchProductData(spreadsheetId);
      const priceListNames = new Set();
      
      if (productsData && Array.isArray(productsData)) {
        productsData.forEach(product => {
          const priceListName = product['Price List Name'] || product.PriceList || product.pricelist;
          if (priceListName && priceListName.trim()) {
            priceListNames.add(priceListName.trim());
          }
        });
      }

      const priceListsArray = Array.from(priceListNames);
      
      if (priceListsArray.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      // Store price lists in Firebase
      const batch = this.db.batch();
      
      // Clear existing price lists
      const existingSnapshot = await this.db.collection('price_lists').get();
      existingSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new price lists
      priceListsArray.forEach((priceListName, index) => {
        const docRef = this.db.collection('price_lists').doc(`pricelist_${index}`);
        batch.set(docRef, {
          name: priceListName,
          id: `pricelist_${index}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'google_sheets'
        });
      });

      await batch.commit();

      return { 
        recordsProcessed: priceListsArray.length, 
        changes: priceListsArray.length,
        priceListNames: priceListsArray
      };
    } catch (error) {
      throw new Error(`Failed to sync price lists data: ${error.message}`);
    }
  }

  async logSyncActivity(activity) {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        type: activity.type || 'unknown',
        success: activity.success || false,
        recordsProcessed: activity.recordsProcessed || 0,
        changes: activity.changes || 0,
        errors: activity.errors || [],
        duration: activity.duration || 0
      };

      await this.db.collection('sync_logs').add(logEntry);
      
      this.syncStatus.lastSync = logEntry.timestamp;
      this.syncStatus.lastSyncSuccess = logEntry.success;
      
    } catch (error) {
    }
  }

  async getSyncStatus() {
    try {
      const status = { ...this.syncStatus };
      
      if (this.db) {
        try {
          const productsSnapshot = await this.db.collection('products').get();
          status.productsCount = productsSnapshot.size;
        } catch (error) {
          status.productsCount = 0;
        }
        
        try {
          const salesmenSnapshot = await this.db.collection('config').doc('salesmen').get();
          if (salesmenSnapshot.exists) {
            const salesmenData = salesmenSnapshot.data();
            status.salesmenCount = salesmenData.salesmen ? salesmenData.salesmen.length : 0;
          } else {
            status.salesmenCount = 0;
          }
        } catch (error) {
          status.salesmenCount = 0;
        }
      } else {
        status.productsCount = 0;
        status.salesmenCount = 0;
      }
      
      return status;
    } catch (error) {
      return { ...this.syncStatus, productsCount: 0, salesmenCount: 0 };
    }
  }
}

if (typeof window !== 'undefined') {
  window.FirebaseSyncService = FirebaseSyncService;
}

module.exports = FirebaseSyncService;