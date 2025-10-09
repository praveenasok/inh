/* INHDATA: Local-first data layer with bidirectional Firestore sync
 * - IndexedDB-backed local storage for fast, low-latency reads
 * - Two-way synchronization with Firestore
 * - Single source of truth for dropdowns, pricing, and catalog data
 * - Validation, conflict resolution, referential integrity, and metrics
 */

(function(global){
  const DB_NAME = 'INHDATA';
  const DB_VERSION = 2;
  const STORES = ['meta','products','salesmen','colors','styles','company','quotes','syncQueue'];

  // Utility: simple event bus per collection
  const listeners = new Map();
  function emit(collection, payload){
    const list = listeners.get(collection) || [];
    for (const fn of list) {
      try { fn(payload); } catch(_){}
    }
  }
  function on(collection, fn){
    const list = listeners.get(collection) || [];
    list.push(fn);
    listeners.set(collection, list);
    return () => {
      const arr = listeners.get(collection) || [];
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx,1);
      listeners.set(collection, arr);
    };
  }

  // Metrics
  const metrics = {
    localReads: 0,
    localWrites: 0,
    remoteWrites: 0,
    remoteReads: 0,
    conflictsResolved: 0,
    lastSyncError: null,
    permissionDenied: false,
    remoteEnabled: true,
  };

  // IndexedDB helpers
  function openDB(){
    return new Promise((resolve, reject) => {
      try {
        const req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          for (const store of STORES) {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' });
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function idbGetAll(db, store){
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(store, 'readonly');
        const os = tx.objectStore(store);
        const req = os.getAll();
        req.onsuccess = () => { metrics.localReads++; resolve(req.result || []); };
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }

  async function idbPut(db, store, obj){
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        const req = os.put(obj);
        req.onsuccess = () => { metrics.localWrites++; resolve(true); };
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }

  async function idbBulkPut(db, store, arr){
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        for (const obj of (arr || [])) os.put(obj);
        tx.oncomplete = () => { metrics.localWrites += (arr || []).length; resolve(true); };
        tx.onerror = () => reject(tx.error);
      } catch (e) { reject(e); }
    });
  }

  async function idbDelete(db, store, id){
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        const req = os.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }

  // Conflict resolution: last-write-wins by updatedAt timestamp
  function resolveConflict(localDoc, remoteDoc){
    const lu = Number(localDoc && localDoc.updatedAt || 0);
    const ru = Number(remoteDoc && remoteDoc.updatedAt || 0);
    metrics.conflictsResolved++;
    return ru >= lu ? { ...localDoc, ...remoteDoc } : localDoc;
  }

  // Validation
  function ensureValidDoc(collection, doc){
    if (!doc || typeof doc !== 'object') throw new Error(`Invalid ${collection} document`);
    if (!doc.id) {
      try { doc.id = (global.crypto && global.crypto.randomUUID) ? global.crypto.randomUUID() : String(Date.now()) + '_' + Math.random().toString(36).slice(2); } catch (_) {
        doc.id = String(Date.now()) + '_' + Math.random().toString(36).slice(2);
      }
    }
    if (!doc.updatedAt) doc.updatedAt = Date.now();
    return doc;
  }

  // Referential integrity: no-op for streamlined INHDATA-only model
  async function ensureReferentialIntegrity(db, collection, doc){
    try {
      // Intentionally left blank. This streamlined version maintains only
      // products, salesmen, colors, styles, and company without derived stores.
      return;
    } catch (_) {}
  }

  // Firestore helpers
  function getFirestore(){
    if (!global.firebase) throw new Error('Firebase SDK not loaded');
    try { return global.firebase.firestore(); } catch (e) { throw new Error(`Firebase init failed: ${e.message}`); }
  }

  // Detect Firestore permission errors
  function isPermissionDenied(err){
    if (!err) return false;
    const msg = String(err && err.message || '');
    return (err.code === 'permission-denied') || /Missing or insufficient permissions/i.test(msg);
  }

  const INHDATA = {
    db: null,
    fs: null,
    unsubscribes: {},
    metrics,
    initialized: false,
    remoteEnabled: true,
    syncIntervalId: null,

    async initialize(){
      if (this.initialized) return;
      this.db = await openDB();
      // Try to initialize Firestore; if it fails or permissions are missing, disable remote
      try {
        this.fs = getFirestore();
      } catch (e) {
        this.fs = null;
        this.remoteEnabled = false;
        metrics.lastSyncError = e.message;
        console.warn('[INHDATA] Firestore init failed, suspending remote:', e.message);
      }
      // Initial remote-to-local sync for key collections
      if (this.fs && this.remoteEnabled) {
        await this._primeFromRemote(['products','salesmen','colors','styles','company','quotes']);
        // Start realtime subscriptions
        await this._subscribeRemote('products');
        await this._subscribeRemote('salesmen');
        await this._subscribeRemote('colors');
        await this._subscribeRemote('styles');
        await this._subscribeRemote('company');
        await this._subscribeRemote('quotes');
        // Ensure derived salesmen names are available after initial prime
        try { await this._updateSalesmenNamesMeta(); } catch (_) {}
        // Start outbound sync loop
        this._startSyncLoop();
      } else {
        // Emit existing local caches so UI can render without remote
        try {
          emit('products', await idbGetAll(this.db, 'products'));
          emit('salesmen', await idbGetAll(this.db, 'salesmen'));
          emit('colors', await idbGetAll(this.db, 'colors'));
          emit('styles', await idbGetAll(this.db, 'styles'));
          emit('company', await idbGetAll(this.db, 'company'));
          emit('quotes', await idbGetAll(this.db, 'quotes'));
        } catch (_) {}
      }
      this.initialized = true;
    },

    // Map local store names to canonical Firestore collection names
    _getRemoteCollectionName(col){
      const map = {
        colors: 'inh_colors',
        styles: 'inh_styles',
        salesmen: 'inh_salesmen',
        quotes: 'quotes'
      };
      return map[col] || col;
    },

    async _primeFromRemote(collections){
      for (const col of collections) {
        try {
          const remoteCol = this._getRemoteCollectionName(col);
          const snap = await this.fs.collection(remoteCol).get();
          metrics.remoteReads += snap.size || 0;
          let docs = snap.docs.map(d => {
            const data = d.data() || {};
            const id = d.id;
            return ensureValidDoc(col, { id, ...data, updatedAt: data.updatedAt || Date.now(), _origin: 'remote' });
          });
          // Fallback to legacy non-prefixed collections when primary is empty for colors/styles
          if ((docs.length === 0) && (col === 'colors' || col === 'styles')) {
            try {
              const legacySnap = await this.fs.collection(col).get();
              metrics.remoteReads += legacySnap.size || 0;
              docs = legacySnap.docs.map(d => {
                const data = d.data() || {};
                const id = d.id;
                return ensureValidDoc(col, { id, ...data, updatedAt: data.updatedAt || Date.now(), _origin: 'remote' });
              });
              if (docs.length > 0) {
                console.info(`[INHDATA] Using legacy '${col}' collection as fallback`);
              }
            } catch (_) {}
          }
          await idbBulkPut(this.db, col, docs);
          emit(col, await idbGetAll(this.db, col));
          if (col === 'salesmen') {
            try { await this._updateSalesmenNamesMeta(); } catch (_) {}
          }
        } catch (e) {
          metrics.lastSyncError = e.message;
          console.error(`[INHDATA] Prime from remote failed for ${col}:`, e.message);
          if (isPermissionDenied(e)) {
            this._handlePermissionDenied('prime', col, e);
            // Stop attempting further primes once permissions are denied
            break;
          }
        }
      }
    },

    async _subscribeRemote(col){
      try {
        if (!this.fs || !this.remoteEnabled) return; // remote disabled
        const remoteCol = this._getRemoteCollectionName(col);
        const ref = this.fs.collection(remoteCol);
        const unsub = ref.onSnapshot(async (snapshot) => {
          try {
            const changes = snapshot.docChanges();
            for (const change of changes) {
              const d = change.doc; const data = d.data() || {}; const id = d.id;
              const incoming = ensureValidDoc(col, { id, ...data, updatedAt: data.updatedAt || Date.now(), _origin: 'remote' });
              // Merge with local if exists
              const existingArr = await idbGetAll(this.db, col);
              const existing = existingArr.find(x => x.id === id);
              const finalDoc = existing ? resolveConflict(existing, incoming) : incoming;
              await ensureReferentialIntegrity(this.db, col, finalDoc);
              await idbPut(this.db, col, finalDoc);
            }
            emit(col, await idbGetAll(this.db, col));
            if (col === 'salesmen') {
              try { await this._updateSalesmenNamesMeta(); } catch (_) {}
            }
          } catch (e) {
            metrics.lastSyncError = e.message;
            console.error(`[INHDATA] Remote subscription apply failed for ${col}:`, e.message);
          }
        }, (err) => {
          metrics.lastSyncError = err && err.message;
          console.error(`[INHDATA] Remote subscription error for ${col}:`, err);
          if (isPermissionDenied(err)) {
            this._handlePermissionDenied('subscribe', col, err);
          }
        });
        this.unsubscribes[col] = unsub;
      } catch (e) {
        metrics.lastSyncError = e.message;
        console.error(`[INHDATA] Subscribe failed for ${col}:`, e.message);
      }
    },

    // Removed: price list derivation. Streamlined INHDATA does not manage derived collections.

    async getAll(collection){
      const data = await idbGetAll(this.db, collection);
      return data;
    },

    subscribe(collection, callback){
      return on(collection, callback);
    },

    async upsert(collection, doc){
      const valid = ensureValidDoc(collection, { ...doc, _origin: 'local' });
      await ensureReferentialIntegrity(this.db, collection, valid);
      await idbPut(this.db, collection, valid);
      await this._enqueueSync(collection, valid);
      emit(collection, await idbGetAll(this.db, collection));
      return valid;
    },

    async remove(collection, id){
      await idbDelete(this.db, collection, id);
      emit(collection, await idbGetAll(this.db, collection));
      await this._enqueueSync(collection, { id, _delete: true, updatedAt: Date.now() });
    },

    async _enqueueSync(collection, doc){
      try {
        const item = { id: `${collection}:${doc.id}`, collection, payload: doc, updatedAt: Date.now() };
        await idbPut(this.db, 'syncQueue', item);
      } catch (e) {
        console.error('[INHDATA] Enqueue sync failed:', e.message);
      }
    },

    _startSyncLoop(){
      const run = async () => {
        try {
          const queueItems = await idbGetAll(this.db, 'syncQueue');
          for (const item of queueItems) {
            const { collection, payload } = item;
            try {
              if (payload && payload._delete) {
                const remoteCol = this._getRemoteCollectionName(collection);
                await this.fs.collection(remoteCol).doc(payload.id).delete();
              } else {
                const remoteCol = this._getRemoteCollectionName(collection);
                await this.fs.collection(remoteCol).doc(payload.id).set(payload, { merge: true });
              }
              metrics.remoteWrites++;
              // remove from queue
              await idbDelete(this.db, 'syncQueue', item.id);
            } catch (e) {
              metrics.lastSyncError = e.message;
              // leave in queue; will retry next tick
              console.warn(`[INHDATA] Sync failed for ${collection}/${payload && payload.id}:`, e.message);
              if (isPermissionDenied(e)) {
                this._handlePermissionDenied('sync', collection, e);
                return; // exit run early when disabled
              }
            }
          }
        } catch (e) {
          metrics.lastSyncError = e.message;
          console.warn('[INHDATA] Sync loop error:', e.message);
        }
      };
      // low-latency periodic sync
      if (!this.fs || !this.remoteEnabled) return;
      run();
      this.syncIntervalId = global.setInterval(run, 3000);
    },

    async _handlePermissionDenied(context, col, err){
      try {
        this.remoteEnabled = false;
        metrics.permissionDenied = true;
        metrics.remoteEnabled = false;
        metrics.lastSyncError = err && err.message;
        console.warn(`[INHDATA] Remote access denied during ${context} for ${col}. Disabling remote sync.`);
        // Unsubscribe any active listeners
        try {
          for (const key of Object.keys(this.unsubscribes || {})) {
            const u = this.unsubscribes[key];
            if (typeof u === 'function') {
              try { u(); } catch (_) {}
            }
          }
        } catch (_) {}
        this.unsubscribes = {};
        // Stop sync loop if running
        if (this.syncIntervalId) {
          try { global.clearInterval(this.syncIntervalId); } catch (_) {}
          this.syncIntervalId = null;
        }
        // Emit local caches so UI can continue
        try {
          emit('products', await idbGetAll(this.db, 'products'));
          emit('salesmen', await idbGetAll(this.db, 'salesmen'));
          emit('colors', await idbGetAll(this.db, 'colors'));
          emit('styles', await idbGetAll(this.db, 'styles'));
          emit('company', await idbGetAll(this.db, 'company'));
        } catch (_) {}
      } catch (_) {}
    },

    // Utilities for dropdowns
    async distinct(collection, keys){
      const items = await idbGetAll(this.db, collection);
      const set = new Set();
      const toArray = (val) => Array.isArray(val) ? val : String(val || '').split(/[|,/\\]/);
      for (const it of items) {
        for (const k of (keys || [])) {
          const v = it && it[k];
          if (v == null) continue;
          for (let x of toArray(v)) {
            x = String(x).trim();
            if (x) set.add(x);
          }
        }
      }
      return Array.from(set).sort((a,b) => a.localeCompare(b));
    },

    // Derived helpers
    async _updateSalesmenNamesMeta(){
      try {
        const salesmen = await idbGetAll(this.db, 'salesmen');
        const map = new Map();
        for (const it of (salesmen || [])) {
          const raw = typeof it?.name === 'string' ? it.name : '';
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (!map.has(key)) map.set(key, trimmed);
        }
        const unique = Array.from(map.values()).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        await idbPut(this.db, 'meta', { id: 'salesmen_names', list: unique, updatedAt: Date.now() });
      } catch (e) {
        // Non-fatal; keep going
        console.warn('[INHDATA] Failed to update salesmen names meta:', e && e.message);
      }
    },

    // Retrieve and normalize full salesmen records exclusively from INHDATA
    async getSalesmenDetailed(){
      try {
        // Ensure initialized so IndexedDB is available
        try { if (!this.initialized) await this.initialize(); } catch (_) {}
        const raw = await idbGetAll(this.db, 'salesmen');
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map((r) => {
          const pick = (keys) => {
            for (const k of keys) {
              if (r && r[k] !== undefined && r[k] !== null) return r[k];
            }
            return undefined;
          };

          const id = pick(['id','ID','docId']);
          const name = pick(['name','Name','SalesmanName','salesmanName']);
          const email = pick(['email','Email']);
          const phone = pick(['phone','Phone','mobile','Mobile','contact','Contact']);
          const region = pick(['region','Region','zone','Zone']);
          const city = pick(['city','City']);
          const country = pick(['country','Country']);
          const code = pick(['code','Code']);
          const designation = pick(['designation','Designation','title','Title']);
          const team = pick(['team','Team','group','Group']);
          const status = pick(['status','Status','active','Active']);
          const notes = pick(['notes','Notes','remark','Remark']);
          const createdAt = pick(['createdAt','created_at','CreatedAt']);
          const updatedAt = pick(['updatedAt','updated_at','UpdatedAt','lastUpdated','LastUpdated']);

          // Collect any additional attributes present in record
          const known = new Set(['id','ID','docId','name','Name','SalesmanName','salesmanName','email','Email','phone','Phone','mobile','Mobile','contact','Contact','region','Region','zone','Zone','city','City','country','Country','code','Code','designation','Designation','title','Title','team','Team','group','Group','status','Status','active','Active','notes','Notes','remark','Remark','createdAt','created_at','CreatedAt','updatedAt','updated_at','UpdatedAt','lastUpdated','LastUpdated']);
          const extra = {};
          try {
            Object.keys(r || {}).forEach(k => { if (!known.has(k)) extra[k] = r[k]; });
          } catch (_) {}

          return {
            id: typeof id === 'string' ? id : String(id || ''),
            name: typeof name === 'string' ? name : (name != null ? String(name) : ''),
            email: email != null ? String(email) : undefined,
            phone: phone != null ? String(phone) : undefined,
            region: region != null ? String(region) : undefined,
            city: city != null ? String(city) : undefined,
            country: country != null ? String(country) : undefined,
            code: code != null ? String(code) : undefined,
            designation: designation != null ? String(designation) : undefined,
            team: team != null ? String(team) : undefined,
            status: status != null ? String(status) : undefined,
            notes: notes != null ? String(notes) : undefined,
            createdAt: createdAt ?? undefined,
            updatedAt: updatedAt ?? undefined,
            extra,
            _source: 'INHDATA'
          };
        });
        return normalized;
      } catch (e) {
        console.warn('[INHDATA] getSalesmenDetailed failed:', e && e.message);
        return [];
      }
    },

    async getSalesmenNames(){
      try {
        const metaAll = await idbGetAll(this.db, 'meta');
        const entry = (metaAll || []).find(m => m && m.id === 'salesmen_names');
        if (entry && Array.isArray(entry.list)) return entry.list;
      } catch (_) {}
      // Fallback: compute directly from local store
      try {
        const salesmen = await idbGetAll(this.db, 'salesmen');
        const map = new Map();
        for (const it of (salesmen || [])) {
          const raw = typeof it?.name === 'string' ? it.name : '';
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (!map.has(key)) map.set(key, trimmed);
        }
        return Array.from(map.values()).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      } catch (_) { return []; }
    },
  };

  global.INHDATA = INHDATA;
})(window);