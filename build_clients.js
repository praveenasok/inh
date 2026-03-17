const fs = require('fs');
const path = require('path');

const clientsDir = path.join(__dirname, 'data', 'clients');
const outputFile = path.join(__dirname, 'data', 'clients.json');

try {
  // Ensure directory exists
  if (!fs.existsSync(clientsDir)) {
    console.log('No clients directory found, exiting.');
    process.exit(0);
  }

  const files = fs.readdirSync(clientsDir);
  const clients = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(clientsDir, f), 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`Failed to parse ${f}:`, err);
        return null;
      }
    })
    .filter(Boolean); // Remove any nulls

  fs.writeFileSync(outputFile, JSON.stringify(clients, null, 2));
  console.log(`Successfully bundled ${clients.length} clients into data/clients.json`);
} catch (error) {
  console.error('Error building clients.json:', error);
  process.exit(1);
}
