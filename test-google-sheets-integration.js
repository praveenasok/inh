// Comprehensive Google Sheets Integration Test
// This script tests all Google Sheets functionality with the updated API key

class GoogleSheetsIntegrationTest {
    constructor() {
        this.API_KEY = '35bbf27b0bf3abb0a9fec63e815006a5785ec7bb';
        this.SHEET_ID = '1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s';
        this.PUBLIC_SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
        this.testResults = [];
    }

    log(test, status, message, details = '') {
        const result = {
            test,
            status,
            message,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        console.log(`[${status.toUpperCase()}] ${test}: ${message}`);
        if (details) console.log(`  Details: ${details}`);
    }

    async testBasicApiAccess() {
        console.log('\n🔍 Testing Basic API Access...');
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.PUBLIC_SHEET_ID}?key=${this.API_KEY}`);
            
            if (response.ok) {
                const data = await response.json();
                this.log('Basic API Access', 'success', 'API key is valid and working', 
                    `Accessed: "${data.properties.title}" with ${data.sheets.length} sheets`);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.log('Basic API Access', 'error', `HTTP ${response.status}: ${response.statusText}`, 
                    JSON.stringify(errorData, null, 2));
                return false;
            }
        } catch (error) {
            this.log('Basic API Access', 'error', 'Network error', error.message);
            return false;
        }
    }

    async testConfiguredSheetAccess() {
        console.log('\n📊 Testing Configured Sheet Access...');
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}?key=${this.API_KEY}`);
            
