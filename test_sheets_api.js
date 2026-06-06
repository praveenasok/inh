const { GoogleAuth } = require('google-auth-library');
const sheets = require('googleapis/build/src/apis/sheets');

const serviceAccountPath = './service-account-key.json';
const spreadsheetId = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';

const auth = new GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

(async () => {
  // Let's create the sheets client using a custom bound context
  const customGoogle = {
    _options: {},
    auth: auth,
    sheets: function(options) {
      return sheets.sheets.call(this, options);
    }
  };

  const client = customGoogle.sheets({ version: 'v4', auth: auth });
  
  console.log('Client keys:', Object.keys(client));
  console.log('Client context keys:', Object.keys(client.context));
  console.log('Client context google keys:', Object.keys(client.context.google));
  console.log('Client context _options keys:', Object.keys(client.context._options));

  // Let's inspect the actual request method
  console.log('spreadsheets.get method:', client.spreadsheets.get.toString());
  
  process.exit(0);
})().catch(err => {
  console.error('Inspector crashed:', err);
  process.exit(1);
});
