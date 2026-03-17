document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('provider-select');
    const currencySelect = document.getElementById('currency-select');
    // countrySelect is the hidden input holding the zone value
    const countrySelect = document.getElementById('country-select');
    const countrySearch = document.getElementById('country-search');
    const countrySuggestions = document.getElementById('country-suggestions');
    const weightInput = document.getElementById('weight-input');
    const fuelInput = document.getElementById('fuel-surcharge');
    const commercialCheck = document.getElementById('commercial-check');
    const resultsSection = document.getElementById('results-section');

    // Result elements
    const zoneDisplay = document.getElementById('zone-display');
    const baseRateDisplay = document.getElementById('base-rate');
    const demandChargeDisplay = document.getElementById('demand-charge');
    const fuelAmountDisplay = document.getElementById('fuel-amount');
    const commercialRow = document.getElementById('commercial-row');
    const commercialChargeDisplay = document.getElementById('commercial-charge');
    const subtotalDisplay = document.getElementById('subtotal');
    const gstDisplay = document.getElementById('gst-amount');
    const totalPayableDisplay = document.getElementById('total-payable');

    // Basic shipping providers setup
    const providerLogos = {
        'DHL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/512px-DHL_Logo.svg.png',
        'FedEx': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/FedEx_Express.svg/512px-FedEx_Express.svg.png',
        'UPS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/UPS_logo.svg/512px-UPS_logo.svg.png',
        'Aramex': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Aramex_logo.svg/512px-Aramex_logo.svg.png'
    };

    // Populate Provider Dropdown
    const providers = Object.keys(shippingData);
    providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider;
        option.textContent = provider;
        providerSelect.appendChild(option);
    });

    // Setup logo image next to select (since native options don't support images)
    if (!document.getElementById('provider-logo-display')) {
        const img = document.createElement('img');
        img.id = 'provider-logo-display';
        // Positioned absolutely within the relative wrapper to overlay the select box nicely
        img.className = 'absolute right-8 top-1/2 transform -translate-y-1/2 h-4 pointer-events-none hidden';
        providerSelect.parentElement.classList.add('relative');
        providerSelect.parentElement.appendChild(img);
    }

    function updateProviderLogo() {
        const logoImg = document.getElementById('provider-logo-display');
        if (!logoImg) return;

        const provider = providerSelect.value;
        let logoUrl = '';
        if (provider) {
            for (const [key, url] of Object.entries(providerLogos)) {
                if (provider.toLowerCase().includes(key.toLowerCase())) {
                    logoUrl = url;
                    break;
                }
            }
        }

        if (logoUrl) {
            logoImg.src = logoUrl;
            logoImg.classList.remove('hidden');
        } else {
            logoImg.classList.add('hidden');
        }
    }

    // Internal list of { label, zone } for the current provider
    let countryList = [];

    // Build countryList from the selected provider's zones
    function populateCountries() {
        const provider = providerSelect.value;
        if (!provider) return;

        const currentZones = shippingData[provider].zones;
        // Alternate search names for common countries
        const countryAliases = {
            'United States Of America': ['usa', 'us', 'united states', 'america'],
            'United Kingdom': ['uk', 'great britain', 'britain', 'england', 'gb'],
            'United Arab Emirates': ['uae', 'dubai', 'emirates'],
            'Russia': ['russian federation'],
            'South Korea': ['korea south', 'republic of korea'],
            'North Korea': ['korea north'],
            'China, People\'s Republic': ['china', 'prc'],
            'Vietnam': ['viet nam'],
            'Taiwan': ['chinese taipei'],
            'Iran (Islamic Republic of)': ['iran'],
            'Syria': ['syrian arab republic'],
            'Bolivia': ['plurinational state'],
            'Venezuela': ['bolivarian republic'],
        };

        countryList = [...currentZones]
            .filter(country => country['2025 Zone Guide'] && country['2025 Zone Guide'] !== 'Countries and Territories')
            .sort((a, b) => a['2025 Zone Guide'].localeCompare(b['2025 Zone Guide']))
            .map(country => {
                const name = country['2025 Zone Guide'];
                const flag = getCountryFlag(name);
                const aliases = countryAliases[name] || [];
                // searchKey is plain name + all aliases joined — used for filtering
                const searchKey = [name.toLowerCase(), ...aliases].join(' ');
                return {
                    label: flag ? name + ' ' + flag : name,
                    plainName: name,
                    zone: country['Unnamed: 2'],
                    searchKey
                };
            });

        // Reset selection
        countrySelect.value = '';
        countrySearch.value = '';
    }

    // ── Autocomplete logic ──────────────────────────────────────────────────
    let activeIndex = -1;

    function openSuggestions(items) {
        countrySuggestions.innerHTML = '';
        activeIndex = -1;

        if (items.length === 0) {
            const li = document.createElement('li');
            li.className = 'no-results';
            li.textContent = 'No countries found';
            countrySuggestions.appendChild(li);
        } else {
            items.forEach(function (item) {
                const li = document.createElement('li');
                li.setAttribute('role', 'option');
                li.dataset.zone = item.zone;
                // Simple: just set text, no innerHTML
                li.textContent = item.label;
                li.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    selectCountry(item);
                });
                countrySuggestions.appendChild(li);
            });
        }
        countrySuggestions.classList.add('open');
    }

    function closeSuggestions() {
        countrySuggestions.classList.remove('open');
        activeIndex = -1;
    }

    function selectCountry(item) {
        countrySearch.value = item.label;
        countrySelect.value = item.zone;
        closeSuggestions();
        updateAll();
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function setActiveItem(idx) {
        const items = countrySuggestions.querySelectorAll('li:not(.no-results)');
        items.forEach(li => li.classList.remove('active'));
        activeIndex = idx;
        if (idx >= 0 && idx < items.length) {
            items[idx].classList.add('active');
            items[idx].scrollIntoView({ block: 'nearest' });
        }
    }

    countrySearch.addEventListener('input', () => {
        // Clear the selected zone when the user edits the text
        countrySelect.value = '';
        const raw = countrySearch.value;
        // Strip any flag emoji the field might already contain so search is against plain text
        const clean = raw.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim();
        const query = clean.toLowerCase();
        if (!query) {
            openSuggestions(countryList);
            return;
        }
        const filtered = countryList.filter(c => c.searchKey.includes(query));
        openSuggestions(filtered);
    });

    countrySearch.addEventListener('focus', () => {
        // Strip flag so clicking into a pre-filled field shows all countries
        const raw = countrySearch.value.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim();
        const query = raw.toLowerCase();
        const filtered = query
            ? countryList.filter(c => c.searchKey.includes(query))
            : countryList;
        openSuggestions(filtered);
    });

    countrySearch.addEventListener('blur', () => {
        // Small delay so mousedown on list can fire first
        setTimeout(closeSuggestions, 150);
        // If nothing is selected and user typed something non-matching, clear
        if (!countrySelect.value) countrySearch.value = '';
    });

    countrySearch.addEventListener('keydown', (e) => {
        const items = countrySuggestions.querySelectorAll('li:not(.no-results)');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveItem(Math.min(activeIndex + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveItem(Math.max(activeIndex - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < items.length) {
                const li = items[activeIndex];
                const item = countryList.find(c => c.zone === li.dataset.zone);
                if (item) selectCountry(item);
            }
        } else if (e.key === 'Escape') {
            closeSuggestions();
        }
    });
    // ── end autocomplete ────────────────────────────────────────────────────

    // Currency State
    let exchangeRates = { INR: 1 };

    // Fetch Exchange Rates
    fetch('https://api.exchangerate-api.com/v4/latest/INR')
        .then(response => response.json())
        .then(data => {
            exchangeRates = data.rates;
            if (typeof updateAll === 'function') {
                updateAll();
            } else {
                calculateRate();
                if (typeof generateRateTable === 'function') generateRateTable();
            }
        })
        .catch(error => console.error('Error fetching exchange rates:', error));

    const formatCurrency = (amount, currency) => {
        const rate = exchangeRates[currency] || 1;
        const convertedAmount = amount * rate;

        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(convertedAmount);
    };

    // Helper to get flag emoji from country name
    function getCountryFlag(countryName) {
        if (!countryName) return '';

        // Common mappings
        const countryCodes = {
            'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Andorra': 'AD', 'Angola': 'AO',
            'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT', 'Azerbaijan': 'AZ',
            'Bahrain': 'BH', 'Bangladesh': 'BD', 'Belarus': 'BY', 'Belgium': 'BE', 'Bhutan': 'BT',
            'Bolivia': 'BO', 'Bosnia and Herzegovina': 'BA', 'Botswana': 'BW', 'Brazil': 'BR', 'Bulgaria': 'BG',
            'Burundi': 'BI', 'Cambodia': 'KH', 'Cameroon': 'CM', 'Canada': 'CA', 'Cape Verde': 'CV',
            'Chile': 'CL', 'China': 'CN', 'Colombia': 'CO', 'Costa Rica': 'CR', 'Croatia': 'HR',
            'Cuba': 'CU', 'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Denmark': 'DK', 'Djibouti': 'DJ',
            'Dominica': 'DM', 'Dominican Republic': 'DO', 'Ecuador': 'EC', 'Egypt': 'EG', 'El Salvador': 'SV',
            'Eritrea': 'ER', 'Estonia': 'EE', 'Ethiopia': 'ET', 'Fiji': 'FJ', 'Finland': 'FI',
            'France': 'FR', 'Gabon': 'GA', 'Gambia': 'GM', 'Georgia': 'GE', 'Germany': 'DE',
            'Ghana': 'GH', 'Greece': 'GR', 'Guatemala': 'GT', 'Guinea': 'GN', 'Guyana': 'GY',
            'Haiti': 'HT', 'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
            'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE', 'Israel': 'IL',
            'Italy': 'IT', 'Jamaica': 'JM', 'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ',
            'Kenya': 'KE', 'Kuwait': 'KW', 'Lebanon': 'LB', 'Liberia': 'LR', 'Libya': 'LY',
            'Liechtenstein': 'LI', 'Lithuania': 'LT', 'Luxembourg': 'LU', 'Madagascar': 'MG', 'Malawi': 'MW',
            'Malaysia': 'MY', 'Maldives': 'MV', 'Mali': 'ML', 'Malta': 'MT', 'Mauritania': 'MR',
            'Mauritius': 'MU', 'Mexico': 'MX', 'Moldova': 'MD', 'Monaco': 'MC', 'Mongolia': 'MN',
            'Montenegro': 'ME', 'Morocco': 'MA', 'Mozambique': 'MZ', 'Myanmar': 'MM', 'Namibia': 'NA',
            'Nepal': 'NP', 'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Niger': 'NE',
            'Nigeria': 'NG', 'North Korea': 'KP', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK',
            'Palestine': 'PS', 'Panama': 'PA', 'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH',
            'Poland': 'PL', 'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU',
            'Rwanda': 'RW', 'Saudi Arabia': 'SA', 'Senegal': 'SN', 'Serbia': 'RS', 'Seychelles': 'SC',
            'Sierra Leone': 'SL', 'Singapore': 'SG', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Somalia': 'SO',
            'South Africa': 'ZA', 'South Korea': 'KR', 'Spain': 'ES', 'Sri Lanka': 'LK', 'Sudan': 'SD',
            'Suriname': 'SR', 'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY', 'Taiwan': 'TW',
            'Tajikistan': 'TJ', 'Tanzania': 'TZ', 'Thailand': 'TH', 'Togo': 'TG', 'Tunisia': 'TN',
            'Turkey': 'TR', 'Turkmenistan': 'TM', 'Uganda': 'UG', 'Ukraine': 'UA', 'United Arab Emirates': 'AE',
            'United Kingdom': 'GB', 'United States': 'US', 'Uruguay': 'UY', 'Uzbekistan': 'UZ', 'Venezuela': 'VE',
            'Vietnam': 'VN', 'Yemen': 'YE', 'Zambia': 'ZM', 'Zimbabwe': 'ZW'
        };

        // Attempt exact or partial match
        let code = countryCodes[countryName] || Object.keys(countryCodes).find(k => countryName.toLowerCase().includes(k.toLowerCase()));
        if (!code) code = countryCodes[code];

        if (code) {
            return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt() + 127397));
        }
        return '';
    }

    // Pure function for calculation
    function calculateShippingCost(provider, zone, weight, fuelPercent, isCommercial) {
        // Round weight up to nearest 0.5
        const roundedWeight = Math.ceil(weight * 2) / 2;
        let weightKey = roundedWeight.toFixed(1);

        let baseRate = 0;
        let rateFound = false;
        let error = null;

        const providerRates = shippingData[provider].rates;

        if (providerRates[weightKey]) {
            const rate = providerRates[weightKey][zone];
            if (rate !== undefined && rate !== null) {
                baseRate = rate;
                rateFound = true;
            }
        } else {
            // Handle weights higher than max in table
            const weights = Object.keys(providerRates).map(parseFloat).sort((a, b) => a - b);
            const maxWeight = weights[weights.length - 1];

            if (roundedWeight > maxWeight) {
                error = 'Weight limit exceeded';
                return { error };
            }
        }

        if (!rateFound) {
            error = 'Rate not available';
            return { error };
        }

        // Calculations
        const demandCharge = 350; // Changed from flat 150 * weight based on DHL quote
        const fuelSurcharge = (baseRate + demandCharge) * (fuelPercent / 100);
        const commercialCharge = isCommercial ? 3500 : 0;

        const subtotal = baseRate + demandCharge + fuelSurcharge + commercialCharge;
        const gst = subtotal * 0.18;
        const total = subtotal + gst + 500; // Added Rs 500 for any error/margin

        return {
            baseRate,
            demandCharge,
            fuelSurcharge,
            commercialCharge,
            subtotal,
            gst,
            total,
            error: null
        };
    }

    function calculateRate() {
        const provider = providerSelect.value;
        const zone = countrySelect.value;
        let weight = parseFloat(weightInput.value);
        const fuelPercent = parseFloat(fuelInput.value) || 0;
        const isCommercial = commercialCheck.checked;
        const currentCurrency = currencySelect.value;

        if (!provider || !zone || isNaN(weight) || weight <= 0) {
            resultsSection.style.display = 'none';
            return;
        }

        resultsSection.style.display = 'flex';
        zoneDisplay.textContent = `Zone ${zone}`;

        const result = calculateShippingCost(provider, zone, weight, fuelPercent, isCommercial);

        if (result.error) {
            baseRateDisplay.textContent = result.error;
            // Hide other fields or show error state? For now just show error in base rate
            return;
        }

        // Update UI
        baseRateDisplay.textContent = formatCurrency(result.baseRate, currentCurrency);
        demandChargeDisplay.textContent = formatCurrency(result.demandCharge, currentCurrency);
        fuelAmountDisplay.textContent = formatCurrency(result.fuelSurcharge, currentCurrency);

        if (isCommercial) {
            commercialRow.style.display = 'flex';
            commercialChargeDisplay.textContent = formatCurrency(result.commercialCharge, currentCurrency);
        } else {
            commercialRow.style.display = 'none';
        }

        subtotalDisplay.textContent = formatCurrency(result.subtotal, currentCurrency);
        gstDisplay.textContent = formatCurrency(result.gst, currentCurrency);
        totalPayableDisplay.textContent = formatCurrency(result.total, currentCurrency);
    }

    // Rate Table Generation
    const inlineRateTableContainer = document.getElementById('inline-rate-table-container');
    const rateTableBody = document.getElementById('rate-table-body');
    const tableSubtitle = document.getElementById('table-subtitle');
    const printBtn = document.getElementById('print-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    function generateRateTable() {
        const provider = providerSelect.value;
        const zone = countrySelect.value;
        const fuelPercent = parseFloat(fuelInput.value) || 0;
        const isCommercial = commercialCheck.checked;
        const currentCurrency = currencySelect.value;

        if (!provider || !zone) {
            if (inlineRateTableContainer) {
                inlineRateTableContainer.classList.add('hidden');
            }
            return;
        }

        // Get country name for subtitle from the autocomplete text input
        let countryName = countrySearch ? countrySearch.value : zone;
        // Strip flag emoji (handles flag on either side)
        let pureCountryName = countryName.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '').replace(/\s*[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim();
        const flag = getCountryFlag(pureCountryName);
        const displayCountryName = pureCountryName + (flag ? ' ' + flag : '');

        if (tableSubtitle) {
            tableSubtitle.textContent = `Rates for ${displayCountryName} via ${provider} (${currentCurrency})`;
        }

        const rateGridContainer = document.getElementById('rate-grid-container');

        const providerRates = shippingData[provider]?.rates;
        if (!providerRates) return;

        // Get shipping provider logo
        const providerLogos = {
            'DHL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/512px-DHL_Logo.svg.png',
            'FedEx': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/FedEx_Express.svg/512px-FedEx_Express.svg.png',
            'UPS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/UPS_logo.svg/512px-UPS_logo.svg.png',
            'Aramex': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Aramex_logo.svg/512px-Aramex_logo.svg.png'
        };

        // Find best match for logo
        let logoUrl = '';
        for (const [key, url] of Object.entries(providerLogos)) {
            if (provider.toLowerCase().includes(key.toLowerCase())) {
                logoUrl = url;
                break;
            }
        }

        const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${provider}" class="h-4 inline-block ml-2 align-middle">` : '';

        // Get all weights and sort them numerically
        const weights = Object.keys(providerRates).map(parseFloat).sort((a, b) => a - b);

        let tableHTML = `
            <table class="w-full text-left border-collapse border border-gray-300 max-w-md mx-auto shadow-sm bg-white text-xs">
                <thead>
                    <tr>
                        <th colspan="2" class="border border-gray-300 p-1 sm:p-2 bg-gray-100 font-semibold text-center text-gray-800">
                            Shipping Charges for - ${displayCountryName} ${logoHtml}
                        </th>
                    </tr>
                    <tr>
                        <th class="border border-gray-300 p-1 sm:p-2 font-semibold bg-gray-50 text-gray-700 w-1/2">Weight</th>
                        <th class="border border-gray-300 p-1 sm:p-2 font-semibold bg-gray-50 text-gray-700 w-1/2 text-right">Rate</th>
                    </tr>
                </thead>
                <tbody id="rate-table-body">
        `;

        weights.forEach(weight => {
            const result = calculateShippingCost(provider, zone, weight, fuelPercent, isCommercial);

            if (!result.error) {
                const weightText = weight % 1 === 0 ? weight : weight.toFixed(1);
                tableHTML += `
                    <tr class="hover:bg-gray-50 transition-colors" data-weight="${weight}">
                        <td class="border border-gray-300 p-1 sm:p-2 text-gray-800">${weightText} kg</td>
                        <td class="border border-gray-300 p-1 sm:p-2 text-gray-800 font-medium text-right">${formatCurrency(result.total, currentCurrency)}</td>
                    </tr>
                `;
            }
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        if (rateGridContainer) {
            rateGridContainer.innerHTML = tableHTML;
        }

        if (inlineRateTableContainer) {
            inlineRateTableContainer.classList.remove('hidden');
        }
    }

    let currentExportAction = 'jpg';

    const exportModal = document.getElementById('export-modal'); // now a popover
    const exportFromSelect = document.getElementById('export-from-weight');
    const exportToSelect = document.getElementById('export-to-weight');
    const confirmExportBtn = document.getElementById('confirm-export-btn');
    const closeExportBtn = document.querySelector('.close-export-btn');

    function openExportModal(action = 'jpg', event) {
        if (event) event.stopPropagation();

        // If clicking the same button, toggle off
        if (currentExportAction === action && !exportModal.classList.contains('hidden')) {
            closeExportModal();
            return;
        }

        currentExportAction = action;
        const tableBody = document.getElementById('rate-table-body');
        if (!tableBody) return;

        // Get all weight values from rows
        const rows = Array.from(tableBody.querySelectorAll('tr[data-weight]'));
        if (rows.length === 0) return;

        const weights = rows.map(row => parseFloat(row.getAttribute('data-weight')));

        // Populate dropdowns
        exportFromSelect.innerHTML = '';
        exportToSelect.innerHTML = '';

        weights.forEach((w) => {
            const wText = w % 1 === 0 ? w : w.toFixed(1);

            const fromOpt = document.createElement('option');
            fromOpt.value = w;
            fromOpt.textContent = `${wText} kg`;
            exportFromSelect.appendChild(fromOpt);

            const toOpt = document.createElement('option');
            toOpt.value = w;
            toOpt.textContent = `${wText} kg`;
            exportToSelect.appendChild(toOpt);
        });

        // Select first and last by default
        exportFromSelect.value = weights[0];
        exportToSelect.value = weights[weights.length - 1];

        // Update Modal UI text
        const modalTitle = document.getElementById('export-modal-title');
        const btnIcon = document.getElementById('export-btn-icon');
        const btnText = document.getElementById('export-btn-text');

        if (action === 'print') {
            modalTitle.textContent = 'Print Range';
            btnIcon.className = 'fas fa-print';
            btnText.textContent = 'Print';
        } else {
            modalTitle.textContent = 'Export JPG Range';
            btnIcon.className = 'fas fa-camera';
            btnText.textContent = 'Capture JPG';
        }

        exportModal.classList.remove('hidden');
    }

    function closeExportModal() {
        if (exportModal) {
            exportModal.classList.add('hidden');
        }
    }

    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', closeExportModal);
    }

    // Close popover when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!exportModal.classList.contains('hidden')) {
            const isClickInside = exportModal.contains(event.target) ||
                (printBtn && printBtn.contains(event.target)) ||
                (downloadJpgBtn && downloadJpgBtn.contains(event.target));
            if (!isClickInside) {
                closeExportModal();
            }
        }
    });

    function executeExport() {
        const tableContainer = document.getElementById('inline-rate-table-container');
        const tableBody = document.getElementById('rate-table-body');
        if (!tableContainer || !tableBody) return;

        const fromWeight = parseFloat(exportFromSelect.value);
        const toWeight = parseFloat(exportToSelect.value);

        if (fromWeight > toWeight) {
            alert("From weight cannot be greater than To weight.");
            return;
        }

        const provider = providerSelect.value;
        const rawCountryName = (countrySearch ? countrySearch.value : '') || countrySelect.value;
        const countryName = rawCountryName.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '').trim();

        // Hide rows outside range
        const rows = Array.from(tableBody.querySelectorAll('tr[data-weight]'));
        rows.forEach(row => {
            const w = parseFloat(row.getAttribute('data-weight'));
            if (w < fromWeight || w > toWeight) {
                row.style.display = 'none';
            } else {
                row.style.display = ''; // Ensure visible
            }
        });

        // Close modal visually immediately so it's not captured if overlaying
        closeExportModal();

        if (currentExportAction === 'print') {
            const printWindow = window.open('', '', 'height=600,width=800');
            const tableContent = tableContainer.querySelector('table').outerHTML;
            const subtitle = tableSubtitle ? tableSubtitle.textContent : 'Shipping Rates';

            printWindow.document.write('<html><head><title>Shipping Rates</title>');
            printWindow.document.write('<style>');
            printWindow.document.write(`
                body { font-family: sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f2f2f2; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tr[style*="display: none"] { display: none !important; }
                .text-right { text-align: right; }
            `);
            printWindow.document.write('</style></head><body>');
            printWindow.document.write(`<h1>${subtitle}</h1>`);
            printWindow.document.write(tableContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
                // Restore all rows
                rows.forEach(row => row.style.display = '');
            }, 250);

        } else {
            if (typeof html2canvas === 'undefined') {
                console.error("html2canvas is not loaded");
                rows.forEach(row => row.style.display = '');
                return;
            }

            // Hide buttons for screenshot
            const actionButtons = tableContainer.querySelector('.flex.items-center.gap-2.self-end');
            if (actionButtons) actionButtons.style.display = 'none';

            // Small delay to ensure rendering of hidden rows applies
            setTimeout(() => {
                html2canvas(tableContainer, {
                    scale: 2,
                    backgroundColor: '#ffffff'
                }).then(canvas => {
                    // Restore buttons
                    if (actionButtons) actionButtons.style.display = '';

                    // Restore all rows
                    rows.forEach(row => row.style.display = '');

                    const imageURI = canvas.toDataURL('image/jpeg', 0.9);
                    const link = document.createElement('a');
                    link.href = imageURI;
                    link.download = `Shipping_Rates_${countryName}_${provider}_${fromWeight}kg_to_${toWeight}kg.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }).catch(err => {
                    console.error("Error generating JPG:", err);
                    if (actionButtons) actionButtons.style.display = '';
                    rows.forEach(row => row.style.display = '');
                });
            }, 100);
        }
    }

    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', executeExport);
    }

    if (printBtn) {
        printBtn.addEventListener('click', (e) => openExportModal('print', e));
    }

    // Use the updated button ID to open modal
    const downloadJpgBtn = document.getElementById('download-jpg-btn');
    if (downloadJpgBtn) {
        downloadJpgBtn.addEventListener('click', (e) => openExportModal('jpg', e));
    }

    function updateAll() {
        calculateRate();
        generateRateTable();
    }

    providerSelect.addEventListener('change', () => {
        updateProviderLogo();
        populateCountries();
        // Re-select first country of the new provider
        if (countryList.length > 0) selectCountry(countryList[0]);
        else updateAll();
    });
    currencySelect.addEventListener('change', updateAll);
    weightInput.addEventListener('input', calculateRate);
    fuelInput.addEventListener('input', updateAll);
    commercialCheck.addEventListener('change', updateAll);

    // Initial table load — runs last so formatCurrency and all consts are defined
    updateProviderLogo();
    if (providers.length > 0) {
        providerSelect.value = providers[0];
        populateCountries();
        if (countryList.length > 0) {
            selectCountry(countryList[0]);
        } else {
            updateAll();
        }
    }

});
