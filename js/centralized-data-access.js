class CentralizedDataAccess {
    constructor() {
        this.isReady = false;
        this.readyPromise = null;
        this.data = {
            clients: [],
            products: [],
            salespeople: [],
            colors: [],
            styles: []
        };
        this.initializeAccess();
    }
    
    async initializeAccess() {
        try {
            console.log('🔄 Starting centralized data access initialization...');
            await Promise.race([
                this.loadFromFirebase(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Data access initialization timeout after 60 seconds')), 60000)
                )
            ]);
            
            this.isReady = true;
            this.status = 'ready';
            console.log('✅ Centralized data access initialization completed successfully');
            
        } catch (error) {
            console.error('❌ Firebase data access failed:', error);
            this.isReady = false;
            this.status = 'error';
            
            // Provide more specific error messages
            if (error.code === 'permission-denied') {
                this.error = 'Firebase connection failed: Missing or insufficient permissions.';
            } else if (error.code === 'unavailable' || error.message.includes('network')) {
                this.error = 'Firebase connection failed: Network connection issue. Please check your internet connection.';
            } else if (error.message.includes('timeout')) {
                this.error = 'Firebase connection failed: Connection timeout. Please try again.';
            } else {
                this.error = `Firebase connection failed: ${error.message}`;
            }
            
            // No fallback data - Firebase connection is required
            throw new Error(this.error);
        }
        
        // Always resolve/reject the promise regardless of success or failure
        if (this.readyPromise) {
            if (this.isReady) {
                this.readyPromise.resolve(this);
            } else {
                this.readyPromise.reject(new Error(this.error || 'Data access initialization failed'));
            }
        }
    }
    
    async loadFromFirebase() {
        try {
            // Check if API adapter is available first
            if (window.firebaseAPIAdapter && window.firebaseAPIAdapter.isAvailable()) {
                console.log('🔥 Using Firebase API adapter for data loading');
                
                // Load data using API adapter
                const [clients, products, salespeople, colors, styles, quotes, orders] = await Promise.all([
                    this.loadDataViaAPI('clients'),
                    this.loadDataViaAPI('products'),
                    this.loadDataViaAPI('salespeople'),
                    this.loadDataViaAPI('colors'),
                    window.firebaseAPIAdapter.getStyles(),
                    this.loadDataViaAPI('quotes'),
                    this.loadDataViaAPI('orders')
                ]);
                
                this.data.clients = clients || [];
                this.data.products = products || [];
                this.data.salespeople = salespeople || [];
                this.data.colors = colors || [];
                this.data.styles = styles || [];
                this.data.quotes = quotes || [];
                this.data.orders = orders || [];
                
                console.log('✅ All data loaded via API adapter');
                this.dataSource = 'api-adapter';
                this.lastUpdate = new Date().toISOString();
                return;
            }
            
            // Use centralized Firebase manager for initialization
            if (window.centralizedFirebaseManager) {
                console.log('🔥 Using centralized Firebase manager for initialization');
                try {
                    console.log('⏳ Initializing centralized Firebase manager...');
                    await window.centralizedFirebaseManager.initialize();
                    console.log('✅ Centralized Firebase manager initialized');
                    console.log('⏳ Loading all data from Firebase...');
                    await window.centralizedFirebaseManager.loadAllData();
                    console.log('✅ All data loaded from Firebase');
                    
                    // Get data from centralized manager
                    this.data.clients = window.centralizedFirebaseManager.getData('clients') || [];
                    this.data.products = window.centralizedFirebaseManager.getData('products') || [];
                    this.data.salespeople = window.centralizedFirebaseManager.getData('salespeople') || [];
                    this.data.colors = [];  // Load from Firebase collection
                    this.data.styles = [];  // Load from Firebase collection
                    this.data.quotes = [];  // Load from Firebase collection
                    this.data.orders = [];  // Load from Firebase collection
                    
                    // Load additional collections not handled by centralized manager
                    const { firestore } = window.centralizedFirebaseManager.getFirebaseInstances();
                    if (firestore) {
                        const [colors, styles, quotes, orders] = await Promise.all([
                            this.loadFirebaseCollectionDirect(firestore, 'colors'),
                            this.loadFirebaseCollectionDirect(firestore, 'styles'),
                            this.loadFirebaseCollectionDirect(firestore, 'quotes'),
                            this.loadFirebaseCollectionDirect(firestore, 'orders')
                        ]);
                        this.data.colors = colors || [];
                        this.data.styles = styles || [];
                        this.data.quotes = quotes || [];
                        this.data.orders = orders || [];
                    }
                    
                    this.dataSource = 'firebase';
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase centralized manager failed, trying server API fallback:', firebaseError.message);
                    
                    // Fallback to server API
                    const [clients, products, salespeople, colors, styles, quotes, orders] = await Promise.all([
                        this.loadDataViaAPI('clients'),
                        this.loadDataViaAPI('products'),
                        this.loadDataViaAPI('salespeople'),
                        this.loadDataViaAPI('colors'),
                        this.loadDataViaAPI('styles'),
                        this.loadDataViaAPI('quotes'),
                        this.loadDataViaAPI('orders')
                    ]);
                    
                    this.data.clients = clients || [];
                    this.data.products = products || [];
                    this.data.salespeople = salespeople || [];
                    this.data.colors = colors || [];
                    this.data.styles = styles || [];
                    this.data.quotes = quotes || [];
                    this.data.orders = orders || [];
                    
                    this.dataSource = 'server-api';
                }
            } else {
                // Fallback to direct Firebase initialization
                console.log('⚠️ Centralized Firebase manager not available, using direct initialization');
                try {
                    await this.waitForFirebaseInitialization();
                    
                    if (!window.firebase || !window.firebase.firestore) {
                        throw new Error('Firebase not available or not initialized');
                    }
                    
                    const db = window.firebase.firestore();
                    await db.collection('products').limit(1).get();
                    
                    const [clients, products, salespeople, colors, styles, quotes, orders] = await Promise.all([
                        this.loadFirebaseCollection('clients'),
                        this.loadFirebaseCollection('products'),
                        this.loadSalesmenFromConfig(),
                        this.loadFirebaseCollection('colors'),
                        this.loadFirebaseCollection('styles'),
                        this.loadFirebaseCollection('quotes'),
                        this.loadFirebaseCollection('orders')
                    ]);
                    
                    this.data.clients = clients || [];
                    this.data.products = products || [];
                    this.data.salespeople = salespeople || [];
                    this.data.colors = colors || [];
                    this.data.styles = styles || [];
                    this.data.quotes = quotes || [];
                    this.data.orders = orders || [];
                    
                    this.dataSource = 'firebase';
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase direct access failed, trying server API fallback:', firebaseError.message);
                    
                    // Fallback to server API
                    const [clients, products, salespeople, colors, styles, quotes, orders] = await Promise.all([
                        this.loadDataViaAPI('clients'),
                        this.loadDataViaAPI('products'),
                        this.loadDataViaAPI('salespeople'),
                        this.loadDataViaAPI('colors'),
                        this.loadDataViaAPI('styles'),
                        this.loadDataViaAPI('quotes'),
                        this.loadDataViaAPI('orders')
                    ]);
                    
                    this.data.clients = clients || [];
                    this.data.products = products || [];
                    this.data.salespeople = salespeople || [];
                    this.data.colors = colors || [];
                    this.data.styles = styles || [];
                    this.data.quotes = quotes || [];
                    this.data.orders = orders || [];
                    
                    this.dataSource = 'server-api';
                }
            }
            
            this.lastUpdate = new Date().toISOString();
        } catch (error) {
            throw new Error(`Data loading failed: ${error.message}`);
        }
    }
    
    async waitForFirebaseInitialization(maxWait = 20000) {
        const startTime = Date.now();
        let attempts = 0;
        
        while (!window.firebase || !window.firebase.firestore) {
            attempts++;
            const elapsed = Date.now() - startTime;
            
            if (elapsed > maxWait) {
                console.error(`❌ Firebase initialization timeout after ${elapsed}ms (${attempts} attempts)`);
                console.error('Firebase status:', {
                    firebase: !!window.firebase,
                    firestore: !!(window.firebase && window.firebase.firestore),
                    firebaseGlobalApp: !!window.firebaseGlobalApp,
                    firebaseGlobalInitialized: !!window.firebaseGlobalInitialized
                });
                throw new Error(`Firebase initialization timeout after ${elapsed}ms`);
            }
            
            // Log progress every 1 second
            if (attempts % 10 === 0) {
                console.log(`⏳ Waiting for Firebase initialization... (${elapsed}ms elapsed)`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`✅ Firebase initialized after ${Date.now() - startTime}ms (${attempts} attempts)`);
    }
    
    async loadFirebaseCollection(collectionName) {
        try {
            const db = window.firebase.firestore();
            
            // Retry Firestore operations with exponential backoff
            const snapshot = await this.retryFirestoreOperation(async () => {
                return await db.collection(collectionName).get();
            });
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`❌ Failed to load ${collectionName} after retries:`, error);
            return [];
        }
    }

    async loadFirebaseCollectionDirect(firestore, collectionName) {
        try {
            // Retry Firestore operations with exponential backoff
            const snapshot = await this.retryFirestoreOperation(async () => {
                return await firestore.collection(collectionName).get();
            });

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`❌ Failed to load ${collectionName} after retries:`, error);
            return [];
        }
    }

    async loadDataViaAPI(collectionName) {
        try {
            console.log(`⏳ Loading ${collectionName} via server API...`);
            
            // Map collection names to server endpoints
            const endpointMap = {
                'clients': '/api/clients',
                'products': '/api/products', 
                'salespeople': '/api/salespeople',
                'colors': '/api/colors',
                'styles': '/api/styles',
                'quotes': '/api/quotes',
                'orders': '/api/orders'
            };
            
            const endpoint = endpointMap[collectionName];
            if (!endpoint) {
                console.warn(`⚠️ No API endpoint available for ${collectionName}`);
                return [];
            }
            
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Loaded ${data.length || 0} ${collectionName} via server API`);
            return data || [];
        } catch (error) {
            console.error(`❌ Failed to load ${collectionName} via server API:`, error);
            return [];
        }
    }

    async loadSalesmenFromConfig() {
        try {
            const db = window.firebase.firestore();
            const snapshot = await db.collection('config').doc('salesmen').get();
            if (snapshot.exists) {
                const data = snapshot.data();
                return data.salesmen || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }
    
    async retryFirebaseConnection(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.loadFromFirebase();
                return;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    waitForReady() {
        if (this.isReady) {
            return Promise.resolve(this);
        }
        
        if (!this.readyPromise) {
            this.readyPromise = {};
            this.readyPromise.promise = new Promise((resolve, reject) => {
                this.readyPromise.resolve = resolve;
                this.readyPromise.reject = reject;
                
                setTimeout(() => {
                    if (!this.isReady) {
                        reject(new Error('Data access initialization timeout'));
                    }
                }, 15000);
            });
        }
        
        return this.readyPromise.promise;
    }
    
    async getData(type) {
        await this.waitForReady();
        return this.data[type] || [];
    }
    
    async getFilteredData(type, filterFn) {
        const data = await this.getData(type);
        return data.filter(filterFn);
    }
    
    async getClients() {
        return await this.getData('clients');
    }
    
    async getProducts() {
        return await this.getData('products');
    }
    
    async getSalespeople() {
        return await this.getData('salespeople');
    }

    async getColors() {
        return await this.getData('colors');
    }

    async getStyles() {
        return await this.getData('styles');
    }

    async getQuotes() {
        return await this.getData('quotes');
    }

    async getOrders() {
        return await this.getData('orders');
    }

    async getCategories() {
        const products = await this.getProducts();
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        return categories.sort();
    }

    async getSubcategories() {
        const products = await this.getProducts();
        const subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
        return subcategories.sort();
    }

    async getPriceLists() {
        const products = await this.getProducts();
        const priceLists = [...new Set(products.map(p => p.priceList).filter(Boolean))];
        return priceLists.sort();
    }

    async getBrands() {
        const products = await this.getProducts();
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
        return brands.sort();
    }

    async getProductsByCategory(category) {
        return await this.getFilteredData('products', p => p.category === category);
    }

    async getProductsBySubcategory(subcategory) {
        return await this.getFilteredData('products', p => p.subcategory === subcategory);
    }

    async getProductsByBrand(brand) {
        return await this.getFilteredData('products', p => p.brand === brand);
    }

    async searchProducts(searchTerm) {
        if (!searchTerm) return await this.getProducts();
        
        const term = searchTerm.toLowerCase();
        return await this.getFilteredData('products', p => 
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.category && p.category.toLowerCase().includes(term)) ||
            (p.subcategory && p.subcategory.toLowerCase().includes(term)) ||
            (p.brand && p.brand.toLowerCase().includes(term))
        );
    }

    async getFirebaseInstances() {
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase not available');
        }
        
        return {
            db: window.firebase.firestore(),
            auth: window.firebase.auth ? window.firebase.auth() : null
        };
    }

    async retryFirestoreOperation(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.warn(`⚠️ Firestore operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async refreshData(type) {
        if (type) {
            const newData = await this.loadFirebaseCollection(type);
            this.data[type] = newData;
        } else {
            await this.loadFromFirebase();
        }
        
        this.lastUpdate = new Date().toISOString();
    }

    addEventListener(eventType, listener) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        this.eventListeners[eventType].push(listener);
    }

    removeEventListener(eventType, listener) {
        if (this.eventListeners && this.eventListeners[eventType]) {
            const index = this.eventListeners[eventType].indexOf(listener);
            if (index > -1) {
                this.eventListeners[eventType].splice(index, 1);
            }
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            status: this.status,
            error: this.error,
            dataSource: this.dataSource,
            lastUpdate: this.lastUpdate,
            dataCounts: {
                clients: this.data.clients.length,
                products: this.data.products.length,
                salespeople: this.data.salespeople.length,
                colors: this.data.colors.length,
                styles: this.data.styles.length
            }
        };
    }
}

const DataAccessUtils = {
    async populateSelect(selectElement, dataType, options = {}) {
        if (!selectElement) return;
        
        try {
            await window.centralizedDataAccess.waitForReady();
            
            const data = await window.centralizedDataAccess.getData(dataType);
            
            selectElement.innerHTML = '';
            
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || `Select ${dataType}...`;
                selectElement.appendChild(emptyOption);
            }
            
            data.forEach(item => {
                const option = document.createElement('option');
                
                if (options.valueField) {
                    option.value = item[options.valueField];
                } else {
                    option.value = item.id || item.name || item;
                }
                
                if (options.textField) {
                    option.textContent = item[options.textField];
                } else if (typeof item === 'string') {
                    option.textContent = item;
                } else {
                    option.textContent = item.name || item.id || item;
                }
                
                if (options.selectedValue && option.value === options.selectedValue) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = `Error loading ${dataType}`;
            selectElement.appendChild(errorOption);
        }
    },
    
    async populateClientsSelect(selectElement, options = {}) {
        await this.populateSelect(selectElement, 'clients', {
            textField: 'name',
            valueField: 'id',
            ...options
        });
    },
    
    async populateProductsSelect(selectElement, options = {}) {
        await this.populateSelect(selectElement, 'products', {
            textField: 'name',
            valueField: 'id',
            ...options
        });
    },
    
    async populateSalespeopleSelect(selectElement, options = {}) {
        await this.populateSelect(selectElement, 'salespeople', {
            textField: 'name',
            valueField: 'id',
            ...options
        });
    },
    
    async populateCategoriesSelect(selectElement, options = {}) {
        try {
            await window.centralizedDataAccess.waitForReady();
            const categories = await window.centralizedDataAccess.getCategories();
            
            selectElement.innerHTML = '';
            
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || 'Select Category...';
                selectElement.appendChild(emptyOption);
            }
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                
                if (options.selectedValue && option.value === options.selectedValue) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading categories';
            selectElement.appendChild(errorOption);
        }
    },
    
    async populateSubcategoriesSelect(selectElement, category = null, options = {}) {
        try {
            await window.centralizedDataAccess.waitForReady();
            
            let subcategories;
            if (category) {
                const products = await window.centralizedDataAccess.getProductsByCategory(category);
                subcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))].sort();
            } else {
                subcategories = await window.centralizedDataAccess.getSubcategories();
            }
            
            selectElement.innerHTML = '';
            
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || 'Select Subcategory...';
                selectElement.appendChild(emptyOption);
            }
            
            subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory;
                option.textContent = subcategory;
                
                if (options.selectedValue && option.value === options.selectedValue) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading subcategories';
            selectElement.appendChild(errorOption);
        }
    },

    async populateBrandsSelect(selectElement, options = {}) {
        try {
            await window.centralizedDataAccess.waitForReady();
            const brands = await window.centralizedDataAccess.getBrands();
            
            selectElement.innerHTML = '';
            
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || 'Select Brand...';
                selectElement.appendChild(emptyOption);
            }
            
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                
                if (options.selectedValue && option.value === options.selectedValue) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
            
        } catch (error) {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading brands';
            selectElement.appendChild(errorOption);
        }
    }
};

window.centralizedDataAccess = new CentralizedDataAccess();
window.DataAccessUtils = DataAccessUtils;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CentralizedDataAccess, DataAccessUtils };
}