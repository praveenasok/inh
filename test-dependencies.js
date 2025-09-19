console.log('Testing dependencies individually...');

// Test 1: Basic Node.js modules
console.log('\n1. Testing basic Node.js modules...');
try {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    console.log('✅ Basic Node.js modules loaded successfully');
} catch (error) {
    console.error('❌ Error loading basic Node.js modules:', error.message);
}

// Test 2: Firebase Admin
console.log('\n2. Testing Firebase Admin...');
try {
    const admin = require('firebase-admin');
    console.log('✅ Firebase Admin module loaded successfully');
    console.log('   - Version:', require('firebase-admin/package.json').version);
} catch (error) {
    console.error('❌ Error loading Firebase Admin:', error.message);
}

// Test 3: Google APIs
console.log('\n3. Testing Google APIs...');
try {
    const { google } = require('googleapis');
    console.log('✅ Google APIs module loaded successfully');
    console.log('   - Version:', require('googleapis/package.json').version);
} catch (error) {
    console.error('❌ Error loading Google APIs:', error.message);
}

// Test 4: Node Cron
console.log('\n4. Testing Node Cron...');
try {
    const cron = require('node-cron');
    console.log('✅ Node Cron module loaded successfully');
    console.log('   - Version:', require('node-cron/package.json').version);
} catch (error) {
    console.error('❌ Error loading Node Cron:', error.message);
}

// Test 5: XLSX
console.log('\n5. Testing XLSX...');
try {
    const XLSX = require('xlsx');
    console.log('✅ XLSX module loaded successfully');
    console.log('   - Version:', require('xlsx/package.json').version);
} catch (error) {
    console.error('❌ Error loading XLSX:', error.message);
}

// Test 6: Service account file
console.log('\n6. Testing service account file...');
try {
    const serviceAccountPath = './service-account-key.json';
    if (require('fs').existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        console.log('✅ Service account file loaded successfully');
        console.log('   - Project ID:', serviceAccount.project_id);
        console.log('   - Client Email:', serviceAccount.client_email);
    } else {
        console.log('⚠️  Service account file not found');
    }
} catch (error) {
    console.error('❌ Error loading service account file:', error.message);
}

console.log('\n✅ Dependency test completed');