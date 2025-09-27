class FirebaseDatabase {
  constructor() {
    this.db = null;
    this.storage = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      this.db = firebase.firestore();
      
      try {
        this.db.settings({
          cacheSizeBytes: 40000000,
          ignoreUndefinedProperties: true,
          experimentalForceLongPolling: false,
          merge: true
        });
      } catch (settingsError) {
      }

      try {
        await this.db.disableNetwork();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.db.enableNetwork();
      } catch (networkError) {
      }
      
      try {
        this.storage = firebase.storage();
      } catch (storageError) {
        this.storage = null;
      }
      
      try {
        await this.db.collection('test').limit(1).get();
      } catch (testError) {
      }
      
      this.initialized = true;
      
    } catch (error) {
      this.initialized = false;
    }
  }

  isAvailable() {
    return this.initialized && this.db !== null;
  }

  getCurrentUser() {
    if (window.globalFirebase && window.globalFirebase.getCurrentUser) {
      return window.globalFirebase.getCurrentUser();
    }
    return null;
  }

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
      
      return { id: docRef.id, ...clientData };
      
    } catch (error) {
      throw error;
    }
  }

  async getClients(filters = {}) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection('clients');
      
      if (filters.salesperson) {
        query = query.where('salesperson', '==', filters.salesperson);
      }
      
      if (filters.startDate && filters.endDate) {
        query = query.where('createdAt', '>=', filters.startDate)
                    .where('createdAt', '<=', filters.endDate);
      }
      
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const clients = [];
      
      snapshot.forEach(doc => {
        clients.push({ id: doc.id, ...doc.data() });
      });
      
      return clients;
      
    } catch (error) {
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
      
      return { id: clientId, ...clientData };
      
    } catch (error) {
      throw error;
    }
  }

  async deleteClient(clientId) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection('clients').doc(clientId).delete();
      
    } catch (error) {
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
    if (!this.db) {
        throw new Error('Firebase not initialized');
    }

    try {
        const transformedProducts = products.map(product => this.transformProductData(product));
        
        const batch = writeBatch(this.db);
        transformedProducts.forEach((product, index) => {
            const docRef = doc(this.db, 'products', `product_${index}`);
            batch.set(docRef, product);
        });
        
        await batch.commit();
        return true;
    } catch (error) {
        throw error;
    }
  }

  async getProducts(filters = {}) {
    if (!this.db) {
        return [];
    }

    try {
        const querySnapshot = await getDocs(collection(this.db, 'products'));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (error) {
        throw error;
    }
  }

  // Colors Management Operations
  async getColors(filters = {}) {
    if (!this.db) {
        return [];
    }

    try {
        const querySnapshot = await getDocs(collection(this.db, 'colors'));
        const colors = [];
        querySnapshot.forEach((doc) => {
            colors.push({ id: doc.id, ...doc.data() });
        });
        return colors;
    } catch (error) {
        throw error;
    }
  }

  async getStyles(filters = {}) {
    if (!this.db) {
        return [];
    }

    try {
        const querySnapshot = await getDocs(collection(this.db, 'styles'));
        const styles = [];
        querySnapshot.forEach((doc) => {
            styles.push({ id: doc.id, ...doc.data() });
        });
        return styles;
    } catch (error) {
        throw error;
    }
  }

  // Quote Management Operations
  async saveQuote(quoteData) {
    if (!this.db) {
        throw new Error('Firebase not initialized');
    }

    try {
        const docRef = await addDoc(collection(this.db, 'quotes'), quoteData);
        return docRef.id;
    } catch (error) {
        throw error;
    }
  }

  // Order Management Operations
  async saveOrder(orderData) {
    if (!this.db) {
        throw new Error('Firebase not initialized');
    }

    try {
        const docRef = await addDoc(collection(this.db, 'orders'), orderData);
        
        if (window.googleSheetsIntegration && window.googleSheetsIntegration.isConfigured()) {
            try {
                await window.googleSheetsIntegration.appendOrderData(orderData);
            } catch (sheetError) {
            }
        }
        
        return docRef.id;
    } catch (error) {
        throw error;
    }
  }

  // Convert Quote to Order
  async convertQuoteToOrder(quoteId, orderData) {
    if (!this.db) {
        throw new Error('Firebase not initialized');
    }

    try {
        const orderId = await this.saveOrder(orderData);
        
        try {
            await deleteDoc(doc(this.db, 'quotes', quoteId));
        } catch (deleteError) {
        }
        
        return orderId;
    } catch (error) {
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
      if (window.googleSheetsFetch) {
        const result = await window.googleSheetsFetch.appendOrderData(orderData);
        return result;
      } else if (window.googleSheets && window.googleSheets.isAvailable()) {
        const result = await window.googleSheets.appendOrderData(orderData);
        return result;
      } else {
        return await this.fallbackGoogleSheetsSync(orderData);
      }
    } catch (error) {
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
      
      return await response.json();
      
    } catch (error) {
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

  // Client Google Sheets Integration
  async syncClientToGoogleSheets(clientData) {
    try {
      // Use the Google Sheets integration class if available
      if (window.googleSheetsFetch) {
        const result = await window.googleSheetsFetch.appendClientData(clientData);
        return result;
      } else if (window.googleSheets && window.googleSheets.isAvailable()) {
        const result = await window.googleSheets.appendClientData(clientData);
        return result;
      } else {
        return await this.fallbackClientGoogleSheetsSync(clientData);
      }
    } catch (error) {
      throw error;
    }
  }

  // Sync all clients to Google Sheets
  async syncAllClientsToGoogleSheets() {
    try {
      const clients = await this.getClients();
      
      if (window.googleSheetsFetch) {
        const result = await window.googleSheetsFetch.syncClientsToGoogleSheets(clients);
        return result;
      } else if (window.googleSheets && window.googleSheets.isAvailable()) {
        const result = await window.googleSheets.syncClientsToGoogleSheets(clients);
        return result;
      } else {
        return await this.fallbackAllClientsGoogleSheetsSync(clients);
      }
    } catch (error) {
      throw error;
    }
  }

  // Fallback client Google Sheets sync implementation
  async fallbackClientGoogleSheetsSync(clientData) {
    const GOOGLE_SHEET_ID = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    const API_KEY = (typeof process !== 'undefined' && process.env) ? 
                    process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY' :
                    window.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
    
    if (API_KEY === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured');
    }
    
    try {
      const sheetData = this.formatClientForGoogleSheets(clientData);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/clients:append?valueInputOption=RAW&key=${API_KEY}`,
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
      
      return await response.json();
      
    } catch (error) {
      throw error;
    }
  }

  // Fallback all clients Google Sheets sync implementation
  async fallbackAllClientsGoogleSheetsSync(clients) {
    const GOOGLE_SHEET_ID = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    const API_KEY = (typeof process !== 'undefined' && process.env) ? 
                    process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY' :
                    window.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
    
    if (API_KEY === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured');
    }
    
    try {
      // First, create headers if they don't exist
      await this.createClientHeaders();
      
      // Format all client data
      const sheetData = clients.map(client => this.formatClientForGoogleSheets(client));
      
      // Clear existing data and update with new data
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/clients!A2:L?valueInputOption=RAW&key=${API_KEY}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: sheetData
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      throw error;
    }
  }

  // Create client headers in Google Sheets
  async createClientHeaders() {
    try {
      const headers = [
        'Client ID', 'Client Name', 'Company', 'Contact Person', 'Phone', 'Email', 
        'Address', 'City', 'State', 'Postal Code', 'Country', 'GST Number', 
        'PAN Number', 'Credit Limit', 'Payment Terms', 'Salesman', 'Notes', 
        'Created Date', 'Updated Date'
      ];

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${window.GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/Clients!A1:S1?valueInputOption=RAW&key=${window.GOOGLE_SHEETS_CONFIG.apiKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers]
        })
      });

      if (response.ok) {
        const result = await response.json();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Format client data for Google Sheets
  formatClientForGoogleSheets(clientData) {
    return [
      clientData.id || '',
      clientData.clientName || '',
      clientData.companyName || '',
      clientData.phone1 || '',
      clientData.phone2 || '',
      clientData.email || '',
      clientData.address?.line1 || '',
      clientData.address?.line2 || '',
      clientData.address?.city || '',
      clientData.address?.state || '',
      clientData.address?.postalCode || '',
      clientData.address?.country || ''
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
      return true;
      
    } catch (error) {
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
      
    } catch (error) {
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
      throw error;
    }
  }

  // File Storage Operations
  async uploadFile(file, path) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    if (!this.storage) {
      throw new Error('Firebase Storage not available');
    }

    try {
      const storageRef = this.storage.ref().child(path);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      return downloadURL;
      
    } catch (error) {
      throw error;
    }
  }

  async downloadFile(path) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    if (!this.storage) {
      throw new Error('Firebase Storage not available');
    }

    try {
      const storageRef = this.storage.ref().child(path);
      const downloadURL = await storageRef.getDownloadURL();
      
      return downloadURL;
      
    } catch (error) {
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
      
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'create', { id: docRef.id, ...data });
      }
      
      return { id: docRef.id, ...data };
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        return { id: 'local_' + Date.now(), ...data, source: 'local' };
      }
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
      
      return data;
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        return [];
      }
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
      
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'update', { id, ...updateData });
      }
      
      return { id, ...updateData };
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        return { id, ...updateData, source: 'local' };
      }
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
      
      if (this.isRealTimeSyncActive()) {
        this.notifyDataChange(dataType, 'delete', { id });
      }
      
    } catch (error) {
      if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
        return { success: false, reason: 'permission-denied' };
      }
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
        clients: { synced: 0, failed: 0 },
        quotes: { synced: 0, failed: 0 },
        orders: { synced: 0, failed: 0 }
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
            syncResults.quotes.failed++;
          }
        }
      }
      
      await batch.commit();
      
      return syncResults;
      
    } catch (error) {
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
      
      return { clients, quotes, salesmen };
      
    } catch (error) {
      throw error;
    }
  }

  // Real-time listeners
  onClientsChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    try {
      return this.db.collection('clients')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
          const clients = [];
          snapshot.forEach(doc => {
            clients.push({ id: doc.id, ...doc.data() });
          });
          callback(clients);
        }, error => {
          console.warn('⚠️ Clients real-time listener error:', error.message);
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            return;
          }
          // For network errors, try to fallback to one-time read
          if (error.code === 'unavailable' || error.message.includes('network')) {
            this.getClients().then(clients => callback(clients)).catch(() => {});
          }
        });
    } catch (error) {
      console.warn('⚠️ Failed to setup clients listener:', error.message);
      return () => {};
    }
  }

  onQuotesChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    try {
      return this.db.collection('quotes')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
          const quotes = [];
          snapshot.forEach(doc => {
            quotes.push({ id: doc.id, ...doc.data() });
          });
          callback(quotes);
        }, error => {
          console.warn('⚠️ Quotes real-time listener error:', error.message);
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            return;
          }
          // For network errors, try to fallback to one-time read
          if (error.code === 'unavailable' || error.message.includes('network')) {
            this.getQuotes().then(quotes => callback(quotes)).catch(() => {});
          }
        });
    } catch (error) {
      console.warn('⚠️ Failed to setup quotes listener:', error.message);
      return () => {};
    }
  }
  
  // Real-time Products Synchronization
  onProductsChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    try {
      return this.db.collection('products')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
          const products = [];
          snapshot.forEach(doc => {
            const productData = doc.data();
            const transformedProduct = this.transformProductData(productData);
            products.push({ 
              id: doc.id, 
              ...transformedProduct 
            });
          });
          callback(products);
        }, error => {
          console.warn('⚠️ Products real-time listener error:', error.message);
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            return;
          }
          // For network errors, try to fallback to one-time read
          if (error.code === 'unavailable' || error.message.includes('network')) {
            this.getProducts().then(products => callback(products)).catch(() => {});
          }
        });
    } catch (error) {
      console.warn('⚠️ Failed to setup products listener:', error.message);
      return () => {};
    }
  }
  
  // Real-time Salesmen Synchronization
  onSalesmenChange(callback) {
    if (!this.isAvailable()) {
      return () => {}; // Return empty unsubscribe function
    }

    try {
      return this.db.collection('config').doc('salesmen')
        .onSnapshot(doc => {
          if (doc.exists) {
            const data = doc.data();
            const salesmen = data.list || [];

            callback(salesmen);
          } else {
            callback([]);
          }
        }, error => {
          console.warn('⚠️ Salesmen real-time listener error:', error.message);
          if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            return;
          }
          // For network errors, try to fallback to one-time read
          if (error.code === 'unavailable' || error.message.includes('network')) {
            this.getSalesmen().then(salesmen => callback(salesmen)).catch(() => {});
          }
        });
      
    } catch (error) {
      console.warn('⚠️ Failed to setup salesmen listener:', error.message);
      return () => {};
    }
  }
  
  // Get Database Statistics
  async getDatabaseStats() {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const stats = {
        products: 0,
        clients: 0,
        salesmen: 0,
        priceLists: 0,
        categories: 0,
        colors: 0,
        styles: 0,
        quotes: 0,
        orders: 0,
        lastUpdated: 'Never'
      };

      // Get products count and extract categories/price lists/colors/styles
      const productsSnapshot = await this.db.collection('products').get();
      stats.products = productsSnapshot.size;
      
      const categories = new Set();
      const priceLists = new Set();
      const colorsFromProducts = new Set();
      const stylesFromProducts = new Set();
      let lastProductUpdate = null;
      
      productsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.Category) categories.add(data.Category);
        if (data.PriceList || data['Price List Name']) {
          priceLists.add(data.PriceList || data['Price List Name']);
        }
        
        // Extract colors from products
        if (data.Colors) colorsFromProducts.add(data.Colors);
        if (data.Color) colorsFromProducts.add(data.Color);
        if (data.color) colorsFromProducts.add(data.color);
        
        // Extract styles from products
        if (data.Style) stylesFromProducts.add(data.Style);
        if (data.style) stylesFromProducts.add(data.style);
        
        if (data.updatedAt && (!lastProductUpdate || data.updatedAt > lastProductUpdate)) {
          lastProductUpdate = data.updatedAt;
        }
      });
      
      stats.categories = categories.size;
      stats.priceLists = priceLists.size;

      // Get colors count from dedicated colors collection
      try {
        const colorsSnapshot = await this.db.collection('colors').get();
        stats.colors = colorsSnapshot.size;
      } catch (error) {
        stats.colors = 0;
      }

      // Get styles count from dedicated styles collection
      try {
        const stylesSnapshot = await this.db.collection('styles').get();
        stats.styles = stylesSnapshot.size;
      } catch (error) {
        stats.styles = 0;
      }

      // Get clients count
      const clientsSnapshot = await this.db.collection('clients').get();
      stats.clients = clientsSnapshot.size;

      // Get quotes count
      const quotesSnapshot = await this.db.collection('quotes').get();
      stats.quotes = quotesSnapshot.size;

      // Get orders count
      const ordersSnapshot = await this.db.collection('orders').get();
      stats.orders = ordersSnapshot.size;

      // Get salesmen count
      try {
        const salesmenDoc = await this.db.collection('config').doc('salesmen').get();
        if (salesmenDoc.exists) {
          const salesmenData = salesmenDoc.data();
          stats.salesmen = (salesmenData.list || []).length;
        }
      } catch (error) {
      }

      // Set last updated time
      if (lastProductUpdate) {
        try {
          // Handle Firebase Timestamp objects
          if (lastProductUpdate && typeof lastProductUpdate.toDate === 'function') {
            stats.lastUpdated = lastProductUpdate.toDate().toLocaleString('en-US');
          } else if (lastProductUpdate && typeof lastProductUpdate.seconds === 'number') {
            // Handle Firestore Timestamp format
            stats.lastUpdated = new Date(lastProductUpdate.seconds * 1000).toLocaleString('en-US');
          } else {
            // Handle regular date strings or numbers
            const date = new Date(lastProductUpdate);
            if (!isNaN(date.getTime())) {
              stats.lastUpdated = date.toLocaleString('en-US');
            } else {
              stats.lastUpdated = 'Invalid date format';
            }
          }
        } catch (error) {
          stats.lastUpdated = 'Date formatting error';
        }
      }

      return stats;
      
    } catch (error) {
      throw error;
    }
  }

  // Enable Real-time Synchronization
  enableRealTimeSync() {
    if (!this.isAvailable()) {
      return;
    }
    
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
          
        }
      } catch (error) {
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
        
      } catch (error) {
      }
    });
    
    // Set up quotes listener for real-time updates
    this.quotesUnsubscribe = this.onQuotesChange((quotes) => {
      try {
        // Update quotes list UI if function is available
        if (typeof renderSavedQuotesList === 'function') {
          renderSavedQuotesList();
        }
      } catch (error) {
      }
    });
    
  }
  
  // Disable Real-time Synchronization
  disableRealTimeSync() {
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
    }
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseDatabase;
}