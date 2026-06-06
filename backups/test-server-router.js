const path = require('path');
const fs = require('fs');

const pathname = '/delegated-orders.html';
const __dirname_mock = '/Users/praveenasok/Desktop/inhsuite';
const QUOTE_MAKER_FILE_PATH = path.join(__dirname_mock, 'quotemaker', 'index.html');

console.log("Mocking path resolution for:", pathname);

let filePath;
if (pathname === '/quotemaker') {
  filePath = QUOTE_MAKER_FILE_PATH;
} else if (pathname.startsWith('/quotemaker/')) {
  filePath = path.join(__dirname_mock, pathname);
} else {
  filePath = path.join(__dirname_mock, pathname === '/' ? 'quotemaker.html' : pathname);
}

console.log("Resolved FilePath:", filePath);
console.log("File exists?", fs.existsSync(filePath));

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

const ext = path.extname(filePath).toLowerCase();
const contentType = mimeTypes[ext] || 'application/octet-stream';
console.log("Extension:", ext);
console.log("Content Type:", contentType);

console.log("✅ Router path simulation successful!");
