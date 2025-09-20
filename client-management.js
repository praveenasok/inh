// Client Management System
// Handles client data storage, retrieval, and unique ID generation

class ClientManager {
  constructor() {
    this.clients = [];
    this.deviceId = this.getOrCreateDeviceId();
    this.initialized = false;
    this.initializeAsync();
  }

  // Async initialization
  async initializeAsync() {
    try {
      this.clients = await this.loadClients();
      this.initialized = true;
      console.log('ClientManager initialized with', this.clients.length, 'clients');
    } catch (error) {
      console.error('Error initializing ClientManager:', error);
      this.clients = [];
      this.initialized = true;
    }
  }

  // Ensure initialization is complete
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeAsync();
    }
  }

  // Generate unique device ID
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Generate unique client ID with company4lettercode-autonumber format
  async generateClientId() {
    try {
      // Get company code from Firebase companies collection
      const companyCode = await this.getCompanyCode();
      
      // Get next auto number for clients
      const autoNumber = await this.getNextClientAutoNumber();
      
      // Generate client ID: COMP-###
      const clientId = `${companyCode}-${autoNumber.toString().padStart(3, '0')}`;
      
      return clientId;
    } catch (error) {
      console.error('Error generating client ID:', error);
      // Fallback to timestamp-based ID
      const timestamp = Date.now().toString().slice(-6);
      return `INH-${timestamp}`;
    }
  }

  // Get company code from Firebase companies collection
  async getCompanyCode() {
    try {
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        const companiesSnapshot = await window.firebaseDB.db.collection('companies').limit(1).get();
        if (!companiesSnapshot.empty) {
          const company = companiesSnapshot.docs[0].data();
          // Look for company code in various possible field names
          const code = company.code || company.Code || company.company_code || company.companyCode || 
                      company.fourLetterCode || company.four_letter_code || company.abbreviation;
          if (code && code.length >= 3) {
            return code.substring(0, 4).toUpperCase(); // Ensure 4 characters max
          }
        }
      }
      
      // Fallback to default company code
      return 'INH';
    } catch (error) {
      console.error('Error fetching company code:', error);
      return 'INH'; // Fallback
    }
  }

  // Get next auto number for clients
  async getNextClientAutoNumber() {
    try {
      // Get all existing client IDs to determine next number
      const existingClients = this.clients || [];
      
      // Extract auto numbers from existing client IDs
      const autoNumbers = existingClients
        .map(client => {
          const parts = client.id.split('-');
          if (parts.length >= 2) {
            const numberPart = parts[parts.length - 1];
            return parseInt(numberPart, 10);
          }
          return 0;
        })
        .filter(num => !isNaN(num));
      
      // Find the highest auto number and increment
      const maxAutoNumber = autoNumbers.length > 0 ? Math.max(...autoNumbers) : 0;
      return maxAutoNumber + 1;
    } catch (error) {
      console.error('Error getting next client auto number:', error);
      return 1; // Start from 1 if error
    }
  }

  // Validate client data
  validateClientData(clientData) {
    // Required fields for basic client information
    const required = ['clientName', 'contactPerson', 'email', 'phone1'];
    const missing = required.filter(field => !clientData[field] || clientData[field].trim() === '');
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone numbers
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(clientData.phone1)) {
      throw new Error('Invalid phone number format for Phone 1');
    }
    if (clientData.phone2 && !phoneRegex.test(clientData.phone2)) {
      throw new Error('Invalid phone number format for Phone 2');
    }

    // Validate billing address if provided
    if (clientData.billingAddress) {
      const billingRequired = ['street', 'city', 'state', 'zipCode', 'country'];
      const billingMissing = billingRequired.filter(field => 
        !clientData.billingAddress[field] || clientData.billingAddress[field].trim() === ''
      );
      if (billingMissing.length > 0) {
        throw new Error(`Missing billing address fields: ${billingMissing.join(', ')}`);
      }
    }

    // Validate shipping address if provided and different from billing
    if (clientData.shippingAddress && !clientData.sameAsBilling) {
      const shippingRequired = ['street', 'city', 'state', 'zipCode', 'country'];
      const shippingMissing = shippingRequired.filter(field => 
        !clientData.shippingAddress[field] || clientData.shippingAddress[field].trim() === ''
      );
      if (shippingMissing.length > 0) {
        throw new Error(`Missing shipping address fields: ${shippingMissing.join(', ')}`);
      }
    }

    return true;
  }

  // Add new client
  async addClient(clientData, salespersonName) {
    try {
      await this.ensureInitialized();
      this.validateClientData(clientData);
      
      // Generate client ID asynchronously
      const clientId = await this.generateClientId();
      
      const client = {
        id: clientId,
        ...clientData,
        salesperson: salespersonName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceId: this.deviceId
      };

      // Save to Firebase first if available
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        try {
          const savedClient = await window.firebaseDB.saveClient(client);
          console.log('✅ Client saved to Firebase:', savedClient.id);
          
          // Add to local array for immediate access
          this.clients.push(client);
          
          // Also save to localStorage as backup
          await this.saveClientsToLocalStorage();
          
          return client;
        } catch (firebaseError) {
          console.error('❌ Firebase save failed, falling back to localStorage:', firebaseError);
        }
      }
      
      // Fallback to localStorage-only operation
      this.clients.push(client);
      await this.saveClients();
      
      return client;
    } catch (error) {
      throw new Error(`Failed to add client: ${error.message}`);
    }
  }

  // Update existing client
  async updateClient(clientId, clientData) {
    try {
      await this.ensureInitialized();
      this.validateClientData(clientData);
      
      const index = this.clients.findIndex(c => c.id === clientId);
      if (index === -1) {
        throw new Error('Client not found');
      }

      const updatedClient = {
        ...this.clients[index],
        ...clientData,
        updatedAt: new Date().toISOString()
      };

      // Update in Firebase first if available
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        try {
          await window.firebaseDB.updateClient(clientId, updatedClient);
          console.log('✅ Client updated in Firebase:', clientId);
          
          // Update local array
          this.clients[index] = updatedClient;
          
          // Also save to localStorage as backup
          await this.saveClientsToLocalStorage();
          
          return updatedClient;
        } catch (firebaseError) {
          console.error('❌ Firebase update failed, falling back to localStorage:', firebaseError);
        }
      }
      
      // Fallback to localStorage-only operation
      this.clients[index] = updatedClient;
      await this.saveClients();
      return updatedClient;
    } catch (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }
  }

  // Delete client
  async deleteClient(clientId) {
    try {
      await this.ensureInitialized();
      const index = this.clients.findIndex(c => c.id === clientId);
      if (index === -1) {
        throw new Error('Client not found');
      }

      const deletedClient = this.clients[index];

      // Delete from Firebase first if available
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        try {
          await window.firebaseDB.deleteClient(clientId);
          console.log('✅ Client deleted from Firebase:', clientId);
          
          // Remove from local array
          this.clients.splice(index, 1);
          
          // Also save to localStorage as backup
          await this.saveClientsToLocalStorage();
          
          return deletedClient;
        } catch (firebaseError) {
          console.error('❌ Firebase delete failed, falling back to localStorage:', firebaseError);
        }
      }
      
      // Fallback to localStorage-only operation
      this.clients.splice(index, 1);
      await this.saveClients();
      return deletedClient;
    } catch (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  }

  // Get client by ID
  getClient(clientId) {
    return this.clients.find(c => c.id === clientId);
  }

  // Get all clients
  getAllClients() {
    return [...this.clients];
  }

  // Search clients
  searchClients(query) {
    const searchTerm = query.toLowerCase();
    return this.clients.filter(client => 
      client.clientName.toLowerCase().includes(searchTerm) ||
      client.companyName.toLowerCase().includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm) ||
      client.id.toLowerCase().includes(searchTerm)
    );
  }

  // Load clients from Firebase (with localStorage fallback)
  async loadClients() {
    try {
      // Try to load from Firebase database first
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        try {
          const firebaseClients = await window.firebaseDB.getClients();
          if (firebaseClients && Array.isArray(firebaseClients)) {
            console.log('✅ Loaded clients from Firebase database:', firebaseClients.length);
            
            // Also save to localStorage as backup
            await this.saveClientsToLocalStorage(firebaseClients);
            
            return firebaseClients;
          }
        } catch (firebaseError) {
          console.error('❌ Firebase database load failed:', firebaseError);
        }
      }
      
      // Fallback to localStorage
      const stored = localStorage.getItem('clientData');
      const localClients = stored ? JSON.parse(stored) : [];
      
      console.log('📁 Loaded clients from localStorage:', localClients.length);
      return localClients;
    } catch (error) {
      console.error('Error loading clients:', error);
      // Final fallback to empty array
      return [];
    }
  }

  // Helper function to save clients to localStorage only
  async saveClientsToLocalStorage(clientsArray = null) {
    try {
      const clientsToSave = clientsArray || this.clients;
      const timestamp = Date.now().toString();
      
      localStorage.setItem('clientData', JSON.stringify(clientsToSave));
      localStorage.setItem('clientDataTimestamp', timestamp);
      
      console.log('💾 Clients saved to localStorage backup:', clientsToSave.length);
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  // Save clients to Firebase (with localStorage backup)
  async saveClients() {
    try {
      const timestamp = Date.now().toString();
      
      // Save to Firebase first
      if (window.firebaseStorage) {
        await window.firebaseStorage.setItem('clientData', this.clients);
        await window.firebaseStorage.setItem('clientDataTimestamp', timestamp);
        console.log('Clients saved to Firebase:', this.clients.length);
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('clientData', JSON.stringify(this.clients));
      localStorage.setItem('clientDataTimestamp', timestamp);
      
    } catch (error) {
      console.error('Error saving clients to Firebase:', error);
      
      // Fallback to localStorage only
      try {
        localStorage.setItem('clientData', JSON.stringify(this.clients));
        localStorage.setItem('clientDataTimestamp', Date.now().toString());
        console.warn('Saved to localStorage as fallback');
      } catch (fallbackError) {
        console.error('Fallback saving failed:', fallbackError);
        throw new Error('Failed to save client data');
      }
    }
  }

  // Export clients data for external database
  exportClients() {
    return {
      deviceId: this.deviceId,
      exportedAt: new Date().toISOString(),
      totalClients: this.clients.length,
      clients: this.clients
    };
  }

  // Import clients data
  importClients(clientsData) {
    try {
      if (!Array.isArray(clientsData)) {
        throw new Error('Invalid data format: expected array');
      }

      // Validate each client
      clientsData.forEach((client, index) => {
        if (!client.id || !client.clientName) {
          throw new Error(`Invalid client data at index ${index}`);
        }
      });

      this.clients = clientsData;
      this.saveClients();
      return this.clients.length;
    } catch (error) {
      throw new Error(`Failed to import clients: ${error.message}`);
    }
  }

  // Get clients for dropdown (formatted)
  getClientsForDropdown() {
    return this.clients.map(client => ({
      value: client.id,
      text: `${client.clientName} (${client.companyName})`,
      client: client
    }));
  }

  // Get statistics
  getStatistics() {
    const now = new Date();
    const thisMonth = this.clients.filter(c => {
      const created = new Date(c.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    const salespeople = [...new Set(this.clients.map(c => c.salesperson))];
    
    return {
      totalClients: this.clients.length,
      thisMonth: thisMonth.length,
      salespeople: salespeople.length,
      lastAdded: this.clients.length > 0 ? this.clients[this.clients.length - 1].createdAt : null
    };
  }
}

// Global client manager instance
window.clientManager = new ClientManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientManager;
}