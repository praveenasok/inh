// Product data for quote maker - integrated with price list system
// This will be populated when user uploads Excel file or loads from existing data
let products = [];

// Load existing product data from the main system if available
async function loadExistingProductData() {
  try {
    // Try to load from the main price list Excel file
    const response = await fetch('../PriceLists/productData.xlsx');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length >= 2) {
        const parsedData = parseProductData(jsonData);
        products = parsedData.products;
        console.log(`Loaded ${products.length} products from existing database`);
        return true;
      }
    }
  } catch (error) {
    console.log('No existing product data found, will need to upload Excel file');
  }
  return false;
}

// Parse Excel data using the same logic as the main price list system
function parseProductData(jsonData) {
  const headers = jsonData[0];
  const products = [];
  
  // Map common header variations to standard field names
  const headerMap = {
    'category': ['category', 'catagory', 'cat', 'type'],
    'product': ['product', 'prod', 'name', 'product name'],
    'density': ['density', 'dens', 'thickness'],
    'colors': ['colors', 'color', 'colour', 'colours'],
    'length': ['length', 'len', 'size'],
    'rate': ['rate', 'price', 'cost', 'amount'],
    'canBeSoldInKG': ['can be sold in kg?', 'kg', 'kilogram', 'can be sold in kg'],
    'standardWeight': ['standard weight', 'weight', 'std weight', 'wt'],
    'priceListName': ['price list name', 'pricelist name', 'pricelistname', 'price list', 'pricelist']
  };
  
  // Find column indices for each field
  const columnIndices = {};
  Object.keys(headerMap).forEach(field => {
    const variations = headerMap[field];
    for (let i = 0; i < headers.length; i++) {
      const header = (headers[i] || '').toString().toLowerCase().trim();
      if (variations.includes(header)) {
        columnIndices[field] = i;
        break;
      }
    }
  });
  
  // Process data rows
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;
    
    const product = {
      Category: row[columnIndices.category] || '',
      Product: row[columnIndices.product] || '',
      Density: row[columnIndices.density] || '',
      Colors: row[columnIndices.colors] || '',
      Length: row[columnIndices.length] || '',
      Rate: row[columnIndices.rate] || '',
      'Can Be Sold in KG?': row[columnIndices.canBeSoldInKG] || '',
      'Standard Weight': row[columnIndices.standardWeight] || '',
      PriceList: row[columnIndices.priceListName] || ''
    };
    
    // Only add products with required fields
    if (product.Category && product.Product && product.Rate) {
      products.push(product);
    }
  }
  
  return {
    products: products,
    totalRows: jsonData.length - 1,
    headers: headers
  };
}

// Function to load products from uploaded Excel file
async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'));
          return;
        }
        
        const parsedData = parseProductData(jsonData);
        products = parsedData.products;
        resolve(parsedData);
        
      } catch (parseError) {
        reject(new Error(`Failed to parse Excel file: ${parseError.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Function to load products from uploaded Excel file (legacy compatibility)


