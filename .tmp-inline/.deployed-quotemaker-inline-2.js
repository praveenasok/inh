
        // Initialize dropdown population when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize dropdown manager (Firebase data only)
        });
        
        // Global variables
        let currentQuote = {
            number: '',
            date: '',
            client: null,
            salesperson: '',
            currency: 'INR',
            priceList: '',
            items: [],
            subtotal: 0,
            discount: 0,
            tax: 18,
            total: 0,
            status: 'draft'
        };
        
        // Defensive variable declarations to prevent redeclaration errors
        if (typeof productData === 'undefined') {
            var productData = [];
        }
        if (typeof clientData === 'undefined') {
            var clientData = [];
        }
        if (typeof salesmenData === 'undefined') {
            var salesmenData = [];
        }
        if (typeof stylesData === 'undefined') {
            var stylesData = [];
        }
        if (typeof colorsData === 'undefined') {
            var colorsData = [];
        }
        // LocalStorageDropdownManager removed - using Firebase-only data
        
        // All data will be loaded directly from Firebase
        // No fallback data - Firebase connection is required
        
        let isManualPriceEntry = false; // Track if user is manually entering price
        
        // Currency symbols
        const currencySymbols = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'AUD': 'A$',
            'AED': 'د.إ ',
            'NGN': '₦',
            'CAD': 'C$',
            'JPY': '¥'
        };

        // Exchange rates (base: INR)
        let exchangeRates = {
            'INR': 1,
            'USD': 0.012,
            'EUR': 0.011,
            'GBP': 0.0095,
            'AUD': 0.018,
            'AED': 0.044,
            'NGN': 19.5,
            'CAD': 0.016,
            'JPY': 1.8
        };

        // Fetch real-time exchange rates
        async function fetchExchangeRates() {
            try {
                // Using multiple APIs for better reliability
                let data = null;
                
                // Try primary API first
                try {
                    const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
                    data = await response.json();
                } catch (e) {
                    // Backup API
                    const response = await fetch('https://api.fixer.io/latest?base=INR&access_key=YOUR_API_KEY');
                    data = await response.json();
                }
                
                if (data && data.rates) {
                    const newRates = {
                        'INR': 1,
                        'USD': data.rates.USD || exchangeRates.USD,
                        'EUR': data.rates.EUR || exchangeRates.EUR,
                        'GBP': data.rates.GBP || exchangeRates.GBP,
                        'AUD': data.rates.AUD || exchangeRates.AUD,
                        'AED': data.rates.AED || exchangeRates.AED,
                        'NGN': data.rates.NGN || exchangeRates.NGN,
                        'CAD': data.rates.CAD || exchangeRates.CAD,
                        'JPY': data.rates.JPY || exchangeRates.JPY
                    };
                    
                    // Update rates and recalculate all prices if rates changed
                    const ratesChanged = JSON.stringify(exchangeRates) !== JSON.stringify(newRates);
                    exchangeRates = newRates;
                    
                    if (ratesChanged && currentQuote.items.length > 0) {
                        updatePricing();
                        updateQuoteSummary();
                    }
                    

                }
            } catch (error) {
            }
        }

        // Convert amount between currencies
        function convertCurrency(amount, fromCurrency, toCurrency) {
            if (fromCurrency === toCurrency) return amount;
            
            // Convert to INR first, then to target currency
            const inrAmount = amount / exchangeRates[fromCurrency];
            return inrAmount * exchangeRates[toCurrency];
        }

        // Start periodic exchange rate updates
        function startExchangeRateUpdates() {
            // Update rates every 30 minutes
            setInterval(async () => {
                await fetchExchangeRates();
                // Recalculate current quote with new rates
                recalculateWithCurrentRates();
            }, 30 * 60 * 1000);
        }

        // Recalculate all prices with current exchange rates
        function recalculateWithCurrentRates() {
            if (currentQuote && currentQuote.items && currentQuote.items.length > 0) {
                // Update pricing for current product selection
                updatePricing();
                
                // Update quote summary
                updateQuoteSummary();
                
                // Update quote items display
                updateQuoteItemsDisplay();
            }
        }







        // Global initialization function that can be called manually
        async function initializeQuoteMaker() {
            
            // Prevent multiple initializations
            if (window.quoteMakerInitialized) {
                return;
            }
            
            showLoading(true);
            
            try {
                // Initialize Firebase as primary data source
                try {
                    await waitForFirebase();
                    await initializeFirebase();
                } catch (firebaseError) {
                    throw new Error('Firebase connection required. Please check your internet connection and try again.');
                }
                
                // LocalStorageDropdownManager removed - using Firebase-only data
                
                // Load data using fallback-first strategy
                await loadAllData();
                await fetchExchangeRates();
                startExchangeRateUpdates();
                
                // Setup event listeners
                setupEventListeners();
                
                // Initialize quote
                initializeQuote();
                
                // Load saved quotes
                await loadSavedQuotes();
                
                // Mark as initialized
                window.quoteMakerInitialized = true;
                
                // Quote Maker initialized successfully
                
            } catch (error) {
                showError('Failed to initialize application. Please refresh the page.');
            } finally {
                showLoading(false);
            }
        }

        // Debug function to test data loading
        window.debugDataLoading = async function() {
            console.log('=== DEBUG DATA LOADING ===');
            
            try {
                if (!window.universalDataManager) {
                    console.log('ERROR: universalDataManager not available');
                    return;
                }
                
                console.log('Data manager available, checking if ready...');
                
                if (!window.universalDataManager.isReady()) {
                    console.log('ERROR: Data manager not ready');
                    return;
                }
                
                console.log('Data manager ready, loading products...');
                
                const products = await window.universalDataManager.getProducts();
                console.log('Products loaded:', products.length, 'items');
                
                if (products.length > 0) {
                    console.log('First product:', products[0]);
                    
                    // Check for PriceList field
                    const firstProduct = products[0];
                    if (firstProduct.PriceList) {
                        console.log('PriceList field found:', firstProduct.PriceList);
                    } else if (firstProduct.priceList) {
                        console.log('priceList field found:', firstProduct.priceList);
                    } else {
                        console.log('No PriceList/priceList field found');
                        console.log('Available fields:', Object.keys(firstProduct));
                    }
                    
                    // Test dropdown population
                    console.log('Testing dropdown population...');
                    const priceListSelector = document.getElementById('price-list-selector');
                    if (priceListSelector) {
                        console.log('Price list selector found');
                        
                        // Extract unique price lists
                        const priceLists = [...new Set(products
                            .map(product => product.PriceList || product.priceList)
                            .filter(priceList => priceList && priceList.trim() !== ''))];
                        
                        console.log('Unique price lists found:', priceLists);
                        
                        if (priceLists.length > 0) {
                            console.log('SUCCESS: Data and dropdown logic working');
                        } else {
                            console.log('ERROR: No valid price lists found in data');
                        }
                    } else {
                        console.log('ERROR: price-list-selector element not found');
                    }
                }
                
            } catch (error) {
                console.log('ERROR in debug function:', error);
            }
        };

        // Make the initialization function globally available
        window.initializeQuoteMaker = initializeQuoteMaker;

        // Initialize the application when DOM is ready (for direct access) or immediately if already loaded (for menu system)
        if (document.readyState === 'loading') {
            // DOM is still loading, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', async function() {
                await initializeQuoteMaker();
            });
        } else {
            // DOM is already loaded, initialize immediately (this happens when loaded via menu)
            setTimeout(async () => {
                await initializeQuoteMaker();
            }, 100); // Small delay to ensure all scripts are loaded
        }

        // Initialize universal Firebase data manager
        async function initializeFirebase() {
            try {
                // First, ensure Firebase SDK is loaded and initialized
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK not loaded');
                }
                
                // Initialize Firebase app if not already done
                if (typeof window.initializeFirebaseApp === 'function') {
                    try {
                        await window.initializeFirebaseApp();
                        console.log('Firebase app initialized successfully');
                    } catch (error) {
                        console.warn('Firebase app initialization warning:', error);
                    }
                }
                
                // Wait for authentication to complete
                if (firebase.auth) {
                    try {
                        console.log('Waiting for Firebase authentication...');
                        
                        // Check if user is already authenticated
                        let user = firebase.auth().currentUser;
                        
                        // If not authenticated, wait for auth state change or sign in anonymously
                        if (!user) {
                            await new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => {
                                    reject(new Error('Authentication timeout'));
                                }, 10000); // 10 second timeout
                                
                                const unsubscribe = firebase.auth().onAuthStateChanged(async (authUser) => {
                                    if (authUser) {
                                        clearTimeout(timeout);
                                        unsubscribe();
                                        console.log('User authenticated:', authUser.uid, authUser.isAnonymous ? '(anonymous)' : '(authenticated)');
                                        resolve(authUser);
                                    } else {
                                        // Try to sign in anonymously
                                        try {
                                            const userCredential = await firebase.auth().signInAnonymously();
                                            clearTimeout(timeout);
                                            unsubscribe();
                                            console.log('Anonymous authentication successful:', userCredential.user.uid);
                                            resolve(userCredential.user);
                                        } catch (authError) {
                                            console.warn('Anonymous authentication failed:', authError);
                                            clearTimeout(timeout);
                                            unsubscribe();
                                            resolve(null); // Continue without auth
                                        }
                                    }
                                });
                            });
                        } else {
                            console.log('User already authenticated:', user.uid, user.isAnonymous ? '(anonymous)' : '(authenticated)');
                        }
                    } catch (authError) {
                        console.warn('Authentication setup failed:', authError);
                        // Continue without authentication - some operations may still work
                    }
                }
                
                // Initialize window.db for direct Firestore access
                if (!window.db) {
                    window.db = firebase.firestore();
                    console.log('Firebase Firestore instance created');
                }
                
                // Wait for universal data manager to be available
                let attempts = 0;
                const maxAttempts = 20; // 10 seconds max wait
                
                while (!window.universalDataManager && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                
                if (!window.universalDataManager) {
                    throw new Error('Universal data manager not available after waiting');
                }
                
                // Wait for universal data manager to be ready
                await window.universalDataManager.waitForReady();
                
                const status = window.universalDataManager.getStatus();
                if (status.isInitialized && status.isDataLoaded) {
                    updateConnectionStatus(true);
                } else {
                    updateConnectionStatus(false);
                    throw new Error('Universal Firebase data manager not ready. Please check your connection.');
                }
                
            } catch (error) {
                updateConnectionStatus(false);
                throw error;
            }
        }

        // Load all required data from Firebase
        async function loadAllData() {
            try {
                // Load data from Firebase only
                const [products, clients, salesmen, styles, colors] = await Promise.all([
                    loadProducts(),
                    loadClients(),
                    loadSalesmen(),
                    loadStyles(),
                    loadColors()
                ]);
                
                // Ensure all dropdowns are populated after data loading
                populateAllDropdowns();
                
                // Initialize Firebase real-time listeners for enhanced dropdowns
                await initializeFirebaseListeners();
                
            } catch (error) {
                throw error;
            }
        }

        // Centralized function to populate all dropdowns
        function populateAllDropdowns() {
            try {
                // Populate main dropdowns (non-Firebase real-time)
                populatePriceListDropdown();
                populateClientDropdown();
                populateSalespersonDropdown();
                
                // Note: Shades, Colors, and Styles dropdowns are now handled by Firebase real-time listeners
                // in initializeFirebaseListeners() function
                
            } catch (error) {
                // Error populating dropdowns
            }
        }

        // Load product data from Firebase
        async function loadProducts() {
            try {
                console.log('loadProducts called');
                // Load data from Firebase using universal data manager
                if (window.universalDataManager) {
                    console.log('Universal data manager available');
                    const status = window.universalDataManager.getStatus();
                    console.log('Data manager status:', status);
                    if (status.isInitialized && status.isDataLoaded) {
                        productData = await window.universalDataManager.getProducts();
                        console.log('Products loaded:', productData ? productData.length : 0);
                        // Populate color types after product data is loaded
                        populateColorTypes();
                        return productData;
                    } else {
                        console.log('Data manager not ready:', status);
                        throw new Error('Firebase universal data manager not ready');
                    }
                } else {
                    console.log('Universal data manager not available');
                    throw new Error('Firebase universal data manager not available');
                }
                
            } catch (error) {
                console.error('loadProducts error:', error);
                productData = [];
                throw error;
            }
        }

        // Load clients from Firebase
        async function loadClients() {
            try {
                // Load data from Firebase using universal data manager
                if (window.universalDataManager) {
                    const status = window.universalDataManager.getStatus();
                    if (status.isInitialized && status.isDataLoaded) {
                        clientData = await window.universalDataManager.getClients();
                        return clientData;
                    } else {
                        throw new Error('Firebase universal data manager not ready');
                    }
                } else {
                    throw new Error('Firebase universal data manager not available');
                }
                
            } catch (error) {
                clientData = [];
                throw error;
            }
        }

        // Load salespeople from Firebase (prefer firebaseDB config path)
        async function loadSalesmen() {
            try {
                // Prefer direct Firebase DB access when available
                if (window.firebaseDB && typeof window.firebaseDB.isAvailable === 'function' && window.firebaseDB.isAvailable()) {
                    salesmenData = await window.firebaseDB.getSalesmen();
                    return salesmenData;
                }

                // Fallback to universal data manager
                if (window.universalDataManager) {
                    const status = window.universalDataManager.getStatus();
                    if (status.isInitialized && status.isDataLoaded) {
                        salesmenData = await window.universalDataManager.getSalespeople();
                        return salesmenData;
                    } else {
                        throw new Error('Firebase universal data manager not ready');
                    }
                } else {
                    throw new Error('Firebase universal data manager not available');
                }
            } catch (error) {
                salesmenData = [];
                throw error;
            }
        }

        // Load styles from Firebase (prefer direct firebaseDB access)
        async function loadStyles() {
            try {
                if (window.firebaseDB && typeof window.firebaseDB.isAvailable === 'function' && window.firebaseDB.isAvailable()) {
                    stylesData = await window.firebaseDB.getStyles();
                    populateStylesFromCollection(stylesData);
                    return stylesData;
                }

                // Fallback to universal data manager
                if (window.universalDataManager) {
                    const status = window.universalDataManager.getStatus();
                    if (status.isInitialized && status.isDataLoaded) {
                        stylesData = await window.universalDataManager.getStyles();
                        populateStylesFromCollection(stylesData);
                        return stylesData;
                    } else {
                        throw new Error('Firebase universal data manager not ready');
                    }
                } else {
                    throw new Error('Firebase universal data manager not available');
                }
            } catch (error) {
                stylesData = [];
                throw error;
            }
        }

        // Load colors from Firebase (prefer direct firebaseDB access)
        async function loadColors() {
            try {
                if (window.firebaseDB && typeof window.firebaseDB.isAvailable === 'function' && window.firebaseDB.isAvailable()) {
                    colorsData = await window.firebaseDB.getColors();
                    populateColors(colorsData);
                    return colorsData;
                }

                // Fallback to universal data manager
                if (window.universalDataManager) {
                    const status = window.universalDataManager.getStatus();
                    if (status.isInitialized && status.isDataLoaded) {
                        colorsData = await window.universalDataManager.getColors();
                        populateColors(colorsData);
                        return colorsData;
                    } else {
                        throw new Error('Firebase universal data manager not ready');
                    }
                } else {
                    throw new Error('Firebase universal data manager not available');
                }
            } catch (error) {
                colorsData = [];
                throw error;
            }
        }

        // Populate price list dropdown using Firebase data
        function populatePriceListDropdown() {
            console.log('populatePriceListDropdown called');
            const priceListSelector = document.getElementById('price-list-selector');
            if (!priceListSelector) {
                console.log('Price list selector not found');
                return;
            }
            
            console.log('Product data available:', productData);
            if (!productData || productData.length === 0) {
                console.log('No product data available for dropdown population');
                return;
            }
            
            // Clear existing options
            priceListSelector.innerHTML = '<option value="">Select Price List</option>';
            
            // Get unique price lists from Firebase product data (prioritize 'Price List Name')
            const priceLists = [...new Set(
                productData
                    .map(product => product['Price List Name'] || product.PriceListName || product.PriceList)
            )].filter(Boolean);
            console.log('Price lists extracted:', priceLists);
            
            priceLists.forEach(priceList => {
                const option = document.createElement('option');
                option.value = priceList;
                option.textContent = priceList;
                priceListSelector.appendChild(option);
            });
            
            console.log('Price list dropdown populated with', priceLists.length, 'options');
        }

        // Populate client dropdown using Firebase data
        function populateClientDropdown() {
            const clientSelector = document.getElementById('client-selector');
            if (!clientSelector) {
                return;
            }
            
            if (!clientData || clientData.length === 0) {
                return;
            }
            
            // Clear existing options
            clientSelector.innerHTML = '<option value="">Select Client</option>';
            
            // Add "Add New Client" option
            const addNewOption = document.createElement('option');
            addNewOption.value = 'add-new';
            addNewOption.textContent = '+ Add New Client';
            clientSelector.appendChild(addNewOption);
            
            // Add clients from Firebase data
            clientData.forEach(client => {
                const option = document.createElement('option');
                option.value = client.name || client.clientName;
                option.textContent = client.name || client.clientName;
                clientSelector.appendChild(option);
            });
            

        }

        // Populate salesperson dropdown using Firebase data
        function populateSalespersonDropdown() {
            const salespersonSelector = document.getElementById('salesperson-selector');
            if (!salespersonSelector) {
                return;
            }
            
            if (!salesmenData || salesmenData.length === 0) {
                return;
            }
            
            // Clear existing options
            salespersonSelector.innerHTML = '<option value="">Select Salesperson</option>';
            
            // Add salespeople from Firebase data
            salesmenData.forEach(salesperson => {
                const option = document.createElement('option');
                option.value = salesperson.name || salesperson.salesmanName;
                option.textContent = salesperson.name || salesperson.salesmanName;
                salespersonSelector.appendChild(option);
            });
            

        }

        // Setup event listeners
        function setupEventListeners() {
            
            // Price list change
            document.getElementById('price-list-selector').addEventListener('change', onPriceListChange);
            
            // Category change
            document.getElementById('category-selector').addEventListener('change', onCategoryChange);
            
            // Product change
            document.getElementById('product-selector').addEventListener('change', onProductChange);
            
            // Other selectors
            document.getElementById('density-selector').addEventListener('change', () => {
                const priceList = document.getElementById('price-list-selector').value;
                const category = document.getElementById('category-selector').value;
                const product = document.getElementById('product-selector').value;
                const density = document.getElementById('density-selector').value;
                
                // Populate color types based on selected criteria
                if (priceList && category && product) {
                    populateColorTypes(priceList, category, product, density);
                }
                
                isManualPriceEntry = false; // Reset manual entry flag
                updatePricing();
            });
            document.getElementById('length-selector').addEventListener('change', () => {
                isManualPriceEntry = false; // Reset manual entry flag
                updatePricing();
            });
            // Color type change
            document.getElementById('color-type-selector').addEventListener('change', () => {
                isManualPriceEntry = false; // Reset manual entry flag
                updatePricing();
            });
            document.getElementById('color-type-selector').addEventListener('change', onColorTypeChange);
            document.getElementById('color-selector').addEventListener('change', (e) => {
                const customColorContainer = document.querySelector('.custom-color-container');
                const colorImageBtn = document.getElementById('color-image-btn');
                const customColorInput = document.getElementById('custom-color-input');
                
                if (e.target.value === 'Custom') {
                    // Show with smooth animation
                    customColorContainer.style.display = 'block';
                    setTimeout(() => {
                        customColorContainer.classList.add('show');
                    }, 10);
                    customColorInput.disabled = false;
                    colorImageBtn.disabled = false;
                    customColorInput.focus(); // Auto-focus for better UX
                } else {
                    // Hide with smooth animation
                    customColorContainer.classList.remove('show');
                    setTimeout(() => {
                        customColorContainer.style.display = 'none';
                    }, 300);
                    customColorInput.disabled = true;
                    customColorInput.value = '';
                    customColorInput.classList.remove('custom-input-error');
                    colorImageBtn.disabled = true;
                    // Clear any uploaded color image
                    const colorImageInput = document.getElementById('color-image-input');
                    const colorImagePreview = document.getElementById('color-image-preview');
                    if (colorImageInput) colorImageInput.value = '';
                    if (colorImagePreview) {
                        colorImagePreview.style.display = 'none';
                        colorImagePreview.innerHTML = '';
                    }
                }
                isManualPriceEntry = false; // Reset manual entry flag
                updatePricing();
            });
            document.getElementById('style-selector').addEventListener('change', (e) => {
                const customStyleContainer = document.querySelector('.custom-style-container');
                const styleImageBtn = document.getElementById('style-image-btn');
                const customStyleInput = document.getElementById('custom-style-input');
                
                if (e.target.value === 'Custom') {
                    // Show with smooth animation
                    customStyleContainer.style.display = 'block';
                    setTimeout(() => {
                        customStyleContainer.classList.add('show');
                    }, 10);
                    customStyleInput.disabled = false;
                    styleImageBtn.disabled = false;
                    customStyleInput.focus(); // Auto-focus for better UX
                } else {
                    // Hide with smooth animation
                    customStyleContainer.classList.remove('show');
                    setTimeout(() => {
                        customStyleContainer.style.display = 'none';
                    }, 300);
                    customStyleInput.disabled = true;
                    customStyleInput.value = '';
                    customStyleInput.classList.remove('custom-input-error');
                    styleImageBtn.disabled = true;
                    // Clear any uploaded style image
                    const styleImageInput = document.getElementById('style-image-input');
                    const styleImagePreview = document.getElementById('style-image-preview');
                    if (styleImageInput) styleImageInput.value = '';
                    if (styleImagePreview) {
                        styleImagePreview.style.display = 'none';
                        styleImagePreview.innerHTML = '';
                    }
                }
                isManualPriceEntry = false; // Reset manual entry flag
                updatePricing();
            });
            
            // Quantity and price inputs
            document.getElementById('quantity-input').addEventListener('input', () => {
                updatePricing();
            });
            document.getElementById('unit-price-input').addEventListener('input', () => {
                isManualPriceEntry = true; // User is manually entering price
                updatePricing();
            });
            
            // Currency change
            document.getElementById('currency-selector').addEventListener('change', onCurrencyChange);
            
            // Client selector
            document.getElementById('client-selector').addEventListener('change', onClientChange);
            
            // Add item button
            document.getElementById('add-item-btn').addEventListener('click', addQuoteItem);
            
            // Custom input validation
            document.getElementById('custom-color-input').addEventListener('input', function() {
                validateCustomInputs();
            });
            
            document.getElementById('custom-style-input').addEventListener('input', function() {
                validateCustomInputs();
            });
            
            // Auto-expand on focus and auto-collapse on blur
            document.getElementById('custom-color-input').addEventListener('focus', function() {
                const container = document.querySelector('.custom-color-container');
                if (container && container.classList.contains('show')) {
                    container.classList.remove('collapsed');
                }
            });
            
            document.getElementById('custom-color-input').addEventListener('blur', function() {
                // Small delay to allow for potential focus on related elements
                setTimeout(() => {
                    const container = document.querySelector('.custom-color-container');
                    if (container && container.classList.contains('show')) {
                        container.classList.add('collapsed');
                    }
                }, 150);
            });
            
            document.getElementById('custom-style-input').addEventListener('focus', function() {
                const container = document.querySelector('.custom-style-container');
                if (container && container.classList.contains('show')) {
                    container.classList.remove('collapsed');
                }
            });
            
            document.getElementById('custom-style-input').addEventListener('blur', function() {
                // Small delay to allow for potential focus on related elements
                setTimeout(() => {
                    const container = document.querySelector('.custom-style-container');
                    if (container && container.classList.contains('show')) {
                        container.classList.add('collapsed');
                    }
                }, 150);
            });
            
            // Summary inputs
            document.getElementById('discount-input').addEventListener('input', updateQuoteSummary);
            document.getElementById('tax-input').addEventListener('input', updateQuoteSummary);
            
            // Shipping input with error handling
            const shippingInput = document.getElementById('shipping-input');
            if (shippingInput) {
                shippingInput.addEventListener('input', updateQuoteSummary);
            }
            
            // Action buttons
            document.getElementById('save-quote-btn').addEventListener('click', saveQuote);
            
            // Optional buttons with null checks
            const clearQuoteBtn = document.getElementById('clear-quote-btn');
            if (clearQuoteBtn) {
                clearQuoteBtn.addEventListener('click', clearQuote);
            }
            
            const duplicateQuoteBtn = document.getElementById('duplicate-quote-btn');
            if (duplicateQuoteBtn) {
                duplicateQuoteBtn.addEventListener('click', duplicateQuote);
            }
            
            const loadQuoteBtn = document.getElementById('load-quote-btn');
            if (loadQuoteBtn) {
                loadQuoteBtn.addEventListener('click', loadQuote);
            }
            
            // Modal events
            document.getElementById('close-modal-btn').addEventListener('click', closeAddClientModal);
            document.getElementById('cancel-client-btn').addEventListener('click', closeAddClientModal);
            document.getElementById('add-client-form').addEventListener('submit', addNewClient);
            
            // Image upload functionality
            setupImageUploadListeners();
        }
        
        // Enhanced image upload functionality
        function setupImageUploadListeners() {
            // Color image upload
            const colorImageBtn = document.getElementById('color-image-btn');
            const colorImageInput = document.getElementById('color-image-input');
            const colorImagePreview = document.getElementById('color-image-preview');
            const colorImageDisplay = document.getElementById('color-image-display');
            const removeColorImageBtn = document.getElementById('remove-color-image');
            
            // Check if all required elements exist before setting up listeners
            if (!colorImageBtn || !colorImageInput || !colorImagePreview || !colorImageDisplay || !removeColorImageBtn) {
                return;
            }
            
            colorImageBtn.addEventListener('click', () => {
                colorImageInput.click();
            });
            
            colorImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showError('Please select a valid image file.');
                        return;
                    }
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showError('Image file size must be less than 5MB.');
                        return;
                    }
                    
                    // Show loading state
                    colorImageBtn.classList.add('image-upload-loading');
                    colorImageBtn.disabled = true;
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        colorImageDisplay.src = e.target.result;
                        colorImagePreview.classList.remove('hidden');
                        colorImagePreview.style.display = ''; // Reset display style
                        
                        // Add has-image class to expand container for thumbnail
                        const customColorContainer = document.querySelector('.custom-color-container');
                        if (customColorContainer) {
                            customColorContainer.classList.add('has-image');
                        }
                        
                        // Remove loading state
                        colorImageBtn.classList.remove('image-upload-loading');
                        colorImageBtn.disabled = false;
                    };
                    reader.onerror = () => {
                        showError('Failed to load image. Please try again.');
                        colorImageBtn.classList.remove('image-upload-loading');
                        colorImageBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            removeColorImageBtn.addEventListener('click', () => {
                colorImageInput.value = '';
                colorImagePreview.classList.add('hidden');
                colorImageDisplay.src = '';
                
                // Remove has-image class to collapse container
                const customColorContainer = document.querySelector('.custom-color-container');
                if (customColorContainer) {
                    customColorContainer.classList.remove('has-image');
                }
                
                // Check if container should expand back when image is removed
                handleCustomAreaCollapse('color');
            });
            
            // Style image upload
            const styleImageBtn = document.getElementById('style-image-btn');
            const styleImageInput = document.getElementById('style-image-input');
            const styleImagePreview = document.getElementById('style-image-preview');
            const styleImageDisplay = document.getElementById('style-image-display');
            const removeStyleImageBtn = document.getElementById('remove-style-image');
            
            // Check if all required elements exist before setting up listeners
            if (!styleImageBtn || !styleImageInput || !styleImagePreview || !styleImageDisplay || !removeStyleImageBtn) {
                return;
            }
            
            styleImageBtn.addEventListener('click', () => {
                styleImageInput.click();
            });
            
            styleImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showError('Please select a valid image file.');
                        return;
                    }
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showError('Image file size must be less than 5MB.');
                        return;
                    }
                    
                    // Show loading state
                    styleImageBtn.classList.add('image-upload-loading');
                    styleImageBtn.disabled = true;
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        styleImageDisplay.src = e.target.result;
                        styleImagePreview.classList.remove('hidden');
                        styleImagePreview.style.display = ''; // Reset display style
                        
                        // Add has-image class to expand container for thumbnail
                        const customStyleContainer = document.querySelector('.custom-style-container');
                        if (customStyleContainer) {
                            customStyleContainer.classList.add('has-image');
                        }
                        
                        // Remove loading state
                        styleImageBtn.classList.remove('image-upload-loading');
                        styleImageBtn.disabled = false;
                    };
                    reader.onerror = () => {
                        showError('Failed to load image. Please try again.');
                        styleImageBtn.classList.remove('image-upload-loading');
                        styleImageBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            removeStyleImageBtn.addEventListener('click', () => {
                styleImageInput.value = '';
                styleImagePreview.classList.add('hidden');
                styleImageDisplay.src = '';
                
                // Remove has-image class to collapse container
                const customStyleContainer = document.querySelector('.custom-style-container');
                if (customStyleContainer) {
                    customStyleContainer.classList.remove('has-image');
                }
                
                // Check if container should expand back when image is removed
                handleCustomAreaCollapse('style');
            });
            
            // Custom input change handlers
            document.getElementById('custom-color-input').addEventListener('input', () => {
                isManualPriceEntry = false;
                updatePricing();
            });
            
            document.getElementById('custom-style-input').addEventListener('input', () => {
                isManualPriceEntry = false;
                updatePricing();
            });
            
            // OK button event listeners
            document.getElementById('custom-color-ok-btn').addEventListener('click', () => {
                handleCustomAreaCollapse('color');
            });
            
            document.getElementById('custom-style-ok-btn').addEventListener('click', () => {
                handleCustomAreaCollapse('style');
            });
        }

        // Price list change handler
        function onPriceListChange() {
            const priceList = document.getElementById('price-list-selector').value;
            currentQuote.priceList = priceList;
            
            if (priceList) {
                populateCategories(priceList);
                enableSelector('category-selector');
            } else {
                clearCascadeSelectors(['category-selector', 'product-selector', 'density-selector', 'length-selector', 'color-type-selector', 'color-selector']);
            }
        }

        // Populate categories based on price list using Firebase data
        function populateCategories(priceList) {
            const selector = document.getElementById('category-selector');
            if (!selector) {
                return;
            }
            
            if (!productData || productData.length === 0) {
                return;
            }
            
            // Clear existing options
            selector.innerHTML = '<option value="">Select Category</option>';
            
            // Get unique categories for the selected price list
            // Handle different field name variations
            const filteredProducts = productData.filter(product => {
                const priceListField = product.PriceList || product['Price List Name'] || product.PriceListName;
                return priceListField === priceList;
            });
            
            const categories = [...new Set(
                filteredProducts.map(product => {
                    return product.Category || product.category;
                })
            )].filter(Boolean);
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                selector.appendChild(option);
            });
            

            
            // Auto-select if only one option is available
            const options = selector.querySelectorAll('option:not([value=""])');
            if (options.length === 1) {
                selector.value = options[0].value;
                // Trigger the change event to populate dependent dropdowns
                onCategoryChange();
            }
        }

        // Category change handler
        function onCategoryChange() {
            const priceList = document.getElementById('price-list-selector').value;
            const category = document.getElementById('category-selector').value;
            
            if (priceList && category) {
                populateProducts(priceList, category);
                enableSelector('product-selector');
            } else {
                clearCascadeSelectors(['product-selector', 'density-selector', 'length-selector', 'color-type-selector', 'color-selector']);
            }
        }

        // Populate products based on price list and category using Firebase data
        function populateProducts(priceList, category) {
            const selector = document.getElementById('product-selector');
            if (!selector) {
                return;
            }
            
            if (!productData || productData.length === 0) {
                return;
            }
            
            // Get unique products for the selected price list and category
            // Handle different field name variations
            const products = [...new Set(
                productData
                    .filter(product => {
                        const priceListField = product.PriceList || product['Price List Name'] || product.PriceListName;
                        const categoryField = product.Category || product.category;
                        return priceListField === priceList && categoryField === category;
                    })
                    .map(product => product.Product || product.ProductName || product.name)
            )].filter(Boolean);
            
            selector.innerHTML = '<option value="">Select Product</option>';
            
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product;
                option.textContent = product;
                selector.appendChild(option);
            });
            
            // Auto-select if only one option is available
            if (products.length === 1) {
                selector.value = products[0];
                // Trigger the change event to populate dependent dropdowns
                onProductChange();
            }
        }

        // Product change handler
        function onProductChange() {
            const priceList = document.getElementById('price-list-selector').value;
            const category = document.getElementById('category-selector').value;
            const product = document.getElementById('product-selector').value;
            const density = document.getElementById('density-selector').value;
            
            if (priceList && category && product) {
                populateDensities(priceList, category, product);
                populateLengths(priceList, category, product);
                populateColorTypes(priceList, category, product, density);
                
                enableSelector('density-selector');
                enableSelector('length-selector');
                enableSelector('color-type-selector');
                enableSelector('color-selector');
                enableSelector('style-selector');
                
                updatePricing();
            } else {
                clearCascadeSelectors(['density-selector', 'length-selector', 'color-type-selector', 'color-selector', 'style-selector']);
                
                // Re-enable color and style selectors since they have independent data sources
                if (colorsData && colorsData.length > 0) {
                    populateColors();
                    enableSelector('color-selector');
                }
                if (stylesData && stylesData.length > 0) {
                    populateStylesFromCollection();
                    enableSelector('style-selector');
                }
            }
        }

        // Color type change handler
        function onColorTypeChange() {
            const selectedShade = document.getElementById('color-type-selector').value;
            console.log('Shade changed to:', selectedShade);
            // Only trigger pricing update; dropdowns remain as-is.
            updatePricing();
        }
        
        // Populate actual shades based on Dark/Light Colors selection
        function populateActualShades(colorCategory) {
            const colorSelector = document.getElementById('color-selector');
            if (!colorSelector) {
                return;
            }
            
            // Get the categorized shades from the stored data
            const availableShades = window.availableShades;
            if (!availableShades) {
                console.log('No available shades data found');
                return;
            }
            
            let shadesToShow = [];
            if (colorCategory === 'Dark Colors') {
                shadesToShow = availableShades.dark || [];
            } else if (colorCategory === 'Light Colors') {
                shadesToShow = availableShades.light || [];
            }
            
            console.log(`Populating ${colorCategory}:`, shadesToShow);
            
            // Clear and populate the color selector with actual shades
            colorSelector.innerHTML = '<option value="">Select Shade</option>';
            
            // Add Custom option at the top
            const customOption = document.createElement('option');
            customOption.value = 'Custom';
            customOption.textContent = 'Custom';
            colorSelector.appendChild(customOption);
            
            // Add the categorized shades
            shadesToShow.forEach(shade => {
                const option = document.createElement('option');
                option.value = shade;
                option.textContent = shade;
                colorSelector.appendChild(option);
            });
            
            // Enable the color selector
            enableSelector('color-selector');
        }

        // Populate densities using Firebase data
        function populateDensities(priceList, category, product) {
            const selector = document.getElementById('density-selector');
            if (!selector) {
                return;
            }
            
            if (!productData || productData.length === 0) {
                return;
            }
            
            // Get unique densities for the selected product - handle field name variations
            const densities = [...new Set(
                productData
                    .filter(item => {
                        const itemPriceList = item.PriceList || item.priceList || item['Price List Name'] || item.PriceListName;
                        const itemCategory = item.Category || item.category;
                        const itemProduct = item.Product || item.ProductName || item.product || item.name;
                        return itemPriceList === priceList && itemCategory === category && itemProduct === product;
                    })
                    .map(item => item.Density || item.density)
            )].filter(Boolean);
            
            selector.innerHTML = '<option value="">Select Density</option>';
            
            densities.forEach(density => {
                const option = document.createElement('option');
                option.value = density;
                option.textContent = density;
                selector.appendChild(option);
            });
            
            // Auto-select if only one option is available
            const options = selector.querySelectorAll('option:not([value=""])');
            if (options.length === 1) {
                selector.value = options[0].value;
                updatePricing();
            }
        }

        // Populate lengths using Firebase data
        function populateLengths(priceList, category, product) {
            const selector = document.getElementById('length-selector');
            if (!selector) {
                return;
            }
            
            if (!productData || productData.length === 0) {
                return;
            }
            
            // Get unique lengths for the selected product - handle field name variations
            const lengths = [...new Set(
                productData
                    .filter(item => {
                        const itemPriceList = item.PriceList || item.priceList || item['Price List Name'] || item.PriceListName;
                        const itemCategory = item.Category || item.category;
                        const itemProduct = item.Product || item.ProductName || item.product || item.name;
                        return itemPriceList === priceList && itemCategory === category && itemProduct === product;
                    })
                    .map(item => item.Length || item.length)
            )].filter(Boolean);
            
            selector.innerHTML = '<option value="">Select Length</option>';
            
            lengths.sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
            }).forEach(length => {
                const option = document.createElement('option');
                option.value = length;
                option.textContent = length;
                selector.appendChild(option);
            });
            
            // Auto-select if only one option is available
            const options = selector.querySelectorAll('option:not([value=""])');
            if (options.length === 1) {
                selector.value = options[0].value;
                updatePricing();
            }
        }

        // Populate shades using product data (shade column from pricelists sheet)
        function populateColorTypes(priceList, category, product, density) {
            console.log('populateColorTypes called with:', { priceList, category, product, density });
            
            const selector = document.getElementById('color-type-selector');
            if (!selector) {
                return;
            }
            
            if (!productData || productData.length === 0) {
                console.log('No productData available');
                return;
            }
            
            console.log('Total productData items:', productData.length);
            
            // Check if no filters are applied (initial load)
            const hasFilters = (priceList && priceList.trim() !== '') || 
                              (category && category.trim() !== '') || 
                              (product && product.trim() !== '') || 
                              (density && density.trim() !== '');
            
            let filteredProducts = productData;
            
            // Only apply filters if at least one filter is provided
            if (hasFilters) {
                if (priceList && priceList.trim() !== '') {
                    filteredProducts = filteredProducts.filter(item => {
                        const itemPriceList = item.PriceList || item.priceList || item['Price List Name'] || item.PriceListName;
                        return itemPriceList === priceList;
                    });
                    console.log('Filtered by priceList:', priceList, 'Remaining products:', filteredProducts.length);
                }
                
                if (category && category.trim() !== '') {
                    filteredProducts = filteredProducts.filter(item => {
                        const itemCategory = item.Category || item.category;
                        return itemCategory === category;
                    });
                    console.log('Filtered by category:', category, 'Remaining products:', filteredProducts.length);
                }
                
                if (product && product.trim() !== '') {
                    filteredProducts = filteredProducts.filter(item => {
                        const itemProduct = item.Product || item.ProductName || item.product || item.name;
                        return itemProduct === product;
                    });
                    console.log('Filtered by product:', product, 'Remaining products:', filteredProducts.length);
                }
                
                if (density && density.trim() !== '') {
                    filteredProducts = filteredProducts.filter(item => {
                        const itemDensity = item.Density || item.density;
                        return itemDensity === density;
                    });
                    console.log('Filtered by density:', density, 'Remaining products:', filteredProducts.length);
                }
            } else {
                console.log('No filters applied - showing all available shades');
            }
            
            console.log('Filtered products count:', filteredProducts.length);
            
            // Extract unique shades from filtered product data
            const shadeSet = new Set();
            filteredProducts.forEach(item => {
                const rawShade = item.Shade || item.shade || item.Shades || item.shades || item.ColorType || item.color_type || '';
                if (typeof rawShade === 'string' && rawShade.trim() !== '') {
                    rawShade.split(',').forEach(s => {
                        const trimmed = s.trim();
                        if (trimmed) shadeSet.add(trimmed);
                    });
                }
            });
            const shades = Array.from(shadeSet);
            
            // Sort shades alphabetically for consistent display
            shades.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            
            console.log('Available shades:', shades);
            console.log('Shades count:', shades.length);
            
            // Categorize shades into Dark Colors and Light Colors
            const darkShades = [];
            const lightShades = [];
            
            shades.forEach(shade => {
                // Define logic to categorize shades
                // Common dark shades: 1, 1B, 2, 4, 6, 8, 10, Natural Black, Dark Brown, etc.
                // Common light shades: 12, 14, 16, 18, 20, 22, 24, 27, 30, 33, 60, 613, Blonde, Light Brown, etc.
                const shadeStr = shade.toString().toLowerCase();
                
                if (shadeStr.includes('black') || 
                    shadeStr.includes('dark') || 
                    shadeStr === '1' || 
                    shadeStr === '1b' || 
                    shadeStr === '2' || 
                    shadeStr === '4' || 
                    shadeStr === '6' || 
                    shadeStr === '8' || 
                    shadeStr === '10' ||
                    shadeStr.includes('brown') && !shadeStr.includes('light')) {
                    darkShades.push(shade);
                } else {
                    lightShades.push(shade);
                }
            });
            
            // Store the categorized shades for later use
            window.availableShades = {
                dark: darkShades,
                light: lightShades,
                all: shades
            };
            
            console.log('Dark shades:', darkShades);
            console.log('Light shades:', lightShades);
            
            // Populate the selector with actual shades list when product shades available
            selector.innerHTML = '<option value="">Select Shade</option>';
            shades.forEach(shade => {
                const option = document.createElement('option');
                option.value = shade;
                option.textContent = shade;
                selector.appendChild(option);
            });
        }

        // Populate colors from Firebase data
        function populateColors() {
            populateColorsByType(''); // Show all colors initially
        }

        // Populate colors filtered by color type
        function populateColorsByType(colorType) {
            const colorSelector = document.getElementById('color-selector');
            if (!colorSelector) {
                return;
            }
            
            if (!colorsData || colorsData.length === 0) {
                return;
            }
            
            // Clear existing options
            colorSelector.innerHTML = '<option value="">Select Color</option>';
            
            // Filter colors by type if specified
            const filteredColors = colorType ? 
                colorsData.filter(color => color.category === colorType) : 
                colorsData;
            
            // Add colors from Firebase data
            filteredColors.forEach(color => {
                const option = document.createElement('option');
                option.value = color.name || color.colorName;
                option.textContent = color.name || color.colorName;
                colorSelector.appendChild(option);
            });
            
            // Add custom option
            const customOption = document.createElement('option');
            customOption.value = 'Custom';
            customOption.textContent = 'Custom Color';
            colorSelector.appendChild(customOption);
        }

        // Populate styles from Firebase data
        function populateStylesFromCollection() {
            const styleSelector = document.getElementById('style-selector');
            if (!styleSelector) {
                return;
            }
            
            if (!stylesData || stylesData.length === 0) {
                return;
            }
            
            // Clear existing options
            styleSelector.innerHTML = '<option value="">Select Style</option>';
            
            // Add styles from Firebase data
            stylesData.forEach(style => {
                const option = document.createElement('option');
                option.value = style.name || style.styleName;
                option.textContent = style.name || style.styleName;
                styleSelector.appendChild(option);
            });
            
            // Add custom option
            const customOption = document.createElement('option');
            customOption.value = 'Custom';
            customOption.textContent = 'Custom Style';
            styleSelector.appendChild(customOption);
            

        }

        // Firebase Real-time Listeners and Enhanced Dropdown Management
        let firebaseListeners = {
            pricelists: null,
            products: null,
            colors: null,
            styles: null
        };

        // Loading states management
        const loadingStates = {
            pricelists: false,
            products: false,
            colors: false,
            styles: false
        };

        // Show loading state for dropdown
        function showDropdownLoading(dropdownId, message = 'Loading...') {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.innerHTML = `<option value="">${message}</option>`;
                dropdown.disabled = true;
                loadingStates[dropdownId.replace('-selector', '')] = true;
            }
        }

        // Show error state for dropdown
        function showDropdownError(dropdownId, message = 'Error loading data') {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.innerHTML = `<option value="">${message}</option>`;
                dropdown.disabled = true;
            }
        }

        // Enable dropdown after successful data load
        function enableDropdownAfterLoad(dropdownId) {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.disabled = false;
                const key = dropdownId.replace('-selector', '');
                loadingStates[key] = false;
            }
        }

        // Initialize Firebase real-time listeners with enhanced error handling
        async function initializeFirebaseListeners() {
            try {
                console.log('Initializing Firebase real-time listeners...');
                
                // Check if Firebase is properly initialized
                if (typeof firebase === 'undefined') {
                    console.error('Firebase SDK not loaded');
                    throw new Error('Firebase SDK not available');
                }
                
                // Check authentication state before proceeding
                if (firebase.auth) {
                    const currentUser = firebase.auth().currentUser;
                    if (!currentUser) {
                        console.log('No authenticated user found, waiting for authentication...');
                        // Wait a bit for authentication to complete
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const userAfterWait = firebase.auth().currentUser;
                        if (!userAfterWait) {
                            console.warn('Still no authenticated user, proceeding anyway...');
                        } else {
                            console.log('User authenticated after wait:', userAfterWait.uid);
                        }
                    } else {
                        console.log('User already authenticated:', currentUser.uid);
                    }
                }
                
                // Initialize window.db if not already set
                if (!window.db) {
                    try {
                        window.db = firebase.firestore();
                        console.log('Firebase Firestore initialized successfully');
                    } catch (error) {
                        console.error('Error initializing Firebase Firestore:', error);
                        throw new Error('Firebase database not available');
                    }
                }

                // Check Firebase connection state
                await checkFirebaseConnection();

                // Clean up any existing listeners first
                cleanupFirebaseListeners();

                // Add delay to prevent rapid listener creation
                await new Promise(resolve => setTimeout(resolve, 500));

                // Set up listeners with retry logic
                await setupListenersWithRetry();

                console.log('Firebase real-time listeners initialized successfully');
            } catch (error) {
                console.error('Error initializing Firebase listeners:', error);
                // Fallback: populate dropdowns using non-realtime data and keep UI usable
                try {
                    const priceList = (document.getElementById('price-list-selector') && document.getElementById('price-list-selector').value) || '';
                    const category = (document.getElementById('category-selector') && document.getElementById('category-selector').value) || '';
                    const product = (document.getElementById('product-selector') && document.getElementById('product-selector').value) || '';
                    const density = (document.getElementById('density-selector') && document.getElementById('density-selector').value) || '';

                    if (typeof populateColorTypes === 'function') {
                        populateColorTypes(priceList, category, product, density);
                        enableDropdownAfterLoad('color-type-selector');
                    }

                    if (Array.isArray(window.colorsData) && window.colorsData.length > 0 && typeof populateColors === 'function') {
                        // Use existing loaded colors
                        populateColors();
                        enableDropdownAfterLoad('color-selector');
                    }

                    if (Array.isArray(window.stylesData) && window.stylesData.length > 0 && typeof populateStylesFromCollection === 'function') {
                        // Use existing loaded styles
                        populateStylesFromCollection();
                        enableDropdownAfterLoad('style-selector');
                    }
                } catch (fallbackError) {
                    console.error('Fallback dropdown population failed:', fallbackError);
                }

                // Soft retry after delay
                setTimeout(() => {
                    console.log('Retrying Firebase listeners initialization...');
                    initializeFirebaseListeners();
                }, 5000);
            }
        }

        // Check Firebase connection state
        async function checkFirebaseConnection() {
            try {
                // Ensure window.db is initialized
                if (!window.db) {
                    if (typeof firebase === 'undefined') {
                        throw new Error('Firebase SDK not loaded');
                    }
                    window.db = firebase.firestore();
                }
                
                // Test connection with a simple query
                const testQuery = await window.db.collection('config').limit(1).get();
                console.log('Firebase connection verified');
                return true;
            } catch (error) {
                console.error('Firebase connection test failed:', error);
                throw new Error('Firebase connection not available');
            }
        }

        // Clean up existing Firebase listeners
        function cleanupFirebaseListeners() {
            console.log('Cleaning up existing Firebase listeners...');
            
            if (firebaseListeners.pricelists) {
                firebaseListeners.pricelists();
                firebaseListeners.pricelists = null;
            }
            
            if (firebaseListeners.products) {
                firebaseListeners.products();
                firebaseListeners.products = null;
            }
            
            if (firebaseListeners.colors) {
                firebaseListeners.colors();
                firebaseListeners.colors = null;
            }
            
            if (firebaseListeners.styles) {
                firebaseListeners.styles();
                firebaseListeners.styles = null;
            }
        }

        // Setup listeners with retry logic
        async function setupListenersWithRetry() {
            const setupPromises = [
                // Shades are now derived from products data
                setupProductsShadesListenerWithRetry(),
                setupColorsListenerWithRetry(),
                setupStylesListenerWithRetry()
            ];

            await Promise.allSettled(setupPromises);
        }

        // Set up real-time listener for pricelists collection (for shades dropdown)
        function setupPricelistsListener() {
            try {
                showDropdownLoading('color-type-selector', 'Loading shades...');
                
                // Clean up existing listener
                if (firebaseListeners.pricelists) {
                    firebaseListeners.pricelists();
                }

                // Set up new listener with enhanced error handling
                firebaseListeners.pricelists = window.db.collection('pricelists').onSnapshot(
                    (snapshot) => {
                        console.log('Pricelists data updated, refreshing shades dropdown...');
                        const pricelistsData = [];
                        
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            if (data) {
                                pricelistsData.push({ id: doc.id, ...data });
                            }
                        });

                        // Update shades dropdown with new data
                        populateShadesFromPricelists(pricelistsData);
                        enableDropdownAfterLoad('color-type-selector');
                    },
                    (error) => {
                        console.error('Error in pricelists listener:', error);
                        showDropdownError('color-type-selector', 'Error loading shades');
                        
                        // Retry after delay if connection error
                        if (error.code === 'unavailable' || error.message.includes('UNAVAILABLE')) {
                            setTimeout(() => {
                                console.log('Retrying pricelists listener...');
                                setupPricelistsListener();
                            }, 2000);
                        }
                    }
                );
            } catch (error) {
                console.error('Error setting up pricelists listener:', error);
                showDropdownError('color-type-selector', 'Error loading shades');
            }
        }

        // Set up pricelists listener with retry logic
        async function setupPricelistsListenerWithRetry(retryCount = 0) {
            const maxRetries = 3;
            
            try {
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Progressive delay
                setupPricelistsListener();
            } catch (error) {
                console.error(`Pricelists listener setup failed (attempt ${retryCount + 1}):`, error);
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying pricelists listener setup in ${(retryCount + 1) * 1000}ms...`);
                    return setupPricelistsListenerWithRetry(retryCount + 1);
                } else {
                    showDropdownError('color-type-selector', 'Failed to load shades');
                    throw error;
                }
            }
        }

        // Set up real-time listener for products collection to populate shades
        function setupProductsShadesListener() {
            try {
                showDropdownLoading('color-type-selector', 'Loading shades...');

                // Clean up existing listener
                if (firebaseListeners.products) {
                    firebaseListeners.products();
                }

                // Listen to products collection
                firebaseListeners.products = window.db.collection('products').onSnapshot(
                    (snapshot) => {
                        const shadesSet = new Set();

                        snapshot.forEach((doc) => {
                            const data = doc.data() || {};
                            // Handle multiple possible shade fields and comma-separated values
                            const rawShade = data.Shade || data.shade || data.Shades || data.shades || '';
                            if (typeof rawShade === 'string' && rawShade.trim() !== '') {
                                rawShade.split(',').forEach(s => {
                                    const trimmed = s.trim();
                                    if (trimmed) shadesSet.add(trimmed);
                                });
                            }
                        });

                        const shades = Array.from(shadesSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                        window.availableShades = { all: shades };

                        const selector = document.getElementById('color-type-selector');
                        if (selector) {
                            selector.innerHTML = '<option value="">Select Shade</option>';
                            shades.forEach(shade => {
                                const option = document.createElement('option');
                                option.value = shade;
                                option.textContent = shade;
                                selector.appendChild(option);
                            });
                            enableDropdownAfterLoad('color-type-selector');
                        }
                    },
                    (error) => {
                        console.error('Error in products listener for shades:', error);
                        showDropdownError('color-type-selector', 'Error loading shades');
                        // Retry after delay if connection error
                        if (error.code === 'unavailable' || (error.message && error.message.includes('UNAVAILABLE'))) {
                            setTimeout(() => {
                                console.log('Retrying products shades listener...');
                                setupProductsShadesListener();
                            }, 2000);
                        }
                    }
                );
            } catch (error) {
                console.error('Error setting up products shades listener:', error);
                showDropdownError('color-type-selector', 'Error loading shades');
            }
        }

        // Set up products shades listener with retry logic
        async function setupProductsShadesListenerWithRetry(retryCount = 0) {
            const maxRetries = 3;
            try {
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                setupProductsShadesListener();
            } catch (error) {
                console.error(`Products shades listener setup failed (attempt ${retryCount + 1}):`, error);
                if (retryCount < maxRetries) {
                    console.log(`Retrying products shades listener setup in ${(retryCount + 1) * 1000}ms...`);
                    return setupProductsShadesListenerWithRetry(retryCount + 1);
                } else {
                    showDropdownError('color-type-selector', 'Failed to load shades');
                    throw error;
                }
            }
        }

        // Set up real-time listener for colors (prefer config/colors, fallback to collection)
        function setupColorsListener() {
            try {
                showDropdownLoading('color-selector', 'Loading colors...');
                
                // Clean up existing listener
                if (firebaseListeners.colors) {
                    firebaseListeners.colors();
                }

                const configDocRef = window.db.collection('config').doc('colors');
                const docUnsub = configDocRef.onSnapshot(
                    (doc) => {
                        if (doc && doc.exists) {
                            console.log('Config colors doc updated, refreshing colors dropdown...');
                            const raw = doc.data() || {};
                            let colorsData = [];

                            if (Array.isArray(raw.colors)) {
                                colorsData = raw.colors;
                            } else if (Array.isArray(raw.list)) {
                                colorsData = raw.list;
                            } else if (Array.isArray(raw)) {
                                colorsData = raw;
                            } else if (typeof raw === 'object') {
                                colorsData = Object.keys(raw).map(key => {
                                    const val = raw[key];
                                    if (val && typeof val === 'object') return { id: key, ...val };
                                    return { id: key, name: String(val) };
                                });
                            }

                            window.colorsData = colorsData;
                            populateColorsFromCollection(colorsData);
                            enableDropdownAfterLoad('color-selector');
                        } else {
                            console.log('Config colors doc not found; falling back to colors collection');
                            const colUnsub = window.db.collection('colors').onSnapshot(
                                (snapshot) => {
                                    console.log('Colors collection updated, refreshing colors dropdown...');
                                    const colorsData = [];
                                    snapshot.forEach((d) => {
                                        const data = d.data();
                                        if (data) {
                                            colorsData.push({ id: d.id, ...data });
                                        }
                                    });
                                    window.colorsData = colorsData;
                                    populateColorsFromCollection(colorsData);
                                    enableDropdownAfterLoad('color-selector');
                                },
                                (error) => {
                        console.error('Error in colors collection listener:', error);
                        // Keep existing options; ensure dropdown is enabled
                        enableDropdownAfterLoad('color-selector');
                    }
                );
                firebaseListeners.colors = colUnsub;
                if (typeof docUnsub === 'function') docUnsub();
                }
            },
            (error) => {
                console.error('Error in config colors listener:', error);
                // Do not show error UI; keep dropdown usable
                enableDropdownAfterLoad('color-selector');
                // Fallback to collection on error
                const colUnsub = window.db.collection('colors').onSnapshot(
                    (snapshot) => {
                        const colorsData = [];
                        snapshot.forEach((d) => {
                            const data = d.data();
                            if (data) {
                                colorsData.push({ id: d.id, ...data });
                            }
                        });
                        window.colorsData = colorsData;
                        populateColorsFromCollection(colorsData);
                        enableDropdownAfterLoad('color-selector');
                    },
                    (err) => {
                        console.error('Error in colors collection listener:', err);
                        // Keep dropdown enabled even on error
                        enableDropdownAfterLoad('color-selector');
                    }
                );
                firebaseListeners.colors = colUnsub;
            }
        );

                // Track initial doc listener for cleanup; may be replaced by collection listener
                firebaseListeners.colors = docUnsub;
            } catch (error) {
                console.error('Error setting up colors listener:', error);
                // Do not show error UI; keep dropdown usable
                enableDropdownAfterLoad('color-selector');
            }
        }

        // Set up colors listener with retry logic
        async function setupColorsListenerWithRetry(retryCount = 0) {
            const maxRetries = 3;
            
            try {
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Progressive delay
                setupColorsListener();
            } catch (error) {
                console.error(`Colors listener setup failed (attempt ${retryCount + 1}):`, error);
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying colors listener setup in ${(retryCount + 1) * 1000}ms...`);
                    return setupColorsListenerWithRetry(retryCount + 1);
                } else {
                    showDropdownError('color-selector', 'Failed to load colors');
                    throw error;
                }
            }
        }

        // Set up real-time listener for styles (prefer config/styles, fallback to collection)
        function setupStylesListener() {
            try {
                showDropdownLoading('style-selector', 'Loading styles...');
                
                // Clean up existing listener
                if (firebaseListeners.styles) {
                    firebaseListeners.styles();
                }

                const configDocRef = window.db.collection('config').doc('styles');
                const docUnsub = configDocRef.onSnapshot(
                    (doc) => {
                        if (doc && doc.exists) {
                            console.log('Config styles doc updated, refreshing styles dropdown...');
                            const raw = doc.data() || {};
                            let stylesData = [];

                            if (Array.isArray(raw.styles)) {
                                stylesData = raw.styles;
                            } else if (Array.isArray(raw.list)) {
                                stylesData = raw.list;
                            } else if (Array.isArray(raw)) {
                                stylesData = raw;
                            } else if (typeof raw === 'object') {
                                stylesData = Object.keys(raw).map(key => {
                                    const val = raw[key];
                                    if (val && typeof val === 'object') return { id: key, ...val };
                                    return { id: key, stylename: String(val) };
                                });
                            }

                            window.stylesData = stylesData;
                            populateStylesFromCollection(stylesData);
                            enableDropdownAfterLoad('style-selector');
                        } else {
                            console.log('Config styles doc not found; falling back to styles collection');
                            const colUnsub = window.db.collection('styles').onSnapshot(
                                (snapshot) => {
                                    console.log('Styles collection updated, refreshing styles dropdown...');
                                    const stylesData = [];
                                    snapshot.forEach((d) => {
                                        const data = d.data();
                                        if (data) {
                                            stylesData.push({ id: d.id, ...data });
                                        }
                                    });
                                    window.stylesData = stylesData;
                                    populateStylesFromCollection(stylesData);
                                    enableDropdownAfterLoad('style-selector');
                                },
                                (error) => {
                                    console.error('Error in styles collection listener:', error);
                                    // Keep dropdown enabled even on error
                                    enableDropdownAfterLoad('style-selector');
                                }
                            );
                            firebaseListeners.styles = colUnsub;
                            if (typeof docUnsub === 'function') docUnsub();
                        }
                    },
                    (error) => {
                        console.error('Error in config styles listener:', error);
                        // Do not show error UI; keep dropdown usable
                        enableDropdownAfterLoad('style-selector');
                        // Fallback to collection on error
                        const colUnsub = window.db.collection('styles').onSnapshot(
                            (snapshot) => {
                                const stylesData = [];
                                snapshot.forEach((d) => {
                                    const data = d.data();
                                    if (data) {
                                        stylesData.push({ id: d.id, ...data });
                                    }
                                });
                                window.stylesData = stylesData;
                                populateStylesFromCollection(stylesData);
                                enableDropdownAfterLoad('style-selector');
                            },
                            (err) => {
                                console.error('Error in styles collection listener:', err);
                                // Keep dropdown enabled even on error
                                enableDropdownAfterLoad('style-selector');
                            }
                        );
                        firebaseListeners.styles = colUnsub;
                    }
                );

                // Track initial doc listener for cleanup; may be replaced by collection listener
                firebaseListeners.styles = docUnsub;
            } catch (error) {
                console.error('Error setting up styles listener:', error);
                // Do not show error UI; keep dropdown usable
                enableDropdownAfterLoad('style-selector');
            }
        }

        // Set up styles listener with retry logic
        async function setupStylesListenerWithRetry(retryCount = 0) {
            const maxRetries = 3;
            
            try {
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Progressive delay
                setupStylesListener();
            } catch (error) {
                console.error(`Styles listener setup failed (attempt ${retryCount + 1}):`, error);
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying styles listener setup in ${(retryCount + 1) * 1000}ms...`);
                    return setupStylesListenerWithRetry(retryCount + 1);
                } else {
                    showDropdownError('style-selector', 'Failed to load styles');
                    throw error;
                }
            }
        }

        // Populate shades dropdown from pricelists collection
        function populateShadesFromPricelists(pricelistsData) {
            const shadesSelector = document.getElementById('color-type-selector');
            if (!shadesSelector) {
                console.error('Shades selector not found');
                return;
            }

            try {
                // Clear existing options
                shadesSelector.innerHTML = '<option value="">Select Shades</option>';

                if (!pricelistsData || pricelistsData.length === 0) {
                    console.log('No pricelists data available for shades');
                    return;
                }

                // Extract unique shades from pricelists data
                const shadesSet = new Set();
                
                pricelistsData.forEach(item => {
                    // Check various possible shade field names
                    const shade = item.shade || item.Shade || item.shades || item.Shades || 
                                 item.color_type || item.ColorType || item.category || item.Category;
                    
                    if (shade && typeof shade === 'string') {
                        // Handle comma-separated values
                        if (shade.includes(',')) {
                            shade.split(',').forEach(s => {
                                const trimmed = s.trim();
                                if (trimmed) shadesSet.add(trimmed);
                            });
                        } else {
                            shadesSet.add(shade.trim());
                        }
                    }
                });

                // Convert to sorted array
                const shades = Array.from(shadesSet).sort();
                
                console.log('Extracted shades from pricelists:', shades);

                // Add shades to dropdown
                shades.forEach(shade => {
                    const option = document.createElement('option');
                    option.value = shade;
                    option.textContent = shade;
                    shadesSelector.appendChild(option);
                });

                console.log(`Populated ${shades.length} shades in dropdown`);
            } catch (error) {
                console.error('Error populating shades from pricelists:', error);
                showDropdownError('color-type-selector', 'Error processing shades data');
            }
        }

        // Enhanced populate colors from collection with better error handling
        function populateColorsFromCollection(colorsData) {
            const colorSelector = document.getElementById('color-selector');
            if (!colorSelector) {
                console.error('Color selector not found');
                return;
            }

            try {
                // Clear existing options
                colorSelector.innerHTML = '<option value="">Select Color</option>';

                if (!colorsData || colorsData.length === 0) {
                    console.log('No colors data available');
                    return;
                }

                // Deduplicate and add colors from Firebase data
                const colorSet = new Set();
                colorsData.forEach(color => {
                    const colorName = color.name || color.colorName || color.colorname || color.Name || color.ColorName ||
                                      color.color || color.Color;
                    if (colorName) {
                        colorSet.add(colorName.trim());
                    }
                });
                const uniqueColors = Array.from(colorSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                uniqueColors.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    colorSelector.appendChild(option);
                });

                // Add custom option
                const customOption = document.createElement('option');
                customOption.value = 'Custom';
                customOption.textContent = 'Custom Color';
                colorSelector.appendChild(customOption);

                console.log(`Populated ${uniqueColors.length} unique colors in dropdown`);
            } catch (error) {
                console.error('Error populating colors:', error);
                showDropdownError('color-selector', 'Error processing colors data');
            }
        }

        // Enhanced populate styles from collection with better error handling
        function populateStylesFromCollection(stylesData) {
            const styleSelector = document.getElementById('style-selector');
            if (!styleSelector) {
                console.error('Style selector not found');
                return;
            }

            try {
                // Clear existing options
                styleSelector.innerHTML = '<option value="">Select Style</option>';

                if (!stylesData || stylesData.length === 0) {
                    console.log('No styles data available');
                    return;
                }

                // Deduplicate styles and add options - prioritize 'stylename' field
                const styleSet = new Set();
                stylesData.forEach(style => {
                    const styleName = style.stylename || style.styleName || style.name || style.Name ||
                                      style.StyleName || style.style || style.Style;
                    if (styleName) {
                        styleSet.add(styleName.trim());
                    }
                });
                const uniqueStyles = Array.from(styleSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                uniqueStyles.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    styleSelector.appendChild(option);
                });

                // Add custom option
                const customOption = document.createElement('option');
                customOption.value = 'Custom';
                customOption.textContent = 'Custom Style';
                styleSelector.appendChild(customOption);

                console.log(`Populated ${uniqueStyles.length} unique styles in dropdown`);
            } catch (error) {
                console.error('Error populating styles:', error);
                showDropdownError('style-selector', 'Error processing styles data');
            }
        }

        // Clean up Firebase listeners when page unloads
        function cleanupFirebaseListeners() {
            Object.values(firebaseListeners).forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            firebaseListeners = { pricelists: null, products: null, colors: null, styles: null };
        }

        // Add cleanup on page unload
        window.addEventListener('beforeunload', cleanupFirebaseListeners);

        // Update pricing based on current selections
        function updatePricing() {
            const priceList = document.getElementById('price-list-selector').value;
            const category = document.getElementById('category-selector').value;
            const product = document.getElementById('product-selector').value;
            const density = document.getElementById('density-selector').value;
            const length = document.getElementById('length-selector').value;
            const colorType = document.getElementById('color-type-selector').value;
            const quantity = parseFloat(document.getElementById('quantity-input').value) || 1;
            const overridePrice = parseFloat(document.getElementById('unit-price-input').value);
            
            let unitPrice = 0;
            
            // Always try to calculate price from product data first
            if (priceList && category && product && density && length) {
                // Find matching product for pricing
                const matchingProduct = productData.find(p => {
                    const productColors = p.Colors || p.Color || p.color || '';
                    const productShades = p.Shade || p.shade || p.Shades || p.shades || '';
                    const colorMatches = !colorType ||
                        productColors === colorType ||
                        productColors.split(',').map(c => c.trim()).includes(colorType) ||
                        productShades === colorType ||
                        productShades.split(',').map(s => s.trim()).includes(colorType);

                    const priceListMatch = (p['Price List Name'] || p.PriceListName || p.PriceList) === priceList;
                    const categoryMatch = (p.Category || p.category) === category;
                    const productMatch = (p.Product || p.product) === product;
                    const densityMatch = (p.Density || p.density) === density;
                    const lengthMatch = (p.Length || p.length) === length;

                    return priceListMatch && categoryMatch && productMatch && densityMatch && lengthMatch && colorMatches;
                });
                
                if (matchingProduct) {
                    const calculatedPrice = parseFloat(matchingProduct.Rate || matchingProduct.Price || matchingProduct.price || 0);
                    const productCurrency = matchingProduct.Currency || 'INR';
                    const selectedCurrency = document.getElementById('currency-selector').value;
                    
                    // Apply currency conversion to the calculated price
                    const convertedPrice = convertCurrency(calculatedPrice, productCurrency, selectedCurrency);
                    
                    // Use override price if manually entered, otherwise use converted calculated price
                     if (isManualPriceEntry && overridePrice && overridePrice > 0) {
                         unitPrice = overridePrice;
                     } else {
                         unitPrice = convertedPrice;
                         // Update the input field with converted price only if not manually entered
                         if (!isManualPriceEntry) {
                             document.getElementById('unit-price-input').value = unitPrice > 0 ? unitPrice.toFixed(2) : '';
                         }
                     }
                } else {
                    // Use override price if available, otherwise no price
                    if (overridePrice && overridePrice > 0) {
                        unitPrice = overridePrice;
                    } else {
                        unitPrice = 0;
                        document.getElementById('unit-price-input').value = '';
                    }
                }
            } else {
                // No product data available, use override price if entered
                if (overridePrice && overridePrice > 0) {
                    unitPrice = overridePrice;
                } else {
                    unitPrice = 0;
                    document.getElementById('unit-price-input').value = '';
                }
            }
            
            // Update price display
            const priceDisplay = document.getElementById('price-display');
            const calculatedPrice = document.getElementById('calculated-price');
            
            // Check if price display elements exist
            if (!priceDisplay || !calculatedPrice) {
                return;
            }
            

            
            if (unitPrice > 0) {
                const totalPrice = unitPrice * quantity;
                const currency = document.getElementById('currency-selector').value;
                const symbol = currencySymbols[currency] || currency + ' ';
                
                calculatedPrice.textContent = `${symbol}${totalPrice.toFixed(2)}`;
                priceDisplay.classList.remove('hidden');
                
                // Enable add button if all required fields are filled
                const addBtn = document.getElementById('add-item-btn');
                if (addBtn) {
                    if (priceList && category && product && density && length) {
                        addBtn.disabled = false;
                    } else {
                        addBtn.disabled = true;
                    }
                }
            } else {
                priceDisplay.classList.add('hidden');
                const addBtn = document.getElementById('add-item-btn');
                if (addBtn) {
                    addBtn.disabled = true;
                }
            }
        }

        // Currency change handler
        async function onCurrencyChange() {
            const newCurrency = document.getElementById('currency-selector').value;
            const oldCurrency = currentQuote.currency || 'INR';
            
            if (newCurrency !== oldCurrency) {
                // Convert existing quote values to new currency
                if (currentQuote.items && currentQuote.items.length > 0) {
                    currentQuote.items.forEach(item => {
                        if (item.unitPrice) {
                            item.unitPrice = convertCurrency(item.unitPrice, oldCurrency, newCurrency);
                            item.totalPrice = item.unitPrice * item.quantity;
                        }
                      });
                }
                
                // Convert summary amounts
                if (currentQuote.subtotal) {
                    currentQuote.subtotal = convertCurrency(currentQuote.subtotal, oldCurrency, newCurrency);
                }
                if (currentQuote.discountAmount) {
                    currentQuote.discountAmount = convertCurrency(currentQuote.discountAmount, oldCurrency, newCurrency);
                }
                if (currentQuote.taxAmount) {
                    currentQuote.taxAmount = convertCurrency(currentQuote.taxAmount, oldCurrency, newCurrency);
                }
                if (currentQuote.shipping) {
                    currentQuote.shipping = convertCurrency(currentQuote.shipping, oldCurrency, newCurrency);
                }
                if (currentQuote.total) {
                    currentQuote.total = convertCurrency(currentQuote.total, oldCurrency, newCurrency);
                }
                
                // Update shipping input field
                const shippingInput = document.getElementById('shipping-input');
                if (shippingInput && shippingInput.value) {
                    const convertedShipping = convertCurrency(parseFloat(shippingInput.value), oldCurrency, newCurrency);
                    shippingInput.value = convertedShipping.toFixed(2);
                }
                
                // Update discount input field (only if it's a fixed amount, not percentage)
                const discountInput = document.getElementById('discount-input');
                if (discountInput && discountInput.value && !discountInput.value.includes('%')) {
                    const convertedDiscount = convertCurrency(parseFloat(discountInput.value), oldCurrency, newCurrency);
                    discountInput.value = convertedDiscount.toFixed(2);
                }
                
                // Update shipping currency symbol
                const shippingSymbol = document.getElementById('shipping-currency-symbol');
                if (shippingSymbol) {
                    shippingSymbol.textContent = currencySymbols[newCurrency] || newCurrency + ' ';
                }
                
                // Update shipping input placeholder
                if (shippingInput) {
                    shippingInput.placeholder = `Enter shipping amount in ${newCurrency}`;
                }
            }
            
            currentQuote.currency = newCurrency;
            updatePricing();
            updateQuoteItemsDisplay();
            updateQuoteSummary();
        }

        // Client change handler
        function onClientChange() {
            const clientId = document.getElementById('client-selector').value;
            
            if (clientId === 'add-new') {
                openAddClientModal();
                document.getElementById('client-selector').value = '';
            } else if (clientId) {
                const client = clientData.find(c => c.id === clientId);
                currentQuote.client = client;
            } else {
                currentQuote.client = null;
            }
        }

        // Add quote item
        // Validation functions for custom inputs
        function validateCustomInputs() {
            const colorSelector = document.getElementById('color-selector');
            const styleSelector = document.getElementById('style-selector');
            const customColorInput = document.getElementById('custom-color-input');
            const customStyleInput = document.getElementById('custom-style-input');
            const colorErrorMsg = document.getElementById('color-error-message');
            const styleErrorMsg = document.getElementById('style-error-message');
            
            let isValid = true;
            

            
            // Clear previous error states
            customColorInput.classList.remove('error');
            customStyleInput.classList.remove('error');
            if (colorErrorMsg) colorErrorMsg.textContent = '';
            if (styleErrorMsg) styleErrorMsg.textContent = '';
            
            // Validate custom color if "Custom" is selected
            if (colorSelector.value === 'Custom') {
                // Check if custom value has been confirmed (collapsed)
                if (colorSelector.dataset.customConfirmed === 'true') {
                    // Custom value already confirmed, validation passes
                } else {
                    // Validate the input field if not yet confirmed
                    const customColorValue = customColorInput.value.trim();
                    if (!customColorValue) {
                        customColorInput.classList.add('error');
                        if (colorErrorMsg) colorErrorMsg.textContent = 'Please enter a custom color name';
                        isValid = false;
                    } else if (customColorValue.length < 2) {
                        customColorInput.classList.add('error');
                        if (colorErrorMsg) colorErrorMsg.textContent = 'Color name must be at least 2 characters';
                        isValid = false;
                    }
                }
            }
            
            // Validate custom style if "Custom" is selected
            if (styleSelector.value === 'Custom') {
                // Check if custom value has been confirmed (collapsed)
                if (styleSelector.dataset.customConfirmed === 'true') {
                    // Custom value already confirmed, validation passes
                } else {
                    // Validate the input field if not yet confirmed
                    const customStyleValue = customStyleInput.value.trim();
                    if (!customStyleValue) {
                        customStyleInput.classList.add('error');
                        if (styleErrorMsg) styleErrorMsg.textContent = 'Please enter a custom style name';
                        isValid = false;
                    } else if (customStyleValue.length < 2) {
                        customStyleInput.classList.add('error');
                        if (styleErrorMsg) styleErrorMsg.textContent = 'Style name must be at least 2 characters';
                        isValid = false;
                    }
                }
            }
            
            return isValid;
        }

        // Function to handle auto-collapse of custom areas
        function handleCustomAreaCollapse(type) {
            const container = document.querySelector(`.custom-${type}-container`);
            const input = document.getElementById(`custom-${type}-input`);
            const imagePreview = document.getElementById(`${type}-image-preview`);
            const selector = document.getElementById(`${type}-selector`);
            
            if (!container || !selector) return;
            
            // Check if there's content (text or image)
            const hasText = input && input.value.trim().length > 0;
            const hasImage = imagePreview && !imagePreview.classList.contains('hidden');
            
            // If container is visible and there's content, collapse it
            if (container.classList.contains('show') && (hasText || hasImage)) {
                // Hide the container with smooth animation
                container.classList.remove('show');
                setTimeout(() => {
                    container.style.display = 'none';
                }, 300);
                
                // Update the dropdown to show "Custom" as selected
                selector.value = 'Custom';
                
                // Create a visual indicator that custom content is set
                const customText = hasText ? input.value.trim() : 'Custom';
                
                // Update the dropdown option text to show the custom value
                const customOption = selector.querySelector('option[value="Custom"]');
                if (customOption) {
                    // Store original text if not already stored
                    if (!customOption.dataset.originalText) {
                        customOption.dataset.originalText = customOption.textContent;
                    }
                    customOption.textContent = `Custom: ${customText}`;
                }
                
                // Mark this custom input as confirmed
                selector.dataset.customConfirmed = 'true';
                selector.dataset.customValue = customText;
            }
        }

        function addQuoteItem() {
            const priceList = document.getElementById('price-list-selector').value;
            const category = document.getElementById('category-selector').value;
            const product = document.getElementById('product-selector').value;
            const density = document.getElementById('density-selector').value;
            const length = document.getElementById('length-selector').value;
            const colorType = document.getElementById('color-type-selector').value;
            const color = document.getElementById('color-selector').value;
            const style = document.getElementById('style-selector').value;
            const quantity = parseFloat(document.getElementById('quantity-input').value) || 1;
            const unitPrice = parseFloat(document.getElementById('unit-price-input').value) || 0;
            
            // Get custom inputs - use confirmed values if available
            const colorSelector = document.getElementById('color-selector');
            const styleSelector = document.getElementById('style-selector');
            
            const customColor = colorSelector.dataset.customConfirmed === 'true' 
                ? colorSelector.dataset.customValue 
                : document.getElementById('custom-color-input').value.trim();
            const customStyle = styleSelector.dataset.customConfirmed === 'true' 
                ? styleSelector.dataset.customValue 
                : document.getElementById('custom-style-input').value.trim();
            
            // Get image data
            const colorImageInput = document.getElementById('color-image-input');
            const styleImageInput = document.getElementById('style-image-input');
            const colorImageDisplay = document.getElementById('color-image-display');
            const styleImageDisplay = document.getElementById('style-image-display');
            
            // Basic validation
            if (!priceList || !category || !product || !density || !length || unitPrice <= 0) {
                showError('Please fill in all required fields and ensure a valid price is calculated.');
                return;
            }
            
            // Validate custom inputs
            if (!validateCustomInputs()) {
                showError('Please correct the validation errors in custom fields.');
                return;
            }
            
            const item = {
                id: Date.now().toString(),
                priceList,
                category,
                product,
                density,
                length,
                colorType: colorType || 'N/A',
                color: customColor || color || 'N/A',
                style: customStyle || style || 'N/A',
                quantity,
                unitPrice,
                totalPrice: unitPrice * quantity,
                // Store custom data
                customColor: customColor || null,
                customStyle: customStyle || null,
                colorImage: colorImageDisplay && colorImageDisplay.src && colorImageDisplay.src.includes('data:') ? colorImageDisplay.src : null,
                styleImage: styleImageDisplay && styleImageDisplay.src && styleImageDisplay.src.includes('data:') ? styleImageDisplay.src : null
            };
            
            currentQuote.items.push(item);
            
            // Clear form
            clearProductForm();
            
            // Update display
            updateQuoteItemsDisplay();
            updateQuoteSummary();
        }

        // Clear product form
        function clearProductForm() {
            document.getElementById('quantity-input').value = '1';
            document.getElementById('unit-price-input').value = '';
            
            const priceDisplay = document.getElementById('price-display');
            if (priceDisplay) {
                priceDisplay.classList.add('hidden');
            }
            
            const addBtn = document.getElementById('add-item-btn');
            if (addBtn) {
                addBtn.disabled = true;
            }
            
            // Clear product selection fields but preserve Price List and Currency
            // Reset all product selectors except price-list-selector and currency-selector
            const selectorsToReset = [
                'category-selector', 
                'product-selector', 
                'density-selector', 
                'length-selector', 
                'color-type-selector', 
                'color-selector',
                'style-selector'
            ];
            
            selectorsToReset.forEach(selectorId => {
                const selector = document.getElementById(selectorId);
                if (selector) {
                    selector.value = '';
                    selector.disabled = true;
                }
            });
            
            // Re-enable category selector if price list is selected
            const priceList = document.getElementById('price-list-selector').value;
            if (priceList) {
                const categorySelector = document.getElementById('category-selector');
                if (categorySelector) {
                    categorySelector.disabled = false;
                    populateCategories(priceList);
                }
            }
            
            // Reset custom confirmed flags and restore original option text
            const colorSelector = document.getElementById('color-selector');
            const styleSelector = document.getElementById('style-selector');
            
            if (colorSelector) {
                delete colorSelector.dataset.customConfirmed;
                delete colorSelector.dataset.customValue;
                const colorCustomOption = colorSelector.querySelector('option[value="Custom"]');
                if (colorCustomOption && colorCustomOption.dataset.originalText) {
                    colorCustomOption.textContent = colorCustomOption.dataset.originalText;
                }
            }
            
            if (styleSelector) {
                delete styleSelector.dataset.customConfirmed;
                delete styleSelector.dataset.customValue;
                const styleCustomOption = styleSelector.querySelector('option[value="Custom"]');
                if (styleCustomOption && styleCustomOption.dataset.originalText) {
                    styleCustomOption.textContent = styleCustomOption.dataset.originalText;
                }
            }
            
            // Hide custom containers and remove has-image class
            const customColorContainer = document.querySelector('.custom-color-container');
            const customStyleContainer = document.querySelector('.custom-style-container');
            if (customColorContainer) {
                customColorContainer.style.display = 'none';
                customColorContainer.classList.remove('has-image');
            }
            if (customStyleContainer) {
                customStyleContainer.style.display = 'none';
                customStyleContainer.classList.remove('has-image');
            }
            
            // Clear custom inputs and disable them
            document.getElementById('custom-color-input').value = '';
            document.getElementById('custom-style-input').value = '';
            document.getElementById('custom-color-input').disabled = true;
            document.getElementById('custom-style-input').disabled = true;
            
            // Clear uploaded images properly without removing DOM elements
            document.getElementById('color-image-input').value = '';
            document.getElementById('style-image-input').value = '';
            
            // Hide preview containers and reset image sources
            const colorImagePreview = document.getElementById('color-image-preview');
            const styleImagePreview = document.getElementById('style-image-preview');
            const colorImageDisplay = document.getElementById('color-image-display');
            const styleImageDisplay = document.getElementById('style-image-display');
            
            if (colorImagePreview) {
                colorImagePreview.style.display = 'none';
                colorImagePreview.classList.add('hidden');
            }
            if (styleImagePreview) {
                styleImagePreview.style.display = 'none';
                styleImagePreview.classList.add('hidden');
            }
            if (colorImageDisplay) {
                colorImageDisplay.src = '';
            }
            if (styleImageDisplay) {
                styleImageDisplay.src = '';
            }
            
            // Update pricing to re-evaluate add button state
            updatePricing();
        }

        // Update quote items display
        function updateQuoteItemsDisplay() {
            const container = document.getElementById('quote-items-container');
            
            if (currentQuote.items.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <p>No items added yet. Use the form above to add products to your quote.</p>
                    </div>
                `;
                return;
            }
            
            const currency = currentQuote.currency;
            const symbol = currencySymbols[currency] || currency + ' ';
            
            container.innerHTML = currentQuote.items.map((item, index) => {
                const imagePath = getProductImagePath(item.product, item.category, item.density, item.length, item.colorType, item.color);
                
                // Determine color and style display
                const colorDisplay = item.customColor ? `${item.color} (Custom)` : item.color;
                const styleDisplay = item.customStyle ? `${item.style} (Custom)` : item.style;
                
                // Create custom images section
                let customImagesHtml = '';
                
                if (item.colorImage || item.styleImage) {
                    customImagesHtml = `
                        <div class="flex space-x-2 mt-2">
                            ${item.colorImage ? `
                                <div class="text-center">
                                    <img src="${item.colorImage}" 
                                         alt="Color Reference" 
                                         class="w-12 h-12 object-cover rounded border border-gray-300"
                                         onerror="this.style.display='none';">
                                    <p class="text-xs text-gray-500 mt-1">Color</p>
                                </div>
                            ` : ''}
                            ${item.styleImage ? `
                                <div class="text-center">
                                    <img src="${item.styleImage}" 
                                         alt="Style Reference" 
                                         class="w-12 h-12 object-cover rounded border border-gray-300"
                                         onerror="this.style.display='none';">
                                    <p class="text-xs text-gray-500 mt-1">Style</p>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
                
                const itemHtml = `
                <div class="quote-item">
                    <div class="flex justify-between items-start">
                        <div class="flex items-start space-x-3 flex-1">
                            <div class="flex-shrink-0">
                                <img src="${imagePath}" 
                                     alt="${item.product}" 
                                     class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                     onerror="this.src='images/Products/Genius.png'; this.onerror=null;"
                                     loading="lazy">
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800">${item.product}</h4>
                                <p class="text-sm text-gray-600">
                                    ${item.category} • ${item.density} • ${item.length}" • ${item.colorType}
                                    ${colorDisplay !== 'N/A' ? ' • Color: ' + colorDisplay : ''}
                                    ${styleDisplay !== 'N/A' ? ' • Style: ' + styleDisplay : ''}
                                </p>
                                <p class="text-sm text-gray-500 mt-1">
                                    Qty: ${item.quantity} × ${symbol}${item.unitPrice.toFixed(2)}
                                </p>
                                ${customImagesHtml}
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="font-semibold text-gray-800">${symbol}${item.totalPrice.toFixed(2)}</p>
                            <button onclick="removeQuoteItem(${index})" class="text-red-500 hover:text-red-700 text-sm mt-1">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
                `;
                return itemHtml;
            }).join('');
        }

        // Remove quote item
        function removeQuoteItem(index) {
            currentQuote.items.splice(index, 1);
            updateQuoteItemsDisplay();
            updateQuoteSummary();
        }

        // Update quote summary
        function updateQuoteSummary() {
            const currency = currentQuote.currency;
            const symbol = currencySymbols[currency] || currency + ' ';
            
            // Calculate subtotal
            const subtotal = currentQuote.items.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // Get discount input and determine if it's percentage or amount
            const discountInput = document.getElementById('discount-input').value.trim();
            let discountAmount = 0;
            let discountType = 'amount';
            
            if (discountInput.includes('%')) {
                // Percentage discount
                const discountPercent = parseFloat(discountInput.replace('%', '')) || 0;
                discountAmount = subtotal * (discountPercent / 100);
                discountType = 'percentage';
            } else {
                // Amount discount
                discountAmount = parseFloat(discountInput) || 0;
                discountType = 'amount';
            }
            
            // Get tax and shipping
            const taxPercent = parseFloat(document.getElementById('tax-input').value) || 0;
            const shippingAmount = parseFloat(document.getElementById('shipping-input').value) || 0;
            
            // Calculate amounts
            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (taxPercent / 100);
            const total = taxableAmount + taxAmount + shippingAmount;
            
            // Update display
            document.getElementById('subtotal-amount').textContent = `${symbol}${subtotal.toFixed(2)}`;
            document.getElementById('discount-amount').textContent = `${symbol}${discountAmount.toFixed(2)}`;
            document.getElementById('tax-amount').textContent = `${symbol}${taxAmount.toFixed(2)}`;
            document.getElementById('total-amount').textContent = `${symbol}${total.toFixed(2)}`;
            
            // Update current quote
            currentQuote.subtotal = subtotal;
            currentQuote.discountAmount = discountAmount;
            currentQuote.discountType = discountType;
            currentQuote.discountInput = discountInput;
            currentQuote.tax = taxPercent;
            currentQuote.taxAmount = taxAmount;
            currentQuote.shipping = shippingAmount;
            currentQuote.total = total;
        }

        // Utility functions
        function enableSelector(selectorId) {
            document.getElementById(selectorId).disabled = false;
        }

        function clearCascadeSelectors(selectorIds) {
            selectorIds.forEach(id => {
                const selector = document.getElementById(id);
                selector.innerHTML = '<option value="">Select ' + id.replace('-selector', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + '</option>';
                selector.disabled = true;
            });
            
            // Clear pricing
            document.getElementById('unit-price-input').value = '';
            
            const priceDisplay = document.getElementById('price-display');
            if (priceDisplay) {
                priceDisplay.classList.add('hidden');
            }
            
            const addBtn = document.getElementById('add-item-btn');
            if (addBtn) {
                addBtn.disabled = true;
            }
        }

        function updateConnectionStatus(connected) {
            const indicator = document.querySelector('.status-indicator');
            if (!indicator) {
                // Status indicator element doesn't exist
                return;
            }
            
            if (connected) {
                // Green Firebase logo for connected state
                indicator.innerHTML = `
                    <svg class="w-9 h-9 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.803 21.803l5.678-10.44L9.189 6.81l-3.386 14.993zm7.078-11.013L11.189 8.8l1.292-2.49L10.189 3.81l2.692 6.98zm3.908 8.15L14.481 8.8l2.308 10.14z"/>
                        <path d="M18.75 18.94L12 22.5l-6.75-3.56L12 2.5l6.75 16.44z" fill-opacity="0.3"/>
                    </svg>
                `;
                indicator.title = "Firebase Connected";
            } else {
                // Red Firebase logo for disconnected state
                indicator.innerHTML = `
                    <svg class="w-9 h-9 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.803 21.803l5.678-10.44L9.189 6.81l-3.386 14.993zm7.078-11.013L11.189 8.8l1.292-2.49L10.189 3.81l2.692 6.98zm3.908 8.15L14.481 8.8l2.308 10.14z"/>
                        <path d="M18.75 18.94L12 22.5l-6.75-3.56L12 2.5l6.75 16.44z" fill-opacity="0.3"/>
                    </svg>
                `;
                indicator.title = "Firebase Disconnected";
            }
        }

        function showLoading(show) {
            const overlay = document.getElementById('loading-overlay');
            if (!overlay) {
                return;
            }
            if (show) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }

        function showError(message) {
            alert(message); // Simple alert for now, can be enhanced with a proper modal
        }

        function showSuccess(message) {
            alert(message); // Simple alert for now, can be enhanced with a proper modal
        }

        // Initialize quote
        function initializeQuote() {
            // Generate quote number
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            currentQuote.number = `INH-${dateStr}-${randomNum}`;
            
            // Set current date
            currentQuote.date = today.toISOString().split('T')[0];
            
            // Update form
            document.getElementById('quote-number').value = currentQuote.number;
            document.getElementById('quote-date').value = currentQuote.date;
            
            // Initialize shipping currency symbol
            const defaultCurrency = currentQuote.currency || 'INR';
            const shippingSymbol = document.getElementById('shipping-currency-symbol');
            if (shippingSymbol) {
                shippingSymbol.textContent = currencySymbols[defaultCurrency] || defaultCurrency + ' ';
            }
            
            // Initialize shipping input placeholder
            const shippingInput = document.getElementById('shipping-input');
            if (shippingInput) {
                shippingInput.placeholder = `Enter shipping amount in ${defaultCurrency}`;
            }
        }

        // Modal functions
        function openAddClientModal() {
            const modal = document.getElementById('add-client-modal');
            if (!modal) {
                return;
            }
            modal.classList.remove('hidden');
            setTimeout(() => {
                const clientNameInput = document.getElementById('client-name');
                if (clientNameInput) {
                    clientNameInput.focus();
                }
            }, 100);
        }

        function closeAddClientModal() {
            const modal = document.getElementById('add-client-modal');
            const form = document.getElementById('add-client-form');
            if (!modal) {
                return;
            }
            modal.classList.add('hidden');
            if (form) {
                form.reset();
            }
        }

        // Add new client
        async function addNewClient(event) {
            event.preventDefault();
            
            const clientName = document.getElementById('client-name').value.trim();
            const companyName = document.getElementById('company-name').value.trim();
            const email = document.getElementById('client-email').value.trim();
            const phone = document.getElementById('client-phone').value.trim();
            const address = document.getElementById('client-address').value.trim();
            
            if (!clientName) {
                showError('Client name is required');
                return;
            }
            
            try {
                showLoading(true);
                
                const newClient = {
                    clientName,
                    companyName,
                    email,
                    phone,
                    address,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const savedClient = await window.firebaseDB.saveClient(newClient);
                    clientData.push(savedClient);
                    
                    // Add to dropdown
                    const selector = document.getElementById('client-selector');
                    const option = document.createElement('option');
                    option.value = savedClient.id;
                    option.textContent = `${clientName} (${companyName || 'No Company'})`;
                    
                    // Insert before "Add New Client" option
                    const addNewOption = selector.querySelector('option[value="add-new"]');
                    selector.insertBefore(option, addNewOption);
                    
                    // Select the new client
                    selector.value = savedClient.id;
                    currentQuote.client = savedClient;
                    
                    showSuccess('Client added successfully!');
                } else {
                    showError('Cannot add client: Firebase not available');
                }
                
                closeAddClientModal();
                
            } catch (error) {
                showError('Failed to add client. Please try again.');
            } finally {
                showLoading(false);
            }
        }

        // Save quote
        async function saveQuote() {
            if (currentQuote.items.length === 0) {
                showError('Cannot save empty quote. Please add at least one item.');
                return;
            }
            
            try {
                showLoading(true);
                
                // Update quote data from form
                const quoteData = {
                    ...currentQuote,
                    number: document.getElementById('quote-number').value || generateQuoteNumber(),
                    date: document.getElementById('quote-date').value || new Date().toISOString().split('T')[0],
                    salesperson: document.getElementById('salesperson-selector').value,
                    discount: parseFloat(document.getElementById('discount-input').value) || 0,
                    tax: parseFloat(document.getElementById('tax-input').value) || 18,
                    shipping: parseFloat(document.getElementById('shipping-input').value) || 0,
                    subtotal: calculateSubtotal(),
                    total: calculateTotal(),
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    // Create a clean version for Firebase (without large base64 images)
                    const firebaseQuoteData = {
                        ...quoteData,
                        items: quoteData.items.map(item => ({
                            ...item,
                            // Remove large base64 images to prevent Firebase document size limit errors
                            colorImage: item.colorImage ? 'IMAGE_DATA_REMOVED' : null,
                            styleImage: item.styleImage ? 'IMAGE_DATA_REMOVED' : null
                        }))
                    };
                    
                    // Save to Firebase quotes collection
                    const savedQuote = await window.firebaseDB.saveQuote(firebaseQuoteData);
                    showSuccess('Quote saved successfully to Firebase!');
                    
                    // Update current quote with saved data
                    currentQuote = { ...quoteData, id: savedQuote.id };
                    
                    // Refresh saved quotes list
                    await loadSavedQuotes();
                } else {
                    // Save to localStorage as fallback
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    quoteData.id = Date.now().toString();
                    savedQuotes.push(quoteData);
                    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
                    showSuccess('Quote saved locally!');
                    
                    // Update current quote
                    currentQuote = quoteData;
                    
                    // Refresh saved quotes list
                    loadSavedQuotesFromLocal();
                }
                
            } catch (error) {
                showError('Failed to save quote. Please try again.');
            } finally {
                showLoading(false);
            }
        }

        // Load saved quotes from Firebase
        async function loadSavedQuotes() {
            try {
                const container = document.getElementById('saved-quotes-container');
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const quotes = await window.firebaseDB.getQuotes();
                    displaySavedQuotes(quotes);
                } else {
                    loadSavedQuotesFromLocal();
                }
                
            } catch (error) {
                const container = document.getElementById('saved-quotes-container');
                container.innerHTML = '<div class="text-center text-red-500 py-4"><p class="text-sm">Error loading quotes</p></div>';
            }
        }

        // Load saved quotes from localStorage
        function loadSavedQuotesFromLocal() {
            try {
                const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                displaySavedQuotes(savedQuotes);
            } catch (error) {
                const container = document.getElementById('saved-quotes-container');
                container.innerHTML = '<div class="text-center text-red-500 py-4"><p class="text-sm">Error loading local quotes</p></div>';
            }
        }

        // Display saved quotes in the UI
        function displaySavedQuotes(quotes) {
            const container = document.getElementById('saved-quotes-container');
            
            if (!quotes || quotes.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 py-4"><p class="text-sm">No saved quotes yet</p></div>';
                return;
            }
            
            // Sort quotes by creation date (newest first)
            const sortedQuotes = quotes.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });
            
            container.innerHTML = sortedQuotes.slice(0, 5).map(quote => {
                // Calculate total amount with currency symbol
                const total = quote.total || 0;
                const currency = quote.currency || 'INR';
                const symbol = currencySymbols[currency] || currency + ' ';
                const totalDisplay = `${symbol}${total.toFixed(2)}`;
                
                return `
                <div class="quote-item border rounded-lg p-1 mb-1 hover:bg-gray-50">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <div class="text-xs text-gray-700">
                                <span class="font-semibold">${quote.number || 'No Number'}</span>
                                <span class="mx-1">-</span>
                                <span>${quote.client ? quote.client.clientName : 'No Client'}</span>
                                <span class="mx-1">-</span>
                                <span>${quote.items ? quote.items.length : 0} items</span>
                                <span class="mx-1">-</span>
                                <span class="font-semibold text-green-600">${totalDisplay}</span>
                                <span class="mx-1">-</span>
                                <span class="text-gray-500">${formatDate(quote.createdAt)}</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex items-center space-x-1">
                            <button onclick="recallQuote('${quote.id}')" class="action-btn-compact action-btn-recall" title="Recall for editing">
                                <span class="text-xs">📝</span>
                            </button>
                            <button onclick="previewQuote('${quote.id}')" class="action-btn-compact action-btn-preview" title="Generate proforma invoice">
                                <span class="text-xs">👁️</span>
                            </button>
                            <button onclick="deleteQuote('${quote.id}')" class="action-btn-compact action-btn-delete" title="Delete quote">
                                <span class="text-xs">🗑️</span>
                            </button>
                            <button onclick="convertToOrder('${quote.id}')" class="action-btn-compact action-btn-convert" title="Convert to order">
                                <span class="text-xs">📦</span>
                            </button>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        // Load quote data into the form
        async function loadQuoteData(quoteId) {
            try {
                showLoading(true);
                
                let quote = null;
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const quotes = await window.firebaseDB.getQuotes();
                    quote = quotes.find(q => q.id === quoteId);
                } else {
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    quote = savedQuotes.find(q => q.id === quoteId);
                }
                
                if (quote) {
                    // Load quote data into form
                    currentQuote = { ...quote };
                    
                    // Set currency selector and apply conversion if needed
                    const quoteCurrency = quote.currency || 'INR';
                    const currentCurrency = document.getElementById('currency-selector').value;
                    document.getElementById('currency-selector').value = quoteCurrency;
                    
                    // Apply currency conversion to all quote items if currency has changed
                    if (quoteCurrency !== currentCurrency && currentQuote.items) {
                        currentQuote.items.forEach(item => {
                            if (item.unitPrice) {
                                item.unitPrice = convertCurrency(item.unitPrice, quoteCurrency, currentCurrency);
                                item.totalPrice = item.unitPrice * item.quantity;
                            }
                        });
                        
                        // Convert summary amounts
                        if (currentQuote.subtotal) {
                            currentQuote.subtotal = convertCurrency(currentQuote.subtotal, quoteCurrency, currentCurrency);
                        }
                        if (currentQuote.discountAmount) {
                            currentQuote.discountAmount = convertCurrency(currentQuote.discountAmount, quoteCurrency, currentCurrency);
                        }
                        if (currentQuote.taxAmount) {
                            currentQuote.taxAmount = convertCurrency(currentQuote.taxAmount, quoteCurrency, currentCurrency);
                        }
                        if (currentQuote.shipping) {
                            currentQuote.shipping = convertCurrency(currentQuote.shipping, quoteCurrency, currentCurrency);
                        }
                        if (currentQuote.total) {
                            currentQuote.total = convertCurrency(currentQuote.total, quoteCurrency, currentCurrency);
                        }
                        
                        // Update currency in quote
                        currentQuote.currency = currentCurrency;
                    }
                    
                    // Update form fields
                    document.getElementById('quote-number').value = quote.number || '';
                    document.getElementById('quote-date').value = quote.date || '';
                    document.getElementById('salesperson-selector').value = quote.salesperson || '';
                    document.getElementById('discount-input').value = quote.discount || 0;
                    document.getElementById('tax-input').value = quote.tax || 18;
                    document.getElementById('shipping-input').value = quote.shipping || 0;
                    
                    // Set client if available
                    if (quote.client) {
                        document.getElementById('client-selector').value = quote.client.id || '';
                    }
                    
                    // Update displays
                    updateQuoteItemsDisplay();
                    updateQuoteSummary();
                    
                    showSuccess('Quote loaded successfully!');
                } else {
                    showError('Quote not found.');
                }
                
            } catch (error) {
                showError('Failed to load quote.');
            } finally {
                showLoading(false);
            }
        }

        // Helper function to calculate subtotal
        function calculateSubtotal() {
            return currentQuote.items.reduce((sum, item) => sum + item.totalPrice, 0);
        }

        // Helper function to calculate total
        function calculateTotal() {
            const subtotal = calculateSubtotal();
            const discount = parseFloat(document.getElementById('discount-input').value) || 0;
            const tax = parseFloat(document.getElementById('tax-input').value) || 0;
            const shipping = parseFloat(document.getElementById('shipping-input').value) || 0;
            
            const discountAmount = subtotal * (discount / 100);
            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (tax / 100);
            
            return taxableAmount + taxAmount + shipping;
        }

        // Helper function to format currency
        function formatCurrency(amount, currency) {
            // Use centralized language utilities if available
            if (window.LanguageUtils) {
                return window.LanguageUtils.formatCurrency(amount, currency);
            }
            // Fallback to basic formatting
            const symbol = currencySymbols[currency] || currency + ' ';
            return `${symbol}${amount.toFixed(2)}`;
        }

        // Helper function to format date
        function formatDate(dateString) {
            if (!dateString) return 'Unknown';
            const date = new Date(dateString);
            // Use centralized language utilities if available
            if (window.LanguageUtils) {
                return window.LanguageUtils.formatDate(date, 'datetime');
            }
            // Fallback to English locale
            return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        }

        // Generate quote number
        function generateQuoteNumber() {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
            return `INH-${year}${month}${day}-${time}`;
        }



        // Clear quote
        function clearQuote() {
            if (confirm('Are you sure you want to clear the current quote? This action cannot be undone.')) {
                currentQuote.items = [];
                currentQuote.client = null;
                
                // Reset form
                document.getElementById('client-selector').value = '';
                document.getElementById('salesperson-selector').value = '';
                document.getElementById('price-list-selector').value = '';
                document.getElementById('discount-input').value = '0';
                document.getElementById('tax-input').value = '18';
                document.getElementById('shipping-input').value = '0';
                
                clearProductForm();
                updateQuoteItemsDisplay();
                updateQuoteSummary();
                
                showSuccess('Quote cleared successfully!');
            }
        }

        // Duplicate quote (placeholder)
        function duplicateQuote() {
            showError('Duplicate functionality will be implemented soon.');
        }

        // Load quote (placeholder)
        function loadQuote() {
            showError('Load quote functionality will be implemented soon.');
        }

        // Quote Management Actions

        // Recall quote for editing
        async function recallQuote(quoteId) {
            try {
                showLoading(true);
                
                let quote = null;
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const quotes = await window.firebaseDB.getQuotes();
                    quote = quotes.find(q => q.id === quoteId);
                } else {
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    quote = savedQuotes.find(q => q.id === quoteId);
                }
                
                if (quote) {
                    // Load quote data into form
                    currentQuote = { ...quote };
                    
                    // Update form fields
                    document.getElementById('quote-number').value = quote.number || '';
                    document.getElementById('quote-date').value = quote.date || '';
                    document.getElementById('salesperson-selector').value = quote.salesperson || '';
                    document.getElementById('discount-input').value = quote.discount || 0;
                    document.getElementById('tax-input').value = quote.tax || 18;
                    document.getElementById('shipping-input').value = quote.shipping || 0;
                    
                    // Set client if available
                    if (quote.client) {
                        document.getElementById('client-selector').value = quote.client.id || '';
                    }
                    
                    // Update displays
                    updateQuoteItemsDisplay();
                    updateQuoteSummary();
                    
                    showSuccess('Quote recalled for editing!');
                    
                    // Scroll to top for better UX
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    showError('Quote not found.');
                }
                
            } catch (error) {
                showError('Failed to recall quote.');
            } finally {
                showLoading(false);
            }
        }

        // Preview quote (generate proforma invoice)
        async function previewQuote(quoteId) {
            try {
                showLoading(true);
                
                let quote = null;
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const quotes = await window.firebaseDB.getQuotes();
                    quote = quotes.find(q => q.id === quoteId);
                } else {
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    quote = savedQuotes.find(q => q.id === quoteId);
                }
                
                if (quote) {
                    // Generate proforma invoice preview (thermal printer format)
                    const proformaHTML = generateProformaHTML(quote);
                    
                    // Create a new document in the same window
                    document.open();
                    document.write(proformaHTML);
                    document.close();
                } else {
                    showError('Quote not found.');
                }
                
            } catch (error) {
                showError('Failed to generate preview.');
            } finally {
                showLoading(false);
            }
        }

        // Delete quote (update status to 'hold')
        async function deleteQuote(quoteId) {
            if (!confirm('Are you sure you want to delete this quote? It will be marked as "hold" status.')) {
                return;
            }
            
            try {
                showLoading(true);
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    // Update quote status to 'hold' in Firebase
                    await window.firebaseDB.updateAllData('quotes', quoteId, { status: 'hold', updatedAt: new Date().toISOString() });
                    showSuccess('Quote moved to hold status!');
                    
                    // Refresh saved quotes list
                    await loadSavedQuotes();
                } else {
                    // Update in localStorage
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    const quoteIndex = savedQuotes.findIndex(q => q.id === quoteId);
                    
                    if (quoteIndex !== -1) {
                        savedQuotes[quoteIndex].status = 'hold';
                        savedQuotes[quoteIndex].updatedAt = new Date().toISOString();
                        localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
                        showSuccess('Quote moved to hold status!');
                        
                        // Refresh saved quotes list
                        loadSavedQuotesFromLocal();
                    } else {
                        showError('Quote not found.');
                    }
                }
                
            } catch (error) {
                showError('Failed to delete quote.');
            } finally {
                showLoading(false);
            }
        }

        // Convert quote to order
        async function convertToOrder(quoteId) {
            if (!confirm('Are you sure you want to convert this quote to an order? This action cannot be undone.')) {
                return;
            }
            
            try {
                showLoading(true);
                
                let quote = null;
                
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    const quotes = await window.firebaseDB.getQuotes();
                    quote = quotes.find(q => q.id === quoteId);
                } else {
                    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                    quote = savedQuotes.find(q => q.id === quoteId);
                }
                
                if (quote) {
                    // Create order data from quote
                    const orderData = {
                        ...quote,
                        id: undefined, // Remove quote ID
                        orderId: generateOrderNumber(),
                        quoteId: quote.id,
                        status: 'pending',
                        orderDate: new Date().toISOString(),
                        type: 'order'
                    };
                    
                    if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                        // Save to orders collection
                        await window.firebaseDB.saveOrder(orderData);
                        
                        // Update quote status to 'converted'
                        await window.firebaseDB.updateAllData('quotes', quoteId, { status: 'converted', updatedAt: new Date().toISOString() });
                        
                        showSuccess(`Quote converted to order ${orderData.orderId}!`);
                        
                        // Refresh saved quotes list
                        await loadSavedQuotes();
                    } else {
                        // Save to localStorage orders
                        const savedOrders = JSON.parse(localStorage.getItem('savedOrders') || '[]');
                        savedOrders.push(orderData);
                        localStorage.setItem('savedOrders', JSON.stringify(savedOrders));
                        
                        // Update quote status
                        const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                        const quoteIndex = savedQuotes.findIndex(q => q.id === quoteId);
                        if (quoteIndex !== -1) {
                            savedQuotes[quoteIndex].status = 'converted';
                            savedQuotes[quoteIndex].updatedAt = new Date().toISOString();
                            localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
                        }
                        
                        showSuccess(`Quote converted to order ${orderData.orderId}!`);
                        
                        // Refresh saved quotes list
                        loadSavedQuotesFromLocal();
                    }
                } else {
                    showError('Quote not found.');
                }
                
            } catch (error) {
                showError('Failed to convert quote to order.');
            } finally {
                showLoading(false);
            }
        }

        // Generate proforma invoice HTML
        function generateProformaHTML(quote) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Proforma Invoice - ${quote.number}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        /* Thermal Printer Optimized Styles */
                        * { box-sizing: border-box; }
                        body { 
                            font-family: 'Courier New', monospace; 
                            margin: 0; 
                            padding: 8px; 
                            max-width: 380px; 
                            width: 100%; 
                            font-size: 11px; 
                            line-height: 1.2; 
                            color: #000; 
                            background: #fff;
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 15px; 
                            border-bottom: 1px solid #000;
                            padding-bottom: 8px;
                        }
                        .header h1 { 
                            font-size: 14px; 
                            margin: 0 0 4px 0; 
                            font-weight: bold; 
                        }
                        .header h2 { 
                            font-size: 12px; 
                            margin: 0; 
                            font-weight: normal; 
                        }
                        
                        .quote-info { 
                            margin-bottom: 15px; 
                            font-size: 10px;
                        }
                        .quote-info p { 
                            margin: 2px 0; 
                            word-wrap: break-word;
                        }
                        
                        /* Thermal printer friendly item list */
                        .items-section {
                            margin-bottom: 15px;
                            border-top: 1px solid #000;
                            border-bottom: 1px solid #000;
                            padding: 8px 0;
                        }
                        .items-header {
                            font-weight: bold;
                            font-size: 11px;
                            margin-bottom: 8px;
                            text-align: center;
                        }
                        .item {
                            margin-bottom: 8px;
                            padding-bottom: 6px;
                            border-bottom: 1px dashed #000;
                            display: flex;
                            align-items: flex-start;
                            gap: 8px;
                        }
                        .item:last-child {
                            border-bottom: none;
                            margin-bottom: 0;
                        }
                        .item-image {
                            width: 40px;
                            height: 40px;
                            object-fit: contain;
                            border: 1px solid #000;
                            flex-shrink: 0;
                        }
                        .item-content {
                            flex: 1;
                            min-width: 0;
                        }
                        .item-line {
                            margin: 1px 0;
                            font-size: 10px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .item-details {
                            flex: 1;
                            margin-right: 10px;
                        }
                        .item-calculation {
                            text-align: right;
                            font-weight: bold;
                            white-space: nowrap;
                        }
                        .item-price {
                            text-align: right;
                            font-weight: bold;
                        }
                        
                        .totals { 
                            font-size: 10px;
                            border-top: 2px solid #000;
                            padding-top: 8px;
                        }
                        .totals p { 
                            margin: 2px 0; 
                            display: flex; 
                            justify-content: space-between;
                        }
                        .total-row { 
                            font-weight: bold; 
                            font-size: 12px; 
                            border-top: 1px solid #000;
                            padding-top: 4px;
                            margin-top: 4px;
                        }
                        
                        /* Print optimizations */
                        @media print {
                            body { margin: 0; padding: 4px; }
                            .header { page-break-inside: avoid; }
                            .item { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PROFORMA INVOICE</h1>
                        <h2>Indian Natural Hair</h2>
                    </div>
                    
                    <div class="quote-info">
                        <p><strong>Quote #:</strong> ${quote.number || 'N/A'}</p>
                        <p><strong>Date:</strong> ${quote.date || 'N/A'}</p>
                        <p><strong>Client:</strong> ${quote.client ? quote.client.clientName : 'N/A'}</p>
                        <p><strong>Salesperson:</strong> ${quote.salesperson || 'N/A'}</p>
                    </div>
                    
                    <div class="items-section">
                        <div class="items-header">ITEMS</div>
                        ${quote.items ? quote.items.map((item, index) => {
                            const imagePath = getProductImagePath(item.product || '');
                            return '<div class="item">' +
                                '<img src="' + imagePath + '" alt="' + (item.product || 'Product') + '" class="item-image" onerror="this.src=\'images/Products/Genius.png\'">' +
                                '<div class="item-content">' +
                                    '<div class="item-line">' +
                                        '<span class="item-details">' +
                                            '<strong>' + (item.product || 'N/A') + '</strong> | ' +
                                            (item.category || 'N/A') + ' | ' +
                                            (item.density || 'N/A') + ' | ' +
                                            (item.length || 'N/A') + ' | ' +
                                            (item.color || 'N/A') + ' | ' +
                                            (item.style || 'N/A') +
                                        '</span>' +
                                        '<span class="item-calculation">' +
                                            'Qty: ' + (item.quantity || 0) + ' x ' + formatCurrency(item.unitPrice || 0, quote.currency || 'INR') + ' = ' +
                                            formatCurrency(item.totalPrice || 0, quote.currency || 'INR') +
                                        '</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>';
                        }).join('') : '<div class="item">No items</div>'}
                    </div>
                    
                    <div class="totals">
                        <p><span>Subtotal:</span><span>${formatCurrency(quote.subtotal || 0, quote.currency || 'INR')}</span></p>
                        <p><span>Discount:</span><span>${formatCurrency(quote.discountAmount || 0, quote.currency || 'INR')}</span></p>
                        <p><span>Tax (${quote.tax || 0}%):</span><span>${formatCurrency(quote.taxAmount || 0, quote.currency || 'INR')}</span></p>
                        <p><span>Shipping:</span><span>${formatCurrency(quote.shipping || 0, quote.currency || 'INR')}</span></p>
                        <p class="total-row"><span>TOTAL:</span><span>${formatCurrency(quote.total || 0, quote.currency || 'INR')}</span></p>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center; border-top: 1px solid #000; padding-top: 15px;">
                        <button id="smartDownloadBtn" onclick="smartDownload()" style="background-color: #081249; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; margin-right: 10px;">
                            📄 Smart Download
                        </button>
                        <button onclick="window.print()" style="background-color: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 12px; cursor: pointer;">
                            🖨️ Print
                        </button>
                        <div id="downloadInfo" style="margin-top: 10px; font-size: 10px; color: #666; font-style: italic;">
                            Analyzing content size...
                        </div>
                    </div>
                    
                    <script>
                        // Include jsPDF in the preview window
                        const jsPDFScript = document.createElement('script');
                        jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                        document.head.appendChild(jsPDFScript);
                        
                        // Include HTML2Canvas in the preview window
                        const html2canvasScript = document.createElement('script');
                        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                        document.head.appendChild(html2canvasScript);
                        
                        // Quote data will be received via postMessage
                        let quoteData = null;
                        
                        // Listen for quote data from parent window
                        window.addEventListener('message', function(event) {
                            if (event.data.type === 'QUOTE_DATA') {
                                quoteData = event.data.quote;
                            }
                        });
                        
                        // Format currency function
                        function formatCurrency(amount, currency = 'INR') {
                            // Use centralized language utilities if available
                            if (window.LanguageUtils) {
                                return window.LanguageUtils.formatCurrency(amount, currency);
                            }
                            // Fallback to basic formatting
                            const symbols = {
                                'INR': '₹',
                                'USD': '$',
                                'EUR': '€',
                                'GBP': '£'
                            };
                            const symbol = symbols[currency] || currency;
                            return symbol + ' ' + parseFloat(amount || 0).toFixed(2);
                        }
                        
                        // Get product image path function
                        function getProductImagePath(productName) {
                            if (!productName) return 'images/Products/Genius.png';
                            
                            // Clean the product name and create filename
                            const cleanName = productName.trim();
                            const filename = cleanName + '.png';
                            
                            return 'images/Products/' + filename;
                        }
                        
                        // Content measurement and smart download functionality
                        function measureContent() {
                            const content = document.body;
                            const rect = content.getBoundingClientRect();
                            
                            // A4 dimensions in pixels (at 96 DPI)
                            const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
                            const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
                            
                            // Account for margins (20mm on each side)
                            const USABLE_WIDTH = A4_WIDTH_PX - 152; // ~20mm margins
                            const USABLE_HEIGHT = A4_HEIGHT_PX - 152; // ~20mm margins
                            
                            const contentWidth = rect.width;
                            const contentHeight = rect.height;
                            
                            // Determine if content fits in single A4 page
                            const fitsInA4 = contentWidth <= USABLE_WIDTH && contentHeight <= USABLE_HEIGHT;
                            
                            // Calculate number of items for complexity assessment
                            const itemCount = quoteData && quoteData.items ? quoteData.items.length : 0;
                            
                            return {
                                width: contentWidth,
                                height: contentHeight,
                                fitsInA4: fitsInA4,
                                itemCount: itemCount,
                                recommendedFormat: fitsInA4 && itemCount <= 5 ? 'image' : 'pdf'
                            };
                        }
                        
                        // Update download info display
                        function updateDownloadInfo() {
                            const measurement = measureContent();
                            const infoElement = document.getElementById('downloadInfo');
                            const btnElement = document.getElementById('smartDownloadBtn');
                            
                            if (measurement.recommendedFormat === 'image') {
                                infoElement.textContent = 'Will download as IMAGE (' + Math.round(measurement.width) + '×' + Math.round(measurement.height) + 'px, fits A4)';
                                btnElement.innerHTML = '🖼️ Download Image';
                                btnElement.style.backgroundColor = '#2563eb';
                            } else {
                                infoElement.textContent = 'Will download as PDF (' + measurement.itemCount + ' items, multi-page content)';
                                btnElement.innerHTML = '📄 Download PDF';
                                btnElement.style.backgroundColor = '#dc2626';
                            }
                        }
                        
                        // Smart download function
                        async function smartDownload() {
                            try {
                                const measurement = measureContent();
                                
                                if (measurement.recommendedFormat === 'image') {
                                    await downloadAsImage();
                                } else {
                                    await downloadAsPDF();
                                }
                            } catch (error) {
                                alert('Error generating download. Please try again.');
                            }
                        }
                        
                        // Download as optimized image
                        async function downloadAsImage() {
                            if (!window.html2canvas) {
                                alert('Image library is loading, please try again in a moment.');
                                return;
                            }
                            
                            // Hide the download buttons temporarily for clean capture
                            const buttonsDiv = document.querySelector('div[style*="border-top: 1px solid #000"]');
                            const originalDisplay = buttonsDiv.style.display;
                            buttonsDiv.style.display = 'none';
                            
                            try {
                                const canvas = await html2canvas(document.body, {
                                    scale: 2, // High quality
                                    useCORS: true,
                                    allowTaint: true,
                                    backgroundColor: '#ffffff',
                                    width: 794, // A4 width in pixels
                                    height: null // Auto height
                                });
                                
                                // Create download link
                                const link = document.createElement('a');
                                link.download = 'Proforma_Invoice_' + (quoteData.number || 'Quote') + '.png';
                                link.href = canvas.toDataURL('image/png', 0.95);
                                link.click();
                                
                            } finally {
                                // Restore buttons
                                buttonsDiv.style.display = originalDisplay;
                            }
                        }
                        
                    }

                </body>
                </html>
            `;
        }

        // Get product image path
        function getProductImagePath(product, category, density, length, colorType, color) {
            
            // Product image mapping based on actual files in images/Products/
            const productImageMap = {
                'BUN': 'BUN.png',
                'Bangs': 'Bangs.png',
                'Bulk': 'Bulk.png',
                'ClipOn': 'ClipOn.png',
                'Closure': 'Closure.png',
                'ClutchBun': 'ClutchBun.png',
                'CoverPatch': 'CoverPatch.png',
                'CurlyBun': 'CurlyBun.png',
                'FLATCLIPPONYTAIL': 'FLATCLIPPONYTAIL.png',
                'FlatTips': 'FlatTips.png',
                'Frontal': 'Frontal.png',
                'Frontline': 'Frontline.png',
                'Genius': 'Genius.png',
                'Halo': 'Halo.png',
                'Highlights': 'Highlights.png',
                'ITIPS': 'ITIPS.png',
                'Nano': 'Nano.png',
                'PonyTail': 'PonyTail.png',
                'SILKTOPPER': 'SILKTOPPER.png',
                'Tapes': 'Tapes.png',
                'UTIPS': 'UTIPS.png',
                'WIGCLOSURE': 'WIGCLOSURE.png',
                'WIGFRONTAL': 'WIGFRONTAL.png',
                'Weaves-DD': 'Weaves-DD.png',
                'Weaves-SD': 'Weaves-SD.png',
                'Weaves-SDD': 'Weaves-SDD.png',
                'YTIPS': 'YTIPS.png'
            };

            // Try to find image by product name first (exact match)
            if (product && productImageMap[product]) {
                const path = `images/Products/${productImageMap[product]}`;
                return path;
            }

            // Try partial matches for common variations
            const productLower = product ? product.toLowerCase() : '';
            for (const [key, value] of Object.entries(productImageMap)) {
                if (key.toLowerCase().includes(productLower) || productLower.includes(key.toLowerCase())) {
                    const path = `images/Products/${value}`;
                    return path;
                }
            }

            // Fallback to a default image (use one of the existing images)
            const fallbackPath = 'images/Products/Genius.png';
            return fallbackPath;
        }

        // Generate order number
        function generateOrderNumber() {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
            return `ORD-${year}${month}${day}-${time}`;
        }

        // Test function for debugging image upload functionality
        function testImageUploadFunctionality() {
            // Test 1: Check if image display elements exist
            const colorImageDisplay = document.getElementById('color-image-display');
            const styleImageDisplay = document.getElementById('style-image-display');
            
            // Test 2: Simulate adding an item and check if elements still exist
            clearProductForm();
            
            const colorImageDisplayAfter = document.getElementById('color-image-display');
            const styleImageDisplayAfter = document.getElementById('style-image-display');
            
            return {
                beforeClear: { colorImageDisplay: !!colorImageDisplay, styleImageDisplay: !!styleImageDisplay },
                afterClear: { colorImageDisplay: !!colorImageDisplayAfter, styleImageDisplay: !!styleImageDisplayAfter }
            };
        }

        // Test function to diagnose second quote line rendering
        function testSecondQuoteLineRendering() {
            // Clear existing items
            currentQuote.items = [];
            
            // Add two test items
            const testItem1 = {
                id: 'test-1',
                product: 'Genius',
                category: 'Genius',
                density: '150',
                length: '12',
                colorType: 'Natural',
                color: 'Black',
                style: 'Straight',
                quantity: 1,
                unitPrice: 100,
                totalPrice: 100,
                customColor: false,
                customStyle: false,
                colorImage: null,
                styleImage: null
            };
            
            const testItem2 = {
                id: 'test-2',
                product: 'Tapes',
                category: 'Tapes',
                density: '180',
                length: '14',
                colorType: 'Colored',
                color: 'Brown',
                style: 'Wavy',
                quantity: 2,
                unitPrice: 150,
                totalPrice: 300,
                customColor: false,
                customStyle: false,
                colorImage: null,
                styleImage: null
            };
            
            currentQuote.items.push(testItem1);
            updateQuoteItemsDisplay();
            
            setTimeout(() => {
                currentQuote.items.push(testItem2);
                updateQuoteItemsDisplay();
            }, 1000);
        }

        // Add test button functionality (for debugging purposes)
        window.testSecondQuoteLineRendering = testSecondQuoteLineRendering;
        window.testImageUploadFunctionality = testImageUploadFunctionality;
        

        





        
        // Removed temporary JS running indicator
        
        // Mobile menu functionality
        function toggleMobileMenu() {
            const hamburger = document.querySelector('.hamburger-menu');
            const mobileMenu = document.querySelector('.mobile-menu');
            
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            const hamburger = document.querySelector('.hamburger-menu');
            const mobileMenu = document.querySelector('.mobile-menu');
            
            if (!hamburger.contains(event.target) && !mobileMenu.contains(event.target)) {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    