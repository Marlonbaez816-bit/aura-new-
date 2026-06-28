
/* ============================================
   AURA — auth.js
   Autenticación real con Supabase Auth
   ============================================ */

window.AuraAuth = (() => {
  let _profile = null; // perfil de la tabla `profiles`

  // ── Getters ─────────────────────────────────
  function isLoggedIn() {
    return !!SupaDB.auth.getSession();
  }

  function currentUser() {
    return _profile;
  }

  // ── Cargar perfil desde Supabase ─────────────
  async function loadProfile() {
    const authUser = SupaDB.auth.getUser();
    if (!authUser) return null;

    const { data, error } = await (await SupaDB.from('profiles'))
      .eq('id', authUser.id)
      .single();

    if (error || !data) {
      // Si no existe perfil aún, crearlo
      const newProfile = {
        id:            authUser.id,
        name:          authUser.user_metadata?.name || authUser.email.split('@')[0],
        handle:        '@' + (authUser.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, ''),
        bio:           '✨ Nuevo en Aura',
        avatar_url:    null,
        aura_score:    100,
        network_count: 0,
        eco_count:     0,
      };
      await SupaDB.insert('profiles', newProfile);
      _profile = newProfile;
    } else {
      _profile = data;
    }

    AuraStore.set('user', _profile);
    return _profile;
  }

  // ── Logout ────────────────────────────────────
  async function logout() {
    await SupaDB.auth.signOut();
    _profile = null;
    AuraStore.set('user', null);
    AuraToast.show('Sesión cerrada');
    showLoginScreen();
  }

  // ── Pantalla de login ─────────────────────────
  function showLoginScreen() {
    AuraModal.show({
      title: null,
      content: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:20px;padding-bottom:8px;">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--gradient-orb);
            box-shadow:var(--shadow-glow);display:flex;align-items:center;justify-content:center;
            font-size:32px;color:white;">✦</div>

          <div style="text-align:center;">
            <div style="font-size:26px;font-weight:700;font-family:var(--font-display);">Bienvenido a Aura</div>
            <div style="font-size:14px;color:var(--color-text-secondary);margin-top:4px;">Tu espacio. Tu aura.</div>
          </div>

          <!-- TABS -->
          <div style="display:flex;width:100%;border-radius:12px;background:var(--color-bg-input);padding:3px;gap:3px;">
            <button id="tab-login"    onclick="AuraAuth._switchTab('login')"
              style="flex:1;padding:9px;border-radius:10px;font-size:14px;font-weight:600;
              background:var(--color-bg-card);box-shadow:var(--shadow-sm);cursor:pointer;">
              Iniciar sesión
            </button>
            <button id="tab-register" onclick="AuraAuth._switchTab('register')"
              style="flex:1;padding:9px;border-radius:10px;font-size:14px;font-weight:600;
              background:transparent;cursor:pointer;color:var(--color-text-muted);">
              Crear cuenta
            </button>
          </div>

          <!-- FORMULARIO -->
          <div id="auth-form" style="width:100%;display:flex;flex-direction:column;gap:12px;">
            <input id="auth-email"    class="input-field" type="email"    placeholder="Correo electrónico">
            <input id="auth-password" class="input-field" type="password" placeholder="Contraseña">
            <div id="auth-name-wrap" style="display:none;">
              <input id="auth-name" class="input-field" type="text" placeholder="Tu nombre" style="width:100%;">
            </div>
            <div id="auth-error" style="font-size:13px;color:var(--color-error);text-align:center;display:none;"></div>
            <button id="auth-submit-btn" class="btn btn-primary btn-block" onclick="AuraAuth._submitForm()">
              Iniciar sesión
            </button>
          </div>
        </div>
      `
    });
  }

  // ── Alternar login / registro ─────────────────
  function _switchTab(tab) {
    const isRegister = tab === 'register';
    document.getElementById('tab-login').style.background    = isRegister ? 'transparent' : 'var(--color-bg-card)';
    document.getElementById('tab-login').style.color         = isRegister ? 'var(--color-text-muted)' : '';
    document.getElementById('tab-register').style.background = isRegister ? 'var(--color-bg-card)' : 'transparent';
    document.getElementById('tab-register').style.color      = isRegister ? '' : 'var(--color-text-muted)';
    document.getElementById('auth-name-wrap').style.display  = isRegister ? 'block' : 'none';
    document.getElementById('auth-submit-btn').textContent   = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
    document.getElementById('auth-submit-btn').dataset.mode  = tab;
    document.getElementById('auth-error').style.display      = 'none';
  }

  // ── Enviar formulario ─────────────────────────
  async function _submitForm() {
    const btn      = document.getElementById('auth-submit-btn');
    const mode     = btn.dataset.mode || 'login';
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const name     = document.getElementById('auth-name')?.value?.trim();
    const errEl    = document.getElementById('auth-error');

    if (!email || !password) {
      _showError('Completa el correo y la contraseña');
      return;
    }

    btn.textContent = 'Cargando...';
    btn.disabled    = true;

    let result;
    if (mode === 'register') {
      result = await SupaDB.auth.signUp(email, password, { name });
    } else {
      result = await SupaDB.auth.signIn(email, password);
    }

    btn.disabled = false;

    if (result.error) {
      const msg = result.error.msg || result.error.message || 'Error al autenticar';
      _showError(msg);
      btn.textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
      return;
    }

    // Éxito
    await loadProfile();
    AuraModal.close();
    AuraToast.show(`¡Bienvenido${_profile?.name ? ', ' + _profile.name : ''}! ✦`, 'success');
    AuraRouter.navigate('home');
  }

  function _showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  // ── Init ──────────────────────────────────────
  async function init() {
    if (isLoggedIn()) {
      await loadProfile();
    } else {
      setTimeout(showLoginScreen, 800);
    }
  }

  return {
    isLoggedIn, currentUser, logout,
    showLoginScreen, loadProfile, init,
    _switchTab, _submitForm,
  };
})();
