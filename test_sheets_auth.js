const { GoogleAuth } = require('google-auth-library');
const https = require('https');

const serviceAccountPath = './service-account-key.json';
const spreadsheetId = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';

const auth = new GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

(async () => {
  try {
    console.log('1. Getting auth client...');
    const authClient = await auth.getClient();
    
    console.log('2. Fetching access token...');
    const tokenResponse = await authClient.getAccessToken();
    const token = tokenResponse.token;
    console.log('Access token obtained successfully! Starts with:', token ? token.substring(0, 10) + '...' : 'null');

    console.log('3. Sending raw authenticated GET request to Google Sheets API...');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    
    const req = https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('HTTP Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        try {
          const json = JSON.parse(body);
          console.log('Parsed Response JSON:', JSON.stringify(json, null, 2));
        } catch (_) {
          console.log('Raw Response Body:', body);
        }
        process.exit(0);
      });
    });

    req.on('error', (err) => {
      console.error('Network request failed:', err);
      process.exit(1);
    });

  } catch (err) {
    console.error('Auth test crashed:', err);
    process.exit(1);
  }
})().catch(err => {
  console.error('Unhandled exception:', err);
  process.exit(1);
});
