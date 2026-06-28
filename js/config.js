/* ============================================
   AURA — config.js
   Configuración global + cliente Supabase real
   ============================================ */

// ── Supabase ────────────────────────────────
const SUPABASE_URL  = 'https://akkotzmreadksrcuykhs.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra290em1yZWFka3NyY3V5a2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjgyODQsImV4cCI6MjA5ODIwNDI4NH0.dO7MS9CbiSTOYDkvd9ossFCEMHVKb5qldK2SO-K3gqo';

// Cliente HTTP ligero para Supabase REST API
window.SupaDB = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,

  headers() {
    const session = JSON.parse(localStorage.getItem('aura_session') || 'null');
    return {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'return=representation',
    };
  },

  // SELECT
  async from(table) {
    return {
      _table: table,
      _filters: [],
      _order: null,
      _limit: null,

      eq(col, val)    { this._filters.push(`${col}=eq.${val}`);     return this; },
      neq(col, val)   { this._filters.push(`${col}=neq.${val}`);    return this; },
      order(col, { ascending = true } = {}) {
        this._order = `${col}.${ascending ? 'asc' : 'desc'}`;
        return this;
      },
      limit(n)        { this._limit = n; return this; },

      async select(cols = '*') {
        let url = `${SUPABASE_URL}/rest/v1/${this._table}?select=${cols}`;
        if (this._filters.length) url += '&' + this._filters.join('&');
        if (this._order)          url += `&order=${this._order}`;
        if (this._limit)          url += `&limit=${this._limit}`;
        const res = await fetch(url, { headers: SupaDB.headers() });
        const data = await res.json();
        return { data: res.ok ? data : null, error: res.ok ? null : data };
      },

      async single() {
        let url = `${SUPABASE_URL}/rest/v1/${this._table}?`;
        if (this._filters.length) url += this._filters.join('&');
        url += '&limit=1';
        const res = await fetch(url, { headers: SupaDB.headers() });
        const arr = await res.json();
        return { data: res.ok ? (arr[0] || null) : null, error: res.ok ? null : arr };
      },
    };
  },

  // INSERT
  async insert(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: SupaDB.headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { data: res.ok ? data : null, error: res.ok ? null : data };
  },

  // UPDATE
  async update(table, filter, body) {
    const params = Object.entries(filter).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: 'PATCH',
      headers: SupaDB.headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { data: res.ok ? data : null, error: res.ok ? null : data };
  },

  // DELETE
  async delete(table, filter) {
    const params = Object.entries(filter).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: 'DELETE',
      headers: SupaDB.headers(),
    });
    return { error: res.ok ? null : await res.json() };
  },

  // AUTH — email/password con Supabase Auth REST
  auth: {
    async signUp(email, password, metadata = {}) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password, data: metadata }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        localStorage.setItem('aura_session', JSON.stringify(data));
      }
      return { data: res.ok ? data : null, error: res.ok ? null : data };
    },

    async signIn(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        localStorage.setItem('aura_session', JSON.stringify(data));
      }
      return { data: res.ok ? data : null, error: res.ok ? null : data };
    },

    async signOut() {
      const session = JSON.parse(localStorage.getItem('aura_session') || 'null');
      if (session?.access_token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${session.access_token}` },
        });
      }
      localStorage.removeItem('aura_session');
    },

    getSession() {
      return JSON.parse(localStorage.getItem('aura_session') || 'null');
    },

    getUser() {
      const s = this.getSession();
      return s?.user || null;
    },
  },
};

// ── Config global de la app ─────────────────
window.AURA_CONFIG = {
  app: {
    name:    'Aura',
    version: '1.0.0',
    tagline: 'Tu espacio. Tu aura.',
  },

  pages: {
    home: 'home', ecos: 'ecos', communities: 'communities',
    profile: 'profile', chat: 'chat', settings: 'settings',
  },

  themes: [
    { id: 'theme-default',  label: 'Aura',       color: '#7C3AED' },
    { id: 'theme-dark',     label: 'Oscuro',      color: '#1A1A2E' },
    { id: 'theme-midnight', label: 'Medianoche',  color: '#060614' },
    { id: 'theme-rose',     label: 'Rosa',        color: '#E11D48' },
    { id: 'theme-ocean',    label: 'Océano',      color: '#0EA5E9' },
    { id: 'theme-emerald',  label: 'Esmeralda',   color: '#10B981' },
    { id: 'theme-gold',     label: 'Oro',         color: '#D97706' },
  ],

  modules: {
    ai_assistant:    true,
    attention_detect:true,
    gyroscope:       true,
    karma:           true,
    communities:     true,
    chat:            true,
    ecos_video:      true,
    live_tv:         false,
    spotify_sync:    false,
  },

  labels: {
    eco: 'Eco', ecos: 'Ecos', subaura: 'SubAura',
    aura_score: 'Aura', network: 'Red',
  },
};
