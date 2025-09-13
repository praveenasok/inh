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

  // Generate unique client ID
  generateClientId(salespersonName) {
    const date = new Date();
    const dateStr = date.getFullYear() + 
                   String(date.getMonth() + 1).padStart(2, '0') + 
                   String(date.getDate()).padStart(2, '0');
    const salesPerson = salespersonName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const deviceShort = this.deviceId.split('-')[1] || 'DEV';
    
    return `${deviceShort}-${dateStr}-${salesPerson}-${Date.now().toString().slice(-4)}`;
  }

  // Validate client data
  validateClientData(clientData) {
    const required = ['clientName', 'companyName', 'phone1', 'contactPerson', 'email', 'address'];
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

    return true;
  }

  // Add new client
  async addClient(clientData, salespersonName) {
    try {
      await this.ensureInitialized();
      this.validateClientData(clientData);
      
      const client = {
        id: this.generateClientId(salespersonName),
        ...clientData,
        salesperson: salespersonName,
        createdAt: new Date().toISOString(),
        deviceId: this.deviceId
      };

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

      this.clients[index] = {
        ...this.clients[index],
        ...clientData,
        updatedAt: new Date().toISOString()
      };
      
      await this.saveClients();
      return this.clients[index];
    } catch (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }
  }

  // Delete client
  async deleteClient(clientId) {
    await this.ensureInitialized();
    const index = this.clients.findIndex(c => c.id === clientId);
    if (index === -1) {
      throw new Error('Client not found');
    }

    const deletedClient = this.clients.splice(index, 1)[0];
    await this.saveClients();
    return deletedClient;
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
      // Try to load from Firebase first
      if (window.firebaseStorage) {
        const firebaseClients = await window.firebaseStorage.getItem('clientData');
        if (firebaseClients && Array.isArray(firebaseClients)) {
          console.log('Loaded clients from Firebase:', firebaseClients.length);
          return firebaseClients;
        }
      }
      
      // Fallback to localStorage for migration
      const stored = localStorage.getItem('clientData');
      const localClients = stored ? JSON.parse(stored) : [];
      
      // Migrate to Firebase if we have local data
      if (localClients.length > 0 && window.firebaseStorage) {
        await window.firebaseStorage.setItem('clientData', localClients);
        console.log('Migrated clients to Firebase:', localClients.length);
      }
      
      return localClients;
    } catch (error) {
      console.error('Error loading clients:', error);
      // Final fallback to localStorage
      try {
        const stored = localStorage.getItem('clientData');
        return stored ? JSON.parse(stored) : [];
      } catch (fallbackError) {
        console.error('Fallback loading failed:', fallbackError);
        return [];
      }
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