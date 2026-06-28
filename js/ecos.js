/* ============================================
   AURA — ecos.js REAL
   Videos/reels desde Supabase (tabla: posts tipo video)
   Scroll suave + giroscopio + auto-avance
   ============================================ */

window.AuraEcos = (() => {
  let _ecos         = [];
  let _currentIndex = 0;
  let _isMoving     = false;
  let _tiltAccum    = 0;
  let _lastBeta     = null;
  let _progressInterval = null;

  // ── Cargar ecos de video desde Supabase ───────
  async function _loadEcos() {
    const { data } = await (await SupaDB.from('posts'))
      .order('created_at', { ascending: false })
      .limit(15)
      .select(`
        id, content, media_url, type, like_count, comment_count, share_count, created_at,
        profiles:user_id ( id, name, handle, avatar_url, aura_score )
      `);

    // Usar todos los posts si no hay videos reales aún
    _ecos = (data || []);

    if (!_ecos.length) {
      // Fallback visual hasta que haya contenido real
      _ecos = [
        { id:'e1', content:'¡Primer Eco en Aura! ✦ Comparte tu mundo',
          media_url:null, like_count:0, comment_count:0, share_count:0,
          profiles:{ name:'Aura', handle:'@aura', aura_score:9999 },
          _bg:'linear-gradient(135deg,#7c3aed,#ec4899)', _emoji:'✦' },
        { id:'e2', content:'La plataforma donde tu aura brilla 🌟',
          media_url:null, like_count:0, comment_count:0, share_count:0,
          profiles:{ name:'Aura', handle:'@aura', aura_score:9999 },
          _bg:'linear-gradient(135deg,#4facfe,#00f2fe)', _emoji:'🌊' },
        { id:'e3', content:'Crea tu primer Eco y empieza a conectar',
          media_url:null, like_count:0, comment_count:0, share_count:0,
          profiles:{ name:'Aura', handle:'@aura', aura_score:9999 },
          _bg:'linear-gradient(135deg,#43e97b,#38f9d7)', _emoji:'🚀' },
      ];
    }

    _renderTrack();
    _startProgress(0);
    _initGyro();
  }

  // ── Construir track de ecos ────────────────────
  function _renderTrack() {
    const track = document.getElementById('eco-track');
    if (!track) return;
    track.innerHTML = _ecos.map((eco, i) => _buildEcoItem(eco, i)).join('');
  }

  function _buildEcoItem(eco, index) {
    const user = eco.profiles || {};
    const init = (user.name || 'A')[0].toUpperCase();
    const bg   = eco._bg || 'linear-gradient(135deg,#1a1a2e,#16213e)';

    return `
      <div class="eco-video-item" data-index="${index}" style="background:${bg};">

        ${eco.media_url
          ? `<video src="${eco.media_url}" autoplay muted loop playsinline
               style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"
               onended="AuraEcos._onVideoEnd(${index})"></video>`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;
               justify-content:center;font-size:90px;
               filter:drop-shadow(0 8px 24px rgba(0,0,0,0.3));">
               ${eco._emoji || '✦'}
             </div>`
        }

        <!-- Barra de progreso -->
        <div style="position:absolute;top:0;left:0;right:0;height:3px;
          background:rgba(255,255,255,0.18);z-index:2;">
          <div id="eco-prog-${index}" style="height:100%;width:0%;
            background:rgba(255,255,255,0.9);border-radius:99px;transition:width .1s linear;"></div>
        </div>

        <!-- Overlay -->
        <div class="eco-video-overlay" style="z-index:3;">
          <div style="display:flex;align-items:flex-end;gap:12px;">
            <div style="flex:1;">
              <!-- Usuario -->
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div onclick="AuraUserProfile && AuraUserProfile.openProfile('${user.id||''}')"
                  style="width:42px;height:42px;border-radius:50%;overflow:hidden;
                  background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);
                  display:flex;align-items:center;justify-content:center;
                  font-size:18px;font-weight:700;color:white;
                  border:2px solid rgba(255,255,255,0.5);cursor:pointer;">
                  ${user.avatar_url
                    ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
                    : init}
                </div>
                <div>
                  <div style="font-size:15px;font-weight:700;color:white;
                    text-shadow:0 1px 4px rgba(0,0,0,0.4);">${user.name||'Usuario'}</div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.75);">${user.handle||''}</div>
                </div>
                <button id="follow-eco-${index}"
                  onclick="AuraEcos.toggleFollow('${user.id||''}', this)"
                  style="background:rgba(255,255,255,0.18);backdrop-filter:blur(8px);
                  border:1.5px solid rgba(255,255,255,0.6);border-radius:20px;
                  padding:5px 14px;color:white;font-size:13px;font-weight:600;cursor:pointer;">
                  Seguir
                </button>
              </div>

              <!-- Caption -->
              <div style="font-size:14px;color:white;line-height:1.55;margin-bottom:10px;
                text-shadow:0 1px 4px rgba(0,0,0,0.4);">${eco.content||''}</div>

              <!-- Aura score -->
              <div style="display:inline-flex;align-items:center;gap:6px;
                background:rgba(124,58,237,0.55);backdrop-filter:blur(8px);
                border-radius:20px;padding:4px 12px;">
                <span style="font-size:12px;color:white;font-weight:600;">✦ ${user.aura_score||0} Aura</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones laterales -->
        <div class="eco-video-actions" style="z-index:4;">
          <div class="eco-video-action" onclick="AuraEcos.likeEco(this,'${eco.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span id="eco-likes-${index}">${eco.like_count||0}</span>
          </div>
          <div class="eco-video-action" onclick="AuraToast.show('Comentarios próximamente')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>${eco.comment_count||0}</span>
          </div>
          <div class="eco-video-action" onclick="AuraEcos.shareEco('${eco.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>${eco.share_count||0}</span>
          </div>
          <div class="eco-video-action" onclick="AuraToast.show('Guardado ✦','success')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 21 12 16 5 21 5 3 19 3 19 21"/>
            </svg>
            <span>Guardar</span>
          </div>
        </div>

      </div>
    `;
  }

  // ── Navegar ────────────────────────────────────
  function goTo(index) {
    if (_isMoving || index < 0 || index >= _ecos.length) return;
    _isMoving = true;
    _currentIndex = index;

    const track = document.getElementById('eco-track');
    const h = document.getElementById('eco-container')?.clientHeight || window.innerHeight;
    if (track) track.style.transform = `translateY(-${index * h}px)`;

    clearInterval(_progressInterval);
    setTimeout(() => {
      _isMoving = false;
      _startProgress(index);
    }, 580);
  }

  function next() { goTo(_currentIndex + 1); }
  function prev() { goTo(_currentIndex - 1); }

  // ── Progreso simulado (15s por eco) ───────────
  function _startProgress(index) {
    const bar = document.getElementById(`eco-prog-${index}`);
    if (!bar) return;
    bar.style.width = '0%';
    const eco = _ecos[index];
    // Si hay video real, no necesitamos el simulado
    if (eco?.media_url) return;

    const duration = 12000;
    const start = Date.now();
    _progressInterval = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / duration) * 100, 100);
      bar.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(_progressInterval);
        setTimeout(() => {
          if (_currentIndex < _ecos.length - 1) next();
          else AuraToast.show('¡Viste todos los Ecos! ✦', 'success');
        }, 300);
      }
    }, 100);
  }

  function _onVideoEnd(index) {
    const bar = document.getElementById(`eco-prog-${index}`);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (_currentIndex < _ecos.length - 1) next();
    }, 400);
  }

  // ── Swipe táctil ──────────────────────────────
  function _initSwipe(container) {
    let startY = 0, startTime = 0;
    container.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });
    container.addEventListener('touchend', e => {
      const dy = startY - e.changedTouches[0].clientY;
      const dt = Date.now() - startTime;
      if (Math.abs(dy) > 45 && dt < 350) {
        dy > 0 ? next() : prev();
      }
    }, { passive: true });
  }

  // ── Giroscopio ────────────────────────────────
  function _initGyro() {
    const SR = window.DeviceOrientationEvent;
    if (!SR) return;
    const attach = () => {
      window.addEventListener('deviceorientation', e => {
        const beta = e.beta;
        if (_lastBeta === null) { _lastBeta = beta; return; }
        const delta = beta - _lastBeta;
        _lastBeta = beta;
        _tiltAccum += delta;
        if (_tiltAccum > 20)  { _tiltAccum = 0; next(); }
        else if (_tiltAccum < -20) { _tiltAccum = 0; prev(); }
      }, { passive: true });
    };
    if (typeof SR.requestPermission === 'function') {
      document.getElementById('eco-container')?.addEventListener('click', () => {
        SR.requestPermission().then(s => { if (s === 'granted') attach(); }).catch(()=>{});
      }, { once: true });
    } else {
      attach();
    }
  }

  // ── Like real ─────────────────────────────────
  async function likeEco(btn, ecoId) {
    const user = AuraAuth.currentUser();
    if (!user) { AuraToast.show('Inicia sesión para dar like', 'warning'); return; }

    const svg   = btn.querySelector('svg');
    const liked = btn.classList.toggle('eco-action--liked');
    if (liked) {
      svg.style.fill = '#ec4899'; svg.style.stroke = '#ec4899';
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => btn.style.transform = '', 200);
      await SupaDB.insert('likes', { post_id: ecoId, user_id: user.id });
      const idx = _ecos.findIndex(e => e.id === ecoId);
      if (idx !== -1) {
        _ecos[idx].like_count = (_ecos[idx].like_count || 0) + 1;
        const el = document.getElementById(`eco-likes-${idx}`);
        if (el) el.textContent = _ecos[idx].like_count;
      }
      await SupaDB.update('posts', { id: ecoId }, { like_count: (_ecos.find(e=>e.id===ecoId)?.like_count||1) });
      AuraKarma?.add(2, 'Like en Eco');
    } else {
      svg.style.fill = 'none'; svg.style.stroke = 'white';
      const params = `post_id=eq.${ecoId}&user_id=eq.${user.id}`;
      await fetch(`${SupaDB.url}/rest/v1/likes?${params}`, { method:'DELETE', headers: SupaDB.headers() });
    }
  }

  async function toggleFollow(userId, btn) {
    const user = AuraAuth.currentUser();
    if (!user || !userId) return;
    const following = btn.textContent.trim() === 'Siguiendo';
    btn.textContent = following ? 'Seguir' : 'Siguiendo';
    btn.style.background = following ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)';
    btn.style.color = following ? 'white' : '#7c3aed';
    if (!following) {
      await SupaDB.insert('follows', { follower_id: user.id, following_id: userId });
      AuraToast.show('Agregado a tu Red ✦', 'success');
      AuraKarma?.add(1, 'Nuevo seguimiento');
    } else {
      const p = `follower_id=eq.${user.id}&following_id=eq.${userId}`;
      await fetch(`${SupaDB.url}/rest/v1/follows?${p}`, { method:'DELETE', headers: SupaDB.headers() });
      AuraToast.show('Dejaste de seguir');
    }
  }

  function shareEco(id) {
    navigator.share?.({ title:'Eco en Aura ✦', url: window.location.href }).catch(()=>{});
    AuraToast.show('Compartiendo...', 'success');
  }

  // ── Render ────────────────────────────────────
  function render() {
    setTimeout(() => {
      const container = document.getElementById('eco-container');
      if (container) {
        _initSwipe(container);
        _loadEcos();
      }
    }, 80);

    return `
      <div class="page" style="padding:0;overflow:hidden;">
        <div class="eco-video-container" id="eco-container">
          <div class="eco-video-track" id="eco-track">
            <div style="height:100%;display:flex;align-items:center;justify-content:center;
              background:linear-gradient(135deg,#7c3aed,#4c1d95);">
              <div style="text-align:center;color:white;">
                <div style="font-size:48px;margin-bottom:12px;animation:orbPulse 2s infinite;">✦</div>
                <div style="font-size:16px;font-weight:600;">Cargando Ecos...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    AuraRouter.register('ecos', render);
  }

  return { init, render, next, prev, goTo, likeEco, toggleFollow, shareEco, _onVideoEnd };
})();
