/**
 * Test script to verify data accuracy and identify visualization issues
 */

const http = require('http');

async function testAPIEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body, error: error.message });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function analyzeDataAccuracy() {
    console.log('🔍 Testing Data Accuracy for Statistics Visualization...\n');

    const collections = ['products', 'clients', 'salespeople', 'colors', 'styles', 'quotes', 'orders'];
    const results = {};

    for (const collection of collections) {
        try {
            console.log(`📊 Testing ${collection} collection...`);
            const result = await testAPIEndpoint(`/api/get-data?collection=${collection}`);
            
            if (result.status === 200) {
                const data = result.data;
                
                if (Array.isArray(data)) {
                    results[collection] = {
                        count: data.length,
                        status: 'success',
                        sampleData: data.slice(0, 2), // First 2 items for inspection
                        dataTypes: data.length > 0 ? Object.keys(data[0]) : [],
                        hasValidIds: data.every(item => item.id),
                        hasNullValues: data.some(item => Object.values(item).includes(null)),
                        hasUndefinedValues: data.some(item => Object.values(item).includes(undefined)),
                        hasEmptyStrings: data.some(item => Object.values(item).includes(''))
                    };
                    
                    console.log(`   ✅ Count: ${data.length}`);
                    console.log(`   ✅ Valid IDs: ${results[collection].hasValidIds}`);
                    console.log(`   ⚠️  Has null values: ${results[collection].hasNullValues}`);
                    console.log(`   ⚠️  Has undefined values: ${results[collection].hasUndefinedValues}`);
                    console.log(`   ⚠️  Has empty strings: ${results[collection].hasEmptyStrings}`);
                } else {
                    results[collection] = {
                        count: 0,
                        status: 'error',
                        error: 'Data is not an array',
                        response: data
                    };
                    console.log(`   ❌ Error: Data is not an array`);
                }
            } else {
                results[collection] = {
                    count: 0,
                    status: 'error',
                    error: `HTTP ${result.status}`,
                    response: result.data
                };
                console.log(`   ❌ Error: HTTP ${result.status}`);
            }
        } catch (error) {
            results[collection] = {
                count: 0,
                status: 'error',
                error: error.message
            };
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
    }

    // Summary
    console.log('📋 SUMMARY:');
    console.log('===========');
    
    let totalItems = 0;
    let successfulCollections = 0;
    let collectionsWithIssues = [];

    for (const [collection, result] of Object.entries(results)) {
        if (result.status === 'success') {
            successfulCollections++;
            totalItems += result.count;
            console.log(`${collection.padEnd(12)}: ${result.count.toString().padStart(4)} items`);
            
            if (result.hasNullValues || result.hasUndefinedValues || result.hasEmptyStrings) {
                collectionsWithIssues.push(collection);
            }
        } else {
            console.log(`${collection.padEnd(12)}: ERROR - ${result.error}`);
        }
    }

    console.log(`\nTotal items: ${totalItems}`);
    console.log(`Successful collections: ${successfulCollections}/${collections.length}`);
    
    if (collectionsWithIssues.length > 0) {
        console.log(`\n⚠️  Collections with data quality issues: ${collectionsWithIssues.join(', ')}`);
    }

    // Test specific data integrity issues
    console.log('\n🔬 DETAILED DATA ANALYSIS:');
    console.log('===========================');
    
    for (const [collection, result] of Object.entries(results)) {
        if (result.status === 'success' && result.sampleData.length > 0) {
            console.log(`\n${collection.toUpperCase()}:`);
            console.log(`  Sample data structure: ${JSON.stringify(result.dataTypes)}`);
            console.log(`  Sample item: ${JSON.stringify(result.sampleData[0], null, 2)}`);
        }
    }

    return results;
}

// Run the analysis
analyzeDataAccuracy().catch(console.error);