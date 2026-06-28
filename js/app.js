/* ============================================
   AURA — app.js REAL
   Arranca todo con Supabase desde el inicio
   Sin demos, sin mocks
   ============================================ */

(function () {
  'use strict';

  async function bootAura() {

    // ── 1. TEMA (primero para evitar flash) ──
    AuraTheme.init();

    // ── 2. REGISTRAR TODAS LAS PÁGINAS ──
    AuraFeed.init();
    AuraEcos.init();
    AuraChat.init();
    AuraCommunities.init();
    AuraProfile.init();
    AuraKarma.init();
    if (window.AuraNotifications) AuraNotifications.init();
    if (window.AuraMedia)         AuraMedia.init();
    if (window.AuraSearch)        AuraSearch.init();
    if (window.AuraCamera)        AuraCamera.init();
    if (window.AuraUserProfile)   AuraUserProfile.init();
    if (window.AuraCreate)        AuraCreate.init();

    // ── 3. MÓDULOS UX ──
    AuraGyro.init();
    AuraAttention.init();
    AuraAI.init();

    // ── 4. BOTTOM NAV ──
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.vibrate?.(8);
        AuraRouter.navigate(btn.dataset.page);
      });
    });

    // ── 5. BOTÓN CREAR ──
    document.querySelector('[data-action="create"]')?.addEventListener('click', () => {
      navigator.vibrate?.(8);
      AuraModal.show({
        title: 'Crear Eco',
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${[
              ['📝','Texto',     'text'],
              ['📷','Foto',      'photo'],
              ['🎬','Video',     'video'],
              ['🎵','Audio',     'audio'],
              ['🧵','Hilo',      'thread'],
              ['📊','Encuesta',  'poll'],
            ].map(([icon, label, type]) => `
              <button onclick="AuraModal.close();setTimeout(()=>{ if(window.AuraCreate) AuraCreate.open('${type}'); else AuraToast.show('Próximamente','warning'); },180);"
                style="display:flex;flex-direction:column;align-items:center;gap:6px;
                background:var(--color-bg-input);border-radius:14px;padding:16px 8px;cursor:pointer;
                border:1px solid var(--color-border);font-size:13px;font-weight:600;
                color:var(--color-text-primary);">
                <span style="font-size:28px;">${icon}</span>${label}
              </button>
            `).join('')}
          </div>
        `
      });
    });

    // ── 6. BOTÓN NOTIFICACIONES ──
    document.getElementById('btn-notifications')?.addEventListener('click', () => {
      navigator.vibrate?.(8);
      if (window.AuraNotifications) AuraRouter.navigate('notifications');
      else AuraToast.show('Notificaciones próximamente');
      document.getElementById('notif-badge')?.style.setProperty('display','none');
    });

    // ── 7. BOTÓN BUSCAR ──
    document.getElementById('btn-search')?.addEventListener('click', () => {
      navigator.vibrate?.(8);
      if (window.AuraSearch) AuraRouter.navigate('search');
      else AuraToast.show('Búsqueda próximamente');
    });

    // ── 8. BOTÓN LOGO ──
    document.getElementById('btn-logo')?.addEventListener('click', () => {
      AuraRouter.navigate('home');
    });

    // ── 9. BOTÓN CÁMARA ──
    document.getElementById('btn-camera')?.addEventListener('click', () => {
      navigator.vibrate?.(8);
      if (window.AuraCamera) AuraCamera.open();
      else AuraToast.show('Cámara próximamente', 'warning');
    });

    // ── 10. SWIPE HORIZONTAL ──
    const mainPages = ['home', 'ecos', 'communities', 'profile'];
    let swipeStartX = 0;
    const main = document.getElementById('main-content');
    if (main) {
      main.addEventListener('touchstart', e => {
        swipeStartX = e.touches[0].clientX;
      }, { passive: true });
      main.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - swipeStartX;
        if (Math.abs(dx) < 72) return;
        const cur = AuraRouter.current();
        const idx = mainPages.indexOf(cur);
        if (idx === -1) return;
        if (dx < 0 && idx < mainPages.length - 1) AuraRouter.navigate(mainPages[idx + 1]);
        if (dx > 0 && idx > 0)                    AuraRouter.navigate(mainPages[idx - 1]);
      }, { passive: true });
    }

    // ── 11. ONLINE / OFFLINE ──
    window.addEventListener('offline', () => AuraToast.show('Sin conexión 📡', 'warning'));
    window.addEventListener('online',  () => AuraToast.show('Conectado ✦',    'success'));

    // ── 12. PWA BANNER ──
    let _prompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); _prompt = e;
      setTimeout(() => {
        document.getElementById('install-banner')?.classList.remove('hidden');
      }, 10000);
    });
    document.getElementById('install-btn')?.addEventListener('click', () => {
      _prompt?.prompt();
      _prompt?.userChoice.then(() => {
        document.getElementById('install-banner')?.classList.add('hidden');
      });
    });
    document.getElementById('install-close')?.addEventListener('click', () => {
      document.getElementById('install-banner')?.classList.add('hidden');
    });

    // ── 13. PEEK (larga presión) ──
    let peekEl = null, peekTimer = null;
    document.addEventListener('touchstart', e => {
      const t = e.target.closest('[data-peek]');
      if (!t) return;
      peekTimer = setTimeout(() => {
        try {
          const d = JSON.parse(t.dataset.peek);
          _showPeek(d, e.touches[0].clientX, e.touches[0].clientY);
        } catch(_) {}
      }, 450);
    }, { passive: true });
    document.addEventListener('touchend',  _hidePeek, { passive: true });
    document.addEventListener('touchmove', _hidePeek, { passive: true });

    function _showPeek(d, x, y) {
      _hidePeek();
      navigator.vibrate?.(30);
      peekEl = document.createElement('div');
      peekEl.className = 'peek-preview';
      peekEl.innerHTML = `
        ${d.img   ? `<img src="${d.img}" alt="">` : ''}
        ${d.video ? `<video src="${d.video}" autoplay muted loop></video>` : ''}
        <div class="peek-preview__body">
          <div class="peek-preview__title">${d.title||''}</div>
          <div class="peek-preview__sub">${d.sub||''}</div>
        </div>`;
      const vw = window.innerWidth, pw = 260;
      const left = Math.max(8, Math.min(vw - pw - 8, x - pw / 2));
      const top  = y - 320 < 70 ? y + 20 : y - 320;
      peekEl.style.cssText = `left:${left}px;top:${top}px;width:${pw}px;`;
      document.body.appendChild(peekEl);
    }
    function _hidePeek() {
      clearTimeout(peekTimer); peekTimer = null;
      if (peekEl) { peekEl.remove(); peekEl = null; }
    }

    // ── 14. NAVEGAR A HOME Y MOSTRAR APP ──
    AuraRouter.navigate('home');

    // ── 15. SPLASH → APP + AUTH ──
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      const app    = document.getElementById('app');
      if (splash) {
        splash.style.transition = 'opacity .4s ease';
        splash.style.opacity = '0';
        setTimeout(async () => {
          if (splash) splash.style.display = 'none';
          if (app) app.classList.remove('hidden');
          // Auth verifica sesión y muestra login si no hay
          await AuraAuth.init();
        }, 420);
      }
    }, 1800);
  }

  // ── ESPERAR DOM ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAura);
  } else {
    bootAura();
  }

})();
