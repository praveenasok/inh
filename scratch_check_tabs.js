const GoogleSheetsService = require('./google-sheets-service');

async function checkTabs() {
  try {
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();
    const spreadsheetId = '199EnMjmbc6idiOLnaEs8diG8h9vNHhkSH3xK4cyPrsU';
    const tabs = await sheetsService.listSheetTabs(spreadsheetId);
    console.log(tabs);
  } catch (error) {
    console.error(error);
  }
}

checkTabs();
