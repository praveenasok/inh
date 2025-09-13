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
      
      // Enable offline persistence
      await this.db.enablePersistence({ synchronizeTabs: true });
      
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
  async saveProducts(products) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const batch = this.db.batch();
      
      products.forEach(product => {
        const docRef = this.db.collection('products').doc();
        batch.set(docRef, {
          ...product,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('Products saved successfully');
      
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
        query = query.where('PriceList', '==', filters.priceList);
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Quote saved with ID:', docRef.id);
      return { id: docRef.id, ...quoteData };
      
    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    }
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

  // Data Synchronization
  async syncLocalToCloud(localData) {
    if (!this.isAvailable()) {
      throw new Error('Firebase not available');
    }

    try {
      const batch = this.db.batch();
      
      // Sync clients
      if (localData.clients) {
        localData.clients.forEach(client => {
          const docRef = this.db.collection('clients').doc(client.id || this.db.collection('clients').doc().id);
          batch.set(docRef, client, { merge: true });
        });
      }
      
      // Sync quotes
      if (localData.quotes) {
        localData.quotes.forEach(quote => {
          const docRef = this.db.collection('quotes').doc(quote.id || this.db.collection('quotes').doc().id);
          batch.set(docRef, quote, { merge: true });
        });
      }
      
      await batch.commit();
      console.log('Local data synced to cloud successfully');
      
    } catch (error) {
      console.error('Error syncing data to cloud:', error);
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
    
    console.log('✅ Real-time synchronization enabled');
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