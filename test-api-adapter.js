/**
 * Test script to verify Firebase API Adapter functionality
 */

const http = require('http');

async function testAPIEndpoint(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
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
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Firebase API Adapter endpoints...\n');

    try {
        // Test 1: Check server status
        console.log('1. Testing server status...');
        const statusResult = await testAPIEndpoint('/api/status');
        console.log(`   Status: ${statusResult.status}`);
        console.log(`   Response: ${JSON.stringify(statusResult.data)}\n`);

        // Test 2: Test get-data with collection parameter
        console.log('2. Testing get-data with products collection...');
        const productsResult = await testAPIEndpoint('/api/get-data?collection=products');
        console.log(`   Status: ${productsResult.status}`);
        console.log(`   Products count: ${Array.isArray(productsResult.data) ? productsResult.data.length : 'N/A'}\n`);

        // Test 3: Test get-data with clients collection
        console.log('3. Testing get-data with clients collection...');
        const clientsResult = await testAPIEndpoint('/api/get-data?collection=clients');
        console.log(`   Status: ${clientsResult.status}`);
        console.log(`   Clients count: ${Array.isArray(clientsResult.data) ? clientsResult.data.length : 'N/A'}\n`);

        // Test 4: Test get-styles endpoint
        console.log('4. Testing get-styles endpoint...');
        const stylesResult = await testAPIEndpoint('/api/get-styles');
        console.log(`   Status: ${stylesResult.status}`);
        console.log(`   Styles count: ${stylesResult.data && stylesResult.data.data ? stylesResult.data.data.length : 'N/A'}\n`);

        // Test 5: Test sync status
        console.log('5. Testing sync status...');
        const syncStatusResult = await testAPIEndpoint('/api/sync/status');
        console.log(`   Status: ${syncStatusResult.status}`);
        console.log(`   Sync status: ${JSON.stringify(syncStatusResult.data)}\n`);

        console.log('✅ All API endpoint tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

runTests();