const fs = require('fs');
const path = require('path');

const suppliersDir = path.join(__dirname, 'data', 'suppliers');
const outputFile = path.join(__dirname, 'data', 'suppliers.json');

try {
  // Ensure directory exists
  if (!fs.existsSync(suppliersDir)) {
    console.log('No suppliers directory found, exiting.');
    process.exit(0);
  }

  const files = fs.readdirSync(suppliersDir);
  const suppliers = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(suppliersDir, f), 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`Failed to parse ${f}:`, err);
        return null;
      }
    })
    .filter(Boolean); // Remove any nulls

  fs.writeFileSync(outputFile, JSON.stringify(suppliers, null, 2));
  console.log(`Successfully bundled ${suppliers.length} suppliers into data/suppliers.json`);
} catch (error) {
  console.error('Error building suppliers.json:', error);
  process.exit(1);
}
