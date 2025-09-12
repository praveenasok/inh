#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const HOOKS_DIR = path.join(__dirname, '.githooks');
const GIT_HOOKS_DIR = path.join(__dirname, '.git', 'hooks');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Logging utility
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Setup Git hooks
function setupGitHooks() {
  log('Setting up Git hooks...');
  
  // Ensure .git/hooks directory exists
  if (!fs.existsSync(GIT_HOOKS_DIR)) {
    fs.mkdirSync(GIT_HOOKS_DIR, { recursive: true });
  }
  
  // Copy pre-commit hook
  const sourceHook = path.join(HOOKS_DIR, 'pre-commit');
  const targetHook = path.join(GIT_HOOKS_DIR, 'pre-commit');
  
  if (fs.existsSync(sourceHook)) {
    fs.copyFileSync(sourceHook, targetHook);
    
    // Make executable
    try {
      execSync(`chmod +x "${targetHook}"`);
      log('Pre-commit hook installed successfully', 'success');
    } catch (error) {
      log(`Failed to make hook executable: ${error.message}`, 'error');
    }
  } else {
    log('Pre-commit hook source not found', 'error');
  }
}

// Create necessary directories
function createDirectories() {
  log('Creating necessary directories...');
  
  const directories = [
    BACKUP_DIR,
    path.join(__dirname, 'PriceLists')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${path.relative(__dirname, dir)}`);
    } else {
      log(`Directory exists: ${path.relative(__dirname, dir)}`);
    }
  });
}

// Validate environment
function validateEnvironment() {
  log('Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    log(`Node.js version ${nodeVersion} is too old. Requires >= 14.0.0`, 'error');
    return false;
  }
  
  log(`Node.js version: ${nodeVersion} ✓`);
  
  // Check if Git is available
  try {
    execSync('git --version', { stdio: 'pipe' });
    log('Git is available ✓');
  } catch {
    log('Git is not available or not in PATH', 'error');
    return false;
  }
  
  // Check if Firebase CLI is available
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    log('Firebase CLI is available ✓');
  } catch {
    log('Firebase CLI is not available. Install with: npm install -g firebase-tools', 'error');
    return false;
  }
  
  // Check if Excel file exists
  const excelPath = path.join(__dirname, 'PriceLists', 'productData.xlsx');
  if (fs.existsSync(excelPath)) {
    log('Excel file found ✓');
  } else {
    log('Excel file not found. Please add PriceLists/productData.xlsx', 'error');
    return false;
  }
  
  return true;
}

// Create sample Excel file structure documentation
function createDocumentation() {
  log('Creating documentation...');
  
  const excelStructureDoc = `# Excel File Structure

## Required File Location
\`PriceLists/productData.xlsx\`

## Sheet Structure

### Main Sheet (Sheet1)
Required columns:
- **Category** - Product category (e.g., "DIY", "Weaves")
- **Product** - Product name
- **Rate** - Product price (numeric)

Optional columns:
- Density, Length, Colors, Standard Weight, Can Be Sold in KG?, PriceList

### Salesmen Sheet (Optional)
Sheet name: "salesmen"
Column A: Salesman names (one per row)

## Example Structure
\`\`\`
Category | Product | Rate | Density | Length | Colors
DIY      | Bun20   | 300  | DD      | 4      | All Colors
Weaves   | 12"     | 450  | SD      | 12     | Natural
\`\`\`

## Validation Rules
1. File must exist and not be empty
2. Must contain at least header row + 1 data row
3. Required columns must be present
4. Rate column must contain numeric values
5. No completely empty rows
`;
  
  const docPath = path.join(__dirname, 'EXCEL_STRUCTURE.md');
  fs.writeFileSync(docPath, excelStructureDoc, 'utf8');
  log('Excel structure documentation created');
}

// Main setup function
function setup() {
  const startTime = Date.now();
  
  try {
    log('🚀 Setting up deployment environment...');
    
    // Step 1: Validate environment
    if (!validateEnvironment()) {
      log('Environment validation failed. Please fix the issues above.', 'error');
      process.exit(1);
    }
    
    // Step 2: Create directories
    createDirectories();
    
    // Step 3: Setup Git hooks
    setupGitHooks();
    
    // Step 4: Create documentation
    createDocumentation();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`🎉 Setup completed successfully in ${duration}s`, 'success');
    
    // Summary
    console.log('\n📋 Setup Summary:');
    console.log('   • Git hooks installed');
    console.log('   • Backup directory created');
    console.log('   • Documentation generated');
    console.log('   • Environment validated');
    console.log('\n🚀 Ready for deployment!');
    console.log('\nNext steps:');
    console.log('   1. Ensure PriceLists/productData.xlsx is properly formatted');
    console.log('   2. Run: npm run validate-excel');
    console.log('   3. Run: npm run deploy');
    
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setup();
}

module.exports = { setup, validateEnvironment, setupGitHooks };