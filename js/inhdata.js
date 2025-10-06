/* INHDATA: Local-first data layer with bidirectional Firestore sync
 * - IndexedDB-backed local storage for fast, low-latency reads
 * - Two-way synchronization with Firestore
 * - Single source of truth for dropdowns, pricing, and catalog data
 * - Validation, conflict resolution, referential integrity, and metrics
 */

(function(global){
  const DB_NAME = 'INHDATA';
  const DB_VERSION = 1;
  const STORES = ['meta','products','salesmen','priceLists','colors','styles','syncQueue'];

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

  // Referential integrity: ensure priceLists exists for products
  async function ensureReferentialIntegrity(db, collection, doc){
    try {
      if (collection === 'products') {
        const plName = doc['Price List Name'] || doc.PriceListName || doc.PriceList;
        if (typeof plName === 'string' && plName.trim().length > 0) {
          await idbPut(db, 'priceLists', { id: plName.trim(), name: plName.trim(), updatedAt: Date.now() });
        }
      }
    } catch (_) {}
  }

  // Firestore helpers
  function getFirestore(){
    if (!global.firebase) throw new Error('Firebase SDK not loaded');
    try { return global.firebase.firestore(); } catch (e) { throw new Error(`Firebase init failed: ${e.message}`); }
  }

  const INHDATA = {
    db: null,
    fs: null,
    unsubscribes: {},
    metrics,
    initialized: false,

    async initialize(){
      if (this.initialized) return;
      this.db = await openDB();
      this.fs = getFirestore();
      // Initial remote-to-local sync for key collections
      await this._primeFromRemote(['products','salesmen','colors','styles']);
      // Derive priceLists from products
      await this._derivePriceLists();
      // Start realtime subscriptions
      await this._subscribeRemote('products');
      await this._subscribeRemote('salesmen');
      await this._subscribeRemote('colors');
      await this._subscribeRemote('styles');
      // Start outbound sync loop
      this._startSyncLoop();
      this.initialized = true;
    },

    async _primeFromRemote(collections){
      for (const col of collections) {
        try {
          const snap = await this.fs.collection(col).get();
          metrics.remoteReads += snap.size || 0;
          const docs = snap.docs.map(d => {
            const data = d.data() || {};
            const id = d.id;
            return ensureValidDoc(col, { id, ...data, updatedAt: data.updatedAt || Date.now(), _origin: 'remote' });
          });
          await idbBulkPut(this.db, col, docs);
          emit(col, await idbGetAll(this.db, col));
        } catch (e) {
          metrics.lastSyncError = e.message;
          console.error(`[INHDATA] Prime from remote failed for ${col}:`, e.message);
        }
      }
    },

    async _subscribeRemote(col){
      try {
        const ref = this.fs.collection(col);
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
          } catch (e) {
            metrics.lastSyncError = e.message;
            console.error(`[INHDATA] Remote subscription apply failed for ${col}:`, e.message);
          }
        }, (err) => {
          metrics.lastSyncError = err && err.message;
          console.error(`[INHDATA] Remote subscription error for ${col}:`, err);
        });
        this.unsubscribes[col] = unsub;
      } catch (e) {
        metrics.lastSyncError = e.message;
        console.error(`[INHDATA] Subscribe failed for ${col}:`, e.message);
      }
    },

    async _derivePriceLists(){
      try {
        const products = await idbGetAll(this.db, 'products');
        const names = new Set();
        for (const p of products) {
          const val = p['Price List Name'] || p.PriceListName || p.PriceList;
          if (typeof val === 'string') {
            const t = val.trim(); if (t) names.add(t);
          }
        }
        const listDocs = Array.from(names).map(n => ({ id: n, name: n, updatedAt: Date.now() }));
        await idbBulkPut(this.db, 'priceLists', listDocs);
        emit('priceLists', await idbGetAll(this.db, 'priceLists'));
      } catch (e) {
        console.warn('[INHDATA] Derive price lists failed:', e.message);
      }
    },

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
      if (collection === 'products') await this._derivePriceLists();
      return valid;
    },

    async remove(collection, id){
      await idbDelete(this.db, collection, id);
      emit(collection, await idbGetAll(this.db, collection));
      await this._enqueueSync(collection, { id, _delete: true, updatedAt: Date.now() });
      if (collection === 'products') await this._derivePriceLists();
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
                await this.fs.collection(collection).doc(payload.id).delete();
              } else {
                await this.fs.collection(collection).doc(payload.id).set(payload, { merge: true });
              }
              metrics.remoteWrites++;
              // remove from queue
              await idbDelete(this.db, 'syncQueue', item.id);
            } catch (e) {
              metrics.lastSyncError = e.message;
              // leave in queue; will retry next tick
              console.warn(`[INHDATA] Sync failed for ${collection}/${payload && payload.id}:`, e.message);
            }
          }
        } catch (e) {
          metrics.lastSyncError = e.message;
          console.warn('[INHDATA] Sync loop error:', e.message);
        }
      };
      // low-latency periodic sync
      run();
      global.setInterval(run, 3000);
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
  };

  global.INHDATA = INHDATA;
})(window);