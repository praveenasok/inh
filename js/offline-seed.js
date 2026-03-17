// Offline INHDATA seeding: ensures basic data is available when Firebase is unreachable
(function(){
  async function safeFetchJson(url){
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  }

  function deriveName(obj){
    try {
      const n = obj && (obj.name || obj.salesmanName || obj.SalesmanName || obj.Name);
      return typeof n === 'string' ? n : (n != null ? String(n) : '');
    } catch (_) { return ''; }
  }

  async function seedIfEmpty(){
    try {
      if (!window.INHDATA || typeof INHDATA.initialize !== 'function') return;
      try { await INHDATA.initialize(); } catch (_) {}

      // Products: if empty, pull from server (Firestore/Sheets backed) and upsert
      try {
        const productsLocal = await INHDATA.getAll('products');
        if (!Array.isArray(productsLocal) || productsLocal.length === 0) {
          const productsRemote = await safeFetchJson('http://localhost:3000/api/products');
          if (productsRemote.length > 0) {
            for (const doc of productsRemote) {
              try { await INHDATA.upsert('products', { ...doc, updatedAt: Date.now() }); } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // Colors: if empty, pull from server generic get-data
      try {
        const colorsLocal = await INHDATA.getAll('colors');
        if (!Array.isArray(colorsLocal) || colorsLocal.length === 0) {
          const colorsRemote = await safeFetchJson('http://localhost:3000/api/get-data?collection=colors');
          if (colorsRemote.length > 0) {
            for (const c of colorsRemote) {
              try { await INHDATA.upsert('colors', { ...c, updatedAt: Date.now() }); } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // Styles: if empty, pull from server generic get-data (or fallback endpoint)
      try {
        const stylesLocal = await INHDATA.getAll('styles');
        if (!Array.isArray(stylesLocal) || stylesLocal.length === 0) {
          let stylesRemote = await safeFetchJson('http://localhost:3000/api/get-data?collection=styles');
          if (stylesRemote.length === 0) {
            stylesRemote = await safeFetchJson('http://localhost:3000/api/get-styles');
          }
          if (stylesRemote.length > 0) {
            for (const s of stylesRemote) {
              try { await INHDATA.upsert('styles', { ...s, updatedAt: Date.now() }); } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // Salesmen: if empty, pull salespeople and map to local salesmen store
      try {
        const salesmenLocal = await INHDATA.getAll('salesmen');
        if (!Array.isArray(salesmenLocal) || salesmenLocal.length === 0) {
          const people = await safeFetchJson('http://localhost:3000/api/salespeople');
          if (people.length > 0) {
            for (const p of people) {
              const name = deriveName(p).trim();
              const id = p && (p.id || p.ID || p.docId || name || `salesman_${Date.now()}`);
              const record = { id: String(id), name, updatedAt: Date.now(), _origin: 'remote' };
              try { await INHDATA.upsert('salesmen', record); } catch (_) {}
            }
            try { if (typeof INHDATA._updateSalesmenNamesMeta === 'function') { await INHDATA._updateSalesmenNamesMeta(); } } catch (_) {}
          }
        }
      } catch (_) {}

      // Clients: if empty, pull from server and upsert to INHDATA
      try {
        const clientsLocal = await INHDATA.getAll('clients');
        if (!Array.isArray(clientsLocal) || clientsLocal.length === 0) {
          const clientsRemote = await safeFetchJson('http://localhost:3000/api/clients');
          if (clientsRemote.length > 0) {
            for (const cl of clientsRemote) {
              const name =
                deriveName(cl).trim() ||
                (cl.clientName || cl.name || cl.Name || '');
              const id =
                cl && (cl.id || cl.clientId || cl.ID || name || `client_${Date.now()}`);
              const record = {
                id: String(id),
                name,
                email: cl.email || '',
                phone: cl.phone || cl.Phone || '',
                company: cl.company || cl.companyName || cl.Company || '',
                updatedAt: Date.now(),
                _origin: 'remote',
              };
              try { await INHDATA.upsert('clients', record); } catch (_) {}
            }
          }
        }
      } catch (_) {}
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', seedIfEmpty);
  } else {
    seedIfEmpty();
  }
})();