            if (response.ok) {
                const data = await response.json();
                this.log('Configured Sheet Access', 'success', 'Successfully accessed configured spreadsheet', 
                    `Title: "${data.properties.title}", Sheets: ${data.sheets.map(s => s.properties.title).join(', ')}`);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.log('Configured Sheet Access', 'error', `Cannot access configured spreadsheet: HTTP ${response.status}`, 
                    JSON.stringify(errorData, null, 2));
                return false;
            }
        } catch (error) {
            this.log('Configured Sheet Access', 'error', 'Network error', error.message);
            return false;
        }
    }

    async testDataRetrieval() {
        console.log('\n📋 Testing Data Retrieval...');
        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.PUBLIC_SHEET_ID}/values/Class Data!A1:F10?key=${this.API_KEY}`);
            
            if (response.ok) {
                const data = await response.json();
                this.log('Data Retrieval', 'success', 'Successfully retrieved spreadsheet data', 
                    `Retrieved ${data.values ? data.values.length : 0} rows of data`);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.log('Data Retrieval', 'error', `Failed to retrieve data: HTTP ${response.status}`, 
                    JSON.stringify(errorData, null, 2));
                return false;
            }
        } catch (error) {
            this.log('Data Retrieval', 'error', 'Network error during data retrieval', error.message);
            return false;
        }
    }

    async testGapiIntegration() {
        console.log('\n🔧 Testing GAPI Integration...');
        
        if (typeof gapi === 'undefined') {
            this.log('GAPI Integration', 'error', 'GAPI library not available', 
                'This test requires the Google API JavaScript client library');
            return false;
        }

        try {
            // Load the client
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 10000,
                    ontimeout: () => reject(new Error('Timeout loading gapi.client'))
                });
            });

            this.log('GAPI Client Load', 'success', 'GAPI client loaded successfully');

            // Initialize the client
            await gapi.client.init({
                apiKey: this.API_KEY,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            this.log('GAPI Client Init', 'success', 'GAPI client initialized successfully');

            // Test API call
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.PUBLIC_SHEET_ID
            });

            this.log('GAPI API Call', 'success', 'Successfully made API call via GAPI', 
                `Retrieved: "${response.result.properties.title}"`);
            return true;

        } catch (error) {
            this.log('GAPI Integration', 'error', 'GAPI integration failed', error.message);
            return false;
        }
    }

    async testQuotaAndLimits() {
        console.log('\n⚡ Testing API Quota and Limits...');
        try {
            const startTime = Date.now();
            const promises = [];
            
            // Make multiple concurrent requests to test quota
            for (let i = 0; i < 5; i++) {
                promises.push(
                    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.PUBLIC_SHEET_ID}?key=${this.API_KEY}`)
                );
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.ok).length;
            const errorCount = responses.length - successCount;

            if (successCount === responses.length) {
                this.log('Quota and Limits', 'success', `All ${responses.length} concurrent requests succeeded`, 
                    `Duration: ${duration}ms, Average: ${Math.round(duration / responses.length)}ms per request`);
                return true;
            } else {
                this.log('Quota and Limits', 'warning', `${successCount}/${responses.length} requests succeeded`, 
                    `${errorCount} requests failed, possibly due to rate limiting`);
                return false;
            }
        } catch (error) {
            this.log('Quota and Limits', 'error', 'Failed to test quota limits', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Google Sheets Integration Test');
        console.log(`📅 Test started at: ${new Date().toLocaleString()}`);
        console.log(`🔑 API Key: ${this.API_KEY.substring(0, 10)}...${this.API_KEY.substring(this.API_KEY.length - 4)}`);
        console.log(`📊 Sheet ID: ${this.SHEET_ID.substring(0, 10)}...`);
        console.log('=' * 60);

        const tests = [
            { name: 'Basic API Access', method: this.testBasicApiAccess },
            { name: 'Configured Sheet Access', method: this.testConfiguredSheetAccess },
            { name: 'Data Retrieval', method: this.testDataRetrieval },
            { name: 'GAPI Integration', method: this.testGapiIntegration },
            { name: 'Quota and Limits', method: this.testQuotaAndLimits }
        ];

        const results = {};
        
        for (const test of tests) {
            try {
                results[test.name] = await test.method.call(this);
            } catch (error) {
                this.log(test.name, 'error', 'Test execution failed', error.message);
                results[test.name] = false;
            }
        }

        this.generateReport(results);
        return results;
    }

    generateReport(results) {
        console.log('\n' + '=' * 60);
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' * 60);

        const successCount = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        const successRate = Math.round((successCount / totalTests) * 100);

        console.log(`✅ Passed: ${successCount}/${totalTests} tests (${successRate}%)`);
        console.log(`❌ Failed: ${totalTests - successCount}/${totalTests} tests`);

        console.log('\nDetailed Results:');
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`  ${passed ? '✅' : '❌'} ${test}`);
        });

        if (successCount === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED! Google Sheets integration is fully functional.');
        } else if (successCount > 0) {
            console.log('\n⚠️  PARTIAL SUCCESS: Some tests failed. Check the details above.');
        } else {
            console.log('\n💥 ALL TESTS FAILED: Google Sheets integration is not working.');
        }

        console.log('\n📋 Recommendations:');
        if (!results['Basic API Access']) {
            console.log('  • Check if the API key is valid and has the correct permissions');
            console.log('  • Verify that the Google Sheets API is enabled in Google Cloud Console');
        }
        if (!results['Configured Sheet Access']) {
            console.log('  • Check if the configured spreadsheet ID is correct');
            console.log('  • Verify that the spreadsheet is publicly accessible or shared with the service account');
        }
        if (!results['GAPI Integration']) {
            console.log('  • Ensure the Google API JavaScript client library is loaded');
            console.log('  • Check browser console for any JavaScript errors');
        }
        if (!results['Quota and Limits']) {
            console.log('  • Monitor API usage to avoid hitting quota limits');
            console.log('  • Consider implementing request throttling for high-volume operations');
        }

        console.log(`\n📅 Test completed at: ${new Date().toLocaleString()}`);
        console.log('=' * 60);
    }

    getTestResults() {
        return this.testResults;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleSheetsIntegrationTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.GoogleSheetsIntegrationTest = GoogleSheetsIntegrationTest;
    
    // Add a global function to run tests
    window.runGoogleSheetsTests = async function() {
        const tester = new GoogleSheetsIntegrationTest();
        return await tester.runAllTests();
    };
    
    console.log('Google Sheets Integration Test loaded. Run window.runGoogleSheetsTests() to start testing.');
}