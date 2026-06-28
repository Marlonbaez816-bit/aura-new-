/* ============================================
   AURA — communities.js
   Red real: follows y perfiles desde Supabase
   Tablas: profiles, follows, subauras
   ============================================ */

window.AuraCommunities = (() => {
  let _followingIds = new Set(); // IDs que ya sigo

  // ── Cargar IDs que sigo ───────────────────────
  async function _loadFollowing() {
    const me = AuraAuth.currentUser();
    if (!me) return;
    const { data } = await (await SupaDB.from('follows'))
      .eq('follower_id', me.id)
      .select('following_id');
    _followingIds = new Set((data || []).map(r => r.following_id));
  }

  // ── Renderizar tarjeta de usuario ─────────────
  function _renderUserCard(user) {
    const init       = (user.name || 'A')[0].toUpperCase();
    const isFollowing = _followingIds.has(user.id);

    return `
      <div class="user-item">
        <div class="avatar avatar-md" style="background:var(--gradient-soft);display:flex;
          align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);overflow:hidden;">
          ${user.avatar_url
            ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
            : init}
        </div>
        <div class="user-item__info">
          <div class="user-item__name">${user.name || 'Usuario'}</div>
          <div class="user-item__bio">${user.bio || user.handle || ''}</div>
          <div style="margin-top:3px;">
            <span style="font-size:11px;font-weight:700;
              background:var(--gradient-primary);-webkit-background-clip:text;
              -webkit-text-fill-color:transparent;background-clip:text;">
              ✦ ${user.aura_score || 0} Aura
            </span>
          </div>
        </div>
        <button class="btn-follow ${isFollowing ? 'following' : ''}"
          id="follow-btn-${user.id}"
          onclick="AuraCommunities.toggleFollow('${user.id}')">
          ${isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      </div>
    `;
  }

  // ── Follow / Unfollow real ────────────────────
  async function toggleFollow(userId) {
    const me = AuraAuth.currentUser();
    if (!me) { AuraToast.show('Inicia sesión primero', 'warning'); return; }

    const btn        = document.getElementById(`follow-btn-${userId}`);
    const isFollowing = _followingIds.has(userId);

    // Optimistic UI
    if (btn) {
      btn.textContent = isFollowing ? 'Seguir' : 'Siguiendo';
      btn.classList.toggle('following', !isFollowing);
    }

    if (isFollowing) {
      _followingIds.delete(userId);
      // Borrar follow
      const params = `follower_id=eq.${me.id}&following_id=eq.${userId}`;
      await fetch(`${SupaDB.url}/rest/v1/follows?${params}`, {
        method: 'DELETE', headers: SupaDB.headers(),
      });
      // Decrementar contadores
      const cur = me.network_count || 0;
      await SupaDB.update('profiles', { id: me.id },    { network_count: Math.max(0, cur - 1) });
      await SupaDB.update('profiles', { id: userId },   { followers_count: 0 }); // se recalcula con trigger
      AuraToast.show('Dejaste de seguir');
    } else {
      _followingIds.add(userId);
      await SupaDB.insert('follows', { follower_id: me.id, following_id: userId });
      // Incrementar contadores
      const cur = me.network_count || 0;
      await SupaDB.update('profiles', { id: me.id }, { network_count: cur + 1 });
      me.network_count = cur + 1;
      AuraStore.set('user', me);
      AuraToast.show('Agregado a tu Red ✦', 'success');
      // +Karma por seguir
      if (window.AuraKarma) AuraKarma.add(1, 'Siguiendo a alguien');
    }
  }

  // ── Tab: Sugeridos (perfiles reales) ──────────
  async function _loadSuggested() {
    const me = AuraAuth.currentUser();
    const container = document.getElementById('community-tab-content');
    if (!container) return;

    _skeleton(container, 4);

    const { data } = await (await SupaDB.from('profiles'))
      .order('aura_score', { ascending: false })
      .limit(20)
      .select('id, name, handle, bio, avatar_url, aura_score');

    const filtered = (data || []).filter(p => p.id !== me?.id);

    container.innerHTML = filtered.length
      ? filtered.map(_renderUserCard).join('')
      : `<div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <div class="empty-state__title">Sin sugerencias</div>
          <div class="empty-state__text">Invita amigos a Aura</div>
        </div>`;
  }

  // ── Tab: SubAuras (comunidades) ───────────────
  async function _loadSubauras() {
    const container = document.getElementById('community-tab-content');
    if (!container) return;

    _skeleton(container, 3);

    const { data } = await (await SupaDB.from('subauras'))
      .order('member_count', { ascending: false })
      .limit(20)
      .select('id, name, description, icon, color, member_count');

    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🌐</div>
          <div class="empty-state__title">Sin SubAuras aún</div>
          <div class="empty-state__text">Sé el primero en crear una comunidad</div>
          <button class="btn btn-primary" style="margin-top:16px;"
            onclick="AuraToast.show('Crear SubAura próximamente', 'warning')">+ Crear SubAura</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div style="padding:8px 16px 0;">
      ${data.map(c => `
        <div class="card gyro-card" style="display:flex;align-items:center;gap:12px;
          padding:14px;margin-bottom:8px;cursor:pointer;"
          onclick="AuraToast.show('${c.name} próximamente')">
          <div style="width:48px;height:48px;border-radius:12px;
            background:${c.color ? c.color + '22' : 'var(--color-primary-soft)'};
            display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">
            ${c.icon || '🌐'}
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:15px;">${c.name}</div>
            <div style="font-size:12px;color:var(--color-text-muted);">
              ${(c.member_count || 0).toLocaleString('es')} miembros
            </div>
            ${c.description ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${c.description}</div>` : ''}
          </div>
          <button class="btn btn-sm btn-secondary"
            onclick="event.stopPropagation();AuraToast.show('Unido a ${c.name} ✦', 'success')">
            Unirse
          </button>
        </div>`).join('')}
    </div>`;
  }

  // ── Tab: Mi Red (a quienes sigo) ──────────────
  async function _loadMyNetwork() {
    const me = AuraAuth.currentUser();
    const container = document.getElementById('community-tab-content');
    if (!container) return;

    if (!me) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">🔒</div>
        <div class="empty-state__title">Inicia sesión</div>
      </div>`;
      return;
    }

    _skeleton(container, 3);

    // Obtener IDs que sigo
    const { data: followData } = await (await SupaDB.from('follows'))
      .eq('follower_id', me.id)
      .select('following_id');

    if (!followData || !followData.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🌐</div>
          <div class="empty-state__title">Tu Red está vacía</div>
          <div class="empty-state__text">Sigue personas para construir tu red</div>
        </div>`;
      return;
    }

    // Cargar perfiles de esos IDs
    const ids = followData.map(r => r.following_id);
    const { data: profiles } = await (await SupaDB.from('profiles'))
      .select('id, name, handle, bio, avatar_url, aura_score');

    const myNet = (profiles || []).filter(p => ids.includes(p.id));

    container.innerHTML = myNet.length
      ? myNet.map(_renderUserCard).join('')
      : `<div class="empty-state">
          <div class="empty-state__icon">🌐</div>
          <div class="empty-state__title">Tu Red está vacía</div>
        </div>`;
  }

  // ── Buscar usuarios ───────────────────────────
  async function _search(term) {
    if (!term || term.length < 2) {
      const tab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'sugeridos';
      switchTab(document.querySelector('.tab-btn.active'), tab);
      return;
    }

    const container = document.getElementById('community-tab-content');
    _skeleton(container, 3);

    const { data } = await (await SupaDB.from('profiles'))
      .select('id, name, handle, bio, avatar_url, aura_score');

    const me      = AuraAuth.currentUser();
    const results = (data || [])
      .filter(p => p.id !== me?.id &&
        (p.name?.toLowerCase().includes(term.toLowerCase()) ||
         p.handle?.toLowerCase().includes(term.toLowerCase())))
      .slice(0, 15);

    container.innerHTML = results.length
      ? results.map(_renderUserCard).join('')
      : `<div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">Sin resultados</div>
          <div class="empty-state__text">Prueba con otro nombre</div>
        </div>`;
  }

  // ── Cambiar tab ───────────────────────────────
  function switchTab(btn, tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) { btn.classList.add('active'); btn.dataset.tab = tab; }
    if (tab === 'sugeridos')   _loadSuggested();
    else if (tab === 'subauras') _loadSubauras();
    else if (tab === 'red')    _loadMyNetwork();
  }

  // ── Skeleton ──────────────────────────────────
  function _skeleton(container, n) {
    if (!container) return;
    container.innerHTML = Array(n).fill(0).map(() => `
      <div class="user-item">
        <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
          <div class="skeleton" style="height:13px;width:35%;border-radius:5px;"></div>
          <div class="skeleton" style="height:11px;width:60%;border-radius:5px;"></div>
        </div>
        <div class="skeleton" style="width:68px;height:30px;border-radius:999px;"></div>
      </div>`).join('');
  }

  // ── Render página ─────────────────────────────
  function render() {
    setTimeout(async () => {
      await _loadFollowing();
      _loadSuggested();
    }, 0);

    return `
      <div class="page">
        <div style="padding:12px 16px 8px;">
          <input class="input-field input-field--search"
            placeholder="Buscar personas o comunidades..."
            oninput="AuraCommunities._search(this.value)">
        </div>
        <div class="tabs">
          <button class="tab-btn active" data-tab="sugeridos"
            onclick="AuraCommunities.switchTab(this,'sugeridos')">Sugeridos</button>
          <button class="tab-btn" data-tab="subauras"
            onclick="AuraCommunities.switchTab(this,'subauras')">SubAuras</button>
          <button class="tab-btn" data-tab="red"
            onclick="AuraCommunities.switchTab(this,'red')">Mi Red</button>
        </div>
        <div id="community-tab-content" style="padding-top:4px;"></div>
      </div>
    `;
  }

  function init() {
    AuraRouter.register('communities', render);
  }

  return { init, render, toggleFollow, switchTab, _search };
})();
