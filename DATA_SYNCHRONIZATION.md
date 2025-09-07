# Unified Data Synchronization System

## Overview
This system provides unified data synchronization across all modules of the Indian Natural Hair application, ensuring consistent product data between the main app, price list generator, and quote maker.

## Architecture

### Server Endpoints
- **POST /api/embed-data** - Main endpoint for data embedding
- **POST /api/save-data** - Save product data to JSON file
- **GET /api/get-data** - Retrieve current product data

### Target Modules
1. **mainApp** - Main application (index.html)
2. **priceList** - Price List Generator (oldfiles/Price List Generator — Indian Natural Hair.html)
3. **quoteMaker** - Quote Maker (quotemaker/index.html via productData.js)
4. **all** - Synchronizes data across all modules simultaneously

### Data Flow
1. Excel file upload → Server processing → JSON conversion
2. Data embedding into target modules via regex replacement
3. Automatic backup creation before modifications
4. Real-time synchronization across all modules

### File Structure
```
/
├── server.js                 # Main server with embedding logic
├── index.html                # Main app with productData array
├── oldfiles/
│   └── Price List Generator — Indian Natural Hair.html  # Price list with productData
├── quotemaker/
│   ├── index.html            # Quote maker main file
│   └── productData.js        # Separate JS file with products array
└── PriceLists/
    └── productData.xlsx      # Source Excel file
```

### Key Features
- **Automatic Backups**: Creates timestamped backups before any data modification
- **Multi-target Support**: Can embed data into specific modules or all at once
- **Error Handling**: Comprehensive error handling with detailed logging
- **Data Validation**: Ensures data integrity during synchronization
- **Real-time Updates**: Immediate reflection of changes across all modules

### Usage Examples

#### Embed data into all modules:
```bash
curl -X POST http://localhost:8001/api/embed-data \
  -H "Content-Type: application/json" \
  -d '{"target": "all", "data": [product_array]}'
```

#### Embed data into specific module:
```bash
curl -X POST http://localhost:8001/api/embed-data \
  -H "Content-Type: application/json" \
  -d '{"target": "mainApp", "data": [product_array]}'
```

### Implementation Details

#### Main App (index.html)
- Replaces `let productData = [];` with actual data
- Supports both `const` and `let` declarations
- Fallback regex for edge cases

#### Price List Generator
- Replaces `let productData = [];` in HTML file
- Maintains existing data structure and formatting
- Preserves all product properties (Category, Product, Density, Length, Rate, etc.)

#### Quote Maker
- Updates `productData.js` file instead of main HTML
- Replaces `let products = [];` in separate JavaScript file
- Creates backups of JavaScript files

### Error Handling
- File existence validation
- Regex pattern matching verification
- Backup creation confirmation
- Detailed error logging with timestamps

### Backup System
- Automatic backup creation with timestamp
- Format: `filename_backup_[timestamp].ext`
- Preserves original files before any modifications
- Separate backups for HTML and JS files

## Maintenance
- Monitor server logs for embedding operations
- Regular cleanup of backup files
- Verify data consistency across modules
- Update regex patterns if file structures change