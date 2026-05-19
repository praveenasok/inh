const fs = require('fs');
const file = '/Users/praveenasok/Desktop/inhsuite/inh-ratio-mix/script.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix exportPriceList
const exportTarget = `        const validLengths = ACTIVE_FINISHED_LENGTHS.map(len => {
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[len] !== undefined && appState.customPrices[len] !== '' && appState.customPrices[len] !== null) {
                displayPrice = appState.customPrices[len];
            } else {
                displayPrice = calculateColumn(len);
            }
            return { len, displayPrice };
        }).filter(item => item.displayPrice > 0 || (item.displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[item.len] !== undefined && appState.customPrices[item.len] !== ''));

        const headersHTML = validLengths.map((item, i) => {
            const borderRight = i < validLengths.length - 1 ? 'border-right: 2px solid #334155;' : '';
            return \\\`<th style="padding: 26px 15px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; font-size: 20px; \\\${borderRight} position: static;">\\\${item.len}"</th>\\\`;
        }).join('');

        const pricesHTML = validLengths.map((item, i) => {
            const converted = parseFloat(item.displayPrice).toFixed(2);
            const borderRight = i < validLengths.length - 1 ? 'border-right: 1px solid #f1f5f9;' : '';
            return \\\`<td style="padding: 24px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; \\\${borderRight}">\\\${converted}</td>\\\`;
        }).join('');

        container.innerHTML = \\\`
            <div style="text-align: center; margin-bottom: 60px; padding-bottom: 35px; border-bottom: 3px solid #f1f5f9;">
                <div style="color: #6366f1; font-weight: 700; font-size: 18px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">Official Price List &amp; Config</div>
                <h2 style="color: #0f172a; font-size: 56px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -1.5px;">\\\${appState.currentClientName}</h2>
                <div style="display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <span style="background: #f1f5f9; color: #475569; padding: 10px 24px; border-radius: 30px; font-size: 18px; font-weight: 700;">Pricing in \\\${appState.currency}</span>
                    <span style="background: \\\${_hairBadgeBg}; color: \\\${_hairBadgeColor}; border: 2px solid \\\${_hairBadgeBorder}; padding: 10px 24px; border-radius: 30px; font-size: 16px; font-weight: 700;">\\\${_hairLabel}</span>
                </div>
            </div>
            
            <div style="width: 100%; display: flex; justify-content: center; align-items: flex-start; overflow-x: auto;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; text-align: center;">
                    <thead>
                        <tr>
                            <th style="padding: 26px 15px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: #94a3b8; font-weight: 800; text-transform: uppercase; font-size: 14px; letter-spacing: 1.5px; border-right: 2px solid #334155; position: static;">Length</th>
                            \\\${headersHTML}
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #ffffff;">
                            <td style="padding: 24px 15px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-right: 1px solid #f1f5f9; background: #f8fafc;">Price/kg</td>
                            \\\${pricesHTML}
                        </tr>
                    </tbody>
                </table>
            </div>\`;`;

const exportInject = `        container.innerHTML = \\\`
            <div style="text-align: center; margin-bottom: 60px; padding-bottom: 35px; border-bottom: 3px solid #f1f5f9;">
                <div style="color: #6366f1; font-weight: 700; font-size: 18px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">Official Price List &amp; Config</div>
                <h2 style="color: #0f172a; font-size: 56px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -1.5px;">\\\${appState.currentClientName}</h2>
                <div style="display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <span style="background: #f1f5f9; color: #475569; padding: 10px 24px; border-radius: 30px; font-size: 18px; font-weight: 700;">Pricing in \\\${appState.currency}</span>
                    <span style="background: \\\${_hairBadgeBg}; color: \\\${_hairBadgeColor}; border: 2px solid \\\${_hairBadgeBorder}; padding: 10px 24px; border-radius: 30px; font-size: 16px; font-weight: 700;">\\\${_hairLabel}</span>
                </div>
            </div>
            
            <div style="width: 100%; display: flex; justify-content: center; align-items: flex-start;">
                <table style="width: 100%; max-width: 1100px; border-collapse: separate; border-spacing: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; text-align: center;">
                    <thead>
                        <tr>
                            <th style="padding: 26px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px; border-right: 2px solid #334155; width: 50%; position: static;">Finished Length</th>
                            <th style="padding: 26px; background: #0f172a; border-bottom: 3px solid #e2e8f0; color: white; font-weight: 800; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px; width: 50%; position: static;">Prices per kg</th>
                        </tr>
                    </thead>
                    <tbody>
                        \\\${ACTIVE_FINISHED_LENGTHS.map((len, idxArray) => {
            const idx = len;
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[idx] !== undefined && appState.customPrices[idx] !== '' && appState.customPrices[idx] !== null) {
                displayPrice = appState.customPrices[idx];
            } else {
                const price = calculateColumn(idx);
                displayPrice = price;
            }
            
            if (displayPrice < 0 || (displayPrice === 0 && (!appState.customPricesEnabled || appState.customPrices[idx] === undefined || appState.customPrices[idx] === ''))) return '';
            const converted = parseFloat(displayPrice).toFixed(2);
            const bgStr = idxArray % 2 === 0 ? "background: #ffffff;" : "background: #f8fafc;";

            return \\\`
                                <tr style="\\\${bgStr}">
                                    <td style="padding: 24px 30px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 20px; font-weight: 800; border-right: 1px solid #e2e8f0;">\\\${len}"</td>
                                    <td style="padding: 24px 30px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums;">\\\${converted}</td>
                                </tr>
                            \\\`;
        }).join('')}
                    </tbody>
                </table>
            </div>\\\``;

