// Firebase Schema Migration Script
// This script migrates existing Firebase product data to the new 10-column structure

async function migrateFirebaseSchema() {
  try {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded');
      return;
    }

    if (!firebase.apps.length) {
      console.error('❌ Firebase not initialized');
      return;
    }

    console.log('🔄 Starting Firebase schema migration...');
    const db = firebase.firestore();
    
    // Get all existing products
    console.log('📊 Fetching existing products...');
    const productsSnapshot = await db.collection('products').get();
    
    if (productsSnapshot.empty) {
      console.log('📭 No products found to migrate');
      return;
    }

    console.log(`📦 Found ${productsSnapshot.size} products to migrate`);
    
    const batch = db.batch();
    let migratedCount = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      
      // Transform to new 10-column structure
      const migratedProduct = {
        // Column 1: Length of the product (numeric value)
        Length: typeof product.Length === 'number' ? product.Length : parseFloat(product.Length) || 0,
        
        // Column 2: Name of the pricelist (text)
        PriceListName: product.PriceListName || product.PriceList || product['Price List Name'] || '',
        
        // Column 3: Currency for listed prices (3-letter currency code)
        Currency: product.Currency || 'USD',
        
        // Column 4: Category of the products (text)
        Category: product.Category || '',
        
        // Column 5: Density (numeric value with units)
        Density: product.Density || '',
        
        // Column 6: Product name/identifier (text)
        Product: product.Product || product.ProductName || '',
        
        // Column 7: Available colors (comma-separated list)
        Colors: product.Colors || '',
        
        // Column 8: Standard Available Weight (numeric value with units)
        StandardWeight: typeof product.StandardWeight === 'number' ? product.StandardWeight : parseFloat(product.StandardWeight) || 0,
        
        // Column 9: Rate/price (numeric value)
        Rate: typeof product.Rate === 'number' ? product.Rate : parseFloat(product.Rate) || 0,
        
        // Column 10: Bundled sales indicator (boolean flag for kg-based bundled sales)
        BundledSalesKG: parseBooleanField(product.BundledSalesKG || product.CanBeSoldInKG || product['Can Be Sold In KG']),
        
        // Keep metadata
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
        schemaVersion: '1.0'
      };
      
      // Update the document
      batch.update(doc.ref, migratedProduct);
      migratedCount++;
    });
    
    // Commit the batch update
    console.log('💾 Committing migration changes...');
    await batch.commit();
    
    console.log(`✅ Successfully migrated ${migratedCount} products to new 10-column structure`);
    
    // Log the new structure
    console.log('\n📋 New Product Schema:');
    console.log('1. Length: number (Length of the product)');
    console.log('2. PriceListName: string (Name of the pricelist)');
    console.log('3. Currency: string (3-letter currency code)');
    console.log('4. Category: string (Category of the products)');
    console.log('5. Density: string (Density with units)');
    console.log('6. Product: string (Product name/identifier)');
    console.log('7. Colors: string (Available colors, comma-separated)');
    console.log('8. StandardWeight: number (Standard Available Weight with units)');
    console.log('9. Rate: number (Rate/price)');
    console.log('10. BundledSalesKG: boolean (Bundled sales indicator for kg-based sales)');
    
    return migratedCount;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Helper function to parse boolean fields
function parseBooleanField(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1' || lowerValue === 'y';
  }
  return Boolean(value);
}

// Validation function to check schema compliance
async function validateSchemaCompliance() {
  try {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      console.error('❌ Firebase not available for validation');
      return false;
    }

    const db = firebase.firestore();
    const productsSnapshot = await db.collection('products').limit(5).get();
    
    if (productsSnapshot.empty) {
      console.log('📭 No products to validate');
      return true;
    }

    console.log('🔍 Validating schema compliance...');
    let compliantCount = 0;
    let totalCount = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      totalCount++;
      
      const requiredFields = [
        'Length', 'PriceListName', 'Currency', 'Category', 'Density',
        'Product', 'Colors', 'StandardWeight', 'Rate', 'BundledSalesKG'
      ];
      
      const hasAllFields = requiredFields.every(field => product.hasOwnProperty(field));
      const hasCorrectTypes = 
        typeof product.Length === 'number' &&
        typeof product.PriceListName === 'string' &&
        typeof product.Currency === 'string' &&
        typeof product.Category === 'string' &&
        typeof product.Product === 'string' &&
        typeof product.Colors === 'string' &&
        typeof product.StandardWeight === 'number' &&
        typeof product.Rate === 'number' &&
        typeof product.BundledSalesKG === 'boolean';
      
      if (hasAllFields && hasCorrectTypes) {
        compliantCount++;
      } else {
        console.log(`⚠️  Product ${doc.id} not compliant:`, {
          hasAllFields,
          hasCorrectTypes,
          missingFields: requiredFields.filter(field => !product.hasOwnProperty(field))
        });
      }
    });
    
    const complianceRate = (compliantCount / totalCount) * 100;
    console.log(`📊 Schema compliance: ${compliantCount}/${totalCount} (${complianceRate.toFixed(1)}%)`);
    
    return complianceRate === 100;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

// Export functions for use
if (typeof window !== 'undefined') {
  window.migrateFirebaseSchema = migrateFirebaseSchema;
  window.validateSchemaCompliance = validateSchemaCompliance;
}

// Auto-run migration if called directly
if (typeof window !== 'undefined' && window.location) {
  console.log('🔧 Firebase Schema Migration Tool loaded');
  console.log('📝 Usage:');
  console.log('  - migrateFirebaseSchema() - Migrate existing data');
  console.log('  - validateSchemaCompliance() - Validate current schema');
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    migrateFirebaseSchema,
    validateSchemaCompliance,
    parseBooleanField
  };
}