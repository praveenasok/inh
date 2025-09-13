// Client Management System
// Handles client data storage, retrieval, and unique ID generation

class ClientManager {
  constructor() {
    this.clients = this.loadClients();
    this.deviceId = this.getOrCreateDeviceId();
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
  addClient(clientData, salespersonName) {
    try {
      this.validateClientData(clientData);
      
      const client = {
        id: this.generateClientId(salespersonName),
        ...clientData,
        salesperson: salespersonName,
        createdAt: new Date().toISOString(),
        deviceId: this.deviceId
      };

      this.clients.push(client);
      this.saveClients();
      
      return client;
    } catch (error) {
      throw new Error(`Failed to add client: ${error.message}`);
    }
  }

  // Update existing client
  updateClient(clientId, clientData) {
    try {
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
      
      this.saveClients();
      return this.clients[index];
    } catch (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }
  }

  // Delete client
  deleteClient(clientId) {
    const index = this.clients.findIndex(c => c.id === clientId);
    if (index === -1) {
      throw new Error('Client not found');
    }

    const deletedClient = this.clients.splice(index, 1)[0];
    this.saveClients();
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

  // Load clients from localStorage
  loadClients() {
    try {
      const stored = localStorage.getItem('clientData');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  }

  // Save clients to localStorage
  saveClients() {
    try {
      localStorage.setItem('clientData', JSON.stringify(this.clients));
      localStorage.setItem('clientDataTimestamp', Date.now().toString());
    } catch (error) {
      console.error('Error saving clients:', error);
      throw new Error('Failed to save client data');
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