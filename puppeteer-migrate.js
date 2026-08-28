const admin = require('firebase-admin');
const puppeteer = require('puppeteer');

console.log('Loading service account...');
const serviceAccount = require('./service-account-key.json');

console.log('Initializing Firebase Admin (Firestore only)...');
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore(app);

async function downloadFile(url) {
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
        if (!response.ok) return null;
        
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        let filename = 'document';
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match) filename = match[1];
        } else {
            if (contentType.includes('image/jpeg')) filename += '.jpg';
            else if (contentType.includes('image/png')) filename += '.png';
            else if (contentType.includes('application/pdf')) filename += '.pdf';
        }

        return {
            base64: Buffer.from(buffer).toString('base64'),
            contentType,
            filename
        };
    } catch (e) {
        return null;
    }
}

async function runMigration() {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log('Navigating to local server...');
    await page.goto('http://localhost:8000/payroll/index.html', { waitUntil: 'networkidle0' });
    
    // Wait for firebase to be available
    await page.waitForFunction(() => window.firebase && window.firebase.storage);
    console.log('Browser Firebase ready.');

    console.log('Fetching employees from Firestore...');
    const snapshot = await db.collection('employees').get();
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
        const emp = doc.data();
        if (!emp.documents || emp.documents.length === 0) continue;

        let needsUpdate = false;
        const newDocuments = [];

        console.log(`Processing employee ${doc.id} (${emp.firstName} ${emp.lastName})...`);

        for (const d of emp.documents) {
            if (d.url.includes('drive.google.com') || d.url.includes('googleusercontent.com')) {
                console.log(`  Downloading ${d.name}...`);
                const fileData = await downloadFile(d.url);
                
                if (fileData) {
                    const destination = `payroll_documents/${doc.id}_${Date.now()}_${fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    console.log(`  Uploading to ${destination} via Browser...`);
                    const downloadUrl = await page.evaluate(async (base64, contentType, path) => {
                        const ref = window.firebase.storage().ref(path);
                        await ref.putString(base64, 'base64', { contentType });
                        return await ref.getDownloadURL();
                    }, fileData.base64, fileData.contentType, destination);
                    
                    newDocuments.push({ name: d.name, url: downloadUrl });
                    needsUpdate = true;
                } else {
                    console.log(`  Skipping ${d.name} due to download error.`);
                    newDocuments.push(d); 
                }
            } else {
                newDocuments.push(d); 
            }
        }
        
        let newPhotoUrl = emp.photoUrl;
        if (newPhotoUrl && newPhotoUrl.includes('drive.google.com')) {
            console.log(`  Downloading Photo...`);
            const fileData = await downloadFile(newPhotoUrl);
            if (fileData) {
                const destination = `payroll_documents/${doc.id}_${Date.now()}_photo_${fileData.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                
                console.log(`  Uploading Photo to ${destination} via Browser...`);
                const downloadUrl = await page.evaluate(async (base64, contentType, path) => {
                    const ref = window.firebase.storage().ref(path);
                    await ref.putString(base64, 'base64', { contentType });
                    return await ref.getDownloadURL();
                }, fileData.base64, fileData.contentType, destination);
                
                newPhotoUrl = downloadUrl;
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
    await browser.close();
}

runMigration().then(() => {
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
