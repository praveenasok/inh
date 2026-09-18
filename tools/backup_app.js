const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
    try {
        console.log('--- Starting Unified App & Data Backup ---');
        
        // 1. Setup Data Export Directory
        const backupDir = path.join(__dirname, '..', 'backups', 'data_exports');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // 2. Initialize Firebase Admin
        const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');
        if (!fs.existsSync(serviceAccountPath)) {
            console.error('ERROR: service-account-key.json not found in the root directory.');
            console.error('Cannot proceed with database backup.');
            process.exit(1);
        }

        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();

        console.log('Connected to Firestore successfully.');

        // 3. Export Data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
        
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                project_id: serviceAccount.project_id
            },
            collections: {}
        };

        const collections = await db.listCollections();
        console.log(`Found ${collections.length} collections to back up...`);

        for (const collection of collections) {
            console.log(`Exporting collection: ${collection.id}...`);
            const snapshot = await collection.get();
            
            const docs = {};
            snapshot.forEach(doc => {
                docs[doc.id] = doc.data();
            });
            
            backupData.collections[collection.id] = docs;
        }

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`\nSUCCESS: Database successfully exported to ${backupFile}`);

        // 4. Git Backup
        console.log('\n--- Syncing Code and Data to Git ---');
        
        // Add files
        console.log('Staging files...');
        execSync('git add .', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        // Commit
        try {
            console.log('Committing changes...');
            execSync(`git commit -m "Automated App & Data Backup: ${timestamp}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        } catch (error) {
            console.log('No new changes to commit (or commit failed). Proceeding to push...');
        }

        // Push
        try {
            console.log('Pushing to remote repository...');
            execSync('git push', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
            console.log('Git sync complete!');
        } catch (error) {
            console.error('WARNING: git push failed. You may need to push manually if you do not have an upstream set.');
        }

        console.log('\n--- Backup Completed Successfully ---');
        process.exit(0);

    } catch (error) {
        console.error('An error occurred during backup:', error);
        process.exit(1);
    }
}

main();
