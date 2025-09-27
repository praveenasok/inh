/**
 * Comprehensive Data Synchronization Service
 * Provides advanced data comparison, missing data detection, and synchronization
 * across Firebase, Google Sheets, and Local Storage
 */

class ComprehensiveDataSyncService {
    constructor() {
        this.dataSources = {
            firebase: new FirebaseDataSource(),
            sheets: new GoogleSheetsDataSource(),
            local: new LocalStorageDataSource()
        };
        
        this.collections = ['products', 'clients', 'colors', 'salespeople', 'styles'];
        this.syncResults = {};
        this.comparisonResults = {};
        this.missingDataReport = {};
        
        this.eventListeners = [];
    }

    // Event handling
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // Main synchronization workflow
    async performComprehensiveSync() {
        try {
            this.emit('syncStarted', { message: 'Starting comprehensive synchronization...' });
            
            // Step 1: Analyze all data sources
            this.emit('progress', { step: 1, total: 6, message: 'Analyzing data sources...' });
            const analysisResults = await this.analyzeAllDataSources();
            
            // Step 2: Compare data across sources
            this.emit('progress', { step: 2, total: 6, message: 'Comparing data sources...' });
            const comparisonResults = await this.compareDataSources(analysisResults);
            
            // Step 3: Identify missing data
            this.emit('progress', { step: 3, total: 6, message: 'Identifying missing data...' });
            const missingData = await this.identifyMissingData(comparisonResults);
            
            // Step 4: Create synchronization plan
            this.emit('progress', { step: 4, total: 6, message: 'Creating synchronization plan...' });
            const syncPlan = await this.createSynchronizationPlan(missingData);
            
            // Step 5: Execute synchronization
            this.emit('progress', { step: 5, total: 6, message: 'Executing synchronization...' });
            const syncResults = await this.executeSynchronization(syncPlan);
            
            // Step 6: Verify and generate report
            this.emit('progress', { step: 6, total: 6, message: 'Verifying synchronization...' });
            const verificationResults = await this.verifySynchronization();
            
            this.emit('syncCompleted', {
                analysis: analysisResults,
                comparison: comparisonResults,
                missing: missingData,
                sync: syncResults,
                verification: verificationResults
            });
            
            return {
                success: true,
                results: {
                    analysis: analysisResults,
                    comparison: comparisonResults,
                    missing: missingData,
                    sync: syncResults,
                    verification: verificationResults
                }
            };
            
        } catch (error) {
            this.emit('syncError', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    // Analyze all data sources
    async analyzeAllDataSources() {
        const results = {};
        
        for (const [sourceName, source] of Object.entries(this.dataSources)) {
            try {
                this.emit('log', { message: `Analyzing ${sourceName}...`, type: 'info' });
                results[sourceName] = await source.analyzeData(this.collections);
                this.emit('log', { 
                    message: `${sourceName} analysis complete: ${Object.values(results[sourceName]).reduce((sum, arr) => sum + arr.length, 0)} total records`, 
                    type: 'success' 
                });
            } catch (error) {
                this.emit('log', { message: `${sourceName} analysis failed: ${error.message}`, type: 'error' });
                results[sourceName] = {};
            }
        }
        
        return results;
    }

    // Compare data across sources
    async compareDataSources(analysisResults) {
        const comparison = {};
        
        for (const collection of this.collections) {
            comparison[collection] = {};
            
            for (const [sourceName, sourceData] of Object.entries(analysisResults)) {
                const collectionData = sourceData[collection] || [];
                comparison[collection][sourceName] = {
                    count: collectionData.length,
                    data: collectionData,
                    uniqueIds: this.extractUniqueIds(collectionData),
                    duplicates: this.findDuplicates(collectionData)
                };
            }
            
            // Cross-source comparison
            comparison[collection].crossSourceAnalysis = this.performCrossSourceAnalysis(comparison[collection]);
        }
        
        this.comparisonResults = comparison;
        return comparison;
    }

    // Extract unique identifiers from data
    extractUniqueIds(data) {
        const ids = new Set();
        data.forEach(item => {
            // Try different ID fields
            const id = item.id || item._id || item.key || item.name || item.title;
            if (id) ids.add(id);
        });
        return Array.from(ids);
    }

    // Find duplicates within a dataset
    findDuplicates(data) {
        const seen = new Map();
        const duplicates = [];
        
        data.forEach((item, index) => {
            const id = item.id || item._id || item.key || item.name || item.title;
            if (id) {
                if (seen.has(id)) {
                    duplicates.push({
                        id,
                        indices: [seen.get(id), index],
                        items: [data[seen.get(id)], item]
                    });
                } else {
                    seen.set(id, index);
                }
            }
        });
        
        return duplicates;
    }

    // Perform cross-source analysis
    performCrossSourceAnalysis(collectionComparison) {
        const sources = Object.keys(collectionComparison).filter(key => key !== 'crossSourceAnalysis');
        const allIds = new Set();
        const sourceIds = {};
        
        // Collect all unique IDs from all sources
        sources.forEach(source => {
            sourceIds[source] = new Set(collectionComparison[source].uniqueIds);
            collectionComparison[source].uniqueIds.forEach(id => allIds.add(id));
        });
        
        // Find missing IDs in each source
        const missingInSources = {};
        sources.forEach(source => {
            missingInSources[source] = Array.from(allIds).filter(id => !sourceIds[source].has(id));
        });
        
        // Find common IDs across all sources
        const commonIds = Array.from(allIds).filter(id => 
            sources.every(source => sourceIds[source].has(id))
        );
        
        return {
            totalUniqueIds: allIds.size,
            commonIds: commonIds,
            missingInSources: missingInSources,
            sourceSpecificCounts: Object.fromEntries(
                sources.map(source => [source, sourceIds[source].size])
            )
        };
    }

    // Identify missing data
    async identifyMissingData(comparisonResults) {
        const missingData = {};
        
        for (const [collection, comparison] of Object.entries(comparisonResults)) {
            missingData[collection] = {
                summary: comparison.crossSourceAnalysis,
                details: {}
            };
            
            // Detailed missing data analysis
            const sources = Object.keys(comparison).filter(key => key !== 'crossSourceAnalysis');
            
            sources.forEach(source => {
                missingData[collection].details[source] = {
                    missingIds: comparison.crossSourceAnalysis.missingInSources[source],
                    missingCount: comparison.crossSourceAnalysis.missingInSources[source].length,
                    duplicateCount: comparison[source].duplicates.length,
                    totalRecords: comparison[source].count
                };
            });
        }
        
        this.missingDataReport = missingData;
        return missingData;
    }

    // Create synchronization plan
    async createSynchronizationPlan(missingData) {
        const plan = {
            operations: [],
            priority: [],
            conflicts: [],
            backupRequired: false
        };
        
        for (const [collection, data] of Object.entries(missingData)) {
            const sources = Object.keys(data.details);
            
            // Determine the most complete source
            let mostCompleteSource = sources.reduce((best, current) => {
                const bestCount = data.details[best]?.totalRecords || 0;
                const currentCount = data.details[current]?.totalRecords || 0;
                return currentCount > bestCount ? current : best;
            });
            
            // Plan operations for each source
            sources.forEach(targetSource => {
                if (targetSource !== mostCompleteSource) {
                    const missingCount = data.details[targetSource].missingCount;
                    if (missingCount > 0) {
                        plan.operations.push({
                            type: 'sync',
                            collection,
                            from: mostCompleteSource,
                            to: targetSource,
                            recordCount: missingCount,
                            priority: this.calculatePriority(collection, missingCount)
                        });
                    }
                }
                
                // Plan duplicate removal
                const duplicateCount = data.details[targetSource].duplicateCount;
                if (duplicateCount > 0) {
                    plan.operations.push({
                        type: 'deduplicate',
                        collection,
                        source: targetSource,
                        duplicateCount,
                        priority: 'medium'
                    });
                }
            });
        }
        
        // Sort operations by priority
        plan.operations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        // Determine if backup is required
        plan.backupRequired = plan.operations.some(op => op.recordCount > 10);
        
        return plan;
    }

    // Calculate operation priority
    calculatePriority(collection, recordCount) {
        if (collection === 'products' || collection === 'clients') {
            return recordCount > 5 ? 'high' : 'medium';
        }
        return recordCount > 10 ? 'medium' : 'low';
    }

    // Execute synchronization plan
    async executeSynchronization(plan) {
        const results = {
            operations: [],
            errors: [],
            backupCreated: false
        };
        
        try {
            // Create backup if required
            if (plan.backupRequired) {
                await this.createBackup();
                results.backupCreated = true;
                this.emit('log', { message: 'Data backup created successfully', type: 'success' });
            }
            
            // Execute operations
            for (let i = 0; i < plan.operations.length; i++) {
                const operation = plan.operations[i];
                this.emit('progress', { 
                    step: i + 1, 
                    total: plan.operations.length, 
                    message: `Executing ${operation.type} for ${operation.collection}...` 
                });
                
                try {
                    const result = await this.executeOperation(operation);
                    results.operations.push({
                        operation,
                        result,
                        success: true
                    });
                    
                    this.emit('log', { 
                        message: `${operation.type} completed for ${operation.collection}: ${result.recordsProcessed} records`, 
                        type: 'success' 
                    });
                    
                } catch (error) {
                    results.errors.push({
                        operation,
                        error: error.message
                    });
                    
                    this.emit('log', { 
                        message: `${operation.type} failed for ${operation.collection}: ${error.message}`, 
                        type: 'error' 
                    });
                }
            }
            
        } catch (error) {
            this.emit('log', { message: `Synchronization execution failed: ${error.message}`, type: 'error' });
            throw error;
        }
        
        return results;
    }

    // Execute individual operation
    async executeOperation(operation) {
        switch (operation.type) {
            case 'sync':
                return await this.syncData(operation);
            case 'deduplicate':
                return await this.deduplicateData(operation);
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    // Sync data between sources
    async syncData(operation) {
        const sourceData = await this.dataSources[operation.from].getData(operation.collection);
        const targetMissingIds = this.missingDataReport[operation.collection].details[operation.to].missingIds;
        
        // Filter source data to only include missing records
        const dataToSync = sourceData.filter(item => {
            const id = item.id || item._id || item.key || item.name || item.title;
            return targetMissingIds.includes(id);
        });
        
        // Write data to target source
        const result = await this.dataSources[operation.to].writeData(operation.collection, dataToSync);
        
        return {
            recordsProcessed: dataToSync.length,
            details: result
        };
    }

    // Remove duplicates from data
    async deduplicateData(operation) {
        const sourceData = await this.dataSources[operation.source].getData(operation.collection);
        const duplicates = this.comparisonResults[operation.collection][operation.source].duplicates;
        
        // Remove duplicates (keep first occurrence)
        const uniqueData = sourceData.filter((item, index) => {
            return !duplicates.some(dup => dup.indices.slice(1).includes(index));
        });
        
        // Write deduplicated data back
        const result = await this.dataSources[operation.source].replaceData(operation.collection, uniqueData);
        
        return {
            recordsProcessed: sourceData.length - uniqueData.length,
            details: result
        };
    }

    // Create data backup
    async createBackup() {
        const timestamp = new Date().toISOString();
        const backup = {};
        
        for (const [sourceName, source] of Object.entries(this.dataSources)) {
            try {
                backup[sourceName] = await source.getAllData();
            } catch (error) {
                this.emit('log', { message: `Backup failed for ${sourceName}: ${error.message}`, type: 'warning' });
            }
        }
        
        // Store backup in local storage
        localStorage.setItem(`dataBackup_${timestamp}`, JSON.stringify({
            timestamp,
            data: backup
        }));
        
        return timestamp;
    }

    // Verify synchronization
    async verifySynchronization() {
        this.emit('log', { message: 'Verifying synchronization results...', type: 'info' });
        
        // Re-analyze data after synchronization
        const postSyncAnalysis = await this.analyzeAllDataSources();
        const verification = {};
        
        for (const collection of this.collections) {
            const counts = {};
            let maxCount = 0;
            let minCount = Infinity;
            
            for (const [sourceName, sourceData] of Object.entries(postSyncAnalysis)) {
                const count = sourceData[collection]?.length || 0;
                counts[sourceName] = count;
                maxCount = Math.max(maxCount, count);
                minCount = Math.min(minCount, count);
            }
            
            verification[collection] = {
                counts,
                synchronized: maxCount === minCount && maxCount > 0,
                variance: maxCount - minCount,
                status: maxCount === minCount ? 'synced' : 'partial'
            };
        }
        
        return verification;
    }

    // Generate comprehensive report
    generateSyncReport(syncResults) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalOperations: syncResults.results.sync.operations.length,
                successfulOperations: syncResults.results.sync.operations.filter(op => op.success).length,
                errors: syncResults.results.sync.errors.length,
                backupCreated: syncResults.results.sync.backupCreated
            },
            collections: {},
            recommendations: []
        };
        
        // Collection-specific reports
        for (const collection of this.collections) {
            const verification = syncResults.results.verification[collection];
            report.collections[collection] = {
                status: verification.status,
                counts: verification.counts,
                synchronized: verification.synchronized,
                variance: verification.variance
            };
            
            // Add recommendations
            if (!verification.synchronized) {
                report.recommendations.push({
                    type: 'warning',
                    collection,
                    message: `${collection} is not fully synchronized. Manual review may be required.`
                });
            }
        }
        
        return report;
    }
}

// Data source implementations
class FirebaseDataSource {
    async analyzeData(collections) {
        const data = {};
        
        if (!window.firebase || window.firebase.apps.length === 0) {
            throw new Error('Firebase not available');
        }
        
        const db = window.firebase.firestore();
        
        for (const collection of collections) {
            try {
                const snapshot = await db.collection(collection).get();
                data[collection] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.warn(`Firebase collection ${collection} error:`, error);
                data[collection] = [];
            }
        }
        
        return data;
    }
    
    async getData(collection) {
        const db = window.firebase.firestore();
        const snapshot = await db.collection(collection).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    async writeData(collection, data) {
        const db = window.firebase.firestore();
        const batch = db.batch();
        
        data.forEach(item => {
            const docRef = db.collection(collection).doc();
            batch.set(docRef, item);
        });
        
        await batch.commit();
        return { written: data.length };
    }
    
    async replaceData(collection, data) {
        const db = window.firebase.firestore();
        
        // Delete existing data
        const existingSnapshot = await db.collection(collection).get();
        const deleteBatch = db.batch();
        existingSnapshot.docs.forEach(doc => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        
        // Write new data
        return await this.writeData(collection, data);
    }
    
    async getAllData() {
        const data = {};
        const collections = ['products', 'clients', 'colors', 'salespeople', 'styles'];
        
        for (const collection of collections) {
            try {
                data[collection] = await this.getData(collection);
            } catch (error) {
                data[collection] = [];
            }
        }
        
        return data;
    }
}

class GoogleSheetsDataSource {
    async analyzeData(collections) {
        // For now, return empty data since Google Sheets API is not configured
        // In a real implementation, this would fetch from Google Sheets API
        const data = {};
        collections.forEach(collection => {
            data[collection] = [];
        });
        return data;
    }
    
    async getData(collection) {
        return [];
    }
    
    async writeData(collection, data) {
        // Placeholder for Google Sheets write operation
        return { written: 0, message: 'Google Sheets API not configured' };
    }
    
    async replaceData(collection, data) {
        return await this.writeData(collection, data);
    }
    
    async getAllData() {
        return {};
    }
}

class LocalStorageDataSource {
    async analyzeData(collections) {
        const data = {};
        
        collections.forEach(collection => {
            try {
                const stored = localStorage.getItem(collection);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    data[collection] = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    data[collection] = [];
                }
            } catch (error) {
                console.warn(`Local storage collection ${collection} error:`, error);
                data[collection] = [];
            }
        });
        
        return data;
    }
    
    async getData(collection) {
        const stored = localStorage.getItem(collection);
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [parsed];
        }
        return [];
    }
    
    async writeData(collection, data) {
        const existing = await this.getData(collection);
        const combined = [...existing, ...data];
        localStorage.setItem(collection, JSON.stringify(combined));
        return { written: data.length };
    }
    
    async replaceData(collection, data) {
        localStorage.setItem(collection, JSON.stringify(data));
        return { replaced: data.length };
    }
    
    async getAllData() {
        const data = {};
        const collections = ['products', 'clients', 'colors', 'salespeople', 'styles'];
        
        for (const collection of collections) {
            data[collection] = await this.getData(collection);
        }
        
        return data;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ComprehensiveDataSyncService = ComprehensiveDataSyncService;
}