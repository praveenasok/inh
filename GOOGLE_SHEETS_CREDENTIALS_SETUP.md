# Google Sheets Credentials Setup Guide

This guide will help you set up Google Sheets API credentials for the INH Price List Generator synchronization system.

## Overview

The system uses Google Service Account authentication to securely access Google Sheets data. You need to:
1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Generate and download credentials
5. Share your Google Sheets with the service account

## Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `inh-price-list-sync`
4. Click "Create"
5. Wait for project creation and select it

### Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"
5. Wait for API to be enabled

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "Service account"
3. Fill in details   :
   - **Service account name**: `inh-price-list-sync`
   - **Service account ID**: `inh-price-list-sync` (auto-generated)
   - **Description**: `Service account for INH price list synchronization`
4. Click "Create and Continue"
5. For "Grant this service account access to project":
   - Select role: "Editor" (or "Viewer" if you only need read access)
6. Click "Continue" → "Done"

### Step 4: Generate Service Account Key

1. In "Credentials" page, find your service account
2. Click on the service account email
3. Go to "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON" format
6. Click "Create"
7. A JSON file will be downloaded automatically

### Step 5: Configure the Application

1. Rename the downloaded JSON file to `service-account-key.json`
2. Move it to your project root directory (same folder as `server.js`)
3. **IMPORTANT**: Never commit this file to version control!

### Step 6: Share Google Sheets with Service Account

1. Open your Google Sheets document
2. Click "Share" button
3. In the "Add people and groups" field, enter the service account email:
   - Format: `inh-sheets-sync@your-project-id.iam.gserviceaccount.com`
   - You can find this email in the downloaded JSON file under `client_email`
4. Set permission to "Viewer" (or "Editor" if you need write access)
5. Uncheck "Notify people" (service accounts don't need notifications)
6. Click "Share"

### Step 7: Update Sheet Configuration

1. Get your Google Sheets ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part

2. Update the sheet ID in your configuration files if needed:
   - Check `google-sheets-config.js` for `SHEET_ID`
   - Check `sync-scheduler.js` for spreadsheet configuration

## Verification

To verify your setup is working:

1. Restart your server: `node server.js`
2. Check the console for initialization messages
3. Try the manual sync from the admin interface
4. Check for any error messages

## Troubleshooting

### Common Issues

**Error: "Invalid PEM formatted message"**
- The `service-account-key.json` file contains placeholder values
- Download a new key from Google Cloud Console
- Ensure the JSON file is properly formatted

**Error: "The caller does not have permission"**
- The service account email is not shared with your Google Sheets
- Check the sharing settings in your Google Sheets
- Ensure the service account has at least "Viewer" permission

**Error: "Service account key file not found"**
- The `service-account-key.json` file is missing
- Ensure the file is in the project root directory
- Check the file name is exactly `service-account-key.json`

**Error: "Google Sheets API has not been used"**
- The Google Sheets API is not enabled for your project
- Go to Google Cloud Console and enable the API

### Security Best Practices

1. **Never commit credentials to version control**
   - Add `service-account-key.json` to `.gitignore`
   - Use environment variables in production

2. **Limit service account permissions**
   - Only grant necessary permissions
   - Use "Viewer" role if you only need read access

3. **Regularly rotate keys**
   - Generate new keys periodically
   - Delete old keys from Google Cloud Console

4. **Monitor usage**
   - Check Google Cloud Console for API usage
   - Set up alerts for unusual activity

## Production Deployment

For production environments:

1. Store credentials as environment variables
2. Use Google Cloud Secret Manager
3. Implement proper access controls
4. Enable audit logging

## Support

If you encounter issues:

1. Check the server console for detailed error messages
2. Verify all steps in this guide
3. Test with a simple Google Sheets document first
4. Check Google Cloud Console for API quotas and limits

---

**Note**: This setup process may take 5-10 minutes to complete. The credentials will be active immediately after creation.