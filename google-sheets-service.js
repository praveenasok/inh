// Google Sheets API Service
// Handles secure authentication and data fetching from Google Sheets

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('Service account key file not found. Please add service-account-key.json to the project root. See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.');
      }

      const credentialValidation = this.validateServiceAccountKey(serviceAccountPath);
      if (!credentialValidation.valid) {
        throw new Error(credentialValidation.error);
      }

      this.auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      const authClient = await this.auth.getClient();
      if (!authClient) {
        throw new Error('Failed to authenticate with Google Sheets API. Please check your service account credentials.');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  validateServiceAccountKey(keyFilePath) {
    try {
      const keyContent = fs.readFileSync(keyFilePath, 'utf8');
      let serviceAccount;
      
      try {
        serviceAccount = JSON.parse(keyContent);
      } catch (parseError) {
        return {
          valid: false,
          error: 'Invalid JSON format in service-account-key.json. Please download a new key from Google Cloud Console.'
        };
      }

      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields in service-account-key.json: ${missingFields.join(', ')}. Please download a new key from Google Cloud Console.`
        };
      }

      const placeholderPatterns = [
        'your-project-id',
        'your-private-key-id', 
        'your-private-key',
        'your-service-account@',
        'your-client-id'
      ];
      
      for (const pattern of placeholderPatterns) {
        if (keyContent.includes(pattern)) {
          return {
            valid: false,
            error: `service-account-key.json contains placeholder values (${pattern}). Please replace with actual credentials from Google Cloud Console. See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for setup instructions.`
          };
        }
      }

      if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') || 
          !serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
        return {
          valid: false,
          error: 'Invalid private key format in service-account-key.json. The private_key field must contain a valid PEM formatted private key.'
        };
      }

      if (serviceAccount.type !== 'service_account') {
        return {
          valid: false,
          error: 'Invalid credential type. Expected "service_account" but got "' + serviceAccount.type + '". Please download a service account key, not a user account key.'
        };
      }

      if (!serviceAccount.client_email.includes('@') || !serviceAccount.client_email.includes('.iam.gserviceaccount.com')) {
        return {
          valid: false,
          error: 'Invalid service account email format. Expected format: service-name@project-id.iam.gserviceaccount.com'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to read service-account-key.json: ${error.message}`
      };
    }
  }

  async fetchProductData(spreadsheetId, range = 'pricelists!A1:Z1000') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const products = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const product = {};
        
        headers.forEach((header, index) => {
          product[header] = row[index] || '';
        });
        
        if (product.name || product.Name || product.product_name || product.Product) {
          products.push(product);
        }
      }

      return products;
    } catch (error) {
      throw error;
    }
  }

  async fetchSalesmanData(spreadsheetId, range = 'salesmen!A1:Z1000') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const salesmen = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const salesman = {};
        
        headers.forEach((header, index) => {
          salesman[header] = row[index] || '';
        });
        
        if (salesman.name || salesman.Name || salesman.salesman_name) {
          salesmen.push(salesman);
        }
      }

      return salesmen;
    } catch (error) {
      throw error;
    }
  }

  async fetchCompaniesData(spreadsheetId, range = 'clients!A1:Z1000') {
    try {
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const companies = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0) continue;

        const company = {};
        headers.forEach((header, index) => {
          company[header] = row[index] || '';
        });

        if (company.name || company.Name || company.company_name) {
          companies.push(company);
        }
      }

      return companies;

    } catch (error) {
      throw error;
    }
  }

  async fetchClientData(spreadsheetId, range = 'clients!A1:Z1000') {
    try {
      if (!this.isInitialized) {
        throw new Error('Google Sheets service not initialized');
      }
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const clients = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0) continue;

        const client = {};
        headers.forEach((header, index) => {
          client[header] = row[index] || '';
        });

        if (client.clientName || client.client_name || client.companyName || client.company_name) {
          clients.push(client);
        }
      }

      return clients;

    } catch (error) {
      throw error;
    }
  }

  async fetchColorsData(spreadsheetId, range = 'colors!A1:Z1000') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const colors = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const color = {};
        
        headers.forEach((header, index) => {
          color[header] = row[index] || '';
        });
        
        if (color.colorname && color.colorname.trim() !== '') {
          colors.push(color);
        }
      }

      return colors;
    } catch (error) {
      throw error;
    }
  }

  async fetchStylesData(spreadsheetId, range = 'styles!A1:Z1000') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const styles = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const style = {};
        
        headers.forEach((header, index) => {
          style[header] = row[index] || '';
        });
        
        if (style.stylename && style.stylename.trim() !== '') {
          styles.push(style);
        }
      }

      return styles;
    } catch (error) {
      throw error;
    }
  }

  async fetchPriceListsData(spreadsheetId, range = 'pricelists!A1:Z1000') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const priceListIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('pricelist') || h.toLowerCase().includes('price list'))
      );

      if (priceListIndex === -1) {
        return [];
      }

      const priceLists = new Set();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row[priceListIndex] && row[priceListIndex].trim()) {
          priceLists.add(row[priceListIndex].trim());
        }
      }

      return Array.from(priceLists);
    } catch (error) {
      throw error;
    }
  }

  validateData(data) {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(item => 
      typeof item === 'object' && 
      item !== null &&
      Object.keys(item).length > 0
    );
  }
}

module.exports = GoogleSheetsService;