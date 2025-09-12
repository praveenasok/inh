# Deployment Guide

This guide covers the automated deployment process for the Indian Natural Hair Price List Generator application.

## Overview

The deployment process automatically:
1. Validates the Excel file (`PriceLists/productData.xlsx`)
2. Converts Excel data to JSON format
3. Validates data integrity and formatting
4. Commits changes to Git
5. Deploys to Firebase hosting

## Prerequisites

- Node.js (>=14.0.0)
- Firebase CLI installed and authenticated
- Git repository configured
- Excel file properly formatted in `PriceLists/productData.xlsx`

## Excel File Requirements

### Main Sheet (Product Data)
The first sheet should contain product data with these required columns:
- **Category** - Product category (e.g., "DIY", "Weaves")
- **Product** - Product name
- **Rate** - Product price

### Optional Columns:
- Density, Length, Colors, Standard Weight, Can Be Sold in KG?, PriceList

### Salesmen Sheet (Optional)
A sheet named "salesmen" with salesman names in the first column.
If not provided, default salesmen will be used.

## Deployment Commands

### Full Deployment
```bash
npm run deploy
```
Runs the complete deployment process with validation, conversion, Git commit, and Firebase deployment.

### Quick Validation
```bash
npm run validate-excel
```
Validates the Excel file without deploying.

### Convert Only
```bash
npm run convert-excel
```
Converts Excel to JSON and displays the result without saving.

### Quick Deploy
```bash
npm run deploy-quick
```
Validates Excel file first, then runs full deployment.

## Deployment Process Details

### 1. Excel File Validation
- Checks if `PriceLists/productData.xlsx` exists
- Validates file size (must not be empty)
- Verifies sheet structure
- Confirms required headers are present

### 2. Data Conversion
- Reads Excel workbook
- Processes main sheet for product data
- Processes salesmen sheet if available
- Validates data integrity
- Creates structured JSON output

### 3. JSON Structure
```json
{
  "products": [
    {
      "Category": "DIY",
      "Product": "Bun20",
      "Rate": 300,
      "Density": "Double Drawn",
      "Length": 4,
      "Colors": "All Colors",
      "Standard Weight": 20,
      "Can Be Sold in KG?": "n",
      "PriceList": "Standard"
    }
  ],
  "salesmen": ["Praveen", "Rupa", "INH", "HW", "Vijay", "Pankaj", "Sunil"],
  "headers": ["Category", "Product", "Rate", ...],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "source": "productData.xlsx",
  "totalProducts": 1250
}
```

### 4. Error Handling

The deployment process includes comprehensive error handling for:

#### Excel File Issues:
- Missing file
- Empty file
- Corrupted file
- Missing required sheets
- Invalid data format

#### Data Validation Issues:
- Missing required headers
- Empty data rows
- Invalid product data
- Malformed entries

#### Git Issues:
- Uncommitted changes
- Push failures
- Authentication problems

#### Firebase Issues:
- Authentication failures
- Deployment errors
- Network issues

### 5. Backup System

Before any changes:
- Existing `data.json` is backed up to `backups/data_backup_[timestamp].json`
- Git history provides version control
- Firebase hosting maintains deployment history

## Troubleshooting

### Common Issues

#### "Excel file not found"
- Ensure `PriceLists/productData.xlsx` exists
- Check file permissions
- Verify file path is correct

#### "Missing required headers"
- Verify Excel file has Category, Product, and Rate columns
- Check for typos in header names
- Ensure headers are in the first row

#### "No valid products found"
- Check that data rows have values in required columns
- Remove empty rows from Excel file
- Verify data format (numbers for Rate, etc.)

#### "Git operations failed"
- Ensure Git is configured with user credentials
- Check for merge conflicts
- Verify remote repository access

#### "Firebase deployment failed"
- Ensure Firebase CLI is authenticated: `firebase login`
- Check project configuration: `firebase projects:list`
- Verify deployment permissions

### Manual Recovery

If deployment fails:

1. **Restore from backup:**
   ```bash
   cp backups/data_backup_[timestamp].json data.json
   ```

2. **Reset Git changes:**
   ```bash
   git checkout -- data.json
   ```

3. **Re-run deployment:**
   ```bash
   npm run deploy
   ```

## Monitoring

### Deployment Logs
The deployment script provides detailed logging:
- ✅ Success indicators
- ❌ Error messages
- ℹ️ Information updates
- 📊 Summary statistics

### Post-Deployment Verification

After deployment, verify:
1. **Application loads:** Visit the Firebase hosting URL
2. **Data populated:** Check price lists and salesmen dropdowns
3. **Functionality works:** Test quote generation and calculations
4. **No console errors:** Check browser developer tools

## Best Practices

1. **Always validate before deploying:**
   ```bash
   npm run validate-excel
   ```

2. **Test locally first:**
   ```bash
   npm run convert-excel
   ```

3. **Keep Excel file updated:**
   - Use consistent formatting
   - Avoid empty rows
   - Maintain required columns

4. **Monitor deployments:**
   - Check deployment logs
   - Verify application functionality
   - Test critical features

5. **Backup important data:**
   - Keep Excel file backups
   - Monitor backup directory
   - Maintain Git history

## Support

For deployment issues:
1. Check this documentation
2. Review error logs
3. Verify Excel file format
4. Test with sample data
5. Contact development team

---

**Last Updated:** January 2024  
**Version:** 1.0.0