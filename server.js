const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8001;
const HTML_FILE_PATH = path.join(__dirname, 'index.html');
const DATA_FILE_PATH = path.join(__dirname, 'data.json');
const PRICE_LIST_FILE_PATH = path.join(__dirname, 'oldfiles', 'Price List Generator — Indian Natural Hair.html');
const QUOTE_MAKER_FILE_PATH = path.join(__dirname, 'quotemaker', 'index.html');

// In-memory data storage
let currentProductData = null;

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

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
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
      if (currentProductData) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(currentProductData));
      } else if (fs.existsSync(DATA_FILE_PATH)) {
        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        currentProductData = JSON.parse(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No data found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get data: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/embed-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        console.log('Embed data request received');
        const { target, data } = JSON.parse(body);
        console.log(`Target: ${target}, Data length: ${data ? data.products?.length || 'unknown' : 'no data'}`);
        
        if (target === 'priceList') {
          console.log('Embedding into price list...');
          embedDataIntoFile(PRICE_LIST_FILE_PATH, data, 'price-list');
        } else if (target === 'quoteMaker') {
          console.log('Embedding into quote maker...');
          embedDataIntoFile(QUOTE_MAKER_FILE_PATH, data, 'quote-maker');
        } else if (target === 'mainApp') {
          console.log('Embedding into main app...');
          embedDataIntoFile(HTML_FILE_PATH, data, 'main-app');
        } else if (target === 'all') {
          // Embed into all modules for synchronization
          console.log('Embedding into all applications...');
          console.log('1. Embedding into price list...');
          embedDataIntoFile(PRICE_LIST_FILE_PATH, data, 'price-list');
          console.log('2. Embedding into quote maker...');
          embedDataIntoFile(QUOTE_MAKER_FILE_PATH, data, 'quote-maker');
          console.log('3. Embedding into main app...');
          embedDataIntoFile(HTML_FILE_PATH, data, 'main-app');
        } else {
          throw new Error('Invalid target specified. Use: priceList, quoteMaker, mainApp, or all');
        }
        
        console.log('Embed operation completed successfully');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Data embedded into ${target}` }));
      } catch (error) {
        console.error('Embed data error:', error.message);
        console.error('Error stack:', error.stack);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to embed data: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/clear-data' && req.method === 'POST') {
    try {
      currentProductData = null;
      
      // Remove data file
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
        
        // Update price lists in main application
        const mainHtmlPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(mainHtmlPath)) {
          let htmlContent = fs.readFileSync(mainHtmlPath, 'utf8');
          
          // Create backup
          const backupPath = mainHtmlPath.replace('.html', `_backup_${Date.now()}.html`);
          fs.writeFileSync(backupPath, htmlContent, 'utf8');
          
          // Update availablePriceLists in the HTML
          const priceListsJson = JSON.stringify(priceLists);
          const priceListRegex = /availablePriceLists\s*=\s*new\s+Set\(\[.*?\]\);/s;
          
          if (priceListRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(
              priceListRegex,
              `availablePriceLists = new Set(${priceListsJson});`
            );
            
            fs.writeFileSync(mainHtmlPath, htmlContent, 'utf8');
            console.log(`Price lists updated in main application: ${priceLists.join(', ')}`);
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
        
        // Initialize synchronization metadata
        const syncData = {
          priceLists: priceLists || [],
          lastSync: timestamp || Date.now(),
          syncEnabled: true,
          modules: {
            priceListGenerator: { status: 'synchronized', lastUpdate: timestamp },
            quoteMaker: { status: 'synchronized', lastUpdate: timestamp }
          }
        };
        
        // Save sync metadata
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

  // Real-time price list synchronization endpoint
  if (pathname === '/api/sync-price-lists' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { action, priceLists, sourceModule } = JSON.parse(body);
        
        // Update sync metadata
        let syncData = {};
        try {
          syncData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync-metadata.json'), 'utf8'));
        } catch (e) {
          syncData = { timestamp: Date.now(), priceLists: [], modules: {} };
        }
        
        syncData.timestamp = Date.now();
        syncData.priceLists = priceLists || [];
        syncData.modules[sourceModule] = { status: 'updated', lastUpdate: Date.now() };
        
        // Save updated sync metadata
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

  // Get current sync status endpoint
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

  // Handle /save-html endpoint (legacy)
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
        
        // Create backup of current HTML file
        const backupPath = path.join(__dirname, `index_backup_${Date.now()}.html`);
        if (fs.existsSync(HTML_FILE_PATH)) {
          fs.copyFileSync(HTML_FILE_PATH, backupPath);
        }
        
        // Write the new HTML content
        fs.writeFileSync(HTML_FILE_PATH, htmlContent, 'utf8');
        
        console.log(`HTML file updated at ${timestamp}`);
        console.log(`Backup created: ${backupPath}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'HTML file updated successfully',
          backup: backupPath
        }));
        
      } catch (error) {
        console.error('Error saving HTML file:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save HTML file: ' + error.message }));
      }
    });
    
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check - prevent directory traversal
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

// Helper function to embed data into HTML files
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
      // Fallback: look for any empty productData array
      const fallbackRegex = /productData\s*=\s*\[\s*\];/;
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
        console.log(`Quote maker productData.js updated at ${new Date().toISOString()}`);
        console.log(`Backup created: ${backupPath}`);
      } else {
        throw new Error('Could not find products array to replace in quote maker productData.js');
      }
    } else {
      throw new Error('productData.js file not found in quote maker directory');
    }
    // Return early since we're not modifying the HTML file
    return;
  } else if (type === 'main-app') {
    // For main app, replace productData, products arrays, and productCatalog
    // First replace productData for price list generator
    const productDataRegex = /(const|let)\s+productData\s*=\s*\[\s*\];/;
    if (productDataRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        productDataRegex,
        (match, declaration) => `${declaration} productData = ${jsonData};`
      );
    } else {
      const fallbackProductDataRegex = /productData\s*=\s*\[\s*\];/;
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
    
    // Replace hardcoded productCatalog with dynamic data from Excel
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
  
  console.log(`Data embedded into ${type} at ${new Date().toISOString()}`);
  console.log(`Backup created: ${backupPath}`);
}

// Load existing data on startup
if (fs.existsSync(DATA_FILE_PATH)) {
  try {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    currentProductData = JSON.parse(data);
    console.log('Loaded existing product data from file');
  } catch (error) {
    console.log('Could not load existing data:', error.message);
  }
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('This server supports:');
  console.log('- Static file serving');
  console.log('- Admin interface at /admin.html');
  console.log('- API endpoints for data management:');
  console.log('  - GET /api/status - Server status');
  console.log('  - POST /api/save-data - Save product data');
  console.log('  - GET /api/get-data - Retrieve product data');
  console.log('  - POST /api/embed-data - Embed data into HTML files');
  console.log('  - POST /api/clear-data - Clear all data');
  console.log('- POST /save-html endpoint for permanent JSON embedding');
  console.log('- Automatic HTML file backups');
});

module.exports = server;