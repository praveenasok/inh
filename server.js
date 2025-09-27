const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const SyncScheduler = require('./sync-scheduler');
const FirebaseSyncService = require('./firebase-sync-service');
const GoogleSheetsService = require('./google-sheets-service');

const PORT = 3000;
const HTML_FILE_PATH = path.join(__dirname, 'index.html');
const DATA_FILE_PATH = path.join(__dirname, 'data.json');
const PRICE_LIST_FILE_PATH = path.join(__dirname, 'oldfiles', 'Price List Generator — Indian Natural Hair.html');
const QUOTE_MAKER_FILE_PATH = path.join(__dirname, 'quotemaker', 'index.html');

// In-memory data storage
let currentProductData = null;

// Initialize sync services
let syncScheduler = null;
let syncService = null;
let googleSheetsService = null;

// Initialize sync services
async function initializeSyncServices() {
  try {
    syncScheduler = new SyncScheduler();
    syncService = new FirebaseSyncService();
    googleSheetsService = new GoogleSheetsService();
    
    await syncScheduler.initialize();
    await syncService.initialize();
    await googleSheetsService.initialize();
    
    // Start the scheduler automatically
    syncScheduler.startScheduler();
    
    // Perform initial sync for colors and styles on startup
    try {
      // Performing initial sync for colors and styles
      const productSheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
      
      // Sync colors
      const colorsResult = await syncService.syncColorsData(productSheetId);
      // Initial colors sync completed
      
      // Sync styles
      const stylesResult = await syncService.syncStylesData(productSheetId);
      // Initial styles sync completed
      
    } catch (error) {
      // Initial colors/styles sync failed, will be synced during next scheduled sync
    }
    
    // Sync services initialized successfully
    
    // Make scheduler globally available for graceful shutdown
    global.syncScheduler = syncScheduler;
  } catch (error) {
    // Failed to initialize sync services - sync services will be disabled
  }
}

