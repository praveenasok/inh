function createProductPriceList(productGroup) {
      const hasKgY = (productGroup.items || []).some(i => String(i?.SoldinKG ?? i?.['Sold in KG'] ?? i?.SoldInKG ?? i?.soldInKg ?? '').trim().toLowerCase() === 'y');
      const hasKgN = (productGroup.items || []).some(i => String(i?.SoldinKG ?? i?.['Sold in KG'] ?? i?.SoldInKG ?? i?.soldInKg ?? '').trim().toLowerCase() === 'n');
      const { category, product, density, colors, items } = productGroup;
      const normalizedCategory = String(category || '').trim().toLowerCase();
      const normalizedNoSpace = normalizedCategory.replace(/\s+/g, '');
      const STD_WEIGHT_CATEGORIES = new Set([
        'diy',
        'wigs',
        'clipon', 'clip on',
        'toppers', 'topper',
        'closures', 'closure'
      ]);
      const isStdWeightCategory = STD_WEIGHT_CATEGORIES.has(normalizedCategory) || STD_WEIGHT_CATEGORIES.has(normalizedNoSpace);
      // Use data-driven Standard Weight for DIY and Wigs categories
      const standardWeightGrams = isStdWeightCategory ? (() => {
        const raw = (items || []).map(i => i['Standard Weight'] ?? i.StandardWeight ?? i.standardWeight).find(v => v != null && v !== '');
        if (raw == null) return null;
        if (typeof raw === 'number') return raw;
        const parsed = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
      })() : null;
      const unit = isStdWeightCategory
        ? (Number.isFinite(standardWeightGrams) ? `Standard Weight (${standardWeightGrams} grams)` : 'Standard Weight')
        : (normalizedNoSpace === 'tapes'
          ? (state.kg ? 'Per Kilogram (1000 grams) - 400 Tapes' : 'Per Piece (100 grams) - 40 Tapes')
          : (state.kg ? 'Per Kilogram (1000 grams)' : 'Per Piece (100 grams)'));

      // Determine shade label to display (prefer user-selected shade, then group value, then derive from item data)
      const selectedShade = (document.getElementById('color') && document.getElementById('color').value) ? document.getElementById('color').value : '';
      const allLabel = 'ALL COLORS';
      const deriveShadeFromItems = (arr) => {
        try {
          for (const i of Array.isArray(arr) ? arr : []) {
            const raw = i.Shade || i.shade || i.Shades || i.shades || i.Colors || i.Color || i.colour || i.Colour || i['Shade Name'] || i.ShadeName;
            if (!raw) continue;
            if (Array.isArray(raw)) {
              const s = String(raw[0] || '').trim();
              if (s) return s;
            } else if (typeof raw === 'string') {
              const first = raw.split(/[\|,\/]+/).map(v => v.trim()).find(Boolean);
              if (first) return first;
            }
          }
        } catch (_) { }
        return '';
      };
      const shadeLabel = (selectedShade && selectedShade.trim()) ? selectedShade : (((colors && colors !== 'N/A') ? colors : '') || deriveShadeFromItems(items) || allLabel);

      // Determine company name based on price list
      const priceListName = items[0]?.PriceListName || items[0]?.PriceList || items[0]?.['Price List Name'] || '';
      // Get product image (prefer cached/unified sources)
      const productImage = getCachedOrMappedProductImage(priceListName, category, product, density);
      let companyName = 'Indian Natural Hair';
      if (priceListName === 'INDIA25') {
        companyName = 'IND Natural Hair Pvt Ltd';
      } else if (priceListName === 'USA25') {
        companyName = 'Indian Natural Hair, LLC';
      }

      // Sort items by length for better display
      const sortedItems = items.sort((a, b) => {
        const lengthA = parseFloat(a.Length) || 0;
        const lengthB = parseFloat(b.Length) || 0;
        return lengthA - lengthB;
      });

      // Multi-shade support: build list of unique shades and lengths
      const shadeKeys = ['Shade', 'shade', 'Shades', 'shades', 'Colors', 'Color', 'colour', 'Colour', 'Shade Name', 'ShadeName'];
      const extractShades = (val) => {
        const out = [];
        if (!val) return out;
        if (Array.isArray(val)) {
          val.forEach(v => { const s = String(v || '').trim(); if (s) out.push(s); });
        } else if (typeof val === 'string') {
          val.split(/[\|,\/]+|[,;]+/).forEach(piece => { const s = piece.trim(); if (s) out.push(s); });
        }
        return out;
      };

      const shadesSet = new Set();
      (items || []).forEach(i => {
        for (const k of shadeKeys) {
          if (k in i) extractShades(i[k]).forEach(s => shadesSet.add(s));
        }
      });
      const shadesList = Array.from(shadesSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      const isMultiShade = shadesList.length > 1;

      // Detect if "All Shades" is effectively selected (no specific shade or label indicates all)
      const allSelected = isMultiShade && (
        !selectedShade || String(selectedShade).trim() === '' || /all\s*(shades|colors)/i.test(String(selectedShade)) || String(shadeLabel).toUpperCase() === allLabel
      );

      // Determine if any item supports selling by kilogram
      const kgKeys = ['Can be sold in kg?', 'Can be sold in kg', 'SellInKg', 'sellInKg', 'kg', 'KG'];
      const isTruthy = (v) => {
        if (typeof v === 'boolean') return v;
        const s = String(v || '').trim().toLowerCase();
        return ['yes', 'true', '1', 'kg', 'can be sold in kg', 'y'].includes(s);
      };
      const supportsKg = (items || []).some(i => kgKeys.some(k => i && (i[k] !== undefined) && isTruthy(i[k])));

      const lengthsList = Array.from(new Set((items || []).map(i => String(i.Length || '').trim()).filter(Boolean)))
        .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));

      const normalizeShade = s => String(s || '').trim().toLowerCase();
      const matchShade = (i, s) => {
        const target = normalizeShade(s);
        for (const k of shadeKeys) {
          const raw = i[k];
          if (!raw) continue;
          if (Array.isArray(raw)) {
            if (raw.map(v => normalizeShade(v)).includes(target)) return true;
          } else if (typeof raw === 'string') {
            const arr = raw.split(/[\|,\/]+|[,;]+/).map(v => normalizeShade(v)).filter(Boolean);
            if (arr.includes(target)) return true;
          }
        }
        return false;
      };

      const findItemByLengthAndShade = (len, shade) => {
        const targetLen = String(len).trim();
        return (items || []).find(i => String(i.Length || '').trim() === targetLen && matchShade(i, shade));
      };

      let isVirgin = product.toLowerCase().includes('virgin') || category.toLowerCase().includes('virgin') || priceListName.toLowerCase().includes('virgin');
      let isRemy = product.toLowerCase().includes('remy') || category.toLowerCase().includes('remy') || priceListName.toLowerCase().includes('remy');
      
      let stampInfo = '';
      if (isVirgin) {
          stampInfo = `<img src="images/hw/bleachable.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
      } else if (isRemy) {
          stampInfo = `<img src="images/hw/bleachable27.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="Bleachable" />`;
      }
      
      let headersHTML = `
          <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in inches</span></th>
          <th style="width: 80px; min-width: 80px; max-width: 80px; padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: bottom; white-space: nowrap;">Length<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">in cm</span></th>
      `;
      if (isMultiShade) {
          shadesList.forEach((sh, shIdx) => {
              const bRight = shIdx === shadesList.length - 1 ? '' : 'border-right: 1px solid #e2e8f0;';
              headersHTML += `<th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap; ${bRight}">Price (${sh})<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${state.currency} /${unit.toLowerCase().includes('piece') ? 'pc' : 'kg'}</span></th>`;
          });
      } else {
          headersHTML += `<th style="padding: 16px 10px 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom; white-space: nowrap;">Price<br><span style="font-size: 11px; font-weight: 600; color: #475569; font-variant: normal; text-transform: none;">${state.currency} /${unit.toLowerCase().includes('piece') ? 'pc' : 'kg'}</span></th>`;
      }
      
      let rowsHTML = '';
      if (isMultiShade) {
          lengthsList.forEach((len, idx) => {
              const bgStr = idx % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
              const cmLen = parseFloat(len) * 2.5;
              rowsHTML += `<tr style="${bgStr}">
                  <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen} cm</td>`;
              shadesList.forEach((sh, shIdx) => {
                  const itm = findItemByLengthAndShade(len, sh);
                  const bRight = shIdx === shadesList.length - 1 ? '' : 'border-right: 1px solid #e2e8f0;';
                  let val = '-';
                  if (itm) {
                      val = `${itm.currencySymbol}${itm.calculatedPrice.toFixed(2)}`;
                  }
                  rowsHTML += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; ${bRight}">${val} <span style="font-size:11px; font-weight:500; color:#64748b;">/${unit.toLowerCase().includes('piece') ? 'pc' : 'kg'}</span></td>`;
              });
              rowsHTML += `</tr>`;
          });
      } else {
          sortedItems.forEach((item, idx) => {
              const bgStr = idx % 2 === 0 ? "background: #ffffff;" : "background: #faf0e6;";
              const len = item.Length || 'N/A';
              const cmLen = len !== 'N/A' ? parseFloat(len) * 2.5 : 'N/A';
              const val = `${item.currencySymbol}${item.calculatedPrice.toFixed(2)}`;
              rowsHTML += `<tr style="${bgStr}">
                  <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${len}"</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #334155; font-size: 14px; border-right: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${cmLen !== 'N/A' ? cmLen + ' cm' : 'N/A'}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; border-right: 1px solid #e2e8f0;">${val} <span style="font-size:11px; font-weight:500; color:#64748b;">/${unit.toLowerCase().includes('piece') ? 'pc' : 'kg'}</span></td>
              </tr>`;
          });
      }

      let footerInfoHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              <div><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> Generated: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>
              <div>HAIRWISE</div>
              <div>${(function() {
                  const __d = new Date();
                  const __dd = String(__d.getDate()).padStart(2, '0');
                  const __mm = String(__d.getMonth() + 1).padStart(2, '0');
                  const __yy = String(__d.getFullYear()).slice(-2);
                  return `${__dd}${__mm}${__yy}`;
              })()}</div>
          </div>
      `;

      let footerHTML = footerInfoHTML;
      if (isVirgin || isRemy) {
          footerHTML = `
              <div style="margin-top: 15px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;">
                  <div style="font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: inline-block;">Important Information</div>
                  <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-weight: 500; font-size: 12px;">
                      <tr>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Shipping Charges Extra</td>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Curly/Wavy Styles 10% Extra</td>
                      </tr>
                      <tr>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>The prices are ${unit.toLowerCase().includes('piece') ? 'per piece' : 'per kilogram'}</td>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${unit.toLowerCase().includes('piece') ? '200 to 300 grams depending on length' : '1 Kilogram = 10 packets of 100 grams each'}</td>
                      </tr>
                      <tr>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>${unit.toLowerCase().includes('piece') ? 'Minimum Order Quantity 10 pieces' : 'Minimum Order Quantity 1 kg (10 pieces)'}</td>
                          <td style="width: 50%; padding: 4px 10px 4px 0; vertical-align: top; text-align: left; white-space: nowrap;"><span style="color:#6366f1; font-weight:900; margin-right:6px;">•</span>Bleached colors 20% Extra</td>
                      </tr>
                  </table>
              </div>
              ${footerInfoHTML}
          `;
      }
      
      return `
          <div style="overflow-x: auto; width: 100%; padding: 15px 5px; -webkit-overflow-scrolling: touch;" class="product-price-list mb-6 max-w-full">
              <div class="preview-card-inner" style="position: relative; background: rgba(79, 70, 229, 0.10); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; min-width: 700px; width: max-content; color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                  
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                      <img src="images/hw/hwstraightlogo.png" style="height: 45px;" />
                      <div style="text-align: right; font-size: 10px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">
                          NEW DELHI <span style="margin: 0 6px; color: #cbd5e1;">|</span> NEW JERSEY <span style="margin: 0 6px; color: #cbd5e1;">|</span> FLORIDA
                      </div>
                  </div>
                  
                  <div style="width: 100%; max-width: 1100px; margin: 0 auto 12px auto; display: flex; justify-content: center; align-items: stretch; gap: 0; box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0; background: white;">
                      
                      <div style="flex-grow: 1;">
                          <div style="padding: 16px 10px; background: #faf0e6; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: center; vertical-align: bottom;">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; width: 100%;">
                                  <img src="images/hw/100percent.png?v=3" style="height: 80px; width: auto; max-width: 100%; object-fit: contain;" alt="100% Authentic Human Hair" />
                                  ${stampInfo}
                              </div>
                              <h3 style="font-size: 16px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                  ${product.toUpperCase()} | ${density.toUpperCase()} | ${String(shadeLabel).toUpperCase()}
                                  <span style="color: #16a34a;">(${state.currency || 'INR'})</span>
                              </h3>
                          </div>
                          
                          <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 14px; background: transparent;">
                              <thead>
                                  <tr>
                                      ${headersHTML}
                                  </tr>
                              </thead>
                              <tbody>
                                  ${rowsHTML}
                              </tbody>
                          </table>
                      </div>
                      ${productImage ? `<div style="flex: 0 0 250px; display: flex; align-items: stretch; justify-content: center; padding: 0; background: #ffffff; border-left: 2px solid #e2e8f0;">
                          <img src="${productImage}" style="width: 100%; height: 100%; max-height: none; object-fit: contain;" onerror="this.style.display='none'">
                      </div>` : ''}
                  </div>
                  ${footerHTML}
              </div>
          </div>
      `;
    }