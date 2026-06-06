const http = require('http');

console.log("Sending GET request to http://127.0.0.1:3000/api/status...");

const req = http.get("http://127.0.0.1:3000/api/status", (res) => {
  console.log("Response Received!");
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", JSON.stringify(res.headers, null, 2));

  let body = '';
  res.on('data', chunk => { body += chunk.toString(); });
  res.on('end', () => {
    console.log("Body:", body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error("HTTP Error:", e.message);
  process.exit(1);
});

// Set 5 seconds timeout
req.setTimeout(5000, () => {
  console.error("❌ Request timed out after 5 seconds! Server is hanging!");
  req.destroy();
  process.exit(1);
});