// 2. Fix sharePriceListFromRatioTab
const shareTarget = `        const validLengths = ACTIVE_FINISHED_LENGTHS.map(len => {
            let displayPrice = 0;
            if(appState.customPricesEnabled && appState.customPrices[len] !== undefined && appState.customPrices[len] !== '' && appState.customPrices[len] !== null) {
                displayPrice = appState.customPrices[len];
            } else {
                displayPrice = calculateColumn(len);
            }
            return { len, displayPrice };
        }).filter(item => item.displayPrice > 0 || (item.displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[item.len] !== undefined && appState.customPrices[item.len] !== ''));

        const headersHTML = validLengths.map((item, i) => {
            const borderRight = i < validLengths.length - 1 ? 'border-right: 2px solid #e2e8f0;' : '';
            return \\\`<th style="padding: 16px 15px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 14px; \\\${borderRight} position: static;">\\\${item.len}"</th>\\\`;
        }).join('');

        const pricesHTML = validLengths.map((item, i) => {
            const converted = parseFloat(item.displayPrice).toFixed(2);
            const borderRight = i < validLengths.length - 1 ? 'border-right: 1px solid #f1f5f9;' : '';
            return \\\`<td style="padding: 16px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; \\\${borderRight}">\\\${converted}</td>\\\`;
        }).join('');

        let displayHTML = \\\`
            <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;">
                <div id="export-preview-\\\${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" class="preview-card-inner" style="background: \\\${_bg2}; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 700px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">\\\${clientName}</h2>
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                        <span style="display:inline-block; margin-right: 12px;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Created: \\\${new Date(pl.savedAt || Date.now()).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                        <span style="display:inline-block;"><i class="fa-solid fa-share-nodes" style="margin-right: 4px;"></i> Shared: \\\${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                    </div>
                    <div style="margin-top: 8px;">
                        <span style="background: \\\${_sharedHairBg}; color: \\\${_sharedHairColor}; border: 1px solid \\\${_sharedHairBorder}; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">\\\${_sharedHairLabel}</span>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 25px; text-align: center; font-size: 14px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr>
                            <th style="padding: 16px 15px; background: #0f172a; border-bottom: 2px solid #e2e8f0; color: white; font-weight: 800; font-size: 14px; border-right: 2px solid #e2e8f0; position: static;">Length</th>
                            \\\${headersHTML}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 16px 15px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 700; border-right: 1px solid #f1f5f9; background: #f8fafc;">Price (\\\${appState.currency})</td>
                            \\\${pricesHTML}
                        </tr>
                    </tbody>
                </table>
        \\\`;`;

const shareInject = `        let displayHTML = \\\`
            <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;">
                <div id="export-preview-\\\${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" class="preview-card-inner" style="background: \\\${_bg2}; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 700px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">\\\${clientName}</h2>
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                        <span style="display:inline-block; margin-right: 12px;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Created: \\\${new Date(pl.savedAt || Date.now()).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                        <span style="display:inline-block;"><i class="fa-solid fa-share-nodes" style="margin-right: 4px;"></i> Shared: \\\${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                    </div>
                    <div style="margin-top: 8px;">
                        <span style="background: \\\${_sharedHairBg}; color: \\\${_sharedHairColor}; border: 1px solid \\\${_sharedHairBorder}; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">\\\${_sharedHairLabel}</span>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 25px; text-align: left; font-size: 14px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr>
                            <th style="padding: 16px 20px; background: #0f172a; border-bottom: 2px solid #e2e8f0; color: white; font-weight: 800; width: 50%; border-right: 1px solid #334155; position: static;">Finished Length</th>
                            <th style="padding: 16px 20px; background: #0f172a; border-bottom: 2px solid #e2e8f0; color: white; font-weight: 800; text-align: right; width: 50%; position: static;">Price / kg (\\\${appState.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
        \\\`;
        
        let validItemCount = 0;
        ACTIVE_FINISHED_LENGTHS.forEach((len) => {
            const idx = len;
            let displayPrice = 0;
            if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                displayPrice = appState.customPrices[idx];
            } else {
                displayPrice = calculateColumn(idx);
            }
            if (displayPrice > 0 || (displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[idx] !== undefined && appState.customPrices[idx] !== '')) {
                const bgStr = validItemCount % 2 === 0 ? "background: #ffffff;" : "background: #f8fafc;";
                displayHTML += \\\`
                    <tr style="\\\${bgStr}">
                        <td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 16px; border-right: 1px solid #e2e8f0;">\\\${len}"</td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a;">\\\${parseFloat(displayPrice).toFixed(2)}</td>
                    </tr>
                \\\`;
                validItemCount++;
            }
        });
        
        displayHTML += \\\`
                    </tbody>
                </table>
        \\\`;`;

let replaced = false;

// We use string match logic because indentation might vary slightly
// Find exportTarget
let exportIndex = content.indexOf(exportTarget.trim().substring(0, 100)); // Find beginning
if(exportIndex === -1) {
    console.log("Could not find export target");
    // fallback logic, remove whitespaces
    const pureTarget = exportTarget.replace(/\s+/g, '');
    const pureContent = content.replace(/\s+/g, '');
    if (pureContent.includes(pureTarget)) {
       console.log("Target found without whitespaces, but exact whitespace match failed.");
    }
} else {
    // Actually, writing a custom search and replace is safer to just use exact strings.
    // I will replace by searching the exact strings using regex with whitespace flexibility if needed, but exact strings are better.
}
