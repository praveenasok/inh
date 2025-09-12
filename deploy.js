#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const XLSX = require('xlsx');

// Configuration
const EXCEL_FILE_PATH = path.join(__dirname, 'PriceLists', 'productData.xlsx');
const JSON_FILE_PATH = path.join(__dirname, 'data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Logging utility
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Validate Excel file
function validateExcelFile() {
  log('Validating Excel file...');
  
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    throw new Error(`Excel file not found at: ${EXCEL_FILE_PATH}`);
  }
  
  const stats = fs.statSync(EXCEL_FILE_PATH);
  if (stats.size === 0) {
    throw new Error('Excel file is empty');
  }
  
  log(`Excel file found: ${(stats.size / 1024).toFixed(2)} KB`, 'success');
  return true;
}

// Convert Excel to JSON with validation
function convertExcelToJson() {
  log('Converting Excel to JSON...');
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    
    log(`Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Get the first sheet (main product data)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }
    
    // Parse the data
    const headers = jsonData[0];
    const products = [];
    
    // Validate headers
    const requiredHeaders = ['Category', 'Product', 'Rate'];
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h && h.toString().toLowerCase().includes(header.toLowerCase()))
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
    
    log(`Processing ${jsonData.length - 1} data rows...`);
    
    // Process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const product = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined && row[index] !== null) {
          product[header] = row[index];
        }
      });
      
      // Validate required fields
      if (product.Category && product.Product && product.Rate) {
        products.push(product);
      } else {
        log(`Skipping invalid row ${i + 1}: missing required fields`, 'error');
      }
    }
    
    if (products.length === 0) {
      throw new Error('No valid products found in Excel file');
    }
    
    // Process salesmen data if available
    let salesmen = [];
    if (workbook.SheetNames.includes('salesmen')) {
      log('Processing salesmen data...');
      const salesmenSheet = workbook.Sheets['salesmen'];
      const salesmenData = XLSX.utils.sheet_to_json(salesmenSheet, { header: 1 });
      
      salesmen = salesmenData.slice(1)
        .map(row => row[0])
        .filter(name => name && name.trim())
        .map(name => name.trim());
      
      log(`Found ${salesmen.length} salesmen`);
    } else {
      // Use default salesmen if sheet not found
      salesmen = [
        "Praveen", "Rupa", "INH", "HW", "Vijay", "Pankaj", "Sunil"
      ];
      log('Using default salesmen data');
    }
    
    // Create final JSON structure
    const finalData = {
      products: products,
      salesmen: salesmen,
      headers: headers.filter(h => h),
      lastUpdated: new Date().toISOString(),
      source: 'productData.xlsx',
      totalProducts: products.length
    };
    
    log(`Conversion successful: ${products.length} products, ${salesmen.length} salesmen`, 'success');
    return finalData;
    
  } catch (error) {
    throw new Error(`Excel conversion failed: ${error.message}`);
  }
}

// Backup existing JSON file
function backupExistingJson() {
  if (fs.existsSync(JSON_FILE_PATH)) {
    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, `data_backup_${timestamp}.json`);
    fs.copyFileSync(JSON_FILE_PATH, backupPath);
    log(`Existing JSON backed up to: ${backupPath}`);
  }
}

// Write JSON file
function writeJsonFile(data) {
  log('Writing JSON file...');
  
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(JSON_FILE_PATH, jsonString, 'utf8');
    
    const stats = fs.statSync(JSON_FILE_PATH);
    log(`JSON file written: ${(stats.size / 1024).toFixed(2)} KB`, 'success');
    
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${error.message}`);
  }
}

