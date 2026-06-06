const spreadsheetId = '1HhVr9wWniNXas_-aGB5B2V_0lSMWohbollCporqEuPs';
const gid = '143866920';
const apiKey = 'AIzaSyAdESdS-vNgXcvp0ZUv3AsYkryNdCemztI';

async function inspect() {
  try {
    console.log('1. Fetching spreadsheet metadata...');
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    const metaResp = await fetch(metaUrl);
    if (!metaResp.ok) {
      const errText = await metaResp.text();
      console.error(`Metadata response error (HTTP ${metaResp.status}):`, errText);
      return;
    }
    const metaData = await metaResp.json();
    console.log(`Spreadsheet title: "${metaData.properties?.title}"`);
    const sheetsList = metaData.sheets || [];
    console.log(`Found ${sheetsList.length} sheets in spreadsheet.`);
    
    const targetSheet = sheetsList.find(s => String(s.properties?.sheetId) === String(gid));
    if (!targetSheet) {
      console.error(`ERROR: Target GID ${gid} not found in spreadsheet sheets list:`);
      sheetsList.forEach(s => {
        console.log(`  - GID: ${s.properties?.sheetId}, Title: "${s.properties?.title}"`);
      });
      return;
    }
    
    const tabTitle = targetSheet.properties.title;
    console.log(`Found target sheet GID ${gid} -> Title: "${tabTitle}"`);
    
    console.log('2. Fetching sheet values...');
    const valUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}!A1:ZZZ?key=${apiKey}`;
    const valResp = await fetch(valUrl);
    if (!valResp.ok) {
      const errText = await valResp.text();
      console.error(`Values response error (HTTP ${valResp.status}):`, errText);
      return;
    }
    const valData = await valResp.json();
    const rows = valData.values || [];
    console.log(`Successfully fetched ${rows.length} rows.`);
    
    if (rows.length > 0) {
      console.log('Headers (Row 1):', rows[0]);
      console.log('First 5 data rows:');
      for (let i = 1; i < Math.min(6, rows.length); i++) {
        console.log(`Row ${i + 1}:`, rows[i]);
      }
    } else {
      console.log('No rows found in this sheet.');
    }
  } catch (error) {
    console.error('Inspector crashed:', error);
  }
}

inspect();
