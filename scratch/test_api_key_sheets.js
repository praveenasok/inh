const apiKey = 'AIzaSyAdESdS-vNgXcvp0ZUv3AsYkryNdCemztI';
const sheetId = '1HhVr9wWniNXas_-aGB5B2V_0lSMWohbollCporqEuPs';
const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => {
    if (data.error) {
      console.log('Error from Google:', data.error);
    } else {
      console.log('Title:', data.properties?.title);
      console.log('Sheets:', data.sheets?.map(s => `${s.properties.title} (${s.properties.sheetId})`));
    }
  })
  .catch(err => console.error('Error:', err));
