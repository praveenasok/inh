// Admin menu visibility controller
// Hides admin links unless the current user is the configured admin.
(function(){
  const ADMIN_EMAIL = 'info@indiannaturalhair.com';
  const INIT_WAIT_MS = 12000;

  function isAdminEmail(email){
    try { return String(email || '').trim().toLowerCase() === ADMIN_EMAIL; } catch(_) { return false; }
  }

  function getAdminLinkElements(){
    const selectors = [
      'a[href$="adminpanel.html"]',
      'a[href*="adminpanel.html"]',
      'a[href*="admin-sync-interface.html"]',
      'a[href*="client-admin-ui.html"]',
      'a[aria-label="Admin"]'
    ];
    const nodes = new Set();
    selectors.forEach(sel => { try { document.querySelectorAll(sel).forEach(el => nodes.add(el)); } catch(_){} });
    return Array.from(nodes);
  }

  function hideAdminLinks(){
    getAdminLinkElements().forEach(el => {
      try { el.classList.add('hidden'); } catch(_) {}
      try { el.style.display = 'none'; } catch(_) {}
      try { el.setAttribute('data-admin-hidden', 'true'); } catch(_) {}
    });
  }

  function showAdminLinks(){
    getAdminLinkElements().forEach(el => {
      try { el.classList.remove('hidden'); } catch(_) {}
      try { el.style.display = ''; } catch(_) {}
      try { el.removeAttribute('data-admin-hidden'); } catch(_) {}
    });
  }

  function applyVisibility(isAdmin){
    if (isAdmin) { showAdminLinks(); } else { hideAdminLinks(); }
  }

  function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

  async function ensureFirebaseInitialized(){
    try {
      if (!window.firebase) return false;
      // Already initialized
      if (firebase.apps && firebase.apps.length > 0) return true;
      // Try calling the global initializer if available
      if (typeof window.initializeFirebaseApp === 'function') {
        try { await window.initializeFirebaseApp(); } catch(_) {}
      }
      const start = Date.now();
      while (Date.now() - start < INIT_WAIT_MS) {
        if (firebase.apps && firebase.apps.length > 0) return true;
        await sleep(200);
      }
    } catch(_) {}
    return false;
  }

  function attachAuthListener(){
    try {
      if (!window.firebase || !firebase.auth) return false;
      // Listen for auth state changes and update visibility
      firebase.auth().onAuthStateChanged(u => {
        try { applyVisibility(isAdminEmail(u?.email)); } catch(_) {}
      });
      // Also apply immediately if current user is available
      try {
        const u = firebase.auth().currentUser;
        if (u && u.email) applyVisibility(isAdminEmail(u.email));
      } catch(_) {}
      return true;
    } catch(_) { return false; }
  }

  async function resolveCurrentUserEmail(){
    // Prefer Firebase auth if present
    try {
      if (window.firebase && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user && user.email) return user.email;
      }
    } catch(_) {}

    // Fallback to session helper (Node server /auth/me)
    try {
      if (window.sessionHelper && typeof window.sessionHelper.check === 'function') {
        const me = await window.sessionHelper.check({ force: true });
        if (me && me.email) return me.email;
      }
    } catch(_) {}

    return null;
  }

  document.addEventListener('DOMContentLoaded', async function(){
    // Hide immediately to avoid flicker, then reveal if admin
    hideAdminLinks();

    // Ensure Firebase is initialized, then attach auth listener
    let listenerAttached = false;
    try {
      const initialized = await ensureFirebaseInitialized();
      if (initialized) {
        listenerAttached = attachAuthListener() || false;
      }
    } catch(_) {}

    // Apply visibility based on current info
    try {
      const email = await resolveCurrentUserEmail();
      applyVisibility(isAdminEmail(email));
    } catch(_) {}

    // As a final fallback, retry listener attachment shortly
    if (!listenerAttached) {
      setTimeout(async () => {
        try {
          const ok = attachAuthListener();
          const email2 = await resolveCurrentUserEmail();
          applyVisibility(isAdminEmail(email2));
        } catch(_) {}
      }, 1000);
    }
  });
})();