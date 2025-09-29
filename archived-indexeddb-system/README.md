# Archived IndexedDB System

This directory contains the IndexedDB-based synchronization system that was replaced with a simplified Google Sheets → Firebase → Local Storage approach.

## Archived Files

### Core IndexedDB Components
- `indexeddb-manager.js` - Core IndexedDB management system
- `indexeddb-dropdown-manager.js` - IndexedDB-based dropdown management
- `dropdown-manager-migration.js` - Migration utilities from localStorage to IndexedDB

### Sync System Components
- `server-to-indexeddb-sync.js` - Server API to IndexedDB synchronization
- `sheets-to-indexeddb-sync.js` - Google Sheets to IndexedDB synchronization
- `indexeddb-to-sheets-sync.js` - IndexedDB to Google Sheets synchronization
- `bidirectional-sync-coordinator.js` - Orchestrates bidirectional sync
- `sync-system-init.js` - Entry point for the sync system
- `sync-system-integration.js` - Integration utilities
- `sync-system-tests.js` - Test suite for IndexedDB functionality

### Diagnostic and Demo Tools
- `indexeddb-diagnostic.html` - IndexedDB diagnostic tool
- `data-integrity-diagnostic.html` - Data integrity diagnostic
- `debug-sync-test.html` - Debug sync testing interface
- `sync-diagnostic-tool.html` - General sync diagnostics
- `sync-system-demo.html` - Demo of the sync system
- `test-server-sync.html` - Server-to-IndexedDB sync tests
- `google-sheets-to-indexeddb-sync-guide.html` - Documentation guide

## Current System

The application now uses a simplified approach:
- **Google Sheets** ↔ **Firebase** ↔ **Local Storage**
- Managed by `LocalFallbackManager` and `UnifiedDataAccess`
- Real-time synchronization via `BidirectionalSyncService`
- Client-side sync via `ClientSyncManager`

## Restoration

If you need to restore the IndexedDB system, move these files back to their original locations:
- JavaScript files go to `/js/` directory
- HTML files go to the root directory