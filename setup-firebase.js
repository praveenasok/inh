#!/usr/bin/env node

// Firebase Setup Script
// Automates Firebase project setup and configuration

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FirebaseSetup {
  constructor() {
    this.projectId = 'quotemaker-app'; // Use existing project ID
    this.setupComplete = false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkFirebaseCLI() {
    try {
      const version = execSync('firebase --version', { encoding: 'utf8' }).trim();
      this.log(`Firebase CLI version: ${version}`);
      return true;
    } catch (error) {
      this.log('Firebase CLI not found. Please install it with: npm install -g firebase-tools', 'error');
      return false;
    }
  }

  async checkAuthentication() {
    try {
      execSync('firebase projects:list', { encoding: 'utf8', stdio: 'pipe' });
      this.log('Firebase authentication verified');
      return true;
    } catch (error) {
      this.log('Firebase authentication required. Please run: firebase login', 'warning');
      return false;
    }
  }

  async enableFirestoreInConsole() {
    this.log('Please enable Firestore in Firebase Console:', 'warning');
    this.log('1. Go to https://console.firebase.google.com/');
    this.log('2. Select your project: ' + this.projectId);
    this.log('3. Go to Firestore Database');
    this.log('4. Click "Create database"');
    this.log('5. Choose "Start in test mode"');
    this.log('6. Select a location close to your users');
    this.log('7. Click "Done"');
    this.log('');
  }

  async enableStorageInConsole() {
    this.log('Please enable Firebase Storage in Firebase Console:', 'warning');
    this.log('1. Go to https://console.firebase.google.com/');
    this.log('2. Select your project: ' + this.projectId);
    this.log('3. Go to Storage');
    this.log('4. Click "Get started"');
    this.log('5. Choose "Start in test mode"');
    this.log('6. Select the same location as Firestore');
    this.log('7. Click "Done"');
    this.log('');
  }

  async updateFirebaseConfig() {
    this.log('Please update Firebase configuration:');
    this.log('1. Go to Project Settings in Firebase Console');
    this.log('2. Scroll to "Your apps" section');
    this.log('3. If no web app exists, click "Add app" → Web');
    this.log('4. Copy the configuration object');
    this.log('5. Update firebase-config.js with your actual values');
    this.log('');
    
    const configPath = path.join(__dirname, 'firebase-config.js');
    if (fs.existsSync(configPath)) {
      this.log('Firebase config file exists: ' + configPath);
    } else {
      this.log('Firebase config file not found: ' + configPath, 'error');
    }
  }

  async deployFirestoreRules() {
    try {
      this.log('Deploying Firestore security rules...');
      execSync('firebase deploy --only firestore:rules', { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
      this.log('Firestore rules deployed successfully', 'success');
      return true;
    } catch (error) {
      this.log('Failed to deploy Firestore rules: ' + error.message, 'error');
      return false;
    }
  }

  async deployFirestoreIndexes() {
    try {
      this.log('Deploying Firestore indexes...');
      execSync('firebase deploy --only firestore:indexes', { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
      this.log('Firestore indexes deployed successfully', 'success');
      return true;
    } catch (error) {
      this.log('Failed to deploy Firestore indexes: ' + error.message, 'error');
      return false;
    }
  }

  async deployStorageRules() {
    try {
      this.log('Deploying Storage security rules...');
      execSync('firebase deploy --only storage', { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
      this.log('Storage rules deployed successfully', 'success');
      return true;
    } catch (error) {
      this.log('Failed to deploy Storage rules: ' + error.message, 'error');
      return false;
    }
  }

  async verifyFiles() {
    const requiredFiles = [
      'firebase.json',
      'firestore.rules',
      'firestore.indexes.json',
      'storage.rules',
      'firebase-config.js',
      'firebase-database.js'
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        this.log(`✓ ${file} exists`);
      } else {
        this.log(`✗ ${file} missing`, 'error');
        allFilesExist = false;
      }
    }

    return allFilesExist;
  }

  async createSampleData() {
    const sampleDataScript = `
// Sample data creation script
// Run this in browser console after Firebase is initialized

async function createSampleData() {
  if (!window.firebaseDB || !window.firebaseDB.isAvailable()) {
    console.error('Firebase not available');
    return;
  }

  try {
    // Sample client data
    const sampleClient = {
      clientName: 'Sample Client',
      companyName: 'Sample Company Ltd',
      phone1: '+1-555-123-4567',
      contactPerson: 'John Doe',
      email: 'john@samplecompany.com',
      address: '123 Business Street, City, State 12345',
      salesperson: 'Praveen',
      deviceId: 'SAMPLE-DEVICE-001'
    };

    const savedClient = await window.firebaseDB.saveClient(sampleClient);
    console.log('Sample client created:', savedClient);

    // Sample quote data
    const sampleQuote = {
      quoteNumber: 'INH-00001-' + new Date().toISOString().slice(0, 10),
      clientId: savedClient.id,
      clientName: sampleClient.clientName,
      salesperson: 'Praveen',
      items: [
        {
          product: 'Clip-On Extensions',
          quantity: 2,
          rate: 150,
          total: 300
        }
      ],
      subtotal: 300,
      tax: 30,
      shipping: 20,
      total: 350,
      status: 'draft'
    };

    const savedQuote = await window.firebaseDB.saveQuote(sampleQuote);
    console.log('Sample quote created:', savedQuote);

    // Sample salesmen data
    const sampleSalesmen = ['Praveen', 'Rupa', 'INH', 'HW', 'Vijay', 'Pankaj', 'Sunil'];
    await window.firebaseDB.saveSalesmen(sampleSalesmen);
    console.log('Sample salesmen data saved');

    console.log('Sample data creation completed successfully!');

  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

// Call the function
createSampleData();
`;

    const scriptPath = path.join(__dirname, 'create-sample-data.js');
    fs.writeFileSync(scriptPath, sampleDataScript);
    this.log('Sample data script created: create-sample-data.js');
  }

  async run() {
    this.log('🚀 Starting Firebase setup for Indian Natural Hair application...');
    this.log('');

    // Step 1: Check Firebase CLI
    if (!(await this.checkFirebaseCLI())) {
      return false;
    }

    // Step 2: Check authentication
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      this.log('Please authenticate with Firebase and run this script again:', 'warning');
      this.log('firebase login');
      this.log('node setup-firebase.js');
      return false;
    }

    // Step 3: Verify required files
    if (!(await this.verifyFiles())) {
      this.log('Some required files are missing. Please check the setup.', 'error');
      return false;
    }

    // Step 4: Manual steps (require user action)
    this.log('='.repeat(60));
    this.log('MANUAL SETUP REQUIRED');
    this.log('='.repeat(60));
    
    await this.enableFirestoreInConsole();
    await this.enableStorageInConsole();
    await this.updateFirebaseConfig();

    this.log('After completing the manual steps above, you can deploy the rules:');
    this.log('');
    this.log('# Deploy Firestore rules and indexes');
    this.log('firebase deploy --only firestore');
    this.log('');
    this.log('# Deploy Storage rules');
    this.log('firebase deploy --only storage');
    this.log('');
    this.log('# Deploy complete application');
    this.log('npm run deploy');
    this.log('');

    // Step 5: Create sample data script
    await this.createSampleData();

    this.log('='.repeat(60));
    this.log('SETUP SUMMARY');
    this.log('='.repeat(60));
    this.log('✅ Firebase CLI verified');
    this.log('✅ Authentication verified');
    this.log('✅ Configuration files created');
    this.log('✅ Sample data script created');
    this.log('');
    this.log('Next steps:');
    this.log('1. Enable Firestore and Storage in Firebase Console');
    this.log('2. Update firebase-config.js with your project configuration');
    this.log('3. Deploy rules: firebase deploy --only firestore,storage');
    this.log('4. Deploy application: npm run deploy');
    this.log('5. Test the application with Firebase integration');
    this.log('');
    this.log('🎉 Firebase setup preparation completed!');

    return true;
  }
}

// Run the setup if called directly
if (require.main === module) {
  const setup = new FirebaseSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = FirebaseSetup;