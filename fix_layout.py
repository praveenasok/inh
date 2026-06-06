import re

with open('inh-ratio-mix/script.js', 'r') as f:
    content = f.read()

# Fix grid layout in Combined List
old_combined = """                    <ul style="list-style-type: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-weight: 500;">
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${isOriginal ? 'original unit' : (isPieces ? 'piece' : (isGrams ? `${exportGramsArray.join(', ')} grams` : 'kilogram'))}</li>
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                        <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                    </ul>"""

new_combined = """                    <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; font-weight: 500;">
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${isOriginal ? 'original unit' : (isPieces ? 'piece' : (isGrams ? `${exportGramsArray.join(', ')} grams` : 'kilogram'))}</li>
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${isPieces || (isOriginal && ratioResults.some(r => r.outputUnit === 'pc')) ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                        <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                    </ul>"""

content = content.replace(old_combined, new_combined)

# Fix grid layout in Share list
old_share = """                <ul style="list-style-type: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-weight: 500;">
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'kilogram'}</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                </ul>"""

new_share = """                <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; font-weight: 500;">
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'kilogram'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${pl.outputUnit === 'pc' ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</li>
                    <li style="width: 50%; box-sizing: border-box; padding: 4px 10px 4px 0;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                </ul>"""

content = content.replace(old_share, new_share)


# Fix isVirgin/isRemy check logic for Composite products
old_stamp_single = """                        const isRVirgin = r.name.toLowerCase().includes('virgin') || (r.bundleComponents && r.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('virgin')));
                        const isRRemy = r.name.toLowerCase().includes('remy') || (r.bundleComponents && r.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('remy')));"""

new_stamp_single = """                        let isRVirgin = r.name.toLowerCase().includes('virgin');
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

content = content.replace(old_stamp_single, new_stamp_single)

old_stamp_multi = """                                    const isRVirgin = r.name.toLowerCase().includes('virgin') || (r.bundleComponents && r.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('virgin')));
                                    const isRRemy = r.name.toLowerCase().includes('remy') || (r.bundleComponents && r.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('remy')));"""

new_stamp_multi = """                                    let isRVirgin = r.name.toLowerCase().includes('virgin');
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

content = content.replace(old_stamp_multi, new_stamp_multi)


old_stamp_share = """        const isVirgin = clientName.toLowerCase().includes('virgin') || (pl.bundleComponents && pl.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('virgin')));
        const isRemy = clientName.toLowerCase().includes('remy') || (pl.bundleComponents && pl.bundleComponents.some(c => c.name && c.name.toLowerCase().includes('remy')));"""

new_stamp_share = """        let isVirgin = clientName.toLowerCase().includes('virgin');
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

content = content.replace(old_stamp_share, new_stamp_share)


with open('inh-ratio-mix/script.js', 'w') as f:
    f.write(content)
