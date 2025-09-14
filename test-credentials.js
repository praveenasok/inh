#!/usr/bin/env node

/**
 * Test script to validate Google Sheets credentials setup
 * Run this script to test your credentials before using the sync system
 */

const GoogleSheetsService = require('./google-sheets-service');
const path = require('path');
const fs = require('fs');

async function testCredentials() {
  console.log('🔍 Testing Google Sheets credentials...');
  console.log('=' .repeat(50));
  
  try {
    // Check if service account key file exists
    const keyPath = path.join(__dirname, 'service-account-key.json');
    if (!fs.existsSync(keyPath)) {
      console.log('❌ service-account-key.json not found');
      console.log('📖 Please see GOOGLE_SHEETS_CREDENTIALS_SETUP.md for setup instructions');
      return false;
    }
    
    console.log('✅ service-account-key.json found');
    
    // Initialize Google Sheets service
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();
    
    console.log('✅ Google Sheets API initialized successfully');
    
    // Test basic API access (try to access the actual spreadsheet)
    const testSpreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    
    try {
      const testData = await sheetsService.fetchProductData(testSpreadsheetId, 'Sheet1!A1:A1');
      console.log('✅ Successfully connected to Google Sheets');
      console.log('✅ Credentials are valid and working');
      
      console.log('\n🎉 All tests passed! Your Google Sheets integration is ready.');
      console.log('\n📋 Next steps:');
      console.log('   1. Make sure your Google Sheets are shared with the service account');
      console.log('   2. Update spreadsheet IDs in your configuration if needed');
      console.log('   3. Test the sync functionality from the admin interface');
      
      return true;
    } catch (accessError) {
      if (accessError.message.includes('does not have permission')) {
        console.log('⚠️  Credentials are valid but sheet access is restricted');
        console.log('📋 Please share your Google Sheets with the service account:');
        
        // Try to extract service account email from the key file
        try {
          const keyContent = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.log(`   📧 Service account email: ${keyContent.client_email}`);
        } catch (e) {
          console.log('   📧 Check the client_email field in service-account-key.json');
        }
        
        console.log('   🔗 Share your sheets with "Viewer" or "Editor" permission');
        return false;
      } else {
        throw accessError;
      }
    }
    
  } catch (error) {
    console.log('❌ Credential test failed:');
    console.log(`   Error: ${error.message}`);
    
    // Provide specific guidance based on error type
    if (error.message.includes('placeholder values')) {
      console.log('\n💡 Solution:');
      console.log('   Your service-account-key.json contains placeholder values.');
      console.log('   Please download a real key from Google Cloud Console.');
    } else if (error.message.includes('Invalid PEM formatted message')) {
      console.log('\n💡 Solution:');
      console.log('   The private key in your service account file is invalid.');
      console.log('   Please download a new key from Google Cloud Console.');
    } else if (error.message.includes('Invalid JSON format')) {
      console.log('\n💡 Solution:');
      console.log('   Your service-account-key.json file is corrupted.');
      console.log('   Please download a new key from Google Cloud Console.');
    }
    
    console.log('\n📖 For detailed setup instructions, see:');
    console.log('   GOOGLE_SHEETS_CREDENTIALS_SETUP.md');
    
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCredentials()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testCredentials };