/* ============================================
   AURA — create-eco.js REAL
   Publica Ecos reales en Supabase (tabla: posts)
   Con subida de imagen a Supabase Storage
   ============================================ */

window.AuraCreate = (() => {
  let _draft = { type:'text', content:'', media:null, mediaFile:null, subaura:'' };

  function open(type = 'text') {
    _draft = { type, content:'', media:null, mediaFile:null, subaura:'' };
    const user = AuraAuth.currentUser();
    if (!user) { AuraAuth.showLoginScreen(); return; }
    const init = (user.name||'A')[0].toUpperCase();

    AuraModal.show({
      title: null,
      content: `
        <div style="display:flex;flex-direction:column;gap:0;">

          <!-- Header del creator -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <button onclick="AuraModal.close()"
              style="font-size:15px;color:var(--color-text-secondary);cursor:pointer;background:none;border:none;">
              Cancelar
            </button>
            <span style="font-size:16px;font-weight:700;">Nuevo Eco</span>
            <button onclick="AuraCreate.publish()" id="publish-btn"
              class="btn btn-primary btn-sm" disabled>
              Publicar
            </button>
          </div>

          <!-- Tipos -->
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;">
            ${[['📝','Texto','text'],['📷','Foto','photo'],['🎬','Video','video'],['🧵','Hilo','thread']].map(([icon,label,t]) => `
              <button onclick="AuraCreate.switchType('${t}')" id="type-${t}"
                style="display:flex;flex-direction:column;align-items:center;gap:4px;
                padding:8px 14px;border-radius:12px;font-size:12px;font-weight:600;
                white-space:nowrap;flex-shrink:0;cursor:pointer;transition:all .12s;
                background:${type===t?'var(--color-primary-soft)':'var(--color-bg-input)'};
                color:${type===t?'var(--color-primary)':'var(--color-text-secondary)'};
                border:1.5px solid ${type===t?'var(--color-primary-light)':'transparent'};">
                <span style="font-size:18px;">${icon}</span>${label}
              </button>
            `).join('')}
          </div>

          <!-- Área de texto -->
          <div style="display:flex;gap:12px;padding-top:4px;">
            <div class="avatar avatar-md" style="background:var(--gradient-soft);
              display:flex;align-items:center;justify-content:center;
              font-weight:700;color:var(--color-primary);flex-shrink:0;overflow:hidden;">
              ${user.avatar_url
                ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
                : init}
            </div>
            <div style="flex:1;">
              <textarea id="eco-text" rows="5"
                placeholder="¿Qué quieres compartir?"
                oninput="AuraCreate.onInput(this)"
                style="width:100%;background:none;border:none;outline:none;resize:none;
                font-size:16px;line-height:1.6;color:var(--color-text-primary);
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;"></textarea>
              <div id="media-preview" style="margin-top:8px;"></div>
              <input id="subaura-input" placeholder="SubAura (opcional)"
                oninput="_draft&&(_draft.subaura=this.value)"
                style="background:var(--color-bg-input);border-radius:20px;
                padding:6px 14px;font-size:13px;width:100%;border:none;
                outline:none;color:var(--color-text-primary);margin-top:8px;">
            </div>
          </div>

          <!-- Acciones -->
          <div style="border-top:1px solid var(--color-border);margin-top:14px;
            padding-top:12px;display:flex;align-items:center;gap:4px;">
            <button onclick="AuraCreate.attachMedia('image')" class="icon-btn" title="Foto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <button onclick="AuraCreate.attachMedia('video')" class="icon-btn" title="Video">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </button>
            <div style="margin-left:auto;font-size:13px;color:var(--color-text-muted);" id="char-count">0/500</div>
          </div>

          <input type="file" id="media-file-input" accept="image/*,video/*" style="display:none"
            onchange="AuraCreate.handleMedia(this.files[0])">
        </div>
      `
    });
  }

  function switchType(type) {
    _draft.type = type;
    document.querySelectorAll('[id^="type-"]').forEach(b => {
      const t = b.id.replace('type-','');
      b.style.background = t===type ? 'var(--color-primary-soft)' : 'var(--color-bg-input)';
      b.style.color = t===type ? 'var(--color-primary)' : 'var(--color-text-secondary)';
      b.style.borderColor = t===type ? 'var(--color-primary-light)' : 'transparent';
    });
    if (type === 'photo' || type === 'video') attachMedia(type === 'photo' ? 'image' : 'video');
  }

  function onInput(ta) {
    _draft.content = ta.value;
    const n = ta.value.length;
    const el = document.getElementById('char-count');
    if (el) { el.textContent = `${n}/500`; el.style.color = n > 450 ? 'var(--color-error)' : 'var(--color-text-muted)'; }
    const btn = document.getElementById('publish-btn');
    if (btn) btn.disabled = n === 0 && !_draft.media;
  }

  function attachMedia(type) {
    const input = document.getElementById('media-file-input');
    if (input) { input.accept = type === 'image' ? 'image/*' : 'video/*'; input.click(); }
  }

  function handleMedia(file) {
    if (!file) return;
    _draft.mediaFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      _draft.media = e.target.result;
      const preview = document.getElementById('media-preview');
      if (preview) {
        const isVideo = file.type.startsWith('video');
        preview.innerHTML = `
          <div style="position:relative;border-radius:12px;overflow:hidden;">
            ${isVideo
              ? `<video src="${_draft.media}" controls style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;"></video>`
              : `<img src="${_draft.media}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;">`}
            <button onclick="AuraCreate.removeMedia()"
              style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.5);
              border-radius:50%;width:28px;height:28px;color:white;font-size:16px;
              cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>`;
      }
      const btn = document.getElementById('publish-btn');
      if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function removeMedia() {
    _draft.media = null; _draft.mediaFile = null;
    const p = document.getElementById('media-preview');
    if (p) p.innerHTML = '';
  }

  // ── Subir media a Supabase Storage ────────────
  async function _uploadMedia(file) {
    if (!file) return null;
    try {
      const ext  = file.name.split('.').pop();
      const path = `${AuraAuth.currentUser()?.id}/${Date.now()}.${ext}`;
      const res  = await fetch(
        `${SupaDB.url}/storage/v1/object/aura-media/${path}`,
        { method:'POST', headers:{ ...SupaDB.headers(), 'Content-Type': file.type }, body: file }
      );
      if (!res.ok) return null;
      return `${SupaDB.url}/storage/v1/object/public/aura-media/${path}`;
    } catch(e) { return null; }
  }

  // ── Publicar ──────────────────────────────────
  async function publish() {
    const user = AuraAuth.currentUser();
    if (!user) return;
    if (!_draft.content && !_draft.media) return;

    const btn = document.getElementById('publish-btn');
    if (btn) { btn.textContent = 'Publicando...'; btn.disabled = true; }

    let mediaUrl = null;
    if (_draft.mediaFile) {
      mediaUrl = await _uploadMedia(_draft.mediaFile);
    }

    const { data, error } = await SupaDB.insert('posts', {
      user_id:   user.id,
      content:   _draft.content,
      media_url: mediaUrl,
      type:      _draft.type,
      subaura:   _draft.subaura || null,
    });

    if (error) {
      AuraToast.show('Error al publicar. Inténtalo de nuevo.', 'error');
      if (btn) { btn.textContent = 'Publicar'; btn.disabled = false; }
      return;
    }

    AuraModal.close();
    AuraToast.show('¡Eco publicado! ✦', 'success');
    AuraKarma?.add(10, 'Nuevo Eco publicado');

    // Actualizar contador en perfil
    const cur = user.eco_count || 0;
    await SupaDB.update('profiles', { id: user.id }, { eco_count: cur + 1 });
    user.eco_count = cur + 1;
    AuraStore.set('user', user);

    setTimeout(() => AuraRouter.navigate('home'), 300);
  }

  function init() {}

  return { init, open, switchType, onInput, attachMedia, handleMedia, removeMedia, publish };
})();
