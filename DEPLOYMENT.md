# Deployment Guide

This guide covers the automated deployment process for the Indian Natural Hair Price List Generator application.

## Overview

The deployment process automatically:
1. Validates Google Sheets data sources
2. Synchronizes data from Google Sheets to Firebase
3. Validates data integrity and formatting
4. Commits changes to Git
5. Deploys to Firebase hosting

## Prerequisites

- Node.js (>=14.0.0)
- Firebase CLI installed and authenticated
- Git repository configured
- Google Sheets API credentials configured
- Firebase project set up with Firestore database

## Data Source Requirements

### Google Sheets Structure
The Google Sheets should contain product data with these required columns:
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
Runs the complete deployment process with Google Sheets sync, Firebase update, Git commit, and Firebase hosting deployment.

### Data Sync Only
```bash
npm run sync-data
```
Synchronizes data from Google Sheets to Firebase without deploying.

### Validate Sources
```bash
npm run validate-sources
```
Validates Google Sheets connectivity and data structure without syncing.

### Quick Deploy
```bash
npm run deploy-quick
```
Validates data sources first, then runs full deployment.

## Deployment Process Details

### 1. Data Source Validation
- Checks Google Sheets API connectivity
- Validates Firebase Firestore access
- Verifies sheet structure and permissions
- Confirms required headers are present

### 2. Data Synchronization
- Reads data from Google Sheets
- Processes main sheet for product data
- Processes salesmen sheet if available
- Validates data integrity
- Syncs to Firebase Firestore collections

### 3. Firebase Data Structure
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
  "source": "Google Sheets",
  "totalProducts": 1250
}
```

### 4. Error Handling

The deployment process includes comprehensive error handling for:

#### Data Source Issues:
- Google Sheets API connection failures
- Firebase authentication errors
- Missing or inaccessible sheets
- Permission denied errors
- Network connectivity issues

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
- Firestore permission issues
- Network connectivity problems

### 5. Backup System

Before any changes:
- Firebase Firestore maintains automatic backups
- Git history provides version control
- Firebase hosting maintains deployment history
- Local JSON backups are created during sync

## Troubleshooting

### Common Issues

#### "Google Sheets API connection failed"
- Verify API credentials are configured correctly
- Check Google Sheets permissions
- Ensure service account has access to the sheets

#### "Missing required headers"
- Verify Google Sheets has Category, Product, and Rate columns
- Check for typos in header names
- Ensure headers are in the first row

#### "No valid products found"
- Check that data rows have values in required columns
- Remove empty rows from Google Sheets
- Verify data format (numbers for Rate, etc.)

#### "Firebase authentication failed"
- Ensure Firebase CLI is authenticated: `firebase login`
- Check project configuration: `firebase projects:list`
- Verify Firestore security rules allow write access

#### "Data sync failed"
- Check Firebase project configuration
- Verify Firestore database exists
- Ensure network connectivity

### Manual Recovery

If deployment fails:

1. **Check Firebase data:**
   ```bash
   npm run check-firebase-data
   ```

2. **Re-sync from Google Sheets:**
   ```bash
   npm run sync-data
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
- 🔄 Sync progress indicators

### Post-Deployment Verification

After deployment, verify:
1. **Application loads:** Visit the Firebase hosting URL
2. **Data populated:** Check price lists and salesmen dropdowns load from Firebase
3. **Functionality works:** Test quote generation and calculations
4. **No console errors:** Check browser developer tools
5. **Firebase data:** Verify Firestore collections are updated

## Best Practices

1. **Always validate before deploying:**
   ```bash
   npm run validate-sources
   ```

2. **Test data sync first:**
   ```bash
   npm run sync-data
   ```

3. **Keep Google Sheets updated:**
   - Use consistent formatting
   - Avoid empty rows
   - Maintain required columns
   - Ensure proper permissions

4. **Monitor deployments:**
   - Check deployment logs
   - Verify Firebase data sync
   - Test critical features
   - Monitor Firestore usage

5. **Backup important data:**
   - Monitor Firebase backups
   - Maintain Google Sheets backups
   - Keep Git history updated

## Support

For deployment issues:
1. Check this documentation
2. Review error logs
3. Verify Google Sheets access and format
4. Check Firebase configuration
5. Contact development team

---

**Last Updated:** January 2024  
**Version:** 1.0.0