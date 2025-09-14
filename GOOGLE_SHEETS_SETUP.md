# Google Sheets Synchronization Setup Guide

## Overview

This guide will help you set up secure Google Sheets synchronization for your Indian Natural Hair application. The system will automatically fetch product and salesman data from Google Sheets and sync it with your Firebase database.

## Prerequisites

- Google Cloud Console access
- Firebase project setup
- Google Sheets with product and salesman data

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID for later use

## Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on "Google Sheets API" and click **Enable**

## Step 3: Create Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the details:
   - **Service account name**: `sheets-sync-service`
   - **Service account ID**: `sheets-sync-service`
   - **Description**: `Service account for Google Sheets synchronization`
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

## Step 4: Generate Service Account Key

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create** - this will download the JSON key file

## Step 5: Configure Service Account Credentials

1. Rename the downloaded JSON file to `service-account-key.json`
2. Place it in your project root directory: `/Users/praveenasok/Desktop/inh/inh/`
3. **Important**: Add `service-account-key.json` to your `.gitignore` file to prevent committing credentials

### Alternative: Use Template File

If you prefer to manually create the credentials file:

1. Copy `service-account-key.json.template` to `service-account-key.json`
2. Fill in the values from your downloaded JSON key file

## Step 6: Share Google Sheets with Service Account

1. Open your Google Sheets:
   - **Products Sheet**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=1700468671#gid=1700468671`
   - **Salesmen Sheet**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=455801916#gid=455801916`

2. For each sheet:
   - Click **Share** button
   - Add the service account email (found in your JSON key file as `client_email`)
   - Set permission to **Viewer**
   - Click **Send**

## Step 7: Configure Sheet Structure

### Products Sheet Expected Columns:
- Length
- PriceListName
- Currency
- Category
- Density
- Product
- Colors
- StandardWeight
- Rate
- CanBeSoldInKG

### Salesmen Sheet Expected Columns:
- Name
- Email
- Phone
- Territory
- Commission
- Status

## Step 8: Test the Setup

1. Start your server:
   ```bash
   npm start
   ```

2. Open the admin interface:
   ```
   http://localhost:3000/admin-sync-interface.html
   ```

3. Click **Manual Sync** to test the connection
4. Check the sync logs for any errors

## Step 9: Configure Automated Sync

1. In the admin interface, go to **Sync Management**
2. Click **Start Scheduler** to enable automated sync every 12 hours
3. Monitor the sync status and logs

## Security Best Practices

### Credential Security
- ✅ Never commit `service-account-key.json` to version control
- ✅ Add the file to `.gitignore`
- ✅ Use environment variables in production
- ✅ Regularly rotate service account keys
- ✅ Grant minimal necessary permissions

### Access Control
- ✅ Share sheets with service account only (not public)
- ✅ Use "Viewer" permission for service account
- ✅ Monitor access logs in Google Cloud Console
- ✅ Set up alerts for unusual activity

## Troubleshooting

### Common Issues

**1. "Permission denied" errors**
- Verify service account email is added to Google Sheets
- Check that sheets are shared with correct permissions
- Ensure service account key is valid

**2. "Sheets not found" errors**
- Verify Google Sheets URLs are correct
- Check that sheet IDs match in configuration
- Ensure sheets are accessible

**3. "Authentication failed" errors**
- Verify `service-account-key.json` file exists and is valid
- Check that Google Sheets API is enabled
- Ensure service account has proper permissions

**4. "Data format errors"**
- Verify sheet column headers match expected format
- Check for empty rows or invalid data
- Ensure data types are correct (numbers, text, etc.)

### Debug Steps

1. **Check Server Logs**:
   ```bash
   # View server console for detailed error messages
   ```

2. **Test API Endpoints**:
   ```bash
   # Manual sync
   curl -X POST http://localhost:3000/api/sync/manual
   
   # Check sync status
   curl http://localhost:3000/api/sync/status
   
   # View sync logs
   curl http://localhost:3000/api/sync/logs
   ```

3. **Verify Credentials**:
   ```javascript
   // Check if service account file exists
   const fs = require('fs');
   console.log(fs.existsSync('./service-account-key.json'));
   ```

## Production Deployment

### Environment Variables

For production, use environment variables instead of JSON files:

```bash
# Set environment variables
export GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
export GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
export GOOGLE_PROJECT_ID="your-project-id"
```

### Firebase Functions

For serverless deployment, consider using Firebase Functions:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const { SyncScheduler } = require('./sync-scheduler');

exports.scheduledSync = functions.pubsub.schedule('every 12 hours')
  .onRun(async (context) => {
    const scheduler = new SyncScheduler();
    await scheduler.performSync();
  });
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all setup steps are completed correctly
4. Test with a simple manual sync first

## Next Steps

Once setup is complete:

1. ✅ Test manual synchronization
2. ✅ Enable automated scheduling
3. ✅ Monitor sync logs regularly
4. ✅ Set up backup procedures
5. ✅ Train users on admin interface

Your Google Sheets synchronization system is now ready to automatically keep your product and salesman data up to date!