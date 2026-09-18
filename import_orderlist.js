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
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  return admin.firestore();
}

async function importOrderList() {
  const db = await initializeFirestore();
  const sheetsService = new GoogleSheetsService();
  await sheetsService.initialize();

  const spreadsheetId = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
  const tabName = 'OrderList';

  console.log(`Fetching data from ${tabName} tab...`);
  const range = `${tabName}!A2:AC`; // Start from row 2 to skip headers, go up to column AC
  const response = await sheetsService.sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const rows = response.data.values || [];
  console.log(`Fetched ${rows.length} rows.`);

  const collectionName = 'orderlist';
  const batchSize = 400;
  let imported = 0;
  
  console.log(`Clearing existing '${collectionName}' collection...`);
  const existingDocs = await db.collection(collectionName).get();
  
  // Need to process deletions in batches of 500 max
  const chunks = [];
  for (let i = 0; i < existingDocs.docs.length; i += 500) {
      chunks.push(existingDocs.docs.slice(i, i + 500));
  }
  
  for (const chunk of chunks) {
      const deleteBatch = db.batch();
      chunk.forEach((doc) => {
          deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
  }
  
  if (existingDocs.docs.length > 0) {
      console.log(`Deleted ${existingDocs.docs.length} existing documents.`);
  }

  function parseDate(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          let y = parts[2];
          if (y.length === 2) y = '20' + y;
          return `${y}-${m}-${d}`;
      }
      return dateStr;
  }

  const data = rows.map((row, index) => {
    // Map array indices to the specific columns requested
    // B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, P=15, Q=16, S=18, T=19, U=20, V=21, W=22, X=23, Y=24, AB=27
    return {
      orderDate: parseDate(row[1]),
      orderStatus: row[2] || '',
      deliveredDate: parseDate(row[3]),
      orderNumber: row[4] || '',
      customerName: row[5] || '',
      contactDetails: row[6] || '',
      country: row[7] || '',
      priceList: row[8] || '',
      length: row[9] || '',
      productName: row[10] || '',
      productType: row[11] || '',
      style: row[12] || '',
      color: row[13] || '',
      quantity: row[15] || '',
      currency: row[16] || '',
      discountPercentage: row[18] || '',
      rate: row[19] || '',
      amount: row[20] || '',
      currencyRate: row[21] || '',
      amountInInr: row[22] || '',
      advance: row[23] || '',
      salesPerson: row[24] || '',
      productionAssignedTo: row[27] || '',
      _originalRowIndex: index + 2 // 1-based, +1 for header
    };
  }).filter(doc => {
      // Filter out completely empty rows
      return doc.orderNumber || doc.customerName || doc.productName;
  });

  console.log(`Filtered down to ${data.length} valid rows to import.`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = db.batch();
    const slice = data.slice(i, i + batchSize);
    
    slice.forEach(docObj => {
      const docRef = db.collection(collectionName).doc();
      batch.set(docRef, docObj);
    });

    await batch.commit();
    imported += slice.length;
    console.log(`Imported ${imported} / ${data.length} documents...`);
  }

  console.log(`Successfully imported ${imported} documents into '${collectionName}'.`);
}

if (require.main === module) {
  importOrderList()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
