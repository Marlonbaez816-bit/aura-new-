/* ============================================
   AURA — profile.js
   Perfil real desde Supabase (tabla: profiles)
   ============================================ */

window.AuraProfile = (() => {

  // ── Render página perfil ──────────────────────
  async function render() {
    const placeholder = `<div class="page" style="padding:40px 16px;text-align:center;">
      <div class="skeleton" style="height:120px;width:100%;border-radius:0;margin-bottom:60px;"></div>
      <div class="skeleton" style="height:20px;width:40%;margin:auto;border-radius:8px;"></div>
    </div>`;

    // Renderizamos esqueleto inmediato
    document.getElementById('main-content').innerHTML = placeholder;

    const user = AuraAuth.currentUser();
    if (!user) { AuraAuth.showLoginScreen(); return ''; }

    // Contar posts del usuario
    const { data: posts } = await (await SupaDB.from('posts'))
      .eq('user_id', user.id)
      .select('id');

    const ecoCount = posts?.length || 0;

    document.getElementById('main-content').innerHTML = _buildProfileHTML(user, ecoCount);
    _bindPostTabs(user.id);
  }

  function _buildProfileHTML(user, ecoCount) {
    const initials = (user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return `
      <div class="page">
        <!-- PORTADA -->
        <div style="height:130px;background:var(--gradient-primary);position:relative;margin-bottom:56px;">
          <div style="position:absolute;inset:0;backdrop-filter:blur(0px);"></div>
          <button onclick="AuraToast.show('Cambiar portada próximamente')"
            style="position:absolute;bottom:10px;right:12px;
            background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border-radius:20px;
            padding:5px 14px;font-size:12px;color:white;border:none;cursor:pointer;">
            Editar portada
          </button>
          <!-- AVATAR -->
          <div style="position:absolute;bottom:-52px;left:16px;">
            <div style="position:relative;display:inline-block;">
              <div class="avatar avatar-xl" style="border:3px solid var(--color-bg);
                background:var(--gradient-soft);display:flex;align-items:center;justify-content:center;
                font-size:32px;font-weight:700;color:var(--color-primary);box-shadow:var(--shadow-lg);overflow:hidden;">
                ${user.avatar_url
                  ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
                  : initials}
              </div>
              <button onclick="AuraToast.show('Cambiar foto próximamente')"
                style="position:absolute;bottom:2px;right:2px;width:28px;height:28px;border-radius:50%;
                background:var(--gradient-primary);border:2px solid var(--color-bg);
                display:flex;align-items:center;justify-content:center;color:white;font-size:14px;cursor:pointer;">+</button>
            </div>
          </div>
        </div>

        <!-- INFO -->
        <div style="padding:0 16px 16px;">
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
            <button class="btn btn-outline btn-sm" onclick="AuraProfile.openEditProfile()">Editar perfil</button>
          </div>
          <div style="font-size:21px;font-weight:700;font-family:var(--font-display);">${user.name || 'Tu nombre'}</div>
          <div style="font-size:14px;color:var(--color-text-muted);margin-top:2px;">${user.handle || ''}</div>
          <div style="font-size:14px;color:var(--color-text-secondary);margin-top:8px;line-height:1.6;">
            ${user.bio || 'Escribe tu bio ✨'}
          </div>

          <!-- AURA SCORE -->
          <div style="margin-top:14px;">
            <div class="aura-score">
              <div class="aura-score__icon">✦</div>
              <div>
                <div class="aura-score__value">${user.aura_score || 100} Aura</div>
                <div class="aura-score__label">Tu puntuación de impacto</div>
              </div>
            </div>
          </div>

          <!-- STATS -->
          <div class="stats-row" style="margin-top:16px;">
            <div class="stat-item">
              <div class="stat-item__value">${ecoCount}</div>
              <div class="stat-item__label">Ecos</div>
            </div>
            <div class="stat-item" onclick="AuraRouter.navigate('communities')">
              <div class="stat-item__value">${user.network_count || 0}</div>
              <div class="stat-item__label">Red</div>
            </div>
            <div class="stat-item">
              <div class="stat-item__value">${user.followers_count || 0}</div>
              <div class="stat-item__label">Seguidores</div>
            </div>
            <div class="stat-item">
              <div class="stat-item__value">${user.following_count || 0}</div>
              <div class="stat-item__label">Siguiendo</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- TABS -->
        <div class="tabs">
          <button class="tab-btn active" data-tab="ecos"      onclick="AuraProfile.switchTab(this)">Ecos</button>
          <button class="tab-btn"        data-tab="media"     onclick="AuraProfile.switchTab(this)">Galería</button>
          <button class="tab-btn"        data-tab="guardados" onclick="AuraProfile.switchTab(this)">Guardados</button>
        </div>
        <div id="profile-tab-content">
          <div class="skeleton" style="height:14px;width:60%;margin:24px auto;border-radius:6px;"></div>
        </div>

        <!-- AJUSTES -->
        <div class="divider--thick"></div>
        <div class="settings-row" onclick="AuraRouter.navigate('settings')">
          <div class="settings-row__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93l-1.42 1.42M4.93 4.93l1.42 1.42M12 2v2M12 20v2M4.93 19.07l1.42-1.42M19.07 19.07l-1.42-1.42M2 12h2M20 12h2"/>
            </svg>
          </div>
          <div class="settings-row__content">
            <div class="settings-row__title">Ajustes</div>
            <div class="settings-row__subtitle">Personalizar Aura, privacidad y más</div>
          </div>
          <div class="settings-row__right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>
    `;
  }

  // ── Cargar ecos del usuario en la tab ─────────
  async function _bindPostTabs(userId) {
    await _loadUserPosts(userId);
  }

  async function switchTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    const user = AuraAuth.currentUser();
    if (!user) return;
    if (tab === 'ecos') await _loadUserPosts(user.id);
    else {
      document.getElementById('profile-tab-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${tab === 'media' ? '🖼️' : '🔖'}</div>
          <div class="empty-state__title">Sin contenido aún</div>
          <div class="empty-state__text">Aquí aparecerá tu ${tab === 'media' ? 'galería' : 'contenido guardado'}</div>
        </div>`;
    }
  }

  async function _loadUserPosts(userId) {
    const container = document.getElementById('profile-tab-content');
    if (!container) return;
    container.innerHTML = `<div class="skeleton" style="height:14px;width:60%;margin:24px auto;border-radius:6px;"></div>`;

    const { data } = await (await SupaDB.from('posts'))
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .select('id, content, media_url, like_count, comment_count, created_at');

    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">Aún no hay Ecos</div>
          <div class="empty-state__text">Crea tu primer Eco y comparte tu mundo</div>
        </div>`;
      return;
    }

    container.innerHTML = data.map(post => `
      <div class="eco-post" style="border-bottom:1px solid var(--color-border);padding:16px;">
        <p style="font-size:15px;line-height:1.6;margin-bottom:8px;">${post.content || ''}</p>
        ${post.media_url ? `<div class="eco-post__media"><img src="${post.media_url}" loading="lazy"></div>` : ''}
        <div style="display:flex;gap:16px;font-size:13px;color:var(--color-text-muted);margin-top:8px;">
          <span>❤️ ${post.like_count || 0}</span>
          <span>💬 ${post.comment_count || 0}</span>
        </div>
      </div>`).join('');
  }

  // ── Editar perfil ─────────────────────────────
  function openEditProfile() {
    const user = AuraAuth.currentUser() || {};
    AuraModal.show({
      title: 'Editar perfil',
      content: `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="input-group">
            <label class="input-label">Nombre</label>
            <input class="input-field" id="edit-name"   value="${user.name   || ''}" placeholder="Tu nombre">
          </div>
          <div class="input-group">
            <label class="input-label">Usuario</label>
            <input class="input-field" id="edit-handle" value="${user.handle || ''}" placeholder="@tu_usuario">
          </div>
          <div class="input-group">
            <label class="input-label">Bio</label>
            <textarea class="input-field" id="edit-bio" rows="3" style="resize:none;"
              placeholder="Cuéntanos sobre ti...">${user.bio || ''}</textarea>
          </div>
          <div id="edit-error" style="font-size:13px;color:var(--color-error);display:none;text-align:center;"></div>
          <button class="btn btn-primary btn-block" onclick="AuraProfile._saveProfile()">Guardar cambios</button>
        </div>
      `
    });
  }

  async function _saveProfile() {
    const name   = document.getElementById('edit-name')?.value?.trim();
    const handle = document.getElementById('edit-handle')?.value?.trim();
    const bio    = document.getElementById('edit-bio')?.value?.trim();
    const user   = AuraAuth.currentUser();
    if (!user) return;

    const updates = {};
    if (name)   updates.name   = name;
    if (handle) updates.handle = handle;
    if (bio)    updates.bio    = bio;

    const { error } = await SupaDB.update('profiles', { id: user.id }, updates);
    if (error) {
      const el = document.getElementById('edit-error');
      if (el) { el.textContent = 'Error al guardar. Inténtalo de nuevo.'; el.style.display = 'block'; }
      return;
    }

    // Actualizar cache local
    Object.assign(user, updates);
    AuraStore.set('user', user);

    AuraModal.close();
    AuraToast.show('Perfil actualizado ✦', 'success');
    AuraRouter.navigate('profile');
  }

  // ── Ajustes ───────────────────────────────────
  function renderSettings() {
    return `
      <div class="page">
        <div style="padding:8px 0;">
          ${[
            { icon: '🎨', title: 'Apariencia',           sub: 'Tema, colores y animaciones',    action: `AuraModal.show({ title: 'Elige tu tema', content: AuraTheme.renderPicker() })` },
            { icon: '🔔', title: 'Notificaciones',        sub: 'Gestiona tus alertas',            action: `AuraToast.show('Próximamente', 'warning')` },
            { icon: '🔒', title: 'Privacidad',            sub: 'Quién puede ver tu contenido',    action: `AuraToast.show('Próximamente', 'warning')` },
            { icon: '✦',  title: 'Aura Score',            sub: 'Tu sistema de karma',             action: `AuraRouter.navigate('karma')` },
            { icon: '👁️', title: 'Detección de atención', sub: 'Page visibility API',             action: `AuraAttention.toggle()` },
            { icon: '📱', title: 'Giroscopio',            sub: 'Efecto parallax',                 action: `AuraGyro.toggle()` },
            { icon: '🚪', title: 'Cerrar sesión',         sub: '',                               action: `AuraAuth.logout()` },
          ].map(row => `
            <div class="settings-row" onclick="${row.action}">
              <div class="settings-row__icon">${row.icon}</div>
              <div class="settings-row__content">
                <div class="settings-row__title">${row.title}</div>
                ${row.sub ? `<div class="settings-row__subtitle">${row.sub}</div>` : ''}
              </div>
              <div class="settings-row__right">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  function init() {
    AuraRouter.register('profile',  () => { render(); return ''; });
    AuraRouter.register('settings', renderSettings);
  }

  return { init, render, openEditProfile, _saveProfile, switchTab, renderSettings };
})();
