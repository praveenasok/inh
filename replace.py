import re

with open('inh-ratio-mix/script.js', 'r') as f:
    content = f.read()

start_marker = "    window.sharePriceListFromRatioTab = async function (clientName) {"
end_marker = "    window.downloadSharedPriceList = async function (clientName) {"

if start_marker in content and end_marker in content:
    pre = content.split(start_marker)[0]
    post = content.split(end_marker)[1]
    
    with open('update_share_ratio.js', 'r') as f:
        replacement = f.read()
        
    new_content = pre + replacement + '\n' + end_marker + post
    
    with open('inh-ratio-mix/script.js', 'w') as f:
        f.write(new_content)
    print("Success")
else:
    print("Markers not found")
