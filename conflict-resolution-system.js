const { EventEmitter } = require('events');

/**
 * Conflict Resolution System
 * Handles data conflicts between Google Sheets, Firebase, and localStorage
 * with multiple resolution strategies and user intervention capabilities
 */
class ConflictResolutionSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      defaultStrategy: 'timestamp',
      autoResolveThreshold: 5, // Auto-resolve conflicts older than 5 minutes
      maxConflictHistory: 100,
      enableUserIntervention: true,
      ...config
    };
    
    this.pendingConflicts = new Map();
    this.resolvedConflicts = [];
    this.conflictStrategies = {
      'timestamp': this.resolveByTimestamp.bind(this),
      'firebase-priority': this.resolveByFirebasePriority.bind(this),
      'google-sheets-priority': this.resolveByGoogleSheetsPriority.bind(this),
      'manual': this.resolveManually.bind(this),
      'merge': this.resolveByMerging.bind(this),
      'user-choice': this.resolveByUserChoice.bind(this)
    };
  }

  /**
   * Detect conflicts between data sources
   */
  async detectConflicts(googleSheetsData, firebaseData, localStorageData, collection) {
    const conflicts = [];
    const timestamp = Date.now();

    try {
      // Compare Google Sheets vs Firebase
      const gsVsFb = this.compareDataSources(
        googleSheetsData, 
        firebaseData, 
        'google-sheets', 
        'firebase',
        collection
      );
      
      // Compare Firebase vs localStorage
      const fbVsLs = this.compareDataSources(
        firebaseData, 
        localStorageData, 
        'firebase', 
        'localStorage',
        collection
      );
      
      // Compare Google Sheets vs localStorage
      const gsVsLs = this.compareDataSources(
        googleSheetsData, 
        localStorageData, 
        'google-sheets', 
        'localStorage',
        collection
      );

      conflicts.push(...gsVsFb, ...fbVsLs, ...gsVsLs);

      // Process and categorize conflicts
      const processedConflicts = conflicts.map(conflict => ({
        ...conflict,
        id: this.generateConflictId(conflict),
        timestamp,
        collection,
        severity: this.assessConflictSeverity(conflict),
        autoResolvable: this.isAutoResolvable(conflict)
      }));

      // Store pending conflicts
      processedConflicts.forEach(conflict => {
        this.pendingConflicts.set(conflict.id, conflict);
      });

      this.emit('conflicts-detected', {
        conflicts: processedConflicts,
        collection,
        timestamp
      });

      return processedConflicts;
    } catch (error) {
      this.emit('conflict-detection-error', { error: error.message, collection });
      return [];
    }
  }

  /**
   * Compare two data sources and identify conflicts
   */
  compareDataSources(source1Data, source2Data, source1Name, source2Name, collection) {
    const conflicts = [];
    
    if (!source1Data || !source2Data) {
      return conflicts;
    }

    // Convert data to comparable format
    const data1 = this.normalizeData(source1Data, collection);
    const data2 = this.normalizeData(source2Data, collection);

    // Find items that exist in both sources but have different values
    Object.keys(data1).forEach(key => {
      if (data2[key]) {
        const differences = this.findDataDifferences(data1[key], data2[key]);
        if (differences.length > 0) {
          conflicts.push({
            type: 'data-mismatch',
            itemId: key,
            source1: {
              name: source1Name,
              data: data1[key],
              checksum: this.calculateChecksum(data1[key])
            },
            source2: {
              name: source2Name,
              data: data2[key],
              checksum: this.calculateChecksum(data2[key])
            },
            differences,
            conflictFields: differences.map(diff => diff.field)
          });
        }
      }
    });

    // Find items that exist in source1 but not in source2
    Object.keys(data1).forEach(key => {
      if (!data2[key]) {
        conflicts.push({
          type: 'missing-in-source2',
          itemId: key,
          source1: { name: source1Name, data: data1[key] },
          source2: { name: source2Name, data: null }
        });
      }
    });

    // Find items that exist in source2 but not in source1
    Object.keys(data2).forEach(key => {
      if (!data1[key]) {
        conflicts.push({
          type: 'missing-in-source1',
          itemId: key,
          source1: { name: source1Name, data: null },
          source2: { name: source2Name, data: data2[key] }
        });
      }
    });

    return conflicts;
  }

  /**
   * Normalize data for comparison
   */
  normalizeData(data, collection) {
    if (!data) return {};
    
    if (Array.isArray(data)) {
      const normalized = {};
      data.forEach(item => {
        const id = item.id || item.name || item.email || JSON.stringify(item);
        normalized[id] = item;
      });
      return normalized;
    }
    
    return data;
  }

  /**
   * Find differences between two data objects
   */
  findDataDifferences(obj1, obj2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    
    allKeys.forEach(key => {
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];
      
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field: key,
          value1: val1,
          value2: val2,
          type: this.getDifferenceType(val1, val2)
        });
      }
    });
    
    return differences;
  }

  /**
   * Get the type of difference between two values
   */
  getDifferenceType(val1, val2) {
    if (val1 === undefined && val2 !== undefined) return 'added';
    if (val1 !== undefined && val2 === undefined) return 'removed';
    if (typeof val1 !== typeof val2) return 'type-change';
    return 'modified';
  }

  /**
   * Calculate checksum for data
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Generate unique conflict ID
   */
  generateConflictId(conflict) {
    const source = `${conflict.source1?.name}-${conflict.source2?.name}`;
    const item = conflict.itemId || 'unknown';
    const timestamp = Date.now();
    return `conflict-${source}-${item}-${timestamp}`;
  }

  /**
   * Assess conflict severity
   */
  assessConflictSeverity(conflict) {
    if (conflict.type === 'data-mismatch') {
      const criticalFields = ['id', 'email', 'name', 'price', 'status'];
      const hasCriticalConflict = conflict.conflictFields?.some(field => 
        criticalFields.includes(field.toLowerCase())
      );
      return hasCriticalConflict ? 'high' : 'medium';
    }
    
    if (conflict.type.includes('missing')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if conflict can be auto-resolved
   */
  isAutoResolvable(conflict) {
    // Auto-resolve if one source has null/undefined data
    if (!conflict.source1?.data || !conflict.source2?.data) {
      return true;
    }
    
    // Auto-resolve simple field conflicts based on timestamps
    if (conflict.type === 'data-mismatch' && conflict.differences?.length <= 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflicts(conflictIds, strategy = null) {
    const resolvedConflicts = [];
    const resolutionStrategy = strategy || this.config.defaultStrategy;
    
    for (const conflictId of conflictIds) {
      const conflict = this.pendingConflicts.get(conflictId);
      if (!conflict) {
        continue;
      }
      
      try {
        const resolution = await this.resolveConflict(conflict, resolutionStrategy);
        resolvedConflicts.push(resolution);
        
        // Move from pending to resolved
        this.pendingConflicts.delete(conflictId);
        this.resolvedConflicts.push(resolution);
        
        // Limit resolved conflicts history
        if (this.resolvedConflicts.length > this.config.maxConflictHistory) {
          this.resolvedConflicts.shift();
        }
        
      } catch (error) {
        this.emit('conflict-resolution-error', { 
          conflictId, 
          error: error.message 
        });
      }
    }
    
    this.emit('conflicts-resolved', resolvedConflicts);
    return resolvedConflicts;
  }

  /**
   * Resolve a single conflict
   */
  async resolveConflict(conflict, strategy) {
    const resolver = this.conflictStrategies[strategy];
    if (!resolver) {
      throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
    
    const resolution = await resolver(conflict);
    
    return {
      conflictId: conflict.id,
      strategy,
      resolution,
      timestamp: Date.now(),
      originalConflict: conflict
    };
  }

  /**
   * Resolve by timestamp (most recent wins)
   */
  async resolveByTimestamp(conflict) {
    const source1Time = this.extractTimestamp(conflict.source1?.data);
    const source2Time = this.extractTimestamp(conflict.source2?.data);
    
    if (source1Time && source2Time) {
      const winner = source1Time > source2Time ? conflict.source1 : conflict.source2;
      return {
        action: 'use-newer-data',
        winnerSource: winner.name,
        data: winner.data,
        reason: `${winner.name} has more recent timestamp`
      };
    }
    
    // Fallback to Firebase priority if timestamps unavailable
    return this.resolveByFirebasePriority(conflict);
  }

  /**
   * Resolve by Firebase priority
   */
  async resolveByFirebasePriority(conflict) {
    const firebaseSource = conflict.source1?.name === 'firebase' ? 
      conflict.source1 : conflict.source2;
    
    return {
      action: 'use-firebase-data',
      winnerSource: 'firebase',
      data: firebaseSource?.data,
      reason: 'Firebase data takes priority'
    };
  }

  /**
   * Resolve by Google Sheets priority
   */
  async resolveByGoogleSheetsPriority(conflict) {
    const sheetsSource = conflict.source1?.name === 'google-sheets' ? 
      conflict.source1 : conflict.source2;
    
    return {
      action: 'use-google-sheets-data',
      winnerSource: 'google-sheets',
      data: sheetsSource?.data,
      reason: 'Google Sheets data takes priority'
    };
  }

  /**
   * Resolve manually (requires user intervention)
   */
  async resolveManually(conflict) {
    this.emit('manual-resolution-required', conflict);
    
    return {
      action: 'manual-resolution-pending',
      winnerSource: null,
      data: null,
      reason: 'Manual resolution required'
    };
  }

  /**
   * Resolve by merging data
   */
  async resolveByMerging(conflict) {
    const merged = this.mergeConflictingData(
      conflict.source1?.data, 
      conflict.source2?.data
    );
    
    return {
      action: 'merge-data',
      winnerSource: 'merged',
      data: merged,
      reason: 'Data merged from both sources'
    };
  }

  /**
   * Resolve by user choice
   */
  async resolveByUserChoice(conflict) {
    this.emit('user-choice-required', conflict);
    
    return {
      action: 'user-choice-pending',
      winnerSource: null,
      data: null,
      reason: 'Waiting for user choice'
    };
  }

  /**
   * Merge conflicting data intelligently
   */
  mergeConflictingData(data1, data2) {
    if (!data1) return data2;
    if (!data2) return data1;
    
    const merged = { ...data1 };
    
    Object.keys(data2).forEach(key => {
      if (data2[key] !== undefined && data2[key] !== null) {
        // Prefer non-empty values
        if (!data1[key] || data1[key] === '') {
          merged[key] = data2[key];
        }
        // For arrays, merge unique values
        else if (Array.isArray(data1[key]) && Array.isArray(data2[key])) {
          merged[key] = [...new Set([...data1[key], ...data2[key]])];
        }
        // For timestamps, use the more recent one
        else if (key.includes('time') || key.includes('date') || key.includes('updated')) {
          const time1 = new Date(data1[key]).getTime();
          const time2 = new Date(data2[key]).getTime();
          merged[key] = time2 > time1 ? data2[key] : data1[key];
        }
      }
    });
    
    return merged;
  }

  /**
   * Extract timestamp from data
   */
  extractTimestamp(data) {
    if (!data) return null;
    
    const timestampFields = [
      'timestamp', 'lastModified', 'updatedAt', 'updated_at',
      'createdAt', 'created_at', 'lastSync', 'last_sync'
    ];
    
    for (const field of timestampFields) {
      if (data[field]) {
        const time = new Date(data[field]).getTime();
        if (!isNaN(time)) return time;
      }
    }
    
    return null;
  }

  /**
   * Auto-resolve conflicts that meet criteria
   */
  async autoResolveConflicts() {
    const autoResolvableConflicts = Array.from(this.pendingConflicts.values())
      .filter(conflict => conflict.autoResolvable);
    
    if (autoResolvableConflicts.length > 0) {
      const conflictIds = autoResolvableConflicts.map(c => c.id);
      await this.resolveConflicts(conflictIds, this.config.defaultStrategy);
      
      this.emit('auto-resolution-completed', {
        resolvedCount: conflictIds.length,
        strategy: this.config.defaultStrategy
      });
    }
  }

  /**
   * Get conflict statistics
   */
  getConflictStats() {
    const pending = Array.from(this.pendingConflicts.values());
    const resolved = this.resolvedConflicts;
    
    return {
      pending: {
        total: pending.length,
        high: pending.filter(c => c.severity === 'high').length,
        medium: pending.filter(c => c.severity === 'medium').length,
        low: pending.filter(c => c.severity === 'low').length,
        autoResolvable: pending.filter(c => c.autoResolvable).length
      },
      resolved: {
        total: resolved.length,
        last24h: resolved.filter(r => 
          Date.now() - r.timestamp < 24 * 60 * 60 * 1000
        ).length
      }
    };
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts() {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Get resolved conflicts
   */
  getResolvedConflicts(limit = 50) {
    return this.resolvedConflicts
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear resolved conflicts history
   */
  clearResolvedConflicts() {
    this.resolvedConflicts = [];
    this.emit('resolved-conflicts-cleared');
  }

  /**
   * Set user resolution for a conflict
   */
  async setUserResolution(conflictId, chosenSource, customData = null) {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }
    
    const resolution = {
      action: 'user-resolved',
      winnerSource: chosenSource,
      data: customData || (chosenSource === conflict.source1?.name ? 
        conflict.source1?.data : conflict.source2?.data),
      reason: `User chose ${chosenSource}`
    };
    
    const resolvedConflict = {
      conflictId,
      strategy: 'user-choice',
      resolution,
      timestamp: Date.now(),
      originalConflict: conflict
    };
    
    this.pendingConflicts.delete(conflictId);
    this.resolvedConflicts.push(resolvedConflict);
    
    this.emit('user-resolution-applied', resolvedConflict);
    return resolvedConflict;
  }
}

module.exports = ConflictResolutionSystem;