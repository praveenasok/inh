// Offline INHDATA seeding: ensures basic data is available when Firebase is unreachable
(function(){
  async function seedIfEmpty(){
    try {
      if (!window.INHDATA || typeof INHDATA.initialize !== 'function') return;
      try { await INHDATA.initialize(); } catch (_) {}

      // Seed products
      try {
        const products = await INHDATA.getAll('products');
        if (!Array.isArray(products) || products.length === 0) {
          const samples = [
            { id: 'SAMPLE-INDIA25-Bulk-100', PriceListName: 'INDIA25', Category: 'Bulk', Product: 'Bulk', Density: '100%', Shade: 'Natural Black', Rate: 100, SoldinKG: 'Y', updatedAt: Date.now() },
            { id: 'SAMPLE-INDIA25-Tapes-130', PriceListName: 'INDIA25', Category: 'Tapes', Product: 'Tapes', Density: '130%', Shade: 'Natural Black', Rate: 160, SoldinKG: 'N', updatedAt: Date.now() },
            { id: 'SAMPLE-INDIA25-Closures-120', PriceListName: 'INDIA25', Category: 'Closures', Product: 'Lace Closure', Density: '120%', Shade: 'Brown', Rate: 220, SoldinKG: 'N', updatedAt: Date.now() },
            { id: 'SAMPLE-INDIA25-ClipOn-130', PriceListName: 'INDIA25', Category: 'ClipOn', Product: 'ClipOn', Density: '130%', Shade: 'Brown', Rate: 180, SoldinKG: 'N', updatedAt: Date.now() }
          ];
          for (const doc of samples) { try { await INHDATA.upsert('products', doc); } catch (_) {} }
        }
      } catch (_) {}

      // Seed colors
      try {
        const colors = await INHDATA.getAll('colors');
        if (!Array.isArray(colors) || colors.length === 0) {
          const colorSamples = [
            { id: 'color_nat_black', Color: 'Natural Black', Shade: 'Natural Black', updatedAt: Date.now() },
            { id: 'color_brown', Color: 'Brown', Shade: 'Brown', updatedAt: Date.now() }
          ];
          for (const c of colorSamples) { try { await INHDATA.upsert('colors', c); } catch (_) {} }
        }
      } catch (_) {}

      // Seed styles
      try {
        const styles = await INHDATA.getAll('styles');
        if (!Array.isArray(styles) || styles.length === 0) {
          const styleSamples = [
            { id: 'style_straight', Style: 'Straight', updatedAt: Date.now() },
            { id: 'style_wavy', Style: 'Wavy', updatedAt: Date.now() }
          ];
          for (const s of styleSamples) { try { await INHDATA.upsert('styles', s); } catch (_) {} }
        }
      } catch (_) {}

      // Seed salesmen
      try {
        const salesmen = await INHDATA.getAll('salesmen');
        if (!Array.isArray(salesmen) || salesmen.length === 0) {
          const sm = [
            { id: 'salesman_praveen', name: 'Praveen Asok', updatedAt: Date.now() },
            { id: 'salesman_john', name: 'John Doe', updatedAt: Date.now() }
          ];
          for (const d of sm) { try { await INHDATA.upsert('salesmen', d); } catch (_) {} }
          try { if (typeof INHDATA._updateSalesmenNamesMeta === 'function') { await INHDATA._updateSalesmenNamesMeta(); } } catch (_) {}
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