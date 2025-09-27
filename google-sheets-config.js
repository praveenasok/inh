class GoogleSheetsIntegration {
  constructor() {
    this.SHEET_ID = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    this.API_KEY = this.getApiKey();
    this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    this.initialized = false;
  }

  getApiKey() {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
    }
    return window.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
  }

  async initialize() {
    try {
      if (typeof gapi === 'undefined') {
        return false;
      }

      await gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: this.API_KEY,
          discoveryDocs: [this.DISCOVERY_DOC]
        });
        
        this.initialized = true;
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  isAvailable() {
    return this.initialized && typeof gapi !== 'undefined' && gapi.client;
  }

  async appendOrderData(orderData) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available. Please check your API configuration.');
    }

    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured. Please set GOOGLE_SHEETS_API_KEY environment variable or window.GOOGLE_SHEETS_API_KEY.');
    }

    try {
      const values = this.formatOrderForSheet(orderData);
      
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A:N',
        valueInputOption: 'RAW',
        resource: {
          values: [values]
        }
      });

      return response;
    } catch (error) {
      if (error.status === 403) {
        throw new Error('Google Sheets API access denied. Please check your API key and permissions.');
      } else if (error.status === 404) {
        throw new Error('Google Sheets spreadsheet not found. Please check your SHEET_ID.');
      } else if (error.status === 400) {
        throw new Error('Invalid request to Google Sheets API. Please check your data format.');
      }
      
      throw new Error(`Failed to sync products: ${error.message || error}`);
    }
  }

  formatOrderForSheet(orderData) {
    const now = new Date();
    return [
      orderData.orderNumber || orderData.id,
      now.toISOString().split('T')[0],
      now.toTimeString().split(' ')[0],
      orderData.clientName || '',
      orderData.clientCode || '',
      orderData.salesmanName || '',
      orderData.totalAmount || 0,
      orderData.status || 'Pending',
      this.formatItemsForSheet(orderData.items || []),
      orderData.notes || '',
      orderData.deliveryDate || '',
      orderData.paymentTerms || '',
      orderData.discount || 0,
      orderData.tax || 0
    ];
  }

  formatItemsForSheet(items) {
    return items.map(item => 
      `${item.productCode || ''} - ${item.description || ''} (Qty: ${item.quantity || 0})`
    ).join('; ');
  }

  async createHeaders() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const headers = [
        'Order Number',
        'Date',
        'Time',
        'Client Name',
        'Client Code',
        'Salesman',
        'Total Amount',
        'Status',
        'Items',
        'Notes',
        'Delivery Date',
        'Payment Terms',
        'Discount',
        'Tax'
      ];

      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A1:N1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async validateSheetAccess() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: this.SHEET_ID
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async batchUpdateOrders(orders) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available');
    }

    try {
      const values = orders.map(order => this.formatOrderForSheet(order));
      
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A:N',
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async syncPendingOrders() {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Google Sheets API not available' };
      }

      const pendingOrders = JSON.parse(localStorage.getItem('pendingGoogleSheetsOrders') || '[]');
      
      if (pendingOrders.length === 0) {
        return { success: true, synced: 0 };
      }

      await this.batchUpdateOrders(pendingOrders);
      
      localStorage.removeItem('pendingGoogleSheetsOrders');
      
      return { success: true, synced: pendingOrders.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async appendClientData(clientData) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available. Please check your API configuration.');
    }

    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured.');
    }

    try {
      const values = this.formatClientForSheet(clientData);
      
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Clients!A:M',
        valueInputOption: 'RAW',
        resource: {
          values: [values]
        }
      });

      return response;
    } catch (error) {
      if (error.status === 403) {
        throw new Error('Google Sheets API access denied. Please check your API key and permissions.');
      } else if (error.status === 404) {
        throw new Error('Google Sheets spreadsheet not found. Please check your SHEET_ID.');
      }
      
      throw new Error(`Failed to sync client: ${error.message || error}`);
    }
  }

  formatClientForSheet(clientData) {
    const now = new Date();
    return [
      clientData.clientCode || '',
      clientData.companyName || '',
      clientData.contactPerson || '',
      clientData.phone || '',
      clientData.email || '',
      this.formatAddressForSheet(clientData.address || {}),
      clientData.gstNumber || '',
      clientData.panNumber || '',
      clientData.creditLimit || 0,
      clientData.paymentTerms || '',
      clientData.salesmanCode || '',
      now.toISOString().split('T')[0],
      clientData.status || 'Active'
    ];
  }

  formatAddressForSheet(address) {
    const parts = [
      address.street || '',
      address.city || '',
      address.state || '',
      address.pincode || '',
      address.country || ''
    ].filter(part => part.trim() !== '');
    
    return parts.join(', ');
  }

  async batchUpdateClients(clients) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available');
    }

    try {
      const values = clients.map(client => this.formatClientForSheet(client));
      
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Clients!A:M',
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async createClientHeaders() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const headers = [
        'Client Code',
        'Company Name',
        'Contact Person',
        'Phone',
        'Email',
        'Address',
        'GST Number',
        'PAN Number',
        'Credit Limit',
        'Payment Terms',
        'Salesman Code',
        'Created Date',
        'Status'
      ];

      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.SHEET_ID,
        range: 'Clients!A1:M1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async syncClientsToGoogleSheets(clients) {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Google Sheets API not available' };
      }

      if (!Array.isArray(clients) || clients.length === 0) {
        return { success: true, synced: 0 };
      }

      await this.batchUpdateClients(clients);
      
      return { success: true, synced: clients.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncSingleClientToGoogleSheets(clientData) {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Google Sheets API not available' };
      }

      await this.appendClientData(clientData);
      
      return { success: true, synced: 1 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

class GoogleSheetsFetchAPI {
  constructor() {
    this.SHEET_ID = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    this.API_KEY = this.getApiKey();
  }

  getApiKey() {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
    }
    return window.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
  }

  async appendOrderData(orderData) {
    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured.');
    }

    try {
      const values = this.formatOrderForSheet(orderData);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Orders!A:N:append?valueInputOption=RAW&key=${this.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [values]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to append order data: ${error.message}`);
    }
  }

  formatOrderForSheet(orderData) {
    const now = new Date();
    return [
      orderData.orderNumber || orderData.id,
      now.toISOString().split('T')[0],
      now.toTimeString().split(' ')[0],
      orderData.clientName || '',
      orderData.clientCode || '',
      orderData.salesmanName || '',
      orderData.totalAmount || 0,
      orderData.status || 'Pending',
      this.formatItemsForSheet(orderData.items || []),
      orderData.notes || '',
      orderData.deliveryDate || '',
      orderData.paymentTerms || '',
      orderData.discount || 0,
      orderData.tax || 0
    ];
  }

  async appendClientData(clientData) {
    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured.');
    }

    try {
      const values = this.formatClientForSheet(clientData);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Clients!A:M:append?valueInputOption=RAW&key=${this.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [values]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to append client data: ${error.message}`);
    }
  }

  formatClientForSheet(clientData) {
    const now = new Date();
    return [
      clientData.clientCode || '',
      clientData.companyName || '',
      clientData.contactPerson || '',
      clientData.phone || '',
      clientData.email || '',
      this.formatAddressForSheet(clientData.address || {}),
      clientData.gstNumber || '',
      clientData.panNumber || '',
      clientData.creditLimit || 0,
      clientData.paymentTerms || '',
      clientData.salesmanCode || '',
      now.toISOString().split('T')[0],
      clientData.status || 'Active'
    ];
  }

  formatAddressForSheet(address) {
    const parts = [
      address.street || '',
      address.city || '',
      address.state || '',
      address.pincode || '',
      address.country || ''
    ].filter(part => part.trim() !== '');
    
    return parts.join(', ');
  }

  async batchUpdateClients(clients) {
    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      throw new Error('Google Sheets API key not configured.');
    }

    try {
      const values = clients.map(client => this.formatClientForSheet(client));
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Clients!A:M:append?valueInputOption=RAW&key=${this.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to batch update clients: ${error.message}`);
    }
  }

  async createClientHeaders() {
    if (this.getApiKey() === 'YOUR_GOOGLE_SHEETS_API_KEY') {
      return false;
    }

    try {
      const headers = [
        'Client Code',
        'Company Name',
        'Contact Person',
        'Phone',
        'Email',
        'Address',
        'GST Number',
        'PAN Number',
        'Credit Limit',
        'Payment Terms',
        'Salesman Code',
        'Created Date',
        'Status'
      ];

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Clients!A1:M1?valueInputOption=RAW&key=${this.API_KEY}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [headers]
          })
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async syncClientsToGoogleSheets(clients) {
    try {
      if (!Array.isArray(clients) || clients.length === 0) {
        return { success: true, synced: 0 };
      }

      await this.batchUpdateClients(clients);
      
      return { success: true, synced: clients.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncSingleClientToGoogleSheets(clientData) {
    try {
      await this.appendClientData(clientData);
      
      return { success: true, synced: 1 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

window.googleSheets = new GoogleSheetsIntegration();
window.googleSheetsFetch = new GoogleSheetsFetchAPI();

document.addEventListener('DOMContentLoaded', async () => {
  if (window.googleSheets) {
    await window.googleSheets.initialize();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GoogleSheetsIntegration, GoogleSheetsFetchAPI };
}