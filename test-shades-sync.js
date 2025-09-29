/**
 * Test script for shade data extraction and Firebase storage
 * This script tests the new shades functionality
 */

const GoogleSheetsService = require('./google-sheets-service');
const FirebaseSyncService = require('./firebase-sync-service');
const { googleSheetsAutoConfig } = require('./js/google-sheets-auto-config');

async function testShadesSync() {
    console.log('🧪 Testing Shades Data Extraction and Storage...\n');
    
    try {
        // Initialize services
        console.log('📋 Initializing services...');
        const googleSheetsService = new GoogleSheetsService();
        const firebaseSyncService = new FirebaseSyncService();
        
        await googleSheetsService.initialize();
        await firebaseSyncService.initialize();
        console.log('✅ Services initialized successfully\n');
        
        // Get spreadsheet ID
        const spreadsheetId = googleSheetsAutoConfig.getSheetId();
        console.log(`📊 Using spreadsheet ID: ${spreadsheetId}\n`);
        
        // Test 1: Fetch shades data from Google Sheets
        console.log('🔍 Test 1: Fetching shades data from Google Sheets...');
        const shadesData = await googleSheetsService.fetchShadesData(spreadsheetId);
        
        if (shadesData && shadesData.length > 0) {
            console.log(`✅ Successfully fetched ${shadesData.length} shade(s):`);
            shadesData.forEach((shade, index) => {
                console.log(`   ${index + 1}. ${shade.shadename} (ID: ${shade.id})`);
            });
        } else {
            console.log('⚠️  No shade data found. Make sure the "shade" column exists in the pricelists tab.');
        }
        console.log('');
        
        // Test 2: Sync shades data to Firebase
        console.log('🔥 Test 2: Syncing shades data to Firebase...');
        const syncResult = await firebaseSyncService.syncShadesData(spreadsheetId);
        
        if (syncResult.recordsProcessed > 0) {
            console.log(`✅ Successfully synced ${syncResult.recordsProcessed} shade(s) to Firebase`);
            console.log(`📝 Changes made: ${syncResult.changes}`);
        } else {
            console.log('⚠️  No shades data to sync or no changes detected');
        }
        console.log('');
        
        // Test 3: Verify Firebase collection
        console.log('🔍 Test 3: Verifying shades collection in Firebase...');
        if (firebaseSyncService.db) {
            const shadesCollection = firebaseSyncService.db.collection('shades');
            const snapshot = await shadesCollection.get();
            
            if (!snapshot.empty) {
                console.log(`✅ Shades collection exists with ${snapshot.size} document(s):`);
                snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    console.log(`   ${index + 1}. ${data.shadename} (Doc ID: ${doc.id})`);
                });
            } else {
                console.log('⚠️  Shades collection is empty');
            }
        } else {
            console.log('❌ Firebase not available for verification');
        }
        console.log('');
        
        console.log('🎉 Shades sync test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testShadesSync().then(() => {
        console.log('\n✨ Test execution finished');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testShadesSync };