// Function to get salesmen data from Firebase or embedded data
function getSalesmenFromData() {
  // Try to get from current product data first
  if (currentProductData && currentProductData.salesmen) {
    return currentProductData.salesmen;
  }
  
  // Return default salesmen if no data available
  return [
    "Praveen", "Rupa", "INH", "HW", "Vijay", "Pankaj", "Sunil"
  ];
}

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API endpoints
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running', 
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (pathname === '/api/save-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        currentProductData = data;
        
        // Save to file for persistence
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Data saved successfully' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save data: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/get-data' && req.method === 'GET') {
    try {
      const collection = parsedUrl.searchParams.get('collection');
      const docId = parsedUrl.searchParams.get('id');

      // If collection is specified, get data from Firebase
      if (collection) {
        if (!syncService || !syncService.db) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Firebase service not available' }));
          return;
        }

        if (docId) {
          // Get specific document
          const docRef = syncService.db.collection(collection).doc(docId);
          const doc = await docRef.get();
          
          if (doc.exists) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: doc.id, ...doc.data() }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Document not found' }));
          }
        } else {
          // Handle special collections that are stored in config documents
          if (collection === 'salespeople') {
            try {
              const configDoc = await syncService.db.collection('config').doc('salesmen').get();
              if (configDoc.exists) {
                const configData = configDoc.data();
                const salespeople = configData.salesmen || configData.list || [];
                // Add IDs to salespeople data for consistency
                const salesmenWithIds = salespeople.map((salesman, index) => ({
                  id: `salesman_${index}`,
                  ...salesman
                }));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(salesmenWithIds));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
              }
            } catch (error) {
              console.error('Error fetching salespeople:', error);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify([]));
            }
            return;
          }
          
          // Get entire collection (default behavior)
          const snapshot = await syncService.db.collection(collection).get();
          const data = [];
          
          snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        }
        return;
      }

      // Default behavior for backward compatibility (no collection specified)
      if (currentProductData) {
        // Add salesmen data from data source
        const dataWithSalesmen = {
          ...currentProductData,
          salesmen: getSalesmenFromData()
        };
        const response = {
          success: true,
          data: Array.isArray(currentProductData) ? currentProductData : currentProductData.products || [],
          salesmen: dataWithSalesmen.salesmen
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } else {
        // No fallback - Firebase data is required
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase data not available - service unavailable' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Failed to get data: ' + error.message }));
    }
    return;
  }

  // Get styles data from Firebase
  if (pathname === '/api/get-styles' && req.method === 'GET') {
    try {
      if (syncService && syncService.db) {
        // Fetching styles from Firebase
        const stylesSnapshot = await syncService.db.collection('styles').get();
        const styles = [];
        
        stylesSnapshot.forEach(doc => {
          styles.push({ id: doc.id, ...doc.data() });
        });
        
        // Found styles in Firebase
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          data: styles,
          count: styles.length 
        }));
      } else {
        // Firebase not available
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Firebase service not available' 
        }));
      }
    } catch (error) {
      // Error getting styles
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Failed to get styles: ' + error.message 
      }));
    }
    return;
  }

  if (pathname === '/api/embed-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { target, data } = JSON.parse(body);
        
        if (target === 'priceList') {
          embedDataIntoFile(PRICE_LIST_FILE_PATH, data, 'price-list');
        } else if (target === 'quoteMaker') {
          embedDataIntoFile(QUOTE_MAKER_FILE_PATH, data, 'quote-maker');
        } else if (target === 'mainApp') {
          embedDataIntoFile(HTML_FILE_PATH, data, 'main-app');
        } else if (target === 'all') {
          embedDataIntoFile(PRICE_LIST_FILE_PATH, data, 'price-list');
          embedDataIntoFile(QUOTE_MAKER_FILE_PATH, data, 'quote-maker');
          embedDataIntoFile(HTML_FILE_PATH, data, 'main-app');
        } else {
          throw new Error('Invalid target specified. Use: priceList, quoteMaker, mainApp, or all');
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Data embedded into ${target}` }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to embed data: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/save-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { collection, id, data, merge } = JSON.parse(body);
        
        if (!collection || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Collection and data are required' }));
          return;
        }

        if (!syncService || !syncService.db) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Firebase service not available' }));
          return;
        }

        let result;
        if (id) {
          // Update or set specific document
          const docRef = syncService.db.collection(collection).doc(id);
          if (merge) {
            await docRef.update(data);
          } else {
            await docRef.set(data);
          }
          result = { id };
        } else {
          // Add new document
          const docRef = await syncService.db.collection(collection).add(data);
          result = { id: docRef.id };
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save data: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/delete-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { collection, id } = JSON.parse(body);
        
        if (!collection || !id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Collection and id are required' }));
          return;
        }

        if (!syncService || !syncService.db) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Firebase service not available' }));
          return;
        }

        await syncService.db.collection(collection).doc(id).delete();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Document deleted' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete data: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/clear-data' && req.method === 'POST') {
    try {
      currentProductData = null;
      
      if (fs.existsSync(DATA_FILE_PATH)) {
        fs.unlinkSync(DATA_FILE_PATH);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'All data cleared' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to clear data: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/sync-price-lists' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { priceLists, timestamp } = JSON.parse(body);
        
        const mainHtmlPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(mainHtmlPath)) {
          let htmlContent = fs.readFileSync(mainHtmlPath, 'utf8');
          
          const backupPath = mainHtmlPath.replace('.html', `_backup_${Date.now()}.html`);
          fs.writeFileSync(backupPath, htmlContent, 'utf8');
          
          const priceListsJson = JSON.stringify(priceLists);
          const priceListRegex = /availablePriceLists\s*=\s*new\s+Set\(\[.*?\]\);/s;
          
          if (priceListRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(
              priceListRegex,
              `availablePriceLists = new Set(${priceListsJson});`
            );
            
            fs.writeFileSync(mainHtmlPath, htmlContent, 'utf8');
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Price lists synchronized successfully',
          priceLists: priceLists
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to sync price lists: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/init-sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { priceLists, timestamp } = JSON.parse(body);
        
        const syncData = {
          priceLists: priceLists || [],
          lastSync: timestamp || Date.now(),
          syncEnabled: true,
          modules: {
            priceListGenerator: { status: 'synchronized', lastUpdate: timestamp },
            quoteMaker: { status: 'synchronized', lastUpdate: timestamp }
          }
        };
        
        const syncFilePath = path.join(__dirname, 'sync-metadata.json');
        fs.writeFileSync(syncFilePath, JSON.stringify(syncData, null, 2), 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Synchronization initialized successfully',
          syncData 
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to initialize sync: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/sync-price-lists' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { action, priceLists, sourceModule } = JSON.parse(body);
        
        let syncData = {};
        try {
          syncData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync-metadata.json'), 'utf8'));
        } catch (e) {
          syncData = { timestamp: Date.now(), priceLists: [], modules: {} };
        }
        
        syncData.timestamp = Date.now();
        syncData.priceLists = priceLists || [];
        syncData.modules[sourceModule] = { status: 'updated', lastUpdate: Date.now() };
        
        fs.writeFileSync(path.join(__dirname, 'sync-metadata.json'), JSON.stringify(syncData, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, syncData, action }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to sync price lists', details: error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/sync-status' && req.method === 'GET') {
    try {
      const syncData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync-metadata.json'), 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, syncData }));
    } catch (error) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, syncData: { timestamp: 0, priceLists: [], modules: {} } }));
    }
    return;
  }

  if (pathname === '/save-html' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { htmlContent, timestamp } = data;
        
        if (!htmlContent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing htmlContent' }));
          return;
        }
        
        const backupPath = path.join(__dirname, `index_backup_${Date.now()}.html`);
        if (fs.existsSync(HTML_FILE_PATH)) {
          fs.copyFileSync(HTML_FILE_PATH, backupPath);
        }
        
        fs.writeFileSync(HTML_FILE_PATH, htmlContent, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'HTML file updated successfully',
          backup: backupPath
        }));
        
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save HTML file: ' + error.message }));
      }
    });
    
    return;
  }

  // data.json endpoint removed - only Firebase data is served

  if (pathname === '/api/sync/manual' && req.method === 'POST') {
    try {
      if (!syncService) {
        await initializeSyncServices();
      }
      if (!syncScheduler) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Sync service not available. Please configure service account credentials.' 
        }));
        return;
      }
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          let options = {};
          if (body) {
            options = JSON.parse(body);
          }
          
          const result = await syncScheduler.triggerManualSync(options);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (parseError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: parseError.message }));
        }
      });
    } catch (error) {
      const credentialErrorPatterns = [
        'Failed to parse private key',
        'Invalid PEM formatted message',
        'service account key file not found',
        'placeholder values',
        'invalid json format',
        'missing required fields',
        'invalid credential type',
        'invalid service account email',
        'google sheets synchronization is not available'
      ];
      
      const isCredentialError = credentialErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isCredentialError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: error.message,
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
    return;
  }

  if (pathname === '/api/sync/products' && req.method === 'POST') {
    try {
      if (!syncService) {
        await initializeSyncServices();
      }
      if (!syncScheduler) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: 'Sync service not available. Please configure service account credentials.',
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
        return;
      }
      
      const result = await syncScheduler.triggerManualSync({ 
        syncProducts: true, 
        syncSalesmen: false, 
        syncCompanies: false, 
        syncColors: false, 
        syncStyles: false 
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        result,
        totalProducts: result.productResult ? result.productResult.totalProducts : 0
      }));
    } catch (error) {
      const credentialErrorPatterns = [
        'Failed to parse private key',
        'Invalid PEM formatted message',
        'service account key file not found',
        'placeholder values',
        'invalid json format',
        'missing required fields',
        'invalid credential type',
        'invalid service account email',
        'google sheets synchronization is not available'
      ];
      
      const isCredentialError = credentialErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isCredentialError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: error.message,
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
    return;
  }

  if (pathname === '/api/sync/salesmen' && req.method === 'POST') {
    try {
      if (!syncService) {
        await initializeSyncServices();
      }
      if (!syncScheduler) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: 'Sync service not available. Please configure service account credentials.',
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
        return;
      }
      
      const result = await syncScheduler.triggerManualSync({ 
        syncProducts: false, 
        syncSalesmen: true, 
        syncCompanies: false, 
        syncColors: false, 
        syncStyles: false 
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        result,
        totalSalesmen: result.salesmanResult ? result.salesmanResult.totalSalesmen : 0
      }));
    } catch (error) {
      const credentialErrorPatterns = [
        'Failed to parse private key',
        'Invalid PEM formatted message',
        'service account key file not found',
        'placeholder values',
        'invalid json format',
        'missing required fields',
        'invalid credential type',
        'invalid service account email',
        'google sheets synchronization is not available'
      ];
      
      const isCredentialError = credentialErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isCredentialError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: error.message,
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
    return;
  }

  if (pathname === '/api/sync/companies' && req.method === 'POST') {
    try {
      if (!syncService) {
        await initializeSyncServices();
      }
      if (!syncScheduler) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: 'Sync service not available. Please configure service account credentials.',
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
        return;
      }
      
      const result = await syncScheduler.triggerManualSync({ 
        syncProducts: false, 
        syncSalesmen: false, 
        syncCompanies: true, 
        syncColors: false, 
        syncStyles: false 
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        result,
        companiesData: result.companiesResult || { added: 0, updated: 0, deleted: 0, total: 0 }
      }));
    } catch (error) {
      const credentialErrorPatterns = [
        'Failed to parse private key',
        'Invalid PEM formatted message',
        'service account key file not found',
        'placeholder values',
        'invalid json format',
        'missing required fields',
        'invalid credential type',
        'invalid service account email',
        'google sheets synchronization is not available'
      ];
      
      const isCredentialError = credentialErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isCredentialError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Google Sheets synchronization is not available. Please configure valid Google Sheets credentials to enable sync functionality.',
          details: error.message,
          setupGuide: 'See GOOGLE_SHEETS_CREDENTIALS_SETUP.md for detailed setup instructions.'
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
    return;
  }

  if (pathname === '/api/sync/status' && req.method === 'GET') {
    try {
      if (!syncService) {
        const mockStatus = {
          isRunning: false,
          lastSync: null,
          lastError: 'Service account credentials not configured',
          totalSynced: 0,
          schedulerRunning: false,
          nextSync: null,
          productsCount: 0,
          salesmenCount: 0
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: mockStatus }));
        return;
      }
      const status = await syncService.getSyncStatus();
      
      if (syncScheduler) {
        const schedulerStatus = syncScheduler.getSchedulerStatus();
        status.schedulerRunning = schedulerStatus.isRunning;
        status.nextRun = schedulerStatus.nextRun;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  if (pathname === '/api/sync/logs' && req.method === 'GET') {
    try {
      if (!syncService) {
        const mockLogs = [
          {
            id: 'mock-1',
            timestamp: new Date(),
            level: 'info',
            message: 'Google Sheets sync system ready for configuration',
            details: 'Please set up service account credentials to enable synchronization'
          },
          {
            id: 'mock-2',
            timestamp: new Date(Date.now() - 60000),
            level: 'warning',
            message: 'Service account credentials not found',
            details: 'Create service-account-key.json file to enable Google Sheets integration'
          }
        ];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, logs: mockLogs }));
        return;
      }
      const logs = await syncService.getSyncLogs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  if (pathname === '/api/sync/scheduler/start' && req.method === 'POST') {
    try {
      if (!syncScheduler) {
        await initializeSyncServices();
      }
      syncScheduler.start();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Scheduler started' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  if (pathname === '/api/sync/scheduler/stop' && req.method === 'POST') {
    try {
      if (syncScheduler) {
        syncScheduler.stop();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Scheduler stopped' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Collection-specific API endpoints for admin panel fallback
  if (pathname === '/api/clients' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      const snapshot = await syncService.db.collection('clients').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch clients: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      const snapshot = await syncService.db.collection('products').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch products: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/salespeople' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      // Salespeople are stored in config/salesmen document
      const configDoc = await syncService.db.collection('config').doc('salesmen').get();
      if (configDoc.exists) {
        const configData = configDoc.data();
        const salespeople = configData.salesmen || configData.list || [];
        const salesmenWithIds = salespeople.map((salesman, index) => ({
          id: `salesman_${index}`,
          ...salesman
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(salesmenWithIds));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch salespeople: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/colors' && req.method === 'GET') {
    try {
      // Try Firebase first
      if (syncService && syncService.db) {
        try {
          const snapshot = await syncService.db.collection('colors').get();
          const data = [];
          snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        } catch (firebaseError) {
          // Firebase failed, fall back to Google Sheets
        }
      }
      
      // Fallback to Google Sheets
      if (googleSheetsService) {
        const sheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
        const data = await googleSheetsService.fetchColorsData(sheetId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }
      
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No data service available' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch colors: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/styles' && req.method === 'GET') {
    try {
      // Try Firebase first
      if (syncService && syncService.db) {
        try {
          const snapshot = await syncService.db.collection('styles').get();
          const data = [];
          snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        } catch (firebaseError) {
          // Firebase failed, fall back to Google Sheets
        }
      }
      
      // Fallback to Google Sheets
      if (googleSheetsService) {
        const sheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
        const data = await googleSheetsService.fetchStylesData(sheetId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }
      
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No data service available' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch styles: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/quotes' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      const snapshot = await syncService.db.collection('quotes').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch quotes: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/orders' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      const snapshot = await syncService.db.collection('orders').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch orders: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/categories' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      // Get products and extract categories
      const snapshot = await syncService.db.collection('products').get();
      const categories = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        const category = data.category || data.Category || data.ProductCategory;
        if (category) categories.add(category);
      });
      const data = Array.from(categories).map(cat => ({ id: cat, name: cat }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch categories: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/priceLists' && req.method === 'GET') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firebase service not available' }));
        return;
      }
      // Get products and extract price lists
      const snapshot = await syncService.db.collection('products').get();
      const priceLists = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        const priceList = data.priceList || data.PriceList || data.PriceListName || data['Price List Name'];
        if (priceList) priceLists.add(priceList);
      });
      const data = Array.from(priceLists).map(pl => ({ id: pl, name: pl }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch price lists: ' + error.message }));
    }
    return;
  }

  let filePath;
  if (pathname === '/quotemaker') {
    filePath = QUOTE_MAKER_FILE_PATH;
  } else if (pathname.startsWith('/quotemaker/')) {
    filePath = path.join(__dirname, pathname);
  } else {
    // Set quote-maker-v2-ver3.html as the default page for root access
    filePath = path.join(__dirname, pathname === '/' ? 'quote-maker-v2-ver3.html' : pathname);
  }
  
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

function embedDataIntoFile(filePath, data, type) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  let htmlContent = fs.readFileSync(filePath, 'utf8');
  
  // Create backup
  const backupPath = filePath.replace('.html', `_backup_${Date.now()}.html`);
  fs.writeFileSync(backupPath, htmlContent, 'utf8');
  
  // Prepare data for embedding - handle both array and object with products property
  let productsArray;
  if (Array.isArray(data)) {
    productsArray = data;
  } else if (data && data.products && Array.isArray(data.products)) {
    productsArray = data.products;
  } else {
    throw new Error('Invalid data format: expected array or object with products property');
  }
  
  const jsonData = JSON.stringify(productsArray, null, 2);
  
  if (type === 'price-list') {
    // For price list generator, replace the productData array
    const productDataRegex = /const productData = \[\s*\];/;
    if (productDataRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        productDataRegex,
        `const productData = ${jsonData};`
      );
    } else {
      // Fallback: look for any empty productData array (with or without spaces)
      const fallbackRegex = /productData\s*=\s*\[\s*\];?/;
      if (fallbackRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          fallbackRegex,
          `productData = ${jsonData};`
        );
      } else {
        throw new Error('Could not find productData array to replace in price list generator');
      }
    }
  } else if (type === 'quote-maker') {
    // For quote maker, we need to update the productData.js file instead
    const productDataJsPath = path.join(path.dirname(filePath), 'productData.js');
    if (fs.existsSync(productDataJsPath)) {
      let jsContent = fs.readFileSync(productDataJsPath, 'utf8');
      const productsRegex = /let products = \[\s*\];/;
      if (productsRegex.test(jsContent)) {
        jsContent = jsContent.replace(
          productsRegex,
          `let products = ${jsonData};`
        );
        // Create backup
        const timestamp = Date.now();
        const backupPath = productDataJsPath.replace('.js', `_backup_${timestamp}.js`);
        fs.copyFileSync(productDataJsPath, backupPath);
        // Write updated content
        fs.writeFileSync(productDataJsPath, jsContent, 'utf8');
        // Quote maker productData.js updated
        // Backup created
      } else {
        throw new Error('Could not find products array to replace in quote maker productData.js');
      }
    } else {
      throw new Error('productData.js file not found in quote maker directory');
    }
    // Return early since we're not modifying the HTML file
    return;
  } else if (type === 'main-app') {
    // For main app, replace EMBEDDED_DATA script tag first
    const embeddedDataRegex = /(<script[^>]*id=["']EMBEDDED_DATA["'][^>]*>)[\s\S]*?(<\/script>)/;
    if (embeddedDataRegex.test(htmlContent)) {
      const embeddedDataContent = {
        products: productsArray,
        salesmen: []
      };
      htmlContent = htmlContent.replace(
        embeddedDataRegex,
        `$1${JSON.stringify(embeddedDataContent, null, 2)}$2`
      );
    }
    
    // Then replace productData for price list generator
    const productDataRegex = /(const|let)\s+productData\s*=\s*\[\s*\];/;
    if (productDataRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        productDataRegex,
        (match, declaration) => `${declaration} productData = ${jsonData};`
      );
    } else {
      const fallbackProductDataRegex = /productData\s*=\s*\[\s*\];?/;
      if (fallbackProductDataRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          fallbackProductDataRegex,
          `productData = ${jsonData};`
        );
      }
    }
    
    // Then replace products for quote maker
    const productsRegex = /let products = \[\s*\];/;
    if (productsRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        productsRegex,
        `let products = ${jsonData};`
      );
    } else {
      const fallbackProductsRegex = /products\s*=\s*\[\s*\];/;
      if (fallbackProductsRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          fallbackProductsRegex,
          `products = ${jsonData};`
        );
      }
    }
    
    // Replace hardcoded productCatalog with dynamic data from Firebase
    const productCatalogRegex = /const productCatalog = \{[\s\S]*?\};/;
    if (productCatalogRegex.test(htmlContent)) {
      const catalogData = productsArray.reduce((catalog, product) => {
        const category = product.Category || product.category;
        const productName = product.Product || product.product;
        const density = product.Density || product.density;
        
        if (category && !catalog[category]) {
          catalog[category] = {
            image: product.image || 'default.png',
            description: product.description || `${category} products`,
            variants: []
          };
        }
        
        if (category && density && !catalog[category].variants.includes(density)) {
          catalog[category].variants.push(density);
        }
        
        return catalog;
      }, {});
      
      htmlContent = htmlContent.replace(
        productCatalogRegex,
        `const productCatalog = ${JSON.stringify(catalogData, null, 2)};`
      );
    }
  }
  
  // Write updated content
  fs.writeFileSync(filePath, htmlContent, 'utf8');
  
  // Data embedded into file
  // Backup created
}



// Server now only uses Firebase data - no local data.json fallback

server.listen(PORT, () => {
  // Server running at http://localhost:PORT
  // This server supports:
  // - Static file serving
  // - Admin interface at /admin.html
  // - API endpoints for data management:
  //   - GET /api/status - Server status
  //   - POST /api/save-data - Save product data
  //   - GET /api/get-data - Retrieve product data
  //   - POST /api/embed-data - Embed data into HTML files
  //   - POST /api/clear-data - Clear all data
  //   - POST /api/sync/manual - Manual sync trigger
  //   - GET /api/sync/status - Get sync status
  //   - GET /api/sync/logs - Get sync logs
  //   - POST /api/sync/scheduler/start - Start scheduler
  //   - POST /api/sync/scheduler/stop - Stop scheduler
  // - POST /save-html endpoint for permanent JSON embedding
  // - Automatic HTML file backups
  
  // Initialize sync services asynchronously (don't block server startup)
  // Initializing sync services in background
  initializeSyncServices()
    .then(() => {
      // Google Sheets sync services initialized successfully
    })
    .catch((error) => {
      // Failed to initialize sync services - server will continue running without sync functionality
    });
});

module.exports = server;