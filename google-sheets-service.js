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

  /**
   * Initialize Google Sheets API with service account authentication
   */
  async initialize() {
    try {
      // Check if service account key file exists
      const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('Service account key file not found. Please add service-account-key.json to the project root. See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.');
      }

      // Validate service account key content
      const credentialValidation = this.validateServiceAccountKey(serviceAccountPath);
      if (!credentialValidation.valid) {
        throw new Error(credentialValidation.error);
      }

      // Create JWT auth client
      this.auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      // Test authentication by getting auth client
      const authClient = await this.auth.getClient();
      if (!authClient) {
        throw new Error('Failed to authenticate with Google Sheets API. Please check your service account credentials.');
      }

      // Initialize Sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      
      console.log('Google Sheets API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Validate service account key file content
   * @param {string} keyFilePath - Path to the service account key file
   * @returns {Object} Validation result with valid flag and error message
   */
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

      // Check for required fields
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields in service-account-key.json: ${missingFields.join(', ')}. Please download a new key from Google Cloud Console.`
        };
      }

      // Check for placeholder values
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

      // Validate private key format
      if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') || 
          !serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
        return {
          valid: false,
          error: 'Invalid private key format in service-account-key.json. The private_key field must contain a valid PEM formatted private key.'
        };
      }

      // Validate service account type
      if (serviceAccount.type !== 'service_account') {
        return {
          valid: false,
          error: 'Invalid credential type. Expected "service_account" but got "' + serviceAccount.type + '". Please download a service account key, not a user account key.'
        };
      }

      // Validate email format
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

  /**
   * Fetch product data from Google Sheets
   * @param {string} spreadsheetId - The Google Sheets ID
   * @param {string} range - The range to fetch (e.g., 'Sheet1!A1:Z1000')
   * @returns {Promise<Array>} Array of product data
   */
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
        console.log('No data found in the spreadsheet.');
        return [];
      }

      // Assume first row contains headers
      const headers = rows[0];
      const products = [];

      // Convert rows to objects using headers
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const product = {};
        
        headers.forEach((header, index) => {
          product[header] = row[index] || '';
        });
        
        // Only add products with required fields
        if (product.name || product.Name || product.product_name || product.Product) {
          products.push(product);
        }
      }

      console.log(`Fetched ${products.length} products from Google Sheets`);
      return products;
    } catch (error) {
      console.error('Error fetching product data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch salesman data from Google Sheets
   * @param {string} spreadsheetId - The Google Sheets ID
   * @param {string} range - The range to fetch
   * @returns {Promise<Array>} Array of salesman data
   */
  async fetchSalesmanData(spreadsheetId, range = 'salesman!A1:Z1000') {
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
        console.log('No salesman data found in the spreadsheet.');
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
        
        // Only add salesmen with required fields
        if (salesman.name || salesman.Name || salesman.salesman_name) {
          salesmen.push(salesman);
        }
      }

      console.log(`Fetched ${salesmen.length} salesmen from Google Sheets`);
      return salesmen;
    } catch (error) {
      console.error('Error fetching salesman data:', error.message);
      throw error;
    }
  }

  /**
   * Validate data integrity
   * @param {Array} data - Data to validate
   * @returns {boolean} True if data is valid
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      return false;
    }

    // Check if data has required structure
    return data.every(item => 
      typeof item === 'object' && 
      item !== null &&
      Object.keys(item).length > 0
    );
  }
}

module.exports = GoogleSheetsService;