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

  async initialize() {
    try {
      if (!admin.apps.length) {
        const serviceAccountPath = require('path').join(__dirname, 'service-account-key.json');
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      }
      
      this.db = admin.firestore();
      await this.googleSheetsService.initialize();
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      throw error;
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

  async syncSalesmanData(spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s') {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const salesmanData = await this.googleSheetsService.fetchSalesmanData(spreadsheetId);
      
      if (!salesmanData || salesmanData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      const configRef = this.db.collection('config').doc('salesmen');
      const existingDoc = await configRef.get();
      
      let changes = 0;
      const existingData = existingDoc.exists ? existingDoc.data().salesmen || [] : [];
      
      if (this.compareData(existingData, salesmanData)) {
        await configRef.set({ salesmen: salesmanData }, { merge: true });
        changes = salesmanData.length;
      }

      return { recordsProcessed: salesmanData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync salesman data: ${error.message}`);
    }
  }

  async syncCompaniesData(spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s') {
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

  async syncColorsData(spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s') {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const colorsData = await this.googleSheetsService.fetchColorsData(spreadsheetId);
      
      if (!colorsData || colorsData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      const configRef = this.db.collection('config').doc('colors');
      const existingDoc = await configRef.get();
      
      let changes = 0;
      const existingData = existingDoc.exists ? existingDoc.data().colors || [] : [];
      
      if (this.compareData(existingData, colorsData)) {
        await configRef.set({ colors: colorsData }, { merge: true });
        changes = colorsData.length;
      }

      return { recordsProcessed: colorsData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync colors data: ${error.message}`);
    }
  }

  async syncStylesData(spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s') {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }

      const stylesData = await this.googleSheetsService.fetchStylesData(spreadsheetId);
      
      if (!stylesData || stylesData.length === 0) {
        return { recordsProcessed: 0, changes: 0 };
      }

      const configRef = this.db.collection('config').doc('styles');
      const existingDoc = await configRef.get();
      
      let changes = 0;
      const existingData = existingDoc.exists ? existingDoc.data().styles || [] : [];
      
      if (this.compareData(existingData, stylesData)) {
        await configRef.set({ styles: stylesData }, { merge: true });
        changes = stylesData.length;
      }

      return { recordsProcessed: stylesData.length, changes };
    } catch (error) {
      throw new Error(`Failed to sync styles data: ${error.message}`);
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
      console.error('Failed to log sync activity:', error);
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