// Embed data into HTML file for production
function embedDataIntoHTML(data) {
  log('Embedding data into HTML for production...');
  
  const htmlFilePath = path.join(__dirname, 'index.html');
  
  try {
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    
    // Create backup
    const timestamp = Date.now();
    const backupPath = path.join(__dirname, `index_backup_${timestamp}.html`);
    fs.writeFileSync(backupPath, htmlContent, 'utf8');
    log(`HTML backup created: ${backupPath}`);
    
    // Create the embedded data script
    const embeddedDataScript = `<script type="application/json" id="EMBEDDED_DATA">${JSON.stringify(data, null, 2)}</script>`;
    
    // Check if EMBEDDED_DATA script already exists
    const embeddedDataRegex = /<script[^>]*id=["']EMBEDDED_DATA["'][^>]*>[\s\S]*?<\/script>/;
    
    if (embeddedDataRegex.test(htmlContent)) {
      // Replace existing embedded data
      htmlContent = htmlContent.replace(embeddedDataRegex, embeddedDataScript);
      log('Updated existing embedded data');
    } else {
      // Add embedded data script before the closing </head> tag
      const headCloseRegex = /<\/head>/;
      if (headCloseRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(headCloseRegex, `  ${embeddedDataScript}\n</head>`);
        log('Added new embedded data script');
      } else {
        throw new Error('Could not find </head> tag to insert embedded data');
      }
    }
    
    // Write updated HTML
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
    
    const stats = fs.statSync(htmlFilePath);
    log(`HTML file updated: ${(stats.size / 1024).toFixed(2)} KB`, 'success');
    
  } catch (error) {
    throw new Error(`Failed to embed data into HTML: ${error.message}`);
  }
}

// Git operations
function commitChanges() {
  log('Committing changes to Git...');
  
  try {
    // Add files
    execSync('git add .', { stdio: 'inherit' });
    
    // Check if there are changes to commit
    try {
      execSync('git diff --cached --exit-code', { stdio: 'pipe' });
      log('No changes to commit');
      return false;
    } catch {
      // There are changes to commit
    }
    
    // Commit with descriptive message
    const commitMessage = `Update product data from Excel - ${new Date().toISOString()}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // Push to remote
    execSync('git push', { stdio: 'inherit' });
    
    log('Changes committed and pushed successfully', 'success');
    return true;
    
  } catch (error) {
    throw new Error(`Git operations failed: ${error.message}`);
  }
}

// Firebase deployment
function deployToFirebase() {
  log('Deploying to Firebase...');
  
  try {
    execSync('firebase deploy', { stdio: 'inherit' });
    log('Firebase deployment successful', 'success');
    
  } catch (error) {
    throw new Error(`Firebase deployment failed: ${error.message}`);
  }
}

// Main deployment function
async function deploy() {
  const startTime = Date.now();
  
  try {
    log('🚀 Starting deployment process...');
    
    // Step 1: Validate Excel file
    validateExcelFile();
    
    // Step 2: Backup existing JSON
    backupExistingJson();
    
    // Step 3: Convert Excel to JSON
    const jsonData = convertExcelToJson();
    
    // Step 4: Write JSON file
    writeJsonFile(jsonData);
    
    // Step 5: Embed data into HTML for production
    embedDataIntoHTML(jsonData);
    
    // Step 6: Commit changes
    const hasChanges = commitChanges();
    
    // Step 7: Deploy to Firebase
    if (hasChanges) {
      deployToFirebase();
    } else {
      log('Skipping Firebase deployment (no changes)');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`🎉 Deployment completed successfully in ${duration}s`, 'success');
    
    // Summary
    console.log('\n📊 Deployment Summary:');
    console.log(`   • Products: ${jsonData.totalProducts}`);
    console.log(`   • Salesmen: ${jsonData.salesmen.length}`);
    console.log(`   • Source: ${jsonData.source}`);
    console.log(`   • Updated: ${jsonData.lastUpdated}`);
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--convert-only')) {
    // Convert Excel to JSON without Git/Firebase operations
    try {
      log('🔄 Converting Excel to JSON only...');
      validateExcelFile();
      backupExistingJson();
      const jsonData = convertExcelToJson();
      writeJsonFile(jsonData);
      log('✅ Conversion completed successfully', 'success');
    } catch (error) {
      log(`Conversion failed: ${error.message}`, 'error');
      process.exit(1);
    }
  } else {
    // Run full deployment
    deploy();
  }
}

module.exports = { deploy, validateExcelFile, convertExcelToJson, backupExistingJson, writeJsonFile, embedDataIntoHTML };