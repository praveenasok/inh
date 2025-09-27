// Client Management System
// Handles client data storage, retrieval, and unique ID generation

class ClientManager {
  constructor() {
    this.clients = [];
    this.deviceId = this.getOrCreateDeviceId();
    this.initialized = false;
    this.initializeAsync();
  }

  async initializeAsync() {
    try {
      this.clients = await this.loadClients();
      this.initialized = true;
    } catch (error) {
      this.clients = [];
      this.initialized = true;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeAsync();
    }
  }

  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  async generateClientId() {
    try {
      const companyCode = await this.getCompanyCode();
      
      const autoNumber = await this.getNextClientAutoNumber();
      
      return `${companyCode}${autoNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      const fallbackId = 'CLI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      return fallbackId;
    }
  }

  async getCompanyCode() {
    try {
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        const companies = await window.firebaseDB.getAllData('companies');
        if (companies && companies.length > 0) {
          const company = companies[0];
          if (company.code && company.code.length >= 4) {
            return company.code.substring(0, 4).toUpperCase();
          }
        }
      }
      
      return 'INHC';
    } catch (error) {
      return 'INHC';
    }
  }

  async getNextClientAutoNumber() {
    try {
      await this.ensureInitialized();
      
      if (this.clients.length === 0) {
        return 1;
      }
      
      const maxNumber = Math.max(...this.clients.map(client => {
        if (client.clientId && typeof client.clientId === 'string') {
          const match = client.clientId.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        }
        return 0;
      }));
      
      return maxNumber + 1;
    } catch (error) {
      return 1;
    }
  }

  validateClientData(clientData) {
    const errors = [];
    
    if (!clientData.clientName || clientData.clientName.trim() === '') {
      errors.push('Client name is required');
    }
    
    if (!clientData.phone || clientData.phone.trim() === '') {
      errors.push('Phone number is required');
    }
    
    if (clientData.email && clientData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientData.email)) {
        errors.push('Invalid email format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Add new client
  async addClient(clientData, salespersonName) {
    await this.ensureInitialized();
    
    const validation = this.validateClientData(clientData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    const clientId = await this.generateClientId();
    
    const newClient = {
      clientId: clientId,
      ...clientData,
      salesperson: salespersonName || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deviceId: this.deviceId
    };

    try {
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        const savedClient = await window.firebaseDB.saveClient(newClient);
        this.clients.push(savedClient);
        await this.saveClientsToLocalStorage();
        return savedClient;
      }
    } catch (firebaseError) {
      this.clients.push(newClient);
      await this.saveClientsToLocalStorage();
      return newClient;
    }
  }

  async updateClient(clientId, clientData) {
    await this.ensureInitialized();
    
    const validation = this.validateClientData(clientData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    const clientIndex = this.clients.findIndex(client => client.clientId === clientId);
    if (clientIndex === -1) {
      throw new Error('Client not found');
    }

    const updatedClient = {
      ...this.clients[clientIndex],
      ...clientData,
      updatedAt: new Date().toISOString()
    };

    try {
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        const savedClient = await window.firebaseDB.updateClient(clientId, updatedClient);
        this.clients[clientIndex] = savedClient;
        await this.saveClientsToLocalStorage();
        return savedClient;
      }
    } catch (firebaseError) {
      this.clients[clientIndex] = updatedClient;
      await this.saveClientsToLocalStorage();
      return updatedClient;
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
          
          // Remove from local array
          this.clients.splice(index, 1);
          
          // Also save to localStorage as backup
          await this.saveClientsToLocalStorage();
          
          return deletedClient;
        } catch (firebaseError) {
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

  // Load clients using fallback-first strategy
  async loadClients() {
    try {
      console.log('🔄 Loading clients with fallback-first strategy...');
      
      // Primary: Try unified data access (fallback-first)
      if (window.unifiedDataAccess) {
        try {
          const clients = await window.unifiedDataAccess.getClients();
          console.log(`👥 Loaded ${clients.length} clients from unified data access`);
          return clients;
        } catch (unifiedError) {
          console.warn('⚠️ Unified data access failed, trying local fallback:', unifiedError);
        }
      }
      
      // Secondary: Try local fallback manager
      if (window.localFallbackManager) {
        try {
          const clients = await window.localFallbackManager.getData('clients');
          console.log(`👥 Loaded ${clients.length} clients from local fallback manager`);
          return clients || [];
        } catch (fallbackError) {
          console.warn('⚠️ Local fallback failed, trying Firebase:', fallbackError);
        }
      }
      
      // Tertiary: Try Firebase database (last resort)
      if (window.firebaseDB && window.firebaseDB.isAvailable()) {
        try {
          const firebaseClients = await window.firebaseDB.getClients();
          if (firebaseClients && Array.isArray(firebaseClients)) {
            console.log(`👥 Loaded ${firebaseClients.length} clients from Firebase (fallback)`);
            return firebaseClients;
          }
        } catch (firebaseError) {
          console.warn('⚠️ Firebase data access failed:', firebaseError);
        }
      }
      
      // If all methods fail, return empty array
      console.warn('⚠️ No client data available from any source, using empty array');
      return [];
      
    } catch (error) {
      console.error('❌ Error loading clients:', error);
      throw new Error(`Failed to load clients: ${error.message}`);
    }
  }

  // Helper function to save clients to localStorage only
  async saveClientsToLocalStorage(clientsArray = null) {
    try {
      const clientsToSave = clientsArray || this.clients;
      const timestamp = Date.now().toString();
      
      localStorage.setItem('clientData', JSON.stringify(clientsToSave));
      localStorage.setItem('clientDataTimestamp', timestamp);
      
    } catch (error) {
    }
  }

  // Save clients to Firebase only
  async saveClients() {
    try {
      const timestamp = Date.now().toString();
      
      // Save to Firebase only
      if (window.firebaseStorage) {
        await window.firebaseStorage.setItem('clientData', this.clients);
        await window.firebaseStorage.setItem('clientDataTimestamp', timestamp);
      } else {
        throw new Error('Firebase storage not available');
      }
      
    } catch (error) {
      throw new Error(`Failed to save clients to Firebase: ${error.message}`);
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