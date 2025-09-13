// Google Sheets API Configuration
// Handles integration with Google Sheets for order management

class GoogleSheetsIntegration {
  constructor() {
    this.SHEET_ID = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    this.API_KEY = this.getApiKey();
    this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    this.initialized = false;
  }

  // Get API key from environment or configuration
  getApiKey() {
    // In production, this should be loaded from a secure configuration
    // For now, we'll use a placeholder that needs to be configured
    return process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
  }

  // Initialize Google Sheets API
  async initialize() {
    try {
      if (typeof gapi === 'undefined') {
        console.warn('Google API library not loaded');
        return false;
      }

      await gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: this.API_KEY,
          discoveryDocs: [this.DISCOVERY_DOC]
        });
        
        this.initialized = true;
        console.log('Google Sheets API initialized successfully');
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
      return false;
    }
  }

  // Check if API is available and initialized
  isAvailable() {
    return this.initialized && typeof gapi !== 'undefined' && gapi.client;
  }

  // Append order data to Google Sheets
  async appendOrderData(orderData) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available');
    }

    try {
      const values = this.formatOrderForSheet(orderData);
      
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A:N', // Adjust range based on your sheet structure
        valueInputOption: 'RAW',
        resource: {
          values: [values]
        }
      });

      console.log('Order data appended to Google Sheets:', response);
      return response;
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw error;
    }
  }

  // Format order data for Google Sheets
  formatOrderForSheet(orderData) {
    const now = new Date();
    return [
      orderData.orderNumber || orderData.id,
      now.toISOString().split('T')[0], // Date
      now.toTimeString().split(' ')[0], // Time
      orderData.clientName || '',
      orderData.clientContact || '',
      orderData.salesman || '',
      orderData.items ? orderData.items.length : 0,
      orderData.items ? this.formatItemsForSheet(orderData.items) : '',
      orderData.subtotal || 0,
      orderData.discount ? orderData.discount.value || 0 : 0,
      orderData.tax ? orderData.tax.rate || 0 : 0,
      orderData.shipping ? orderData.shipping.cost || 0 : 0,
      orderData.total || 0,
      orderData.currency || 'INR',
      orderData.status || 'pending',
      orderData.notes || '',
      orderData.originalQuoteId || '',
      orderData.deviceId || ''
    ];
  }

  // Format items for sheet display
  formatItemsForSheet(items) {
    return items.map(item => {
      const product = item.product || item.name || 'Unknown';
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      return `${product} (Qty: ${quantity}, Price: ${price})`;
    }).join('; ');
  }

  // Create sheet headers if needed
  async createHeaders() {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available');
    }

    try {
      const headers = [
        'Order Number',
        'Date',
        'Time',
        'Client Name',
        'Client Contact',
        'Salesman',
        'Item Count',
        'Items',
        'Subtotal',
        'Discount',
        'Tax Rate',
        'Shipping',
        'Total',
        'Currency',
        'Status',
        'Notes',
        'Original Quote ID',
        'Device ID'
      ];

      const response = await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A1:R1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      console.log('Headers created in Google Sheets:', response);
      return response;
    } catch (error) {
      console.error('Error creating headers:', error);
      throw error;
    }
  }

  // Validate sheet access
  async validateSheetAccess() {
    if (!this.isAvailable()) {
      return { valid: false, error: 'API not available' };
    }

    try {
      const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: this.SHEET_ID
      });

      return {
        valid: true,
        sheetTitle: response.result.properties.title,
        sheets: response.result.sheets.map(sheet => sheet.properties.title)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Batch update multiple orders
  async batchUpdateOrders(orders) {
    if (!this.isAvailable()) {
      throw new Error('Google Sheets API not available');
    }

    try {
      const values = orders.map(order => this.formatOrderForSheet(order));
      
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.SHEET_ID,
        range: 'Orders!A:R',
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      console.log(`Batch updated ${orders.length} orders to Google Sheets`);
      return response;
    } catch (error) {
      console.error('Error batch updating orders:', error);
      throw error;
    }
  }

  // Sync pending orders from Firebase to Google Sheets
  async syncPendingOrders() {
    try {
      if (!window.firebaseDB || !window.firebaseDB.isAvailable()) {
        throw new Error('Firebase not available');
      }

      // Get orders that haven't been synced to Google Sheets
      const pendingOrders = await window.firebaseDB.getAllData('orders', {
        googleSheetSynced: false
      });

      if (pendingOrders.length === 0) {
        console.log('No pending orders to sync');
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;

      for (const order of pendingOrders) {
        try {
          await this.appendOrderData(order);
          
          // Mark as synced in Firebase
          await window.firebaseDB.updateAllData('orders', order.id, {
            googleSheetSynced: true,
            googleSheetSyncedAt: new Date().toISOString()
          });
          
          synced++;
        } catch (error) {
          console.error('Failed to sync order:', order.id, error);
          failed++;
        }
      }

      console.log(`Sync completed: ${synced} synced, ${failed} failed`);
      return { synced, failed };
    } catch (error) {
      console.error('Error syncing pending orders:', error);
      throw error;
    }
  }
}

// Alternative implementation using fetch API (for when gapi is not available)
class GoogleSheetsFetchAPI {
  constructor() {
    this.SHEET_ID = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    this.API_KEY = this.getApiKey();
  }

  getApiKey() {
    return process.env.GOOGLE_SHEETS_API_KEY || 'YOUR_GOOGLE_SHEETS_API_KEY';
  }

  async appendOrderData(orderData) {
    try {
      const values = this.formatOrderForSheet(orderData);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Orders:append?valueInputOption=RAW&key=${this.API_KEY}`,
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
      console.log('Order appended via fetch API:', result);
      return result;
    } catch (error) {
      console.error('Error appending via fetch API:', error);
      throw error;
    }
  }

  formatOrderForSheet(orderData) {
    // Same formatting as the main class
    const now = new Date();
    return [
      orderData.orderNumber || orderData.id,
      now.toISOString().split('T')[0],
      now.toTimeString().split(' ')[0],
      orderData.clientName || '',
      orderData.clientContact || '',
      orderData.salesman || '',
      orderData.items ? orderData.items.length : 0,
      orderData.items ? orderData.items.map(item => `${item.product} (${item.quantity})`).join('; ') : '',
      orderData.subtotal || 0,
      orderData.discount ? orderData.discount.value || 0 : 0,
      orderData.tax ? orderData.tax.rate || 0 : 0,
      orderData.shipping ? orderData.shipping.cost || 0 : 0,
      orderData.total || 0,
      orderData.currency || 'INR',
      orderData.status || 'pending',
      orderData.notes || ''
    ];
  }
}

// Initialize Google Sheets integration
window.googleSheets = new GoogleSheetsIntegration();
window.googleSheetsFetch = new GoogleSheetsFetchAPI();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.googleSheets.initialize();
    console.log('Google Sheets integration ready');
  } catch (error) {
    console.warn('Google Sheets integration failed to initialize:', error);
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GoogleSheetsIntegration, GoogleSheetsFetchAPI };
}