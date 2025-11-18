(function () {
  if (typeof window === 'undefined') return;

  const TOKEN_KEY = 'yardshare_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || null } catch { return null }
  }
  function setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t) } catch {
      // ignore
    }
  }

  // Capture token from URL hash on first load: https://app/#token=...
  (function captureFromHash() {
    try {
      const hash = window.location.hash || '';
      const m = hash.match(/[#&]token=([^&]+)/);
      if (m && m[1]) {
        const token = decodeURIComponent(m[1]);
        setToken(token);
        // Clean the hash to avoid leaking the token in navigation history
        const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, cleanUrl);
        console.debug('[Auth] JWT captured from URL hash');
      }
    } catch {
      // ignore
    }
  })();

  if (!window.__FETCH_AUTH_ENABLED__) {
    window.__FETCH_AUTH_ENABLED__ = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const token = getToken();
      if (token) {
        init.headers = new Headers(init.headers || {});
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${token}`);
        }
      }
      return origFetch(input, init);
    };
  }
})();
