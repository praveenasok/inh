# Google Sheets Data Structure

## Data Source Configuration
**Primary Data Source**: Google Sheets integrated with Firebase Firestore
**Backup Storage**: Firebase Firestore collections

## Sheet Structure

### Products Sheet (pricelists)
**Sheet URL**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=1700468671#gid=1700468671`

Required columns:
- **Category** - Product category (e.g., "DIY", "Weaves")
- **Product** - Product name
- **Rate** - Product price (numeric)

Optional columns:
- Density, Length, Colors, Standard Weight, Can Be Sold in KG?, PriceList

### Salesmen Sheet
**Sheet URL**: `https://docs.google.com/spreadsheets/d/1hlfrnZnNQ0u8idg5KDmkSY4zFhLyvjLqUwAZn6HmW3s/edit?gid=455801916#gid=455801916`

Column A: Salesman names (one per row)

### Clients Sheet
Column structure for client management:
- Client ID, Client Name, Company Name, Phone 1, Phone 2, Contact Person, Email, Address, Postal Code, TAX ID, Salesperson

### Colors Sheet
Available color options for products

### Styles Sheet
Available style options for products

## Example Structure
```
Category | Product | Rate | Density | Length | Colors
DIY      | Bun20   | 300  | DD      | 4      | All Colors
Weaves   | 12"     | 450  | SD      | 12     | Natural
```

## Firebase Integration
- **Real-time Sync**: Data automatically synchronized from Google Sheets to Firebase Firestore
- **Collections**: products, salesmen, clients, colors, styles
- **Offline Support**: Firebase provides offline data access
- **Backup**: Automatic Firebase backups ensure data persistence

## Validation Rules
1. Google Sheets must be accessible via API
2. Must contain at least header row + 1 data row
3. Required columns must be present
4. Rate column must contain numeric values
5. No completely empty rows
6. Firebase authentication must be valid
7. Firestore security rules must allow read/write access

## Data Synchronization
- **Manual Sync**: Use admin panel "Sync Data" button
- **Automatic Sync**: Scheduled synchronization via Firebase Functions
- **Validation**: Data integrity checks during sync process
- **Error Handling**: Comprehensive error reporting and recovery
