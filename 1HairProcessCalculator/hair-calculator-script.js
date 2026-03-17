/**
 * Hair Process Calculator - WordPress Compatible JavaScript
 * Extracted and adapted for WordPress integration
 */

(function($) {
    'use strict';

    // Initialize when DOM is ready
     $(document).ready(function() {
         initHairCalculator();
     });

    function initHairCalculator() {
        // Tab switching functionality
        initTabSwitching();
        
        // Initialize calculators
        initCuticleRemovalCalculator();
        initPermanentStraighteningCalculator();
        initBleachingCalculator();
    }

    function initTabSwitching() {
        const navButtons = $('.hair-calculator .nav button');
        const panels = $('.hair-calculator .panel');
        
        navButtons.on('click', function() {
            const $this = $(this);
            const target = $this.data('target');
            
            // Remove active class from all buttons and hide all panels
            navButtons.removeClass('active');
            panels.hide();
            
            // Add active class to clicked button and show corresponding panel
            $this.addClass('active');
            $('#' + target).show();
        });
    }

    function initCuticleRemovalCalculator() {
        const $weightInput = $('#c_weight');
        const $percentInput = $('#c_percent');
        const $copyBtn = $('#c_copy');
        const $tbody = $('#c_tbody');
        
        // Cuticle removal formula components (from reference baseline 1kg @100%)
        const BASE = { 
            Ca: 100, 
            H2SO4: 100, 
            NH4OH: 100, 
            waterSoakPerKg: 10, 
            waterTotalPerKg: 100 
        };
        
        function calculateCuticleRemoval() {
            const grams = Math.max(0, parseFloat($weightInput.val()) || 1000);
            let percent = parseFloat($percentInput.val()) || 100;
            percent = Math.max(1, Math.min(100, percent));
            
            const kg = grams / 1000;
            const factor = kg * (percent / 100);
            const processWater = Math.round(BASE.waterSoakPerKg * kg * 10) / 10;
            const washWater = Math.round((BASE.waterTotalPerKg - BASE.waterSoakPerKg) * kg * 10) / 10;
            
            // Clear previous results
            $tbody.empty();
            
            const components = [
                ['Calcium Hypochlorite', Math.round(BASE.Ca * factor * 10) / 10, 'g'],
                ['Sulfuric Acid', Math.round(BASE.H2SO4 * factor * 10) / 10, 'g'],
                ['Water for process', processWater, 'L'],
                ['— Neutralization —', '', ''],
                ['Ammonium Hydroxide', Math.round(BASE.NH4OH * factor * 10) / 10, 'mL'],
                ['Water (neutralization bath)', washWater, 'L']
            ];
            
            // Display each component
            components.forEach(function([name, amount, unit]) {
                const $row = $('<tr>');
                const $nameCell = $('<td>').text(name);
                const $amountCell = $('<td>');
                
                // Handle separator row
                if (name.includes('—') && amount === '') {
                    $nameCell.css({
                        'font-weight': 'bold',
                        'color': 'var(--muted)'
                    });
                    $amountCell.text('');
                } else {
                    // Format units properly (convert to L/kg if needed)
                    let displayAmount = amount;
                    let displayUnit = unit;
                    if (unit === 'mL' && amount > 999) {
                        displayAmount = (amount / 1000).toFixed(2).replace(/\.00$/, '');
                        displayUnit = 'L';
                    } else if (unit === 'g' && amount > 999) {
                        displayAmount = (amount / 1000).toFixed(2).replace(/\.00$/, '');
                        displayUnit = 'kg';
                    }
                    $amountCell.text(displayAmount + ' ' + displayUnit);
                }
                
                $row.append($nameCell, $amountCell);
                $tbody.append($row);
            });
            
            return { weight: grams, percent, components };
        }
        
        // Add input event listeners
        $weightInput.on('input', calculateCuticleRemoval);
        $percentInput.on('input', calculateCuticleRemoval);
        
        // Copy functionality
        $copyBtn.on('click', function() {
            const { weight, percent, components } = calculateCuticleRemoval();
            let copyText = 'Cuticle Removal\n';
            copyText += 'Hair: ' + weight + ' g\nProcess: ' + percent + '%\n';
            
            components.forEach(function([name, amount, unit]) {
                if (name.includes('—') && amount === '') {
                    copyText += '\n' + name + '\n';
                } else {
                    let displayAmount = amount;
                    let displayUnit = unit;
                    if (unit === 'mL' && amount > 999) {
                        displayAmount = (amount / 1000).toFixed(2).replace(/\.00$/, '');
                        displayUnit = 'L';
                    } else if (unit === 'g' && amount > 999) {
                        displayAmount = (amount / 1000).toFixed(2).replace(/\.00$/, '');
                        displayUnit = 'kg';
                    }
                    copyText += name + ': ' + displayAmount + ' ' + displayUnit + '\n';
                }
            });
            copyText += '\nNeutralization: 45 minutes';
            
            copyToClipboard(copyText);
        });
        
        // Initialize with default values
        calculateCuticleRemoval();
    }

    function initPermanentStraighteningCalculator() {
        const $hairInput = $('#t_hair');
        const $ratioInput = $('#t_ratio');
        const $copyBtn = $('#t_copy');
        const $tbody = $('#t_tbody');
        
        function calculateThioglycolate() {
            const hair = Math.max(1, parseFloat($hairInput.val()) || 1);
            const ratio = Math.max(1, parseFloat($ratioInput.val()) || 200);
            
            const TGA_PER_L = 575;    // g per 1000 mL
            const NH3_25_PER_L = 370; // mL per 1000 mL (≈ g)
            
            const totalVol = (hair / 100) * ratio;        // mL
            const tga = (totalVol / 1000) * TGA_PER_L;    // g
            const nh3 = (totalVol / 1000) * NH3_25_PER_L; // mL
            const waterApprox = totalVol - (tga + nh3);   // mL (approx, assumes ~1 g/mL)
            
            // Clear previous results
            $tbody.empty();
            
            // Format and display results
            const rows = [
                ['Total solution volume', formatValue((Math.round(totalVol*100)/100).toFixed(2), 'mL')],
                ['Thioglycolic acid (TGA)', formatValue((Math.round(tga*100)/100).toFixed(2), 'g')],
                ['25% Ammonia water', formatValue((Math.round(nh3*100)/100).toFixed(2), 'mL')],
                ['DI water to top up (approx)', '≈ ' + formatValue((Math.round(waterApprox*100)/100).toFixed(2), 'mL')]
            ];
            
            rows.forEach(function(row) {
                const $tr = $('<tr>');
                const $nameCell = $('<td>').text(row[0]);
                const $amountCell = $('<td>').text(row[1]);
                
                $tr.append($nameCell, $amountCell);
                $tbody.append($tr);
            });
            
            return { hair, ratio, rows };
        }
        
        // Add input event listeners
        $hairInput.on('input', calculateThioglycolate);
        $ratioInput.on('input', calculateThioglycolate);
        
        // Copy functionality
        $copyBtn.on('click', function() {
            const { hair, ratio, rows } = calculateThioglycolate();
            let copyText = 'Permanent Straightening\n';
            copyText += 'Hair: ' + hair + ' g\nBath volume per 100 g: ' + ratio + ' mL\n\n';
            
            rows.forEach(function(row) {
                copyText += row[0] + ': ' + row[1] + '\n';
            });
            
            copyToClipboard(copyText);
        });
        
        // Initialize with default values
        calculateThioglycolate();
    }

    function initBleachingCalculator() {
        const $weightInput = $('#b_weight');
        const $copyBtn = $('#b_copy');
        const $mordantTbody = $('#b_mordant');
        const $bleachTbody = $('#b_bleach');
        const $neutTbody = $('#b_neut');
        
        // Helper function to round numbers
        function round(num, decimals) {
            const factor = Math.pow(10, decimals);
            return Math.round(num * factor) / factor;
        }
        
        function calculateMordantBleach() {
            const g = Math.max(1, parseFloat($weightInput.val()) || 1);
            const mScale = g/1000;
            const bScale = (g/100) * 5; // Updated to 500ml per 100g of hair
            
            // Clear previous results
            $mordantTbody.empty();
            $bleachTbody.empty();
            $neutTbody.empty();
            
            // Mordant bath components
            const mordantRows = [
                ['Ferrous Sulphate', formatValue(round(200*mScale,2),'g')],
                ['Citric Acid', formatValue(round(100*mScale,2),'g')],
                ['Sodium Chloride', formatValue(round(200*mScale,2),'g')],
                ['Water (mordant bath)', formatValue(round(10000*mScale,0),'mL')],
                ['— Neutralization —', ''],
                ['Ammonium Hydroxide', formatValue(round(100*mScale,1),'mL')],
                ['Water (ammonia bath)', formatValue(round(10000*mScale,0),'mL')]
            ];
            
            // Bleach bath components
            const bleachRows = [
                ['Hydrogen Peroxide 50% (H₂O₂)', formatValue(round(96*bScale,1),'mL')],
                ['Water (base)', formatValue(round(224*bScale,1),'mL')],
                ['Ammonium Persulfate', formatValue(round(12*bScale,3),'g')],
                ['Potassium Persulfate', formatValue(round(8*bScale,3),'g')],
                ['Sodium Carbonate', formatValue(round(4*bScale,3),'g')],
                ['Sodium Silicate', formatValue(round(2*bScale,3),'g')],
                ['Sodium Stannate', formatValue(round(0.8*bScale,3),'g')],
                ['EDTA (Na₂/Na₄)', formatValue(round(0.4*bScale,3),'g')]
            ];
            
            // Neutralizer components
            const neutRows = [
                ['Water', formatValue(round(200*bScale,0),'mL')], // Reduced water amount per 100g
                ['Oxalic Acid', formatValue(round(1*bScale,3),'g')],
                ['or Citric Acid', formatValue(round(1.5*bScale,3),'g')],
                ['Sodium Bisulfite', formatValue(round(0.5*bScale,3),'g')]
            ];
            
            // Display components
            function displayRows(rows, $tbody) {
                rows.forEach(function(row) {
                    const $tr = $('<tr>');
                    const $nameCell = $('<td>').text(row[0]);
                    const $amountCell = $('<td>').text(row[1]);
                    
                    $tr.append($nameCell, $amountCell);
                    $tbody.append($tr);
                });
            }
            
            displayRows(mordantRows, $mordantTbody);
            displayRows(bleachRows, $bleachTbody);
            displayRows(neutRows, $neutTbody);
            
            return { g, mordantRows, bleachRows, neutRows };
        }
        
        // Add input event listener
        $weightInput.on('input', calculateMordantBleach);
        
        // Copy functionality
        $copyBtn.on('click', function() {
            const { g, mordantRows, bleachRows, neutRows } = calculateMordantBleach();
            let copyText = 'Bleaching\nHair: ' + g + ' g\n';
            
            // Helper function to add a block of components
            function addBlock(title, rows) {
                copyText += '\n' + title + '\n';
                rows.forEach(function(row) {
                    if (row[1]) { // Skip empty values
                        copyText += row[0] + ': ' + row[1] + '\n';
                    } else {
                        copyText += row[0] + '\n';
                    }
                });
            }
            
            addBlock('Step 1 — Mordanting', mordantRows);
            addBlock('Step 2 — Bleach Bath (500 ml per 100g)', bleachRows);
            addBlock('Step 3 — Neutralizer', neutRows);
            
            copyToClipboard(copyText);
        });
        
        // Initialize with default values
        calculateMordantBleach();
    }

    // Helper function to format values with units
    function formatValue(value, unit) {
        const num = parseFloat(value);
        
        if (Number.isNaN(num)) return value + ' ' + unit;
        
        // mL -> L if > 999 mL
        if (/^ml$/i.test(unit) && num > 999) {
            return (Math.round((num/1000)*100)/100).toFixed(2).replace(/\.00$/,'') + ' L';
        }
        
        // g -> kg if > 999 g
        if (/^g$/i.test(unit) && num > 999) {
            return (Math.round((num/1000)*100)/100).toFixed(2).replace(/\.00$/,'') + ' kg';
        }
        
        // If already L or kg, keep value with up to 2 decimals trimmed
        if (/^l$/i.test(unit) || /^kg$/i.test(unit)) {
            const out = (Math.round(num*100)/100).toFixed(2).replace(/\.00$/,'');
            return out + ' ' + unit;
        }
        
        // Default: show original unit with trimmed decimals
        const out = (Math.round(num*100)/100).toFixed(2).replace(/\.00$/,'');
        return out + ' ' + unit;
    }

    // Universal copy to clipboard function with mobile fallback
    function copyToClipboard(text) {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(function() {
                    alert('Results copied to clipboard!');
                })
                .catch(function(err) {
                    console.error('Clipboard API failed: ', err);
                    fallbackCopyTextToClipboard(text);
                });
        } else {
            // Fallback for mobile and non-secure contexts
            fallbackCopyTextToClipboard(text);
        }
    }

    // Fallback copy method for mobile devices
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Avoid scrolling to bottom
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('Results copied to clipboard!');
            } else {
                alert('Failed to copy results. Please copy manually.');
            }
        } catch (err) {
            console.error('Fallback copy failed: ', err);
            alert('Copy not supported. Please copy manually.');
        }
        
        document.body.removeChild(textArea);
    }

})(jQuery);