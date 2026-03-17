// Lightweight client session helper
// Debounces repeated auth checks to reduce UI twitching caused by frequent gate checks.

(() => {
  let _checkInFlight = null;
  let _lastResult = null;
  let _lastTime = 0;
  const DEFAULT_DEBOUNCE_MS = 5000; // avoid re-checks within this window unless forced

  window.sessionHelper = {
    async check(options) {
      const opts = options || {};
      const debounceMs = typeof opts.debounceMs === 'number' ? opts.debounceMs : DEFAULT_DEBOUNCE_MS;
      const now = Date.now();

      // Serve cached result if recently checked and not forcing
      if (!opts.force && _lastTime && (now - _lastTime) < debounceMs) {
        return _lastResult;
      }

      // If a check is already in-flight, reuse it
      if (_checkInFlight) {
        try { return await _checkInFlight; } catch (_) { return null; }
      }

      try {
        if (localStorage.getItem('SESSION_AUTH') === '1') {
          const email = localStorage.getItem('SESSION_EMAIL') || null;
          const uid = localStorage.getItem('SESSION_UID') || null;
          _lastResult = { uid: uid || null, email: email || null };
          _lastTime = Date.now();
          return _lastResult;
        }
      } catch (_) {}

      try {
        if (window.firebase && firebase.auth && firebase.auth().currentUser) {
          const cu = firebase.auth().currentUser;
          _lastResult = { uid: cu && cu.uid ? cu.uid : null, email: cu && cu.email ? cu.email : null };
          _lastTime = Date.now();
          return _lastResult;
        }
      } catch (_) {}

      if (!opts.force) {
        _lastResult = null;
        _lastTime = Date.now();
        return null;
      }

      // Prefer API base at :3000 during local dev to avoid 404s on static servers
      const bases = [];
      try {
        const origin = window.location.origin || '';
        const url = new URL(origin);
        if (url.port === '3000') {
          bases.push(origin);
        } else {
          bases.push('http://localhost:3000');
        }
      } catch (_) {
        bases.push('http://localhost:3000');
      }

      _checkInFlight = (async () => {
        try {
          for (const base of bases) {
            try {
              const res = await fetch(`${base}/auth/me`, { method: 'GET', credentials: 'include', cache: 'no-store', mode: 'cors' });
              if (res.ok) {
                const json = await res.json();
                if (json && json.authenticated) {
                  _lastResult = { uid: json.uid || null, email: json.email || null };
                  _lastTime = Date.now();
                  return _lastResult;
                }
              }
            } catch (_) {}
          }
        } catch (_) {}
        _lastResult = null;
        _lastTime = Date.now();
        return null;
      })();

      try {
        const result = await _checkInFlight;
        return result;
      } finally {
        _checkInFlight = null;
      }
    },

    async logout() {
      // Sign out from Firebase client
      try { if (firebase && firebase.auth) await firebase.auth().signOut(); } catch (_) {}
      // Prefer API server on :3000 during local dev; include current origin as fallback
      const bases = [];
      try {
        const origin = window.location.origin || '';
        const u = new URL(origin);
        if (u.port === '3000') {
          bases.push(origin);
        }
      } catch (_) {}
      if (!bases.includes('http://localhost:3000')) bases.push('http://localhost:3000');
      const current = window.location.origin || '';
      if (current && !bases.includes(current)) bases.push(current);
      // Attempt logout on all bases to ensure session cookie is cleared
      for (const b of bases) {
        try {
          const res = await fetch(`${b}/auth/sessionLogout`, { method: 'POST', credentials: 'include', keepalive: true, mode: 'cors' });
          // If one succeeds, we can stop early
          if (res && res.ok) break;
        } catch (_) {}
      }
      try { localStorage.removeItem('SESSION_AUTH'); localStorage.removeItem('SESSION_EMAIL'); localStorage.removeItem('SESSION_UID'); } catch (_) {}
    }
  };
})();
