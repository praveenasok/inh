const http = require('http');

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

function httpPost(path, jsonBody) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(jsonBody || {});
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const res = await httpGet('/api/quotes');
    if (res.status !== 200) {
      console.error('Failed to fetch quotes:', res.status, res.body);
      process.exit(1);
    }
    let quotes;
    try {
      quotes = JSON.parse(res.body);
    } catch (e) {
      console.error('Invalid JSON from /api/quotes:', e.message);
      process.exit(1);
    }

    if (!Array.isArray(quotes) || quotes.length === 0) {
      console.log('No quotes found to delete.');
      process.exit(0);
    }

    console.log(`Found ${quotes.length} quotes. Deleting...`);
    let deleted = 0;
    for (const q of quotes) {
      const id = q && q.id;
      if (!id) continue;
      const del = await httpPost('/api/delete-data', { collection: 'quotes', id });
      if (del.status === 200) {
        deleted++;
        console.log(`Deleted: ${id}`);
      } else {
        console.error(`Failed to delete ${id}:`, del.status, del.body);
      }
    }
    console.log(`Deletion complete. ${deleted}/${quotes.length} quotes deleted.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during deletion:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();