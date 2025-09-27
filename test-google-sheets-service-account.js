const { google } = require('googleapis');
const path = require('path');

async function testGoogleSheetsServiceAccount() {
  try {
    console.log('🔍 Testing Google Sheets Service Account Authentication...');
    
    // Load service account credentials
    const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
    console.log(`📁 Service account path: ${serviceAccountPath}`);
    
    let serviceAccount;
    try {
      serviceAccount = require(serviceAccountPath);
      console.log('✅ Service account file loaded successfully');
      console.log(`📋 Project ID: ${serviceAccount.project_id}`);
      console.log(`📧 Client Email: ${serviceAccount.client_email}`);
      console.log(`🔑 Private Key ID: ${serviceAccount.private_key_id}`);
    } catch (error) {
      console.error('❌ Failed to load service account file:', error.message);
      return;
    }
    
    // Create JWT auth client using the service account file
    console.log('🔐 Creating JWT authentication client...');
    const jwtClient = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    
    // Get auth client
    console.log('🔓 Getting auth client...');
    const authClient = await jwtClient.getClient();
    console.log('✅ Auth client obtained successfully');
    
    // Create Sheets API instance
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // Test with the configured sheet ID
    const sheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    console.log(`📊 Testing access to sheet: ${sheetId}`);
    
    try {
      // Get sheet metadata
      console.log('📋 Getting sheet metadata...');
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });
      
      console.log('✅ Successfully accessed sheet metadata');
      console.log(`📝 Sheet title: ${sheetInfo.data.properties.title}`);
      console.log(`📄 Number of sheets: ${sheetInfo.data.sheets.length}`);
      
      // List sheet names
      console.log('📑 Available sheets:');
      sheetInfo.data.sheets.forEach((sheet, index) => {
        console.log(`  ${index + 1}. ${sheet.properties.title}`);
      });
      
      // Try to read some data
      console.log('📖 Testing data read from first sheet...');
      const firstSheetName = sheetInfo.data.sheets[0].properties.title;
      const range = `${firstSheetName}!A1:E10`;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range
      });
      
      const values = response.data.values;
      if (values && values.length > 0) {
        console.log(`✅ Successfully read ${values.length} rows of data`);
        console.log('📊 First few rows:');
        values.slice(0, 3).forEach((row, index) => {
          console.log(`  Row ${index + 1}: ${row.join(' | ')}`);
        });
      } else {
        console.log('⚠️ No data found in the specified range');
      }
      
    } catch (error) {
      console.error('❌ Failed to access Google Sheet:', error.message);
      if (error.code === 403) {
        console.log('💡 This likely means the sheet is not shared with the service account email.');
        console.log(`💡 Please share the sheet with: ${serviceAccount.client_email}`);
      }
      throw error;
    }
    
    console.log('🎉 Google Sheets service account test completed successfully!');
    
  } catch (error) {
    console.error('❌ Google Sheets service account test failed:', error.message);
    console.error('Error details:', error.code || 'Unknown error code');
    throw error;
  }
}

// Run the test
testGoogleSheetsServiceAccount().then(() => {
  console.log('✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});