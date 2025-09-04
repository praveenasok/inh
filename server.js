const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8001;
const HTML_FILE_PATH = path.join(__dirname, 'index.html');

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

  // Handle /save-html endpoint
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('This server supports:');
  console.log('- Static file serving');
  console.log('- POST /save-html endpoint for permanent JSON embedding');
  console.log('- Automatic HTML file backups');
});

module.exports = server;