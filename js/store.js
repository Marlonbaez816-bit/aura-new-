/* ============================================
   AURA — store.js
   Estado global reactivo, sin cambios
   Compatible con SupaDB
   ============================================ */

window.AuraStore = (() => {
  const _state = {
    user:        null,
    theme:       localStorage.getItem('aura_theme') || 'theme-default',
    currentPage: 'home',
    notifications: [],
    isLoading:   false,
    attention:   { isActive: true },
    gyro:        { x: 0, y: 0 },
  };

  const _listeners = {};

  function get(key) { return key ? _state[key] : { ..._state }; }

  function set(key, value) {
    _state[key] = value;
    _emit(key, value);
  }

  function _emit(key, value) {
    (_listeners[key] || []).forEach(fn => fn(value));
    (_listeners['*']  || []).forEach(fn => fn({ key, value }));
  }

  function on(key, cb) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(cb);
    return () => { _listeners[key] = _listeners[key].filter(f => f !== cb); };
  }

  function persist(key, value) {
    set(key, value);
    try { localStorage.setItem(`aura_${key}`, JSON.stringify(value)); } catch(e) {}
  }

  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`aura_${key}`);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  }

  return { get, set, on, persist, load };
})();
