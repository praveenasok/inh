# Google Sheets Data Structure

## Data Source Configuration
**Primary Data Source**: Google Sheets integrated with Firebase Firestore
**Backup Storage**: Firebase Firestore collections
**Integration Guide**: See `GOOGLE_SHEETS_FIREBASE_INTEGRATION_GUIDE.md` for comprehensive details

## Sheet Structure and Firebase Mapping

### 1. Pricelists Tab → `products` Collection
**Sheet URL**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=1700468671#gid=1700468671`
**Primary Use**: Product pricing records and dropdown population

**Required Columns:**
- **Length** - Product length specification
- **Price List Name** - Populates price list dropdowns in interfaces
- **Currency** - Pricing currency
- **Category** - Product category (e.g., "DIY", "Weaves")
- **Density** - Product density specification
- **Product** - Product name
- **Shade** - Product shade/color variant
- **Standard Weight** - Standard weight specification
- **Rate** - Product price (numeric)
- **Can be sold in kg?** - Boolean indicator for weight-based sales

**Data Fetcher**: `fetchProductData()` in `google-sheets-service.js`

### 2. Salesmen Tab → `salesmen` Collection
**Sheet URL**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=455801916#gid=455801916`
**Primary Use**: Populate "Select Sales Representative" dropdown

**Structure:**
- Column A: Salesman names (one per row)

**Data Fetcher**: `fetchSalesmanData()` in `google-sheets-service.js`

### 3. Clients Tab → `clients` Collection
**Primary Use**: Client management and dropdown population

**Column Structure:**
- Client ID, Client Name, Company Name, Phone 1, Phone 2, Contact Person, Email, Address, Postal Code, TAX ID, Salesperson

**Data Fetcher**: `fetchClientData()` in `google-sheets-service.js`

### 4. Colors Tab → `colors` Collection
**Primary Use**: Color options for product customization

**Data Fetcher**: `fetchColorsData()` in `google-sheets-service.js`

### 5. Styles Tab → `styles` Collection
**Primary Use**: Style options for product customization

**Data Fetcher**: `fetchStylesData()` in `google-sheets-service.js`

### 6. Derived Collections

#### Shades Collection (`shades`)
**Source**: Derived from Pricelists tab "Shade" column
**Primary Use**: Shade dropdown population
**Data Fetcher**: `fetchShadesData()` - extracts unique shade values

#### Price Lists Collection (`pricelists`)
**Source**: Derived from Pricelists tab "Price List Name" column
**Primary Use**: Price list dropdown population
**Data Fetcher**: `fetchPriceListsData()` - extracts unique price list names

## Example Structure
```
Category | Product | Rate | Density | Length | Colors | Shade
DIY      | Bun20   | 300  | DD      | 4      | All Colors | Light Brown
Weaves   | 12"     | 450  | SD      | 12     | Natural | Natural Black
```

## Firebase Integration Architecture

### 3-Stage Synchronization Process
1. **Google Sheets → Firebase**: Primary sync using `ComprehensiveSyncSystem`
2. **Firebase → Local Storage**: Secondary sync for offline access
3. **Local Storage → UI**: Data population for HTML interfaces

### Sync Services
- **Primary**: `ComprehensiveSyncSystem` - Orchestrates all sync operations
- **Bidirectional**: `BidirectionalSyncService` - Real-time sync with conflict resolution
- **Change Detection**: `GoogleSheetsChangeDetector` & `FirebaseChangeDetector`
- **Error Handling**: `ErrorHandlingSystem` with retry mechanisms

### Firebase Collections
- `products` - Product pricing and specifications
- `salesmen` - Sales representative data
- `clients` - Client information and contacts
- `colors` - Available color options
- `styles` - Available style options
- `shades` - Unique shade values (derived)
- `pricelists` - Unique price list names (derived)

### HTML Interface Integration
**Consuming Interfaces:**
- `quotemaker.html` - Quote creation with dropdown population
- `price-calculator.html` - Price calculations using product data
- `product-catalog.html` - Product display and filtering
- `admin-sync-panel.html` - Sync management and monitoring

**Data Access Pattern:**
```javascript
// Universal data manager with fallback strategy
const dataManager = new UniversalFirebaseDataManager();
await dataManager.loadData('products');
const products = dataManager.getData('products');
```

### Performance Optimizations
- **Caching**: Local storage caching for frequently accessed data
- **Lazy Loading**: On-demand data loading for large collections
- **Batch Operations**: Bulk Firebase writes for efficiency
- **Error Recovery**: Automatic retry with exponential backoff

## Validation Rules
1. Google Sheets must be accessible via service account API
2. Must contain at least header row + 1 data row
3. Required columns must be present in each tab
4. Data types must match expected formats (numeric for rates, etc.)
5. Firebase security rules must allow read/write access

## Monitoring and Maintenance
- **Sync Status**: Real-time sync progress tracking
- **Error Logging**: Comprehensive error reporting and logging
- **Data Validation**: Automatic validation of synced data
- **Performance Metrics**: Sync timing and success rate monitoring

## Troubleshooting
- **Sync Failures**: Check service account permissions and sheet accessibility
- **Data Inconsistencies**: Use admin panel to compare counts and refresh data
- **Performance Issues**: Monitor sync timing and consider batch size adjustments
- **UI Loading Issues**: Verify data manager initialization and fallback mechanisms

## Data Synchronization Methods
- **Manual Sync**: Use admin panel "Sync Data" button for immediate synchronization
- **Automatic Sync**: Scheduled synchronization via Firebase Functions
- **Real-time Sync**: Bidirectional sync with change detection
- **Validation**: Data integrity checks during sync process
- **Error Handling**: Comprehensive error reporting and recovery mechanisms

## Related Documentation
- `GOOGLE_SHEETS_FIREBASE_INTEGRATION_GUIDE.md` - Comprehensive integration guide
- `DEVELOPMENT_DOCUMENTATION.md` - Development setup and configuration
- Service configuration files in `/js/` directory
