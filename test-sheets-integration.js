const GoogleSheetsService = require('./google-sheets-service');

async function testSheetsIntegration() {
  try {
    console.log('🔍 Testing Google Sheets Integration...');
    
    const sheetsService = new GoogleSheetsService();
    
    console.log('🚀 Initializing Google Sheets service...');
    await sheetsService.initialize();
    console.log('✅ Google Sheets service initialized successfully');
    
    // Test reading from the main spreadsheet
    const spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    
    console.log('📖 Testing read access to Products sheet...');
    try {
      const productsData = await sheetsService.fetchProductData(spreadsheetId);
      console.log(`✅ Successfully read Products sheet. Found ${productsData.length} rows.`);
      
      if (productsData.length > 0) {
        console.log('📋 Sample product data:');
        console.log('   Headers:', Object.keys(productsData[0]));
        console.log('   First row:', productsData[0]);
      }
    } catch (error) {
      console.error('❌ Failed to read Products sheet:', error.message);
    }
    
    console.log('📖 Testing read access to Salesmen sheet...');
    try {
      const salesmenData = await sheetsService.fetchSalesmanData(spreadsheetId);
      console.log(`✅ Successfully read Salesmen sheet. Found ${salesmenData.length} rows.`);
      
      if (salesmenData.length > 0) {
        console.log('📋 Sample salesman data:');
        console.log('   Headers:', Object.keys(salesmenData[0]));
        console.log('   First row:', salesmenData[0]);
      }
    } catch (error) {
      console.error('❌ Failed to read Salesmen sheet:', error.message);
    }
    
    console.log('📖 Testing read access to Colors sheet...');
    try {
      const colorsData = await sheetsService.fetchColorsData(spreadsheetId);
      console.log(`✅ Successfully read Colors sheet. Found ${colorsData.length} rows.`);
      
      if (colorsData.length > 0) {
        console.log('📋 Sample color data:');
        console.log('   Headers:', Object.keys(colorsData[0]));
        console.log('   First row:', colorsData[0]);
      }
    } catch (error) {
      console.error('❌ Failed to read Colors sheet:', error.message);
    }
    
    console.log('🎉 Google Sheets integration test completed!');
    
  } catch (error) {
    console.error('❌ Google Sheets integration test failed:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

// Run the test
testSheetsIntegration().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});