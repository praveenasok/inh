import urllib.request
import json

sheet_id = "1HhVr9wWniNXas_-aGB5B2V_0lSMWohbollCporqEuPs"
gid = "143866920"
api_key = "AIzaSyAdESdS-vNgXcvp0ZUv3AsYkryNdCemztI"

# First get tab name from metadata
meta_url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}?key={api_key}"
try:
    req = urllib.request.Request(meta_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        meta_data = json.loads(response.read().decode())
        sheets = meta_data.get('sheets', [])
        target_sheet = next((s for s in sheets if str(s['properties']['sheetId']) == gid), None)
        if target_sheet:
            title = target_sheet['properties']['title']
            print("Tab Title:", title)
            
            # Fetch values
            val_url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{urllib.parse.quote(title)}!A1:H10?key={api_key}"
            val_req = urllib.request.Request(val_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(val_req) as val_resp:
                val_data = json.loads(val_resp.read().decode())
                values = val_data.get('values', [])
                print("First 10 rows:")
                for r in values:
                    print(r)
        else:
            print("Tab GID not found")
except Exception as e:
    print("Error:", e)
