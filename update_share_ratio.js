    window.sharePriceListFromRatioTab = async function (clientName) {
        if (!clientName) return;
        
        // Remove any existing expanded preview rows
        document.querySelectorAll('.preview-row').forEach(row => row.remove());

        // Get the client config
        const pl = (db.clients || []).find(c => c.name === clientName);
        if (!pl) return;

        // Load config silently to appState so calculateColumn uses it correctly
        await loadRatioConfig(clientName);

        const _hex2 = appState.accentColor || '#4f46e5';
        const _r2 = parseInt(_hex2.slice(1,3),16), _g2 = parseInt(_hex2.slice(3,5),16), _b2 = parseInt(_hex2.slice(5,7),16);
        const _bg2 = `rgba(${_r2},${_g2},${_b2},0.05)`;

        let validItemCount = 0;
        const rowsHTML = ACTIVE_FINISHED_LENGTHS.map((len) => {
            const idx = len;
            let displayPrice = 0;
            if (appState.customPricesEnabled && appState.customPrices[idx] > 0) {
                displayPrice = appState.customPrices[idx];
            } else {
                displayPrice = calculateColumn(idx);
            }
            if (pl && pl.tag === 'Composite' && displayPrice <= 0) return '';
            
            if (displayPrice > 0 || (displayPrice === 0 && appState.customPricesEnabled && appState.customPrices[idx] !== undefined && appState.customPrices[idx] !== '')) {
                const bgStr = validItemCount % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
                const cmLen = len * 2.5;
                validItemCount++;
                return `
                    <tr style="${bgStr}">
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen} cm</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; border-right: 1px solid #e2e8f0;">${formatPriceWithSymbol(displayPrice, appState.currency || 'INR')} <span style="font-size:11px; font-weight:500; color:#64748b;">/${pl.outputUnit === 'pc' ? 'pc' : 'kg'}</span></td>
                    </tr>
                `;
            }
            return '';
        }).join('');

        const isVirgin = clientName.toLowerCase().includes('virgin');
        const isRemy = clientName.toLowerCase().includes('remy');
        let stampInfo = '';
        if (isVirgin) {
            stampInfo = `<img src="../images/hw/bleachable.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
        } else if (isRemy) {
            stampInfo = `<img src="../images/hw/bleachable27.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
        }

        const imgHTML = window.getProductImageHTML(clientName, 'auto');

        let companyName = '';
        let headerLogo = '../images/hw/hwstraightlogo.png';
        let logoHeight = '48px';
        const upperClientName = String(clientName).toUpperCase();
        let isUSA = false;
        
        if (upperClientName.includes('INHUSA')) {
            companyName = 'INDIAN NATURAL HAIR, LLC';
            headerLogo = '../images/hw/inhusa.png';
            logoHeight = '90px';
            isUSA = true;
        }

        const locationTextHtml = `NEW DELHI <span style="margin: 0 6px; color: #cbd5e1;">|</span> NEW JERSEY <span style="margin: 0 6px; color: #cbd5e1;">|</span> FLORIDA`;

        let footerHTML = `
            <div style="margin-top: 15px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;">
                <div style="font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: inline-block;">Important Information</div>
                <ul style="list-style-type: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-weight: 500;">
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are per ${pl.outputUnit === 'pc' ? 'piece' : 'original unit'}</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>1 Kilogram = 10 packets of 100 grams each</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Minimum Order Quantity 1 kg (10 pieces)</li>
                    <li><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</li>
                </ul>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                <div><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Generated: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>
                <div>${companyName === 'INDIAN NATURAL HAIR, LLC' ? '<span style="text-transform: none;">us@indiannaturalhair.com | indiannaturalhair.com | +1 (929) 245-0936</span>' : companyName.toUpperCase()}</div>
                <div>${(function() {
                    const __d = new Date();
                    const __dd = String(__d.getDate()).padStart(2, '0');
                    const __mm = String(__d.getMonth() + 1).padStart(2, '0');
                    const __yy = String(__d.getFullYear()).slice(-2);
                    let _discVal = 0;
                    const inputEl = document.getElementById('exportDiscountPercentInput');
                    if (inputEl && inputEl.value) {
                        _discVal = parseFloat(inputEl.value) || 0;
                    } else if (typeof appState !== 'undefined' && appState.discountPercent) {
                        _discVal = appState.discountPercent;
                    }
                    _discVal = Math.round(_discVal);
                    const _discStr = _discVal < 0 ? '-' + String(Math.abs(_discVal)).padStart(3, '0') : String(Math.abs(_discVal)).padStart(3, '0');
                    return `${__dd}${__mm}${__yy}/${_discStr}`;
                })()}</div>
            </div>
        `;

        let displayHTML = `
            <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;">
                <div id="export-preview-${clientName.replace(/[^a-zA-Z0-9]/g,'_')}" class="preview-card-inner" style="position: relative; background: ${_bg2}; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 700px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; width: 100%; border-bottom: 1px solid rgba(226, 232, 240, 0.6); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="${headerLogo}" style="height: ${logoHeight === '90px' ? '48px' : logoHeight}; object-fit: contain;" onerror="this.src='../images/hw/hwstraightlogo.png'" />
                            ${companyName ? `<div style="font-weight: 800; font-size: 20px; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase;">${companyName}</div>` : ''}
                        </div>
                        <div style="text-align: right; font-size: 10px; color: #475569; font-weight: 800; letter-spacing: 1px; display: flex; align-items: center;">
                            ${locationTextHtml}
                        </div>
                    </div>
                    
                    <div style="width: 100%; max-width: 1100px; margin: 0 auto 12px auto; display: flex; justify-content: center; align-items: stretch; gap: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white;">
                        
                        <div style="flex-grow: 1;">
                            <div style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom;">
                                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                    <div style="flex: 1; text-align: left; display: flex; align-items: center;">
                                        <img src="../images/hw/100percent.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="100% Authentic Human Hair" />
                                    </div>
                                    <div style="flex: 2; font-size: 16px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        ${renderNameWithLogo(clientName, '14px')}
                                        <span style="color: #16a34a;">(${appState.currency || 'INR'})</span>
                                    </div>
                                    <div style="flex: 1; text-align: right; display: flex; justify-content: flex-end; align-items: center;">
                                        ${stampInfo}
                                    </div>
                                </div>
                            </div>
                            
                            <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 14px; background: transparent;">
                                <thead>
                                    <tr>
                                        <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in inches</span></th>
                                        <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in cm</span></th>
                                        <th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${appState.currency || 'INR'} /${pl.outputUnit === 'pc' ? 'pc' : 'kg'}</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHTML}
                                </tbody>
                            </table>
                        </div>
                        ${imgHTML ? `<div style="flex: 0 0 250px; display: flex; align-items: stretch; justify-content: center; padding: 0; background: #ffffff; border-left: 2px solid #e2e8f0;">
                            ${imgHTML.replace(/style="[^"]*"/, 'style="width: 100%; height: 100%; max-height: none; object-fit: contain;"')}
                        </div>` : ''}
                    </div>
                ${footerHTML}
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px;">
                <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition" onclick="window.downloadSharedPriceList('${clientName.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-download mr-2"></i> Download as Image
                </button>
            </div>
        `;

        const row = document.getElementById(`ratio-row-${clientName.replace(/[^a-zA-Z0-9-]/g, '')}`);
        if (row) {
            const previewRow = document.createElement('tr');
            previewRow.className = 'preview-row';
            previewRow.innerHTML = `
                <td colspan="7" class="p-0 border-b border-slate-200">
                    <div style="background-color: #f8fafc; padding: 10px 0; border-bottom: 2px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; padding-left: 20px; padding-right: 20px;">
                        <span class="text-sm font-bold text-slate-700"><i class="fa-solid fa-eye text-indigo-500 mr-2"></i> Shared Price List Preview</span>
                        <button type="button" class="text-slate-400 hover:text-slate-600" onclick="this.closest('.preview-row').remove()"><i class="fa-solid fa-times"></i> Close</button>
                    </div>
                    ${displayHTML}
                </td>
            `;
            row.after(previewRow);
            previewRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
