const { google } = require('googleapis');

const serviceAccountPath = './service-account-key.json';
const spreadsheetId = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';

const auth = new google.auth.GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

(async () => {
  console.log('Testing standard googleapis...');
  const client = google.sheets({ version: 'v4', auth: auth });
  
  try {
    const res = await client.spreadsheets.get({ spreadsheetId });
    console.log('Standard googleapis succeeded! Title:', res.data.properties.title);
  } catch (err) {
    console.error('Standard googleapis failed:', err.message);
  }
  
  process.exit(0);
})().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
