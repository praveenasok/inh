#!/usr/bin/env node

/**
 * Script to fetch data from the 'pricelists' worksheet in Google Sheets
 * This will retrieve all data from the pricelists worksheet accurately and completely
 */

const GoogleSheetsService = require('./google-sheets-service');
const fs = require('fs');
const path = require('path');

async function fetchPricelistsData() {
  console.log('🔍 Fetching data from pricelists worksheet...');
  console.log('=' .repeat(60));
  
  try {
    // Initialize Google Sheets service
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();
    
    console.log('✅ Google Sheets API initialized successfully');
    
    // The spreadsheet ID from configuration
    const spreadsheetId = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
    
    // Fetch data from pricelists worksheet
    console.log('📊 Fetching data from pricelists worksheet...');
    const pricelistsData = await sheetsService.fetchProductData(spreadsheetId, 'pricelists!A1:Z1000');
    
    console.log(`✅ Successfully retrieved ${pricelistsData.length} rows from pricelists worksheet`);
    
    if (pricelistsData.length > 0) {
      console.log('\n📋 Sample data (first 3 rows):');
      console.log('Headers:', Object.keys(pricelistsData[0]));
      
      // Show first 3 rows of data
      pricelistsData.slice(0, 3).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            console.log(`  ${key}: ${value}`);
          }
        });
      });
      
      // Save data to JSON file for inspection
      const outputPath = path.join(__dirname, 'pricelists-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(pricelistsData, null, 2));
      console.log(`\n💾 Complete data saved to: ${outputPath}`);
      
      // Show summary statistics
      console.log('\n📊 Data Summary:');
      console.log(`   Total rows: ${pricelistsData.length}`);
      console.log(`   Columns: ${Object.keys(pricelistsData[0]).length}`);
      
      // Check for key columns
      const firstRow = pricelistsData[0];
      const keyColumns = ['Category', 'Product', 'Rate', 'PriceListName', 'Currency'];
      console.log('\n🔍 Key columns present:');
      keyColumns.forEach(col => {
        const hasColumn = Object.keys(firstRow).some(key => 
          key.toLowerCase().includes(col.toLowerCase()) || 
          col.toLowerCase().includes(key.toLowerCase())
        );
        console.log(`   ${col}: ${hasColumn ? '✅' : '❌'}`);
      });
      
    } else {
      console.log('⚠️  No data found in pricelists worksheet');
      console.log('   This could mean:');
      console.log('   1. The worksheet is empty');
      console.log('   2. The worksheet name "pricelists" does not exist');
      console.log('   3. The service account does not have access to the sheet');
    }
    
    console.log('\n🎉 Data extraction completed successfully!');
    return pricelistsData;
    
  } catch (error) {
    console.error('❌ Error fetching pricelists data:', error.message);
    
    // Provide specific guidance based on error type
    if (error.message.includes('Unable to parse range')) {
      console.log('\n💡 Suggestion: The worksheet "pricelists" may not exist.');
      console.log('   Check the worksheet tabs in your Google Sheets document.');
    } else if (error.message.includes('permission')) {
      console.log('\n💡 Suggestion: Check that the service account has access to the sheet.');
      console.log('   Make sure the sheet is shared with the service account email.');
    } else if (error.message.includes('not found')) {
      console.log('\n💡 Suggestion: Verify the Google Sheets ID is correct.');
      console.log('   Current ID: 1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s');
    }
    
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fetchPricelistsData()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = fetchPricelistsData;