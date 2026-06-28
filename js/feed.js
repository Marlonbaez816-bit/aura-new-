/* ============================================
   AURA — feed.js
   Feed real desde Supabase (tabla: posts)
   ============================================ */

window.AuraFeed = (() => {
  let _posts   = [];
  let _loading = false;

  // ── Cargar posts desde Supabase ───────────────
  async function loadPosts() {
    _loading = true;
    _renderSkeleton();

    // JOIN con profiles para tener nombre, handle, avatar
    const { data, error } = await (await SupaDB.from('posts'))
      .order('created_at', { ascending: false })
      .limit(30)
      .select(`
        id, content, media_url, type, subaura, like_count, comment_count, share_count, created_at,
        profiles:user_id ( id, name, handle, avatar_url, is_verified )
      `);

    _loading = false;

    if (error || !data) {
      document.getElementById('feed-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <div class="empty-state__title">No se pudo cargar el feed</div>
          <div class="empty-state__text">Revisa tu conexión e intenta de nuevo</div>
          <button class="btn btn-secondary" style="margin-top:16px;" onclick="AuraFeed.reload()">Reintentar</button>
        </div>`;
      return;
    }

    _posts = data;
    _renderFeed();
  }

  function reload() { loadPosts(); }

  // ── Skeleton mientras carga ───────────────────
  function _renderSkeleton() {
    const list = document.getElementById('feed-list');
    if (!list) return;
    list.innerHTML = Array(3).fill(0).map(() => `
      <div class="eco-post" style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <div class="skeleton" style="height:14px;width:40%;border-radius:6px;"></div>
            <div class="skeleton" style="height:12px;width:25%;border-radius:6px;"></div>
          </div>
        </div>
        <div class="skeleton" style="height:14px;width:90%;border-radius:6px;"></div>
        <div class="skeleton" style="height:14px;width:70%;border-radius:6px;"></div>
      </div>
    `).join('');
  }

  // ── Renderizar feed completo ──────────────────
  function _renderFeed() {
    const list = document.getElementById('feed-list');
    if (!list) return;

    if (!_posts.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">El feed está vacío</div>
          <div class="empty-state__text">Sé el primero en crear un Eco</div>
        </div>`;
      return;
    }

    list.innerHTML = _posts.map(renderPost).join('');
  }

  // ── Renderizar un post ────────────────────────
  function renderPost(post) {
    const user     = post.profiles || {};
    const initials = (user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const timeAgo  = _timeAgo(post.created_at);

    return `
      <article class="eco-post" data-post-id="${post.id}">
        <div class="eco-post__header">
          <div class="avatar avatar-md avatar-ring" style="flex-shrink:0;">
            <div class="avatar-inner" style="display:flex;align-items:center;justify-content:center;
              background:var(--gradient-soft);font-weight:700;color:var(--color-primary);font-size:15px;">
              ${user.avatar_url
                ? `<img src="${user.avatar_url}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover;">`
                : initials}
            </div>
          </div>
          <div class="eco-post__user">
            <div class="eco-post__name">
              ${user.name || 'Usuario'}
              ${user.is_verified ? '<span class="eco-post__verified">✦</span>' : ''}
              ${post.subaura ? `<a class="subaura-badge" href="#">${post.subaura}</a>` : ''}
            </div>
            <div class="eco-post__handle">${user.handle || ''} · <span class="eco-post__time">${timeAgo}</span></div>
          </div>
          <button class="icon-btn" onclick="AuraToast.show('Opciones del Eco')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>

        <p class="eco-post__content">${post.content || ''}</p>

        ${post.media_url ? `
          <div class="eco-post__media">
            <img src="${post.media_url}" alt="Eco" loading="lazy">
          </div>` : ''}

        <div class="eco-post__actions">
          <button class="eco-action" id="like-btn-${post.id}"
            onclick="AuraFeed.likePost(this, '${post.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="eco-action__count">${post.like_count || 0}</span>
          </button>
          <button class="eco-action" onclick="AuraToast.show('Comentarios próximamente')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="eco-action__count">${post.comment_count || 0}</span>
          </button>
          <button class="eco-action" onclick="AuraToast.show('Compartido ✦', 'success')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span class="eco-action__count">${post.share_count || 0}</span>
          </button>
          <button class="eco-action" onclick="AuraToast.show('Guardado ✦', 'success')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 21 12 16 5 21 5 3 19 3 19 21"/>
            </svg>
          </button>
        </div>
      </article>
    `;
  }

  // ── Like real en Supabase ─────────────────────
  async function likePost(btn, postId) {
    const user = AuraAuth.currentUser();
    if (!user) { AuraToast.show('Inicia sesión para dar like', 'warning'); return; }

    btn.classList.toggle('eco-action--liked');
    btn.classList.add('animate-heart');
    setTimeout(() => btn.classList.remove('animate-heart'), 500);

    const count  = btn.querySelector('.eco-action__count');
    const liked  = btn.classList.contains('eco-action--liked');
    const current = parseInt(count.textContent) || 0;
    count.textContent = liked ? current + 1 : Math.max(0, current - 1);

    if (liked) {
      await SupaDB.insert('likes', { post_id: postId, user_id: user.id });
      await SupaDB.update('posts', { id: postId }, { like_count: current + 1 });
    } else {
      // Borrar el like
      const params = `post_id=eq.${postId}&user_id=eq.${user.id}`;
      await fetch(`${SupaDB.url}/rest/v1/likes?${params}`, {
        method: 'DELETE',
        headers: SupaDB.headers(),
      });
      await SupaDB.update('posts', { id: postId }, { like_count: Math.max(0, current - 1) });
    }
  }

  // ── Stories (Auras) — desde Supabase ─────────
  async function renderStories() {
    const user = AuraAuth.currentUser();
    const container = document.getElementById('stories-row');
    if (!container) return;

    // Mostrar skeleton rápido
    container.innerHTML = `<div class="aura-item">
      <div class="aura-ring aura-ring--add">
        <div class="aura-ring__inner" style="display:flex;align-items:center;justify-content:center;
          background:var(--gradient-soft);font-size:22px;color:var(--color-primary);">+</div>
      </div>
      <span class="aura-item__name">Tu Aura</span>
    </div>`;

    const { data } = await (await SupaDB.from('profiles'))
      .order('aura_score', { ascending: false })
      .limit(8)
      .select('id, name, handle, avatar_url');

    if (!data) return;

    const stories = data.filter(p => p.id !== user?.id);

    container.innerHTML = `
      <div class="aura-item" onclick="AuraToast.show('Crear tu Aura próximamente')">
        <div class="aura-ring aura-ring--add">
          <div class="aura-ring__inner" style="display:flex;align-items:center;justify-content:center;
            background:var(--gradient-soft);font-size:22px;color:var(--color-primary);">+</div>
        </div>
        <span class="aura-item__name">Tu Aura</span>
      </div>
      ${stories.map(p => {
        const init = (p.name || 'A')[0].toUpperCase();
        return `
          <div class="aura-item" onclick="AuraToast.show('Viendo Aura de ${p.name}')">
            <div class="aura-ring">
              <div class="aura-ring__inner" style="display:flex;align-items:center;justify-content:center;
                background:var(--gradient-soft);font-weight:700;color:var(--color-primary);">
                ${p.avatar_url
                  ? `<img src="${p.avatar_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
                  : init}
              </div>
            </div>
            <span class="aura-item__name">${p.name?.split(' ')[0] || ''}</span>
          </div>`;
      }).join('')}`;
  }

  // ── Render página ─────────────────────────────
  function render() {
    const html = `
      <div class="page">
        <div id="stories-row" class="auras-row"></div>
        <div class="divider--thick"></div>
        <div class="chips-row">
          ${['Para ti','Siguiendo','Tendencias','SubAuras'].map((t, i) =>
            `<button class="chip ${i === 0 ? 'active' : ''}"
              onclick="this.closest('.chips-row').querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));this.classList.add('active')">
              ${t}
            </button>`
          ).join('')}
        </div>
        <div id="feed-list"></div>
        <div style="padding:32px 16px;text-align:center;">
          <button class="btn btn-secondary" onclick="AuraFeed.reload()">Cargar más</button>
        </div>
      </div>
    `;
    // Cargamos datos después del render
    setTimeout(() => { loadPosts(); renderStories(); }, 0);
    return html;
  }

  // ── Utilidad: tiempo relativo ─────────────────
  function _timeAgo(iso) {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return 'hace ' + diff + 's';
    if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'm';
    if (diff < 86400)return 'hace ' + Math.floor(diff / 3600) + 'h';
    return 'hace ' + Math.floor(diff / 86400) + 'd';
  }

  function init() {
    AuraRouter.register('home', render);
  }

  return { init, render, likePost, reload };
})();
