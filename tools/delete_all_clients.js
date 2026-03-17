#!/usr/bin/env node
/**
 * Bulk delete all clients via server API.
 * Note: If Firebase service is unavailable, /api/clients may return sample data
 * which will not be deletable. Ensure Firebase Admin is configured.
 */

const http = require('http');

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers || {})
    };
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response (status ${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

async function main() {
  const base = 'http://localhost:3000';
  try {
    const clients = await fetchJSON(`${base}/api/clients`);
    if (!Array.isArray(clients) || clients.length === 0) {
      console.log('No clients found to delete.');
      return;
    }
    let deleted = 0, failed = 0;
    for (const c of clients) {
      const id = c && (c.id || c.ID || c.clientId);
      if (!id) { failed++; continue; }
      try {
        await fetchJSON(`${base}/api/delete-data`, {
          method: 'POST',
          body: { collection: 'clients', id }
        });
        deleted++;
      } catch (e) {
        failed++;
      }
    }
    console.log(`Clients deletion completed. Deleted: ${deleted}, Failed: ${failed}`);
  } catch (e) {
    console.error('Failed to fetch clients:', e.message);
  }
}

main();