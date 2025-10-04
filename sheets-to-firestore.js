/**
 * Sheets to Firestore Importer
 * Uses service-account-key.json to authenticate both Google Sheets API and Firestore Admin.
 * Processes every tab in the specified spreadsheet, creating Firestore collections
 * prefixed with "inh_" followed by the original tab name, and imports all rows.
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const GoogleSheetsService = require('./google-sheets-service');
const { googleSheetsAutoConfig } = require('./js/google-sheets-auto-config');

async function initializeFirestore() {
  const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('service-account-key.json not found in project root');
  }
  const serviceAccount = require(serviceAccountPath);
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  }, 'sheets-import-app');
  return admin.firestore(app);
}

function getSpreadsheetIdFromArgsOrConfig() {
  const arg = process.argv.find(a => a.startsWith('--sheetId='));
  if (arg) {
    return arg.split('=')[1];
  }
  return googleSheetsAutoConfig.getSheetId();
}

function sanitizeCollectionName(name) {
  // Preserve original tab name but avoid trailing/leading spaces
  const clean = (name || '').toString().trim();
  return `inh_${clean}`;
}

async function importAllTabs() {
  const db = await initializeFirestore();
  const sheetsService = new GoogleSheetsService();
  await sheetsService.initialize();

  const spreadsheetId = getSpreadsheetIdFromArgsOrConfig();
  const tabs = await sheetsService.listSheetTabs(spreadsheetId);

  if (!tabs || tabs.length === 0) {
    console.log('No tabs found in spreadsheet. Nothing to import.');
    return;
  }

  const results = [];

  for (const tab of tabs) {
    const title = tab.title;
    const collectionName = sanitizeCollectionName(title);
    console.log(`\nImporting tab: ${title} -> collection: ${collectionName}`);

    try {
      const data = await sheetsService.fetchTabData(spreadsheetId, title);
      console.log(`Fetched ${data.length} rows from tab '${title}'`);

      // Row transformer to normalize and enrich fields per collection
      const transformRow = (row) => {
        const out = { ...row };
        // Normalize common header variants
        const imageVal = out.image || out.Image || out['Product Image'] || '';
        if (imageVal && typeof imageVal === 'string') {
          const trimmed = imageVal.trim();
          // Ensure path prefix is images/Products/
          const hasPrefix = /^images\/Products\//i.test(trimmed);
          out.image = hasPrefix ? trimmed : `images/Products/${trimmed.replace(/^\/*/, '')}`;
        }

        // Optionally add a derived imageName for convenience
        if (out.image && typeof out.image === 'string') {
          try {
            out.imageName = out.image.split('/').pop();
          } catch (_) {}
        }

        return out;
      };

      const batchSize = 400; // Firestore batch limit is 500, keep margin
      let imported = 0;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = db.batch();
        const slice = data.slice(i, i + batchSize);
        slice.forEach((docObj) => {
          const transformed = transformRow(docObj);
          const docRef = db.collection(collectionName).doc();
          batch.set(docRef, transformed);
        });
        await batch.commit();
        imported += slice.length;
      }

      console.log(`Imported ${imported} documents into '${collectionName}'`);
      results.push({ tab: title, collection: collectionName, imported });
    } catch (error) {
      console.error(`Failed to import tab '${title}':`, error.message || error);
      results.push({ tab: title, collection: collectionName, imported: 0, error: error.message || String(error) });
    }
  }

  console.log('\nImport Summary:');
  results.forEach(r => {
    console.log(`- ${r.tab} -> ${r.collection}: ${r.imported} documents${r.error ? ` (error: ${r.error})` : ''}`);
  });
}

if (require.main === module) {
  importAllTabs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Import failed:', err.message || err);
      process.exit(1);
    });
}