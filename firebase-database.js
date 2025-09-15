// Firebase Database Service
// Handles all database operations for the Indian Natural Hair application

class FirebaseDatabase {
  constructor() {
    this.db = null;
    this.storage = null;
    this.initialized = false;
  }

  // Initialize Firebase services
  async initialize() {
    try {
      // Check if Firebase is available
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      // Initialize Firestore
      this.db = firebase.firestore();
      
      // Initialize Storage
      this.storage = firebase.storage();
      
      // Enable offline persistence - temporarily disabled to fix connection issues
      // await this.db.enablePersistence({ synchronizeTabs: true });
      
      this.initialized = true;
      console.log('Firebase Database initialized successfully');
      
    } catch (error) {
      console.error('Firebase initialization error:', error);
      // Fallback to localStorage if Firebase fails
      this.initialized = false;
    }
  }

  // Check if Firebase is available
  isAvailable() {
    return this.initialized && this.db !== null;
  }

  // Client Management Operations
  async saveClient(clientData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const docRef = await this.db.collection('clients').add({
        ...clientData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Client saved with ID:', docRef.id);
      return { id: docRef.id, ...clientData };
      
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  }

  async getClients(filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection('clients');
      
      // Apply filters
      if (filters.salesperson) {
        query = query.where('salesperson', '==', filters.salesperson);
      }
      
      if (filters.startDate && filters.endDate) {
        query = query.where('createdAt', '>=', filters.startDate)
                    .where('createdAt', '<=', filters.endDate);
      }
      
      // Order by creation date
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const clients = [];
      
      snapshot.forEach(doc => {
        clients.push({ id: doc.id, ...doc.data() });
      });
      
      return clients;
      
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  async updateClient(clientId, clientData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection('clients').doc(clientId).update({
        ...clientData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Client updated:', clientId);
      return { id: clientId, ...clientData };
      
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(clientId) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection('clients').doc(clientId).delete();
      console.log('Client deleted:', clientId);
      
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Product Management Operations
  
  // Transform product data to match the 10-column structure
  transformProductData(product) {
    const transformed = {
      // Column 1: Length of the product (numeric value)
      Length: typeof product.Length === 'number' ? product.Length : parseFloat(product.Length) || 0,
      
      // Column 2: Name of the pricelist (text)
      PriceListName: product.PriceListName || product.PriceList || product['Price List Name'] || '',
      
      // Column 3: Currency for listed prices (3-letter currency code)
      Currency: product.Currency || 'USD',
      
      // Column 4: Category of the products (text)
      Category: product.Category || '',
      
      // Column 5: Density (numeric value with units)
      Density: product.Density || '',
      
      // Column 6: Product name/identifier (text)
      Product: product.Product || product.ProductName || '',
      
      // Column 7: Available colors (comma-separated list)
      Colors: product.Colors || '',
      
      // Column 8: Standard Available Weight (numeric value with units)
      StandardWeight: typeof product.StandardWeight === 'number' ? product.StandardWeight : parseFloat(product.StandardWeight) || 0,
      
      // Column 9: Rate/price (numeric value)
      Rate: typeof product.Rate === 'number' ? product.Rate : parseFloat(product.Rate) || 0,
      
      // Column 10: Bundled sales indicator (boolean flag for kg-based bundled sales)
      BundledSalesKG: this.parseBooleanField(product.BundledSalesKG || product.CanBeSoldInKG || product['Can Be Sold In KG'])
    };
    
    return transformed;
  }
  
  // Helper method to parse boolean fields
  parseBooleanField(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1' || lowerValue === 'y';
    }
    return Boolean(value);
  }

  async saveProducts(products) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const batch = this.db.batch();
      
      products.forEach(product => {
        const docRef = this.db.collection('products').doc();
        const transformedProduct = this.transformProductData(product);
        batch.set(docRef, {
          ...transformedProduct,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('Products saved successfully with 10-column structure');
      
    } catch (error) {
      console.error('Error saving products:', error);
      throw error;
    }
  }

  async getProducts(filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection('products');
      
      // Apply filters
      if (filters.category) {
        query = query.where('Category', '==', filters.category);
      }
      
      if (filters.priceList) {
        query = query.where('PriceListName', '==', filters.priceList);
      }
      
      const snapshot = await query.get();
      const products = [];
      
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      
      return products;
      
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // Quote Management Operations
  async saveQuote(quoteData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const docRef = await this.db.collection('quotes').add({
        ...quoteData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: quoteData.status || 'draft'
      });
      
      console.log('Quote saved with ID:', docRef.id);
      return { id: docRef.id, ...quoteData };
      
    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    }
  }

  // Order Management Operations
  async saveOrder(orderData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const docRef = await this.db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: orderData.status || 'pending',
        googleSheetSynced: false
      });
      
      console.log('Order saved with ID:', docRef.id);
      
      // Sync to Google Sheets
      try {
        await this.syncOrderToGoogleSheets({ id: docRef.id, ...orderData });
        await this.db.collection('orders').doc(docRef.id).update({
          googleSheetSynced: true,
          googleSheetSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (sheetError) {
        console.warn('Google Sheets sync failed:', sheetError);
        // Order is still saved to Firebase even if Google Sheets sync fails
      }
      
      return { id: docRef.id, ...orderData };
      
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  }

  // Convert Quote to Order
  async convertQuoteToOrder(quoteId, additionalOrderData = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      // Get the quote data
      const quoteDoc = await this.db.collection('quotes').doc(quoteId).get();
      if (!quoteDoc.exists) {
        throw new Error('Quote not found');
      }

      const quoteData = quoteDoc.data();
      
      // Create order data from quote
      const orderData = {
        ...quoteData,
        ...additionalOrderData,
        originalQuoteId: quoteId,
        orderNumber: additionalOrderData.orderNumber || this.generateOrderNumber(), // Use provided orderNumber or generate new one
        status: 'pending',
        orderType: 'converted_from_quote'
      };

      // Remove quote-specific fields
      delete orderData.quoteId;
      delete orderData.quoteNumber;
      
      // Save the order
      const savedOrder = await this.saveOrder(orderData);
      
      // Delete the quote from database after successful conversion
      await this.db.collection('quotes').doc(quoteId).delete();
      console.log('Quote deleted from database after conversion to order:', quoteId);
      
      return savedOrder;
      
    } catch (error) {
      console.error('Error converting quote to order:', error);
      throw error;
    }
  }

  // Generate Order Number
  generateOrderNumber() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    return `ORD-${dateStr}-${timeStr}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Google Sheets Integration
  async syncOrderToGoogleSheets(orderData) {
    try {
      // Use the Google Sheets integration class if available
      if (window.googleSheetsFetch) {
        const result = await window.googleSheetsFetch.appendOrderData(orderData);
        console.log('Order synced to Google Sheets via fetch API');
        return result;
      } else if (window.googleSheets && window.googleSheets.isAvailable()) {
        const result = await window.googleSheets.appendOrderData(orderData);
        console.log('Order synced to Google Sheets via gapi');
        return result;
      } else {
        // Fallback to direct fetch implementation
        return await this.fallbackGoogleSheetsSync(orderData);
      }
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      throw error;
    }
  }

  // Fallback Google Sheets sync implementation
  async fallbackGoogleSheetsSync(orderData) {
    const GOOGLE_SHEET_ID = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    const API_KEY = (typeof process !== 'undefined' && process.env) ? 
                    process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY' :
                    window.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
    
    if (API_KEY === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      console.warn('Google Sheets API key not configured');
      throw new Error('Google Sheets API key not configured');
    }
    
    try {
      const sheetData = this.formatOrderForGoogleSheets(orderData);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Orders:append?valueInputOption=RAW&key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [sheetData]
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
      }
      
      console.log('Order synced to Google Sheets successfully (fallback)');
      return await response.json();
      
    } catch (error) {
      console.error('Error in fallback Google Sheets sync:', error);
      throw error;
    }
  }

  // Format order data for Google Sheets
  formatOrderForGoogleSheets(orderData) {
    const now = new Date();
    return [
      orderData.orderNumber || orderData.id,
      now.toISOString(),
      orderData.clientName || '',
      orderData.clientContact || '',
      orderData.salesman || '',
      orderData.items ? orderData.items.length : 0,
      orderData.items ? orderData.items.map(item => `${item.product} (${item.quantity})`).join('; ') : '',
      orderData.subtotal || 0,
      orderData.tax || 0,
      orderData.shipping || 0,
      orderData.total || 0,
      orderData.currency || 'INR',
      orderData.status || 'pending',
      orderData.notes || ''
    ];
  }

  async getQuotes(filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection('quotes');
      
      // Apply filters
      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }
      
      if (filters.salesperson) {
        query = query.where('salesperson', '==', filters.salesperson);
      }
      
      // Order by creation date
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const quotes = [];
      
      snapshot.forEach(doc => {
        quotes.push({ id: doc.id, ...doc.data() });
      });
      
      return quotes;
      
    } catch (error) {
      console.error('Error getting quotes:', error);
      throw error;
    }
  }

  // Get Orders
  async getOrders(filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection('orders');
      
      // Apply filters
      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.salesperson) {
        query = query.where('salesperson', '==', filters.salesperson);
      }
      
      // Order by creation date
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const orders = [];
      
      snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      
      return orders;
      
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  // Delete Quote
  async deleteQuote(quoteId) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection('quotes').doc(quoteId).delete();
      console.log('Quote deleted successfully:', quoteId);
      return true;
      
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw error;
    }
  }

  // Salesmen Management
  async saveSalesmen(salesmen) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection('config').doc('salesmen').set({
        list: salesmen,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Salesmen data saved successfully');
      
    } catch (error) {
      console.error('Error saving salesmen:', error);
      throw error;
    }
  }

  async getSalesmen() {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const doc = await this.db.collection('config').doc('salesmen').get();
      
      if (doc.exists) {
        return doc.data().list || [];
      } else {
        return [];
      }
      
    } catch (error) {
      console.error('Error getting salesmen:', error);
      throw error;
    }
  }

  // File Storage Operations
  async uploadFile(file, path) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const storageRef = this.storage.ref().child(path);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      console.log('File uploaded successfully:', downloadURL);
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async downloadFile(path) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const storageRef = this.storage.ref().child(path);
      const downloadURL = await storageRef.getDownloadURL();
      
      return downloadURL;
      
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Complete Data Persistence System (Replaces localStorage)
  async saveAllData(dataType, data, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const collection = this.getCollectionName(dataType);
      const docRef = await this.db.collection(collection).add({
        ...data,
        dataType: dataType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deviceId: options.deviceId || this.getDeviceId(),
        sessionId: options.sessionId || this.getSessionId()
      });
      
      console.log(`${dataType} saved with ID:`, docRef.id);
      
      // Trigger real-time sync if enabled
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'create', { id: docRef.id, ...data });
      }
      
      return { id: docRef.id, ...data };
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        console.warn(`Firebase permission denied for saving ${dataType}, operation skipped`);
        // Return a mock response to prevent breaking the application flow
        return { id: 'local_' + Date.now(), ...data, source: 'local' };
      }
      console.error(`Error saving ${dataType}:`, error);
      throw error;
    }
  }

  async getAllData(dataType, filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const collection = this.getCollectionName(dataType);
      let query = this.db.collection(collection);
      
      // Apply filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          query = query.where(key, '==', filters[key]);
        }
      });
      
      // Order by creation date
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const data = [];
      
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`Retrieved ${data.length} ${dataType} records`);
      return data;
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        console.warn(`Firebase permission denied for getting ${dataType}, returning empty array`);
        return [];
      }
      console.error(`Error getting ${dataType}:`, error);
      throw error;
    }
  }

  async updateAllData(dataType, id, updateData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const collection = this.getCollectionName(dataType);
      await this.db.collection(collection).doc(id).update({
        ...updateData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`${dataType} updated:`, id);
      
      // Trigger real-time sync if enabled
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'update', { id, ...updateData });
      }
      
      return { id, ...updateData };
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        console.warn(`Firebase permission denied for updating ${dataType}, operation skipped`);
        return { id, ...updateData, source: 'local' };
      }
      console.error(`Error updating ${dataType}:`, error);
      throw error;
    }
  }

  async deleteAllData(dataType, id) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const collection = this.getCollectionName(dataType);
      await this.db.collection(collection).doc(id).delete();
      
      console.log(`${dataType} deleted:`, id);
      
      // Trigger real-time sync if enabled
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'delete', { id });
      }
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        console.warn(`Firebase permission denied for deleting ${dataType}, operation skipped`);
        return { success: false, reason: 'permission-denied' };
      }
      console.error(`Error deleting ${dataType}:`, error);
      throw error;
    }
  }

  // Helper methods for data persistence
  getCollectionName(dataType) {
    const collectionMap = {
      'clients': 'clients',
      'quotes': 'quotes',
      'orders': 'orders',
      'products': 'products',
      'salesmen': 'config',
      'settings': 'config',
      'cache': 'cache'
    };
    return collectionMap[dataType] || 'general_data';
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  notifyDataChange(dataType, operation, data) {
    // Emit custom events for real-time updates
    const event = new CustomEvent('firebaseDataChange', {
      detail: { dataType, operation, data }
    });
    document.dispatchEvent(event);
  }

  compareDataItems(item1, item2) {
    // Simple comparison - can be enhanced based on needs
    try {
      return JSON.stringify(item1) === JSON.stringify(item2);
    } catch (error) {
      return false;
    }
  }

  // Data validation and consistency checks
  async validateDataConsistency(dataType, localData) {
    try {
      const firebaseData = await this.getAllData(dataType);
      const inconsistencies = [];
      
      // Check for missing data in Firebase
      localData.forEach(localItem => {
        const firebaseItem = firebaseData.find(fbItem => 
          fbItem.id === localItem.id || 
          this.compareDataItems(localItem, fbItem)
        );
        
        if (!firebaseItem) {
          inconsistencies.push({
            type: 'missing_in_firebase',
            data: localItem
          });
        }
      });
      
      // Check for data conflicts
      firebaseData.forEach(firebaseItem => {
        const localItem = localData.find(localItem => 
          localItem.id === firebaseItem.id
        );
        
        if (localItem && !this.compareDataItems(localItem, firebaseItem)) {
          inconsistencies.push({
            type: 'data_conflict',
            local: localItem,
            firebase: firebaseItem
          });
        }
      });
      
      return {
        isConsistent: inconsistencies.length === 0,
        inconsistencies: inconsistencies
      };
      
    } catch (error) {
      console.error('Error validating data consistency:', error);
      throw error;
    }
  }

  // Data Synchronization
  async syncLocalToCloud(localData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const batch = this.db.batch();
      const syncResults = {
        clients: { success: 0, failed: 0 },
        quotes: { success: 0, failed: 0 },
        orders: { success: 0, failed: 0 }
      };
      
      // Sync clients
      if (localData.clients && localData.clients.length > 0) {
        for (const client of localData.clients) {
          try {
            const docRef = this.db.collection('clients').doc();
            batch.set(docRef, {
              ...client,
              syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
              syncSource: 'local_to_cloud'
            });
            syncResults.clients.success++;
          } catch (error) {
            console.error('Error syncing client:', error);
            syncResults.clients.failed++;
          }
        }
      }
      
      // Sync quotes
      if (localData.quotes && localData.quotes.length > 0) {
        for (const quote of localData.quotes) {
          try {
            const docRef = this.db.collection('quotes').doc();
            batch.set(docRef, {
              ...quote,
              syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
              syncSource: 'local_to_cloud'
            });
            syncResults.quotes.success++;
          } catch (error) {
            console.error('Error syncing quote:', error);
            syncResults.quotes.failed++;
          }
        }
      }
      
      await batch.commit();
      console.log('Local data synced to cloud successfully:', syncResults);
      
      return syncResults;
      
    } catch (error) {
      console.error('Error syncing local data to cloud:', error);
      throw error;
    }
  }

  async syncCloudToLocal() {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const [clients, quotes, salesmen] = await Promise.all([
        this.getClients(),
        this.getQuotes(),
        this.getSalesmen()
      ]);
      
      // Store in localStorage as backup
      localStorage.setItem('cloudClients', JSON.stringify(clients));
      localStorage.setItem('cloudQuotes', JSON.stringify(quotes));
      localStorage.setItem('cloudSalesmen', JSON.stringify(salesmen));
      
      console.log('Cloud data synced to local successfully');
      return { clients, quotes, salesmen };
      
    } catch (error) {
      console.error('Error syncing data from cloud:', error);
      throw error;
    }
  }

  // Real-time listeners
  onClientsChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    return this.db.collection('clients')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const clients = [];
        snapshot.forEach(doc => {
          clients.push({ id: doc.id, ...doc.data() });
        });
        callback(clients);
      }, error => {
        if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
          console.warn('Clients listener permission denied, real-time sync disabled for clients');
          return;
        }
        console.error('Error listening to clients:', error);
      });
  }

  onQuotesChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    return this.db.collection('quotes')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const quotes = [];
        snapshot.forEach(doc => {
          quotes.push({ id: doc.id, ...doc.data() });
        });
        callback(quotes);
      }, error => {
        if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
          console.warn('Quotes listener permission denied, real-time sync disabled for quotes');
          return;
        }
        console.error('Error listening to quotes:', error);
      });
  }
  
  // Real-time Products Synchronization
  onProductsChange(callback) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      console.log('🔄 Setting up real-time products listener...');
      return this.db.collection('products')
        .onSnapshot(snapshot => {
          const products = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            // Remove Firebase-specific fields for compatibility
            const { uploadId, createdAt, updatedAt, ...productData } = data;
            products.push({
              id: doc.id,
              ...productData
            });
          });
          
          console.log(`🔄 Products updated: ${products.length} items`);
          callback(products);
        }, error => {
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            console.warn('❌ Products listener permission denied, real-time sync disabled for products');
            return;
          }
          console.error('❌ Products listener error:', error);
        });
      
    } catch (error) {
      console.error('Error setting up products listener:', error);
      throw error;
    }
  }
  
  // Real-time Salesmen Synchronization
  onSalesmenChange(callback) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      console.log('🔄 Setting up real-time salesmen listener...');
      return this.db.collection('config').doc('salesmen')
        .onSnapshot(doc => {
          if (doc.exists) {
            const data = doc.data();
            const salesmen = data.list || [];
            console.log(`🔄 Salesmen updated: ${salesmen.length} items`);
            callback(salesmen);
          } else {
            console.warn('🔄 Salesmen document does not exist');
            callback([]);
          }
        }, error => {
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            console.warn('❌ Salesmen listener permission denied, real-time sync disabled for salesmen');
            return;
          }
          console.error('❌ Salesmen listener error:', error);
        });
      
    } catch (error) {
      console.error('Error setting up salesmen listener:', error);
      throw error;
    }
  }
  
  // Enable Real-time Synchronization
  enableRealTimeSync() {
    if (!this.isAvailable()) {
      console.warn('🔄 Firebase not available, real-time sync disabled');
      return;
    }
    
    console.log('🔄 Enabling real-time synchronization...');
    
    // Set up products listener
    this.productsUnsubscribe = this.onProductsChange((products) => {
      try {
        // Update global state
        if (typeof state !== 'undefined') {
          state.allProducts = products;
          
          // Update price lists
          if (typeof availablePriceLists !== 'undefined') {
            availablePriceLists.clear();
            products.forEach(product => {
              if (product && (product.PriceList || product['Price List Name'])) {
                const priceListName = product.PriceList || product['Price List Name'];
                availablePriceLists.add(priceListName);
              }
            });
            
            // Update UI if functions are available
            if (typeof updatePriceListDropdown === 'function') {
              updatePriceListDropdown();
            }
          }
          
          // Update categories if function is available
          if (typeof populateCategories === 'function') {
            populateCategories();
          }
          
          // Update admin status if function is available
          if (typeof updateAdminStatus === 'function') {
            updateAdminStatus();
          }
          
          // Cache data locally
          const firebaseData = {
            products,
            salesmen: window.embeddedSalesmenData || [],
            source: 'Firebase-RealTime',
            loadedAt: new Date().toISOString()
          };
          localStorage.setItem('firebaseProductData', JSON.stringify(firebaseData));
          localStorage.setItem('firebaseDataTimestamp', Date.now().toString());
          
          console.log('✅ Products synchronized and UI updated');
        }
      } catch (error) {
        console.error('❌ Error updating products in real-time:', error);
      }
    });
    
    // Set up salesmen listener
    this.salesmenUnsubscribe = this.onSalesmenChange((salesmen) => {
      try {
        // Update global salesmen data
        window.embeddedSalesmenData = salesmen;
        window.cachedSalesmenData = salesmen;
        
        // Update salesmen dropdowns if functions are available
        if (typeof populateSalesmanOptions === 'function') {
          populateSalesmanOptions(salesmen);
        }
        
        console.log('✅ Salesmen synchronized and UI updated');
      } catch (error) {
        console.error('❌ Error updating salesmen in real-time:', error);
      }
    });
    
    // Set up quotes listener for real-time updates
    this.quotesUnsubscribe = this.onQuotesChange((quotes) => {
      try {
        console.log('🔄 Quotes updated in real-time, count:', quotes.length);
        
        // Update quotes list UI if function is available
        if (typeof renderSavedQuotesList === 'function') {
          console.log('🔄 Refreshing quotes list due to real-time update...');
          renderSavedQuotesList();
        }
        
        console.log('✅ Quotes synchronized and UI updated');
      } catch (error) {
        console.error('❌ Error updating quotes in real-time:', error);
      }
    });
    
    console.log('✅ Real-time synchronization enabled (products, salesmen, quotes)');
  }
  
  // Disable Real-time Synchronization
  disableRealTimeSync() {
    console.log('🔄 Disabling real-time synchronization...');
    
    if (this.productsUnsubscribe) {
      this.productsUnsubscribe();
      this.productsUnsubscribe = null;
    }
    
    if (this.salesmenUnsubscribe) {
      this.salesmenUnsubscribe();
      this.salesmenUnsubscribe = null;
    }
    
    if (this.clientsUnsubscribe) {
      this.clientsUnsubscribe();
      this.clientsUnsubscribe = null;
    }
    
    if (this.quotesUnsubscribe) {
      this.quotesUnsubscribe();
      this.quotesUnsubscribe = null;
    }
    
    console.log('✅ Real-time synchronization disabled');
  }
  
  // Check if real-time sync is active
  isRealTimeSyncActive() {
    return !!(this.productsUnsubscribe || this.salesmenUnsubscribe);
  }
}

// Global Firebase Database instance
window.firebaseDB = new FirebaseDatabase();

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Firebase to be available
  if (typeof firebase !== 'undefined') {
    try {
      await window.firebaseDB.initialize();
    } catch (error) {
      console.warn('Firebase initialization failed, using localStorage fallback');
    }
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseDatabase;
}