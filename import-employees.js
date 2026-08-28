console.log('Starting script...');
const fs = require('fs');
const admin = require('firebase-admin');
console.log('Loading service account...');
let serviceAccount;
try {
  serviceAccount = require('./service-account-key.json');
} catch (e) {
  console.error('Failed to load service account', e);
  process.exit(1);
}
console.log('Initializing Firebase...');
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
console.log('Firebase initialized.');
const db = admin.firestore(app);

function parseCSVLine(text) {
    let ret = [], keep = false, token = '';
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (ch === '"') {
            keep = !keep;
        } else if (ch === ',' && !keep) {
            ret.push(token);
            token = '';
        } else {
            token += ch;
        }
    }
    ret.push(token);
    return ret;
}

async function importEmployees() {
  const csvText = fs.readFileSync('employee_data.csv', 'utf8');
  const lines = csvText.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  const batch = db.batch();
  const employeesRef = db.collection('employees');
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    
    // Map headers to values
    const row = {};
    headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] || '';
    });
    
    // Extract name
    const fullName = row['Name'] || '';
    const nameParts = fullName.split(' ');
    const firstName = row['Short Name'] || nameParts[0] || '';
    const lastName = nameParts.slice(firstName === nameParts[0] ? 1 : 0).join(' ') || '';
    
    // Parents
    const parents = [];
    if (row["Father’s Name"]) parents.push(`${row["Father’s Name"]}`);
    if (row["Mother’s Name"]) parents.push(`${row["Mother’s Name"]}`);
    
    // Contacts
    const contacts = [];
    if (row['Phone Number']) contacts.push(row['Phone Number']);
    if (row['Emergency Contact']) contacts.push(`Emergency: ${row['Emergency Contact']}`);
    
    // Documents
    let docs = [];
    if (row['Identity Document']) {
        // IDs are separated by comma in a quoted string maybe
        docs = row['Identity Document'].split(',').map(u => u.trim()).filter(Boolean);
    }
    
    // Joining Date from Timestamp
    let joiningDate = '';
    const ts = row['टाइमस्टैम्प'];
    if (ts) {
        const parts = ts.split(' ')[0].split('/'); // DD/MM/YYYY
        if (parts.length === 3) {
            joiningDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    
    // Formulate employee document
    const employeeData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNumbers: contacts.join(', '),
        emailId: '',
        spouseName: row["Spouse's Name"] || '',
        parentsNames: parents.join(' & '),
        permanentAddress: row['Permanent Address'] || '',
        correspondenceAddress: row['Local Address'] || '',
        jobProfile: 'Employee', // Default since it wasn't requested in form
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        baseSalary: 0,
        status: 'Active',
        documents: docs, // Direct google drive links from the form
        photoUrl: row['Photo'] || '',
        dateOfBirth: row['Date of Birth'] || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = employeesRef.doc();
    batch.set(docRef, employeeData);
  }
  
  console.log('Committing batch...');
  await batch.commit();
  console.log('Imported ' + (lines.length - 1) + ' employees successfully into Firestore.');
}

console.log('Calling importEmployees()...');
importEmployees().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(e => {
    console.error('Error during import:', e);
    process.exit(1);
});
