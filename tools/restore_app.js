const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('--- Starting Unified Data Restore ---');
        
        // 1. Validate Input
        const filename = process.argv[2];
        if (!filename) {
            console.error('ERROR: You must provide a backup filename to restore.');
            console.log('Usage: node tools/restore_app.js backup-[timestamp].json');
            process.exit(1);
        }

        const backupPath = path.join(__dirname, '..', 'backups', 'data_exports', filename);
        if (!fs.existsSync(backupPath)) {
            console.error(`ERROR: File not found at ${backupPath}`);
            process.exit(1);
        }

        // 2. Initialize Firebase Admin
        const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');
        if (!fs.existsSync(serviceAccountPath)) {
            console.error('ERROR: service-account-key.json not found in the root directory.');
            process.exit(1);
        }

        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();

        console.log('Connected to Firestore successfully.');

        // 3. Load Backup Data
        console.log(`Loading backup data from ${filename}...`);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        if (!backupData || !backupData.collections) {
            console.error('ERROR: Invalid backup format. Missing "collections" field.');
            process.exit(1);
        }

        // 4. Restore Data (using Batch Writes)
        const collectionNames = Object.keys(backupData.collections);
        console.log(`Found ${collectionNames.length} collections to restore.\n`);

        for (const collectionName of collectionNames) {
            console.log(`Restoring collection: ${collectionName}...`);
            const docs = backupData.collections[collectionName];
            const docIds = Object.keys(docs);
            
            if (docIds.length === 0) {
                console.log(`  - Skipping (empty collection)`);
                continue;
            }

            // Firestore batch limit is 500 operations
            const BATCH_SIZE = 400;
            let currentBatch = db.batch();
            let batchCount = 0;
            let totalProcessed = 0;

            for (const docId of docIds) {
                const docRef = db.collection(collectionName).doc(docId);
                
                // Firestore doesn't allow undefined values in data, though stringify/parse usually cleans it up
                // Convert timestamp strings back to Firestore Timestamps if necessary (optional)
                const docData = docs[docId];
                
                currentBatch.set(docRef, docData);
                batchCount++;
                totalProcessed++;

                if (batchCount >= BATCH_SIZE) {
                    await currentBatch.commit();
                    console.log(`  - Committed batch of ${batchCount} documents.`);
                    currentBatch = db.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await currentBatch.commit();
                console.log(`  - Committed final batch of ${batchCount} documents.`);
            }
            
            console.log(`  -> Successfully restored ${totalProcessed} documents in ${collectionName}.\n`);
        }

        console.log('--- Restore Completed Successfully ---');
        console.log('Please verify your data in the Firebase Console.');
        process.exit(0);

    } catch (error) {
        console.error('An error occurred during restore:', error);
        process.exit(1);
    }
}

main();
