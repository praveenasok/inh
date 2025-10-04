const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const SyncScheduler = require('./sync-scheduler');
const FirebaseSyncService = require('./firebase-sync-service');
const GoogleSheetsService = require('./google-sheets-service');
const BidirectionalSyncService = require('./bidirectional-sync-service');
const { googleSheetsAutoConfig } = require('./js/google-sheets-auto-config');
const admin = require('firebase-admin');

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
let bidirectionalSyncService = null;

// SSE clients for real-time updates
let sseClients = new Set();

// Initialize sync services
async function initializeSyncServices() {
  try {
    syncScheduler = new SyncScheduler();
    syncService = new FirebaseSyncService();
    googleSheetsService = new GoogleSheetsService();
    
    await syncScheduler.initialize();
    await syncService.initialize();
    await googleSheetsService.initialize();
    
    // Load service account credentials
    let serviceAccountCredentials = null;
    const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
    
    try {
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccountCredentials = JSON.parse(serviceAccountData);
      } else {
      }
    } catch (error) {
    }
    
    // Get the spreadsheet ID from the Google Sheets configuration
    const spreadsheetId = googleSheetsAutoConfig.getSheetId();
    
    // Initialize bidirectional sync service with configuration
    const bidirectionalSyncConfig = {
      googleSheets: {
        pollingInterval: 30000, // 30 seconds
        enablePolling: true,
        collections: ['salesmen', 'price_lists'],
        // Add service account credentials for the change detector
        ...(serviceAccountCredentials && {
          client_email: serviceAccountCredentials.client_email,
          private_key: serviceAccountCredentials.private_key,
          spreadsheetId: spreadsheetId
        })
      },
      firebase: {
        enableRealTimeListeners: true,
        collections: ['salespeople', 'price_lists', 'config']
      },
      localStorage: {
        pollingInterval: 5000, // 5 seconds
        enablePolling: true,
        watchedKeys: ['fallback_salespeople', 'fallback_price_lists', 'salespeople', 'price_lists']
      }
    };
    
    bidirectionalSyncService = new BidirectionalSyncService(syncService, googleSheetsService, bidirectionalSyncConfig);
    
    // Setup event listeners for SSE broadcasting
    setupBidirectionalSyncEventListeners();
    
    // Start the bidirectional sync service
    await bidirectionalSyncService.start();
    
    // Start the scheduler automatically
    syncScheduler.startScheduler();
    
    // Perform initial sync for colors and styles on startup
    try {
      // Performing initial sync for colors and styles
      const productSheetId = googleSheetsAutoConfig.getSheetId();
      
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

// Setup event listeners for bidirectional sync service
function setupBidirectionalSyncEventListeners() {
  if (!bidirectionalSyncService) return;

  // Listen for Firebase changes and broadcast to SSE clients
  bidirectionalSyncService.on('firebase-change-detected', (data) => {
    broadcastToSSEClients('firebase-change-detected', data);
  });

  // Listen for localStorage update requirements
  bidirectionalSyncService.on('localStorage-update-required', (data) => {
    broadcastToSSEClients('localStorage-update-required', data);
  });

  // Listen for data validation results
  bidirectionalSyncService.on('data-validation-completed', (data) => {
    broadcastToSSEClients('data-validation-completed', data);
  });

  // Listen for manual resolution requirements
  bidirectionalSyncService.on('manual-resolution-required', (data) => {
    broadcastToSSEClients('inconsistency-resolution-required', data);
  });

  // Listen for sync status updates
  bidirectionalSyncService.on('sync-service-started', () => {
    broadcastToSSEClients('sync-status-update', { bidirectionalSync: 'running' });
  });

  bidirectionalSyncService.on('sync-service-stopped', () => {
    broadcastToSSEClients('sync-status-update', { bidirectionalSync: 'stopped' });
  });

  bidirectionalSyncService.on('sync-service-error', (error) => {
    broadcastToSSEClients('sync-status-update', { bidirectionalSync: 'error', error: error.message });
  });
}

// Broadcast data to all SSE clients
function broadcastToSSEClients(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      sseClients.delete(client);
    }
  });
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

  // Sync Pricelists tab from Google Sheets into Firestore collection `inh_pricelists`
  if (pathname === '/api/sync/inh_pricelists' && req.method === 'POST') {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Firebase service not available' }));
        return;
      }

      // Parse query params
      const dryRun = parsedUrl.searchParams.get('dryRun') === 'true';
      const spreadsheetId = googleSheetsAutoConfig.getSheetId();

      // Helper to safely get field from a row with various header variants
      const getField = (row, keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return String(row[k]).trim();
          }
        }
        return '';
      };

      const makeName = (category, product, shade, length) => {
        // Exact requested format with spaces around underscores
        return `${category} _ ${product} _ ${shade} _ ${length}`;
      };

      const slugify = (s) => {
        return String(s)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-_.]/g, '');
      };

      const sanitizeProductFilename = (p) => {
        return String(p)
          .replace(/\s+/g, '')
          .replace(/[^A-Za-z0-9_\-]/g, '');
      };

      const resolveImagePath = (row, product) => {
        // Prefer explicit image fields from the sheet
        const explicit = getField(row, ['image', 'Image', 'imagePath', 'image_path', 'imageUrl', 'image_url']);
        if (explicit) return explicit;
        // Fallback to local product image path convention
        const filename = sanitizeProductFilename(product);
        return `/images/Products/${filename}.png`;
      };

      // Fetch rows from Pricelists tab
      let rows = [];
      try {
        rows = await googleSheetsService.fetchProductData(spreadsheetId);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Failed to fetch Pricelists data from Sheets: ' + err.message }));
        return;
      }

      if (!rows || rows.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'No rows found in Pricelists tab', created: 0, updated: 0, skipped: 0 }));
        return;
      }

      // Group by price list name
      const groups = new Map();
      for (const row of rows) {
        const priceListName = getField(row, ['Price List Name', 'PriceListName', 'PriceList', 'pricelist', 'Price List']);
        if (!priceListName) continue;
        if (!groups.has(priceListName)) groups.set(priceListName, []);
        groups.get(priceListName).push(row);
      }

      const results = { created: 0, updated: 0, skipped: 0, errors: 0, lists: [] };

      for (const [plName, plRows] of groups.entries()) {
        const parentId = slugify(plName);
        const parentRef = syncService.db.collection('inh_pricelists').doc(parentId);
        const parentDoc = { name: plName, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

        if (!dryRun) {
          // Ensure parent document exists
          const existingParent = await parentRef.get();
          if (!existingParent.exists) {
            await parentRef.set({ ...parentDoc, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          } else {
            await parentRef.set(parentDoc, { merge: true });
          }
        }

        const listSummary = { priceList: plName, parentId, created: 0, updated: 0, skipped: 0 };

        for (const row of plRows) {
          const category = getField(row, ['Category', 'category']);
          const product = getField(row, ['Product', 'product', 'Item']);
          const shade = getField(row, ['Shade', 'shade', 'Shades']);
          const length = getField(row, ['Length', 'length', 'Size']);

          // Skip if any essential field missing
          if (!category || !product || !shade || !length) {
            results.skipped++;
            listSummary.skipped++;
            continue;
          }

          const name = makeName(category, product, shade, length);
          const image = resolveImagePath(row, product);

          const docId = slugify(`${category}-${product}-${shade}-${length}`);
          const docRef = parentRef.collection('products').doc(docId);

          const payload = {
            name,
            category,
            product,
            shade,
            length,
            image,
            source: 'google_sheets',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          if (dryRun) {
            // Simulate create/update by checking existence
            try {
              const existing = await docRef.get();
              if (existing.exists) {
                results.updated++;
                listSummary.updated++;
              } else {
                results.created++;
                listSummary.created++;
              }
            } catch (e) {
              results.errors++;
            }
          } else {
            const existing = await docRef.get();
            if (existing.exists) {
              await docRef.set(payload, { merge: true });
              results.updated++;
              listSummary.updated++;
            } else {
              await docRef.set({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() });
              results.created++;
              listSummary.created++;
            }
          }
        }

        results.lists.push(listSummary);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, dryRun, ...results }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Sync failed: ' + error.message }));
    }
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
          // Handle special collections that are stored in collections
          if (collection === 'salespeople') {
            try {
              const snapshot = await syncService.db.collection('salespeople').get();
              const salespeople = [];
              snapshot.forEach(doc => {
                salespeople.push({
                  id: doc.id,
                  ...doc.data()
                });
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(salespeople));
            } catch (error) {
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

  if (pathname === '/api/google-sheets-status' && req.method === 'GET') {
    try {
      if (!googleSheetsService) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          connected: false, 
          error: 'Google Sheets service not initialized' 
        }));
        return;
      }

      // Test connection by trying to access the spreadsheet
      const testResult = await googleSheetsService.testConnection();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: testResult.success,
        error: testResult.success ? null : testResult.error,
        spreadsheetId: googleSheetsService.spreadsheetId,
        lastChecked: new Date().toISOString(),
        sheetCount: testResult.sheetCount || 0,
        spreadsheetTitle: testResult.spreadsheetTitle || 'Unknown'
      }));
    } catch (error) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        connected: false, 
        error: 'Failed to check Google Sheets status: ' + error.message 
      }));
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

  if (pathname === '/api/sync/count-data' && req.method === 'POST') {
    try {
      if (!syncService) {
        await initializeSyncServices();
      }
      if (!syncService) {
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
          const result = await syncService.syncCountData();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            result,
            message: 'Count data synchronized to Firebase successfully'
          }));
        } catch (parseError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: parseError.message }));
        }
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Bidirectional Sync API endpoints
  if (pathname === '/api/sync/events' && req.method === 'GET') {
    // Server-Sent Events endpoint for real-time sync updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add client to SSE clients set
    sseClients.add(res);

    // Send initial connection message
    res.write('data: {"type": "connection", "message": "Connected to sync events"}\n\n');

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(res);
    });

    req.on('aborted', () => {
      sseClients.delete(res);
    });

    return;
  }

  if (pathname === '/api/sync/bidirectional/start' && req.method === 'POST') {
    try {
      if (!bidirectionalSyncService) {
        await initializeSyncServices();
      }
      
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      await bidirectionalSyncService.start();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Bidirectional sync started' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  if (pathname === '/api/sync/bidirectional/stop' && req.method === 'POST') {
    try {
      if (bidirectionalSyncService) {
        await bidirectionalSyncService.stop();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Bidirectional sync stopped' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  if (pathname === '/api/sync/bidirectional/status' && req.method === 'GET') {
    try {
      const status = bidirectionalSyncService ? bidirectionalSyncService.getSyncStatus() : { isRunning: false };
      if (!res.headersSent) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify(status));
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      } else {
        // If headers already sent, just end safely
        try { res.end(); } catch (_) {}
      }
    }
    return;
  }

  if (pathname === '/api/sync/localStorage-to-firebase' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { collection, data, timestamp } = JSON.parse(body);
        
        if (!syncService || !syncService.db) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Firebase service not available' }));
          return;
        }

        // Update Firebase with localStorage data
        if (collection === 'salespeople') {
          // Update config document with salespeople data
          await syncService.db.collection('config').doc('salespeople').set({
            salespeople: data,
            lastUpdated: timestamp,
            source: 'localStorage'
          }, { merge: true });
        } else if (collection === 'price_lists') {
          // Update price lists collection
          const batch = syncService.db.batch();
          data.forEach((item, index) => {
            const docRef = syncService.db.collection('price_lists').doc(`item_${index}`);
            batch.set(docRef, { ...item, lastUpdated: timestamp, source: 'localStorage' });
          });
          await batch.commit();
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `${collection} synced to Firebase` }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/sync/resolve-inconsistency' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { type, source } = JSON.parse(body);
        
        if (!bidirectionalSyncService) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
          return;
        }

        // Create a mock inconsistency object for resolution
        const inconsistency = { type, [source]: 'user_selected_value' };
        
        if (source === 'firebase') {
          await bidirectionalSyncService.resolveWithFirebasePriority(inconsistency);
        } else {
          // For Google Sheets priority, we'd need to implement this
          // TODO: Implement Google Sheets priority resolution
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Inconsistency resolved' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/sync/conflict-strategy' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { strategy } = JSON.parse(body);
        
        if (!bidirectionalSyncService) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
          return;
        }

        bidirectionalSyncService.setConflictResolutionStrategy(strategy);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Conflict resolution strategy set to ${strategy}` }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Start periodic data validation
  if (pathname === '/api/sync/validation/start' && req.method === 'POST') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      bidirectionalSyncService.startPeriodicValidation();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Periodic data validation started',
        interval: bidirectionalSyncService.validationIntervalMs
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Stop periodic data validation
  if (pathname === '/api/sync/validation/stop' && req.method === 'POST') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      bidirectionalSyncService.stopPeriodicValidation();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Periodic data validation stopped'
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Perform manual data validation
  if (pathname === '/api/sync/validation/run' && req.method === 'POST') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      const validationResults = await bidirectionalSyncService.performComprehensiveValidation();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Data validation completed',
        results: validationResults
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Get validation status
  if (pathname === '/api/sync/validation/status' && req.method === 'GET') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      const status = {
        periodicValidationActive: !!bidirectionalSyncService.validationInterval,
        validationInterval: bidirectionalSyncService.validationIntervalMs,
        lastValidation: bidirectionalSyncService.lastValidationTime || null
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        status
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Migrate image URLs for inh_pricelists products from Google Sheets
  if (pathname === '/api/migrate/pricelist-images' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      if (!syncService || !syncService.db) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Firebase service not available' }));
        return;
      }
      if (!googleSheetsService) {
        googleSheetsService = new GoogleSheetsService();
        await googleSheetsService.initialize();
      }

      const urlParams = new URL(req.url, 'http://localhost').searchParams;
      const dryRun = (urlParams.get('dryRun') || 'false').toLowerCase() === 'true';
      const targetCollection = urlParams.get('collection') || 'inh_pricelists';
      const sheetId = urlParams.get('sheetId') || googleSheetsAutoConfig.getSheetId();

      // Build a product key -> imageUrl map from the pricelists tab
      const rows = await googleSheetsService.fetchProductData(sheetId);
      const toKey = (pl, cat, prod, dens) => [pl, cat, prod, dens]
        .map(v => (v || '').toString().trim().toLowerCase())
        .join('|');

      const extractField = (obj, keys) => {
        for (const k of keys) {
          const v = obj[k];
          if (typeof v === 'string' && v.trim()) return v.trim();
        }
        return null;
      };

      const getImageFromRow = (row) => {
        const candidates = [
          'image', 'Image', 'imageUrl', 'imageURL', 'ImageURL',
          'ProductImage', 'productImage', 'ProductImageURL', 'productImageURL',
          'Image Link', 'ImageLink', 'image_link', 'image_path', 'storagePath'
        ];
        // Nested Images array support
        if (Array.isArray(row.Images) && row.Images.length > 0) {
          const first = row.Images[0];
          if (typeof first === 'string' && first.trim()) return first.trim();
          if (typeof first === 'object') {
            const u = first.url || first.link || first.path;
            if (typeof u === 'string' && u.trim()) return u.trim();
          }
        }
        return extractField(row, candidates);
      };

      const keyMap = new Map();
      for (const row of rows) {
        const priceList = extractField(row, ['Price List Name', 'PriceListName', 'PriceList', 'pricelist']);
        const category = extractField(row, ['Category', 'category']);
        const product = extractField(row, ['Product', 'product', 'Name', 'name']);
        const density = extractField(row, ['Density', 'density']);
        const imageUrl = getImageFromRow(row);
        if (priceList && category && product && imageUrl) {
          const key = toKey(priceList, category, product, density || '');
          keyMap.set(key, imageUrl);
        }
      }

      // Iterate Firestore inh_pricelists/{priceList}/products subcollections
      const plSnap = await syncService.db.collection(targetCollection).get();
      const deleteFields = [
        'Image', 'image', 'imageURL', 'ImageURL', 'ProductImage', 'productImage',
        'ProductImageURL', 'productImageURL', 'ImageLink', 'image_link', 'image_path', 'storagePath'
      ];

      let examined = 0, updated = 0, missing = 0, errors = 0;
      const mismatches = [];

      for (const plDoc of plSnap.docs) {
        const priceListName = plDoc.get('PriceListName') || plDoc.id;
        let subQuery = plDoc.ref.collection('products');
        const subSnap = await subQuery.get();
        const batch = syncService.db.batch();

        for (const prodDoc of subSnap.docs) {
          examined++;
          const data = prodDoc.data();
          const category = data.Category || data.category || '';
          const product = data.Product || data.product || data.Name || data.name || '';
          const density = data.Density || data.density || '';
          const key = toKey(priceListName, category, product, density);
          const sheetUrl = keyMap.get(key);
          if (!sheetUrl) {
            missing++;
            mismatches.push({ priceList: priceListName, category, product, density, id: prodDoc.id });
            continue;
          }

          const updatePayload = { imageUrl: sheetUrl };
          deleteFields.forEach(f => { updatePayload[f] = admin.firestore.FieldValue.delete ? admin.firestore.FieldValue.delete() : undefined; });

          try {
            if (!dryRun) {
              batch.update(prodDoc.ref, updatePayload);
            }
            updated++;
          } catch (e) {
            errors++;
          }
        }

        if (!dryRun) {
          try { await batch.commit(); } catch (e) { errors++; }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        dryRun,
        targetCollection,
        examined,
        updated,
        missing,
        errors,
        mismatches: dryRun ? mismatches.slice(0, 100) : []
      }));
      return;
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
      return;
    }
  }

  // Get error handling statistics
  if (pathname === '/api/sync/errors/stats' && req.method === 'GET') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      const stats = bidirectionalSyncService.errorHandler ? 
        bidirectionalSyncService.errorHandler.getErrorStats() : 
        { message: 'Error handler not available' };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        stats
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }

  // Get conflict resolution statistics
  if (pathname === '/api/sync/conflicts/stats' && req.method === 'GET') {
    try {
      if (!bidirectionalSyncService) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bidirectional sync service not available' }));
        return;
      }

      const stats = bidirectionalSyncService.conflictResolver ? 
        bidirectionalSyncService.conflictResolver.getConflictStats() : 
        { message: 'Conflict resolver not available' };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        stats
      }));
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
        // Temporary fallback data for testing
        const sampleClients = [
          { id: 'client_1', name: 'ABC Hair Salon', email: 'contact@abchairsalon.com', phone: '+1-555-0101' },
          { id: 'client_2', name: 'Beauty World Inc', email: 'orders@beautyworld.com', phone: '+1-555-0102' },
          { id: 'client_3', name: 'Hair Extensions Plus', email: 'info@hairextensionsplus.com', phone: '+1-555-0103' },
          { id: 'client_4', name: 'Glamour Studio', email: 'sales@glamourstudio.com', phone: '+1-555-0104' },
          { id: 'client_5', name: 'Natural Hair Co', email: 'support@naturalhairco.com', phone: '+1-555-0105' }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sampleClients));
        return;
      }
      const snapshot = await syncService.db.collection('clients').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // If Firebase collection is empty, fall back to sample data
      if (data.length === 0) {
        const sampleClients = [
          { id: 'client_1', name: 'ABC Hair Salon', email: 'contact@abchairsalon.com', phone: '+1-555-0101' },
          { id: 'client_2', name: 'Beauty World Inc', email: 'orders@beautyworld.com', phone: '+1-555-0102' },
          { id: 'client_3', name: 'Hair Extensions Plus', email: 'info@hairextensionsplus.com', phone: '+1-555-0103' },
          { id: 'client_4', name: 'Glamour Studio', email: 'sales@glamourstudio.com', phone: '+1-555-0104' },
          { id: 'client_5', name: 'Natural Hair Co', email: 'support@naturalhairco.com', phone: '+1-555-0105' }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sampleClients));
        return;
      }
      
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
        // Temporary fallback data for testing
        const sampleProducts = [
          { id: 'product_1', name: 'Bulk Hair', category: 'Hair Extensions', basePrice: 150, PriceList: 'Retail' },
          { id: 'product_2', name: 'ClipOn Extensions', category: 'Hair Extensions', basePrice: 120, PriceList: 'Wholesale' },
          { id: 'product_3', name: 'Tape Extensions', category: 'Hair Extensions', basePrice: 180, PriceList: 'Retail' },
          { id: 'product_4', name: 'Weft Hair', category: 'Hair Extensions', basePrice: 200, PriceList: 'VIP' },
          { id: 'product_5', name: 'Closure', category: 'Hair Closures', basePrice: 250, PriceList: 'Wholesale' }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sampleProducts));
        return;
      }
      const snapshot = await syncService.db.collection('products').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // If Firebase collection is empty, fall back to sample data
      if (data.length === 0) {
        const sampleProducts = [
          { id: 'product_1', name: 'Bulk Hair', category: 'Hair Extensions', basePrice: 150, PriceList: 'Retail' },
          { id: 'product_2', name: 'ClipOn Extensions', category: 'Hair Extensions', basePrice: 120, PriceList: 'Wholesale' },
          { id: 'product_3', name: 'Tape Extensions', category: 'Hair Extensions', basePrice: 180, PriceList: 'Retail' },
          { id: 'product_4', name: 'Weft Hair', category: 'Hair Extensions', basePrice: 200, PriceList: 'VIP' },
          { id: 'product_5', name: 'Closure', category: 'Hair Closures', basePrice: 250, PriceList: 'Wholesale' }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sampleProducts));
        return;
      }
      
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
        // Temporary fallback data for testing
        const sampleSalespeople = [
          { id: 'salesman_0', name: 'Praveen', email: 'praveen@inh.com', territory: 'North' },
          { id: 'salesman_1', name: 'Rupa', email: 'rupa@inh.com', territory: 'South' },
          { id: 'salesman_2', name: 'INH', email: 'inh@inh.com', territory: 'Central' },
          { id: 'salesman_3', name: 'HW', email: 'hw@inh.com', territory: 'West' },
          { id: 'salesman_4', name: 'Vijay', email: 'vijay@inh.com', territory: 'East' },
          { id: 'salesman_5', name: 'Pankaj', email: 'pankaj@inh.com', territory: 'Northeast' },
          { id: 'salesman_6', name: 'Sunil', email: 'sunil@inh.com', territory: 'Southwest' }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sampleSalespeople));
        return;
      }
      // Salespeople are stored in salespeople collection
      const snapshot = await syncService.db.collection('salespeople').get();
      const salespeople = [];
      snapshot.forEach(doc => {
        salespeople.push({
          id: doc.id,
          ...doc.data()
        });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(salespeople));
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
          
          // If Firebase collection is empty, fall back to sample data
          if (data.length === 0) {
            const sampleColors = [
              { id: 'color_1', name: 'Natural Black', code: '#1B1B1B' },
              { id: 'color_2', name: 'Dark Brown', code: '#3C2415' },
              { id: 'color_3', name: 'Medium Brown', code: '#8B4513' },
              { id: 'color_4', name: 'Light Brown', code: '#D2691E' },
              { id: 'color_5', name: 'Blonde', code: '#F5DEB3' },
              { id: 'color_6', name: 'Ash Blonde', code: '#C4A484' },
              { id: 'color_7', name: 'Platinum Blonde', code: '#E5E4E2' }
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sampleColors));
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        } catch (firebaseError) {
          // Firebase failed, fall back to Google Sheets
        }
      }
      
      // Fallback to Google Sheets
      if (googleSheetsService) {
        const sheetId = googleSheetsAutoConfig.getSheetId();
        const data = await googleSheetsService.fetchColorsData(sheetId);
        if (data && data.length > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        }
      }
      
      // Final fallback data for testing
      const sampleColors = [
        { id: 'color_1', name: 'Natural Black', code: '#1B1B1B' },
        { id: 'color_2', name: 'Dark Brown', code: '#3C2415' },
        { id: 'color_3', name: 'Medium Brown', code: '#8B4513' },
        { id: 'color_4', name: 'Light Brown', code: '#D2691E' },
        { id: 'color_5', name: 'Blonde', code: '#F5DEB3' },
        { id: 'color_6', name: 'Ash Blonde', code: '#C4A484' },
        { id: 'color_7', name: 'Platinum Blonde', code: '#E5E4E2' }
      ];
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sampleColors));
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
          
          // If Firebase collection is empty, fall back to sample data
          if (data.length === 0) {
            const sampleStyles = [
              { id: 'style_1', name: 'Straight', description: 'Natural straight hair' },
              { id: 'style_2', name: 'Wavy', description: 'Natural wavy texture' },
              { id: 'style_3', name: 'Curly', description: 'Natural curly texture' },
              { id: 'style_4', name: 'Deep Wave', description: 'Deep wave pattern' },
              { id: 'style_5', name: 'Body Wave', description: 'Loose body wave' }
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sampleStyles));
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        } catch (firebaseError) {
          // Firebase failed, fall back to Google Sheets
        }
      }
      
      // Fallback to Google Sheets
      if (googleSheetsService) {
        const sheetId = googleSheetsAutoConfig.getSheetId();
        const data = await googleSheetsService.fetchStylesData(sheetId);
        if (data && data.length > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        }
      }
      
      // Temporary fallback data for testing
      const sampleStyles = [
        { id: 'style_1', name: 'Straight', description: 'Natural straight hair' },
        { id: 'style_2', name: 'Wavy', description: 'Natural wavy texture' },
        { id: 'style_3', name: 'Curly', description: 'Natural curly texture' },
        { id: 'style_4', name: 'Deep Wave', description: 'Deep wave pattern' },
        { id: 'style_5', name: 'Body Wave', description: 'Loose body wave' }
      ];
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sampleStyles));
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

  if (pathname === '/api/salesmen-count' && req.method === 'GET') {
    try {
      let salesmenCount = 0;
      
      // Try Google Sheets first for most accurate count
      if (googleSheetsService) {
        try {
          const salesmenData = await googleSheetsService.fetchSalesmanData(googleSheetsAutoConfig.getSheetId());
          salesmenCount = salesmenData ? salesmenData.length : 0;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            count: salesmenCount, 
            source: 'google_sheets',
            timestamp: new Date().toISOString()
          }));
          return;
        } catch (sheetsError) {
        }
      }
      
      // Fallback to Firebase
      if (syncService && syncService.db) {
        try {
          const snapshot = await syncService.db.collection('salespeople').get();
          salesmenCount = snapshot.size;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            count: salesmenCount, 
            source: 'firebase',
            timestamp: new Date().toISOString()
          }));
          return;
        } catch (firebaseError) {
        }
      }
      
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No data service available for salesmen count' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch salesmen count: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/price-lists-count' && req.method === 'GET') {
    try {
      let priceListsCount = 0;
      let priceLists = new Set();
      
      // Try Google Sheets first for most accurate count
      if (googleSheetsService) {
        try {
          const productsData = await googleSheetsService.fetchProductData(googleSheetsAutoConfig.getSheetId());
          if (productsData && productsData.length > 0) {
            productsData.forEach(product => {
              const priceList = product.priceList || product.PriceList || product.PriceListName || product['Price List Name'];
              if (priceList) priceLists.add(priceList);
            });
            priceListsCount = priceLists.size;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              count: priceListsCount, 
              priceLists: Array.from(priceLists),
              source: 'google_sheets',
              timestamp: new Date().toISOString()
            }));
            return;
          }
        } catch (sheetsError) {
        }
      }
      
      // Fallback to Firebase
      if (syncService && syncService.db) {
        try {
          const snapshot = await syncService.db.collection('products').get();
          snapshot.forEach(doc => {
            const data = doc.data();
            const priceList = data.priceList || data.PriceList || data.PriceListName || data['Price List Name'];
            if (priceList) priceLists.add(priceList);
          });
          priceListsCount = priceLists.size;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            count: priceListsCount, 
            priceLists: Array.from(priceLists),
            source: 'firebase',
            timestamp: new Date().toISOString()
          }));
          return;
        } catch (firebaseError) {
        }
      }
      
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No data service available for price lists count' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch price lists count: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/firebase-counts' && req.method === 'GET') {
    try {
      if (syncService && syncService.db && syncService.isInitialized) {
        const counts = {};
        const collections = ['products', 'colors', 'styles', 'quotes', 'clients', 'price_lists', 'salesmen'];
        
        for (const collection of collections) {
          try {
            // Use the Firebase db directly to get collection counts
            const snapshot = await syncService.db.collection(collection).get();
            const count = snapshot.size;
            counts[collection] = count;
          } catch (error) {
            counts[collection] = 0;
          }
        }
        
        // Map price_lists back to pricelists for frontend compatibility
        if (counts.price_lists !== undefined) {
          counts.pricelists = counts.price_lists;
          delete counts.price_lists;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          counts,
          source: 'firebase',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      const errorDetails = {
        syncService: !!syncService,
        firebaseDb: !!(syncService && syncService.db),
        isInitialized: !!(syncService && syncService.isInitialized),
        message: 'Firebase service not available - services may still be initializing'
      };
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Firebase service not available',
        details: errorDetails
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch Firebase counts: ' + error.message }));
    }
    return;
  }

  let filePath;
  if (pathname === '/quotemaker') {
    filePath = QUOTE_MAKER_FILE_PATH;
  } else if (pathname.startsWith('/quotemaker/')) {
    filePath = path.join(__dirname, pathname);
  } else {
    // Set quotemaker.html as the default page for root access
    filePath = path.join(__dirname, pathname === '/' ? 'quotemaker.html' : pathname);
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