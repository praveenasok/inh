import re

with open('inh-ratio-mix/script.js', 'r') as f:
    content = f.read()

# 1. Update footer to use TABLE instead of UL/LI for html2canvas compatibility
old_combined_footer = """                <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; font-weight: 500;">
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${isOriginal ? 'original unit' : (isPieces ? 'piece' : (isGrams ? `${exportGramsArray.join(', ')} grams` : 'kilogram'))}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                </ul>"""

new_combined_footer = """                <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-weight: 500; font-size: 12px;">
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${isOriginal ? 'original unit' : (isPieces ? 'piece' : (isGrams ? `${exportGramsArray.join(', ')} grams` : 'kilogram'))}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</td>
                    </tr>
                </table>"""

content = content.replace(old_combined_footer, new_combined_footer)

old_share_footer = """                <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; font-weight: 500;">
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'kilogram'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                </ul>"""

new_share_footer = """                <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-weight: 500; font-size: 12px;">
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'kilogram'}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</td>
                        <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</td>
                    </tr>
                </table>"""

content = content.replace(old_share_footer, new_share_footer)

# 2. Update Stamp Logic: strictly check SECOND component (index 1) of bundleComponents if it exists!
old_stamp_single = """                        let isRVirgin = r.name.toLowerCase().includes('virgin');
                        let isRRemy = r.name.toLowerCase().includes('remy');
                        if (r.bundleComponents) {
                            r.bundleComponents.forEach(c => {
                                const cname = (typeof c === 'string' ? c : (c.name || '')).toLowerCase();
                                if (cname.includes('virgin')) isRVirgin = true;
                                if (cname.includes('remy')) isRRemy = true;
                            });
                        }
                        if (r.composeMatrix) {
                            Object.values(r.composeMatrix).forEach(lenObj => {
                                Object.keys(lenObj).forEach(cname => {
                                    if (cname.toLowerCase().includes('virgin')) isRVirgin = true;
                                    if (cname.toLowerCase().includes('remy')) isRRemy = true;
                                });
                            });
                        }"""

new_stamp_single = """                        let isRVirgin = r.name.toLowerCase().includes('virgin');
                        let isRRemy = r.name.toLowerCase().includes('remy');
                        if (r.bundleComponents && r.bundleComponents.length > 1) {
                            isRVirgin = false;
                            isRRemy = false;
                            const secondC = r.bundleComponents[1];
                            const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
                            if (cname.includes('virgin')) isRVirgin = true;
                            if (cname.includes('remy')) isRRemy = true;
                        }"""

content = content.replace(old_stamp_single, new_stamp_single)

old_stamp_multi = """                                    let isRVirgin = r.name.toLowerCase().includes('virgin');
                                    let isRRemy = r.name.toLowerCase().includes('remy');
                                    if (r.bundleComponents) {
                                        r.bundleComponents.forEach(c => {
                                            const cname = (typeof c === 'string' ? c : (c.name || '')).toLowerCase();
                                            if (cname.includes('virgin')) isRVirgin = true;
                                            if (cname.includes('remy')) isRRemy = true;
                                        });
                                    }
                                    if (r.composeMatrix) {
                                        Object.values(r.composeMatrix).forEach(lenObj => {
                                            Object.keys(lenObj).forEach(cname => {
                                                if (cname.toLowerCase().includes('virgin')) isRVirgin = true;
                                                if (cname.toLowerCase().includes('remy')) isRRemy = true;
                                            });
                                        });
                                    }"""

new_stamp_multi = """                                    let isRVirgin = r.name.toLowerCase().includes('virgin');
                                    let isRRemy = r.name.toLowerCase().includes('remy');
                                    if (r.bundleComponents && r.bundleComponents.length > 1) {
                                        isRVirgin = false;
                                        isRRemy = false;
                                        const secondC = r.bundleComponents[1];
                                        const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
                                        if (cname.includes('virgin')) isRVirgin = true;
                                        if (cname.includes('remy')) isRRemy = true;
                                    }"""

content = content.replace(old_stamp_multi, new_stamp_multi)

old_stamp_share = """        let isVirgin = clientName.toLowerCase().includes('virgin');
        let isRemy = clientName.toLowerCase().includes('remy');
        if (pl.bundleComponents) {
            pl.bundleComponents.forEach(c => {
                const cname = (typeof c === 'string' ? c : (c.name || '')).toLowerCase();
                if (cname.includes('virgin')) isVirgin = true;
                if (cname.includes('remy')) isRemy = true;
            });
        }
        if (pl.composeMatrix) {
            Object.values(pl.composeMatrix).forEach(lenObj => {
                Object.keys(lenObj).forEach(cname => {
                    if (cname.toLowerCase().includes('virgin')) isVirgin = true;
                    if (cname.toLowerCase().includes('remy')) isRemy = true;
                });
            });
        }"""

new_stamp_share = """        let isVirgin = clientName.toLowerCase().includes('virgin');
        let isRemy = clientName.toLowerCase().includes('remy');
        if (pl.bundleComponents && pl.bundleComponents.length > 1) {
            isVirgin = false;
            isRemy = false;
            const secondC = pl.bundleComponents[1];
            const cname = (typeof secondC === 'string' ? secondC : (secondC.name || '')).toLowerCase();
            if (cname.includes('virgin')) isVirgin = true;
            if (cname.includes('remy')) isRemy = true;
        }"""

content = content.replace(old_stamp_share, new_stamp_share)


with open('inh-ratio-mix/script.js', 'w') as f:
    f.write(content)

