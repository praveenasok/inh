const fs = require('fs');
const admin = require('firebase-admin');

console.log('Loading service account...');
const serviceAccount = require('./service-account-key.json');

console.log('Initializing Firebase...');
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'inhsuite.appspot.com'
});

console.log('Firebase initialized. Getting firestore...');
const db = admin.firestore(app);
console.log('Firestore got. Getting bucket...');
const bucket = admin.storage().bucket();
console.log('Bucket got:', bucket.name);

async function downloadFile(url) {
    // If it's a Google Drive open URL, convert to export=download
    let downloadUrl = url;
    if (url.includes('drive.google.com/open?id=')) {
        const id = new URL(url).searchParams.get('id');
        downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    } else if (url.includes('drive.google.com/file/d/')) {
        const id = url.split('/d/')[1].split('/')[0];
        downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    }

    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            console.error('Failed to download', downloadUrl, response.status, response.statusText);
            return null;
        }
        
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        let filename = 'document';
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match) filename = match[1];
        } else {
            // guess from content type
            if (contentType.includes('image/jpeg')) filename += '.jpg';
            else if (contentType.includes('image/png')) filename += '.png';
            else if (contentType.includes('application/pdf')) filename += '.pdf';
        }

        return {
            buffer: Buffer.from(buffer),
            contentType,
            filename
        };
    } catch (e) {
        console.error('Error downloading', url, e.message);
        return null;
    }
}

async function runMigration() {
    console.log('Fetching employees...');
    const snapshot = await db.collection('employees').get();
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
        const emp = doc.data();
        if (!emp.documents || emp.documents.length === 0) continue;

        let needsUpdate = false;
        const newDocuments = [];

        console.log(`Processing employee ${doc.id} (${emp.firstName} ${emp.lastName})...`);

        for (const d of emp.documents) {
            const url = typeof d === 'string' ? d : d.url;
            const name = typeof d === 'string' ? 'document' : d.name;
            
            if (!url) continue;

            if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
                console.log(`  Downloading ${name}...`);
                const fileData = await downloadFile(url);
                
                if (fileData) {
                    const destination = `payroll_documents/${doc.id}_${Date.now()}_${fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    const file = bucket.file(destination);
                    
                    console.log(`  Uploading to ${destination}...`);
                    await file.save(fileData.buffer, {
                        metadata: { contentType: fileData.contentType }
                    });
                    
                    // Make public or just get download URL
                    await file.makePublic();
                    const newUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                    
                    newDocuments.push({ name: fileData.filename, url: newUrl });
                    needsUpdate = true;
                } else {
                    console.log(`  Skipping ${name} due to download error.`);
                    newDocuments.push(typeof d === 'string' ? { name: 'failed_download', url: d } : d); // Keep old URL if failed
                }
            } else {
                newDocuments.push(typeof d === 'string' ? { name: 'document', url: d } : d); // Already migrated or other URL
            }
        }
        
        // Also check photoUrl if it exists and is a Google Drive link
        let newPhotoUrl = emp.photoUrl;
        if (newPhotoUrl && newPhotoUrl.includes('drive.google.com')) {
            console.log(`  Downloading Photo...`);
            const fileData = await downloadFile(newPhotoUrl);
            if (fileData) {
                const destination = `payroll_documents/${doc.id}_${Date.now()}_photo_${fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const file = bucket.file(destination);
                
                console.log(`  Uploading Photo to ${destination}...`);
                await file.save(fileData.buffer, {
                    metadata: { contentType: fileData.contentType }
                });
                
                await file.makePublic();
                newPhotoUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(`  Updating Firestore for ${doc.id}...`);
            await db.collection('employees').doc(doc.id).update({
                documents: newDocuments,
                photoUrl: newPhotoUrl
            });
            totalUpdated++;
        }
    }

    console.log(`Migration completed. Updated ${totalUpdated} employees.`);
}

runMigration().then(() => {
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
