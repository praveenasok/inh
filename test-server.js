const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('Starting minimal server...');

// Create HTTP server
const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/' || req.url === '/index.html') {
        try {
            const indexPath = path.join(__dirname, 'index.html');
            if (fs.existsSync(indexPath)) {
                const content = fs.readFileSync(indexPath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Minimal Server Running</h1><p>Server is working but index.html not found</p>');
            }
        } catch (error) {
            console.error('Error serving index.html:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>Error</h1><p>Server error occurred</p>');
        }
    } else if (req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Minimal server is working' }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
    }
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`✅ Minimal server running at http://localhost:${PORT}`);
    console.log('✅ No external dependencies loaded');
    console.log('✅ Basic HTTP server is working');
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
});