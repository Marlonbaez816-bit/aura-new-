/* ============================================
   AURA — karma.js
   Aura Score real: lee y escribe en Supabase
   Tablas: profiles (aura_score), karma_events
   ============================================ */

window.AuraKarma = (() => {
  const _rules = [
    { action: 'Publicar un Eco',          points: +10, icon: '✦' },
    { action: 'Recibir un like',          points:  +2, icon: '❤️' },
    { action: 'Recibir un comentario',    points:  +5, icon: '💬' },
    { action: 'Ser compartido',           points:  +8, icon: '🔁' },
    { action: 'Seguir a alguien',         points:  +1, icon: '➕' },
    { action: 'Eco guardado por otros',   points: +15, icon: '🔖' },
    { action: 'SubAura activa',           points: +25, icon: '🌐' },
    { action: 'Contenido reportado',      points: -20, icon: '⚠️' },
  ];

  const _levels = [
    { label: 'Semilla',  min: 0,    color: '#10B981' },
    { label: 'Brote',    min: 100,  color: '#F59E0B' },
    { label: 'Llama',    min: 500,  color: '#EF4444' },
    { label: 'Nova',     min: 1000, color: '#7C3AED' },
    { label: 'Cosmos',   min: 5000, color: '#EC4899' },
  ];

  function _getLevel(score) {
    let level = _levels[0];
    for (const l of _levels) { if (score >= l.min) level = l; }
    return level;
  }

  function _getNextLevel(score) {
    for (const l of _levels) { if (score < l.min) return l; }
    return null; // máximo nivel
  }

  // ── Añadir puntos y guardar en Supabase ───────
  async function add(points, reason) {
    const user = AuraAuth.currentUser();
    if (!user) return;

    const newScore = Math.max(0, (user.aura_score || 0) + points);

    // Actualizar en Supabase
    await SupaDB.update('profiles', { id: user.id }, { aura_score: newScore });

    // Registrar evento en karma_events
    await SupaDB.insert('karma_events', {
      user_id: user.id,
      points,
      reason,
    });

    // Actualizar cache local
    user.aura_score = newScore;
    AuraStore.set('user', user);

    AuraToast.show(
      `${points > 0 ? '+' : ''}${points} Aura · ${reason}`,
      points > 0 ? 'success' : 'error'
    );
  }

  // ── Cargar historial de eventos ───────────────
  async function _loadHistory() {
    const user = AuraAuth.currentUser();
    const container = document.getElementById('karma-history');
    if (!container || !user) return;

    container.innerHTML = `<div class="skeleton" style="height:12px;width:60%;margin:16px auto;border-radius:6px;"></div>`;

    const { data } = await (await SupaDB.from('karma_events'))
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .select('id, points, reason, created_at');

    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px 16px;">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">Sin historial aún</div>
          <div class="empty-state__text">Publica Ecos, conecta con personas y gana Aura</div>
        </div>`;
      return;
    }

    container.innerHTML = data.map(ev => {
      const positive = ev.points > 0;
      const time     = new Date(ev.created_at).toLocaleDateString('es', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      return `
        <div style="display:flex;align-items:center;gap:12px;
          padding:12px 16px;border-bottom:1px solid var(--color-border);">
          <div style="width:36px;height:36px;border-radius:50%;
            background:${positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};
            display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
            ${positive ? '✦' : '⚠️'}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:500;">${ev.reason || 'Acción'}</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">${time}</div>
          </div>
          <div style="font-size:15px;font-weight:700;
            color:${positive ? 'var(--color-success)' : 'var(--color-error)'};">
            ${positive ? '+' : ''}${ev.points}
          </div>
        </div>`;
    }).join('');
  }

  // ── Render página ─────────────────────────────
  function render() {
    const user  = AuraAuth.currentUser();
    const score = user?.aura_score || 0;
    const level = _getLevel(score);
    const next  = _getNextLevel(score);

    const prevMin = level.min;
    const nextMin = next ? next.min : score;
    const range   = nextMin - prevMin || 1;
    const progress = next
      ? Math.min(((score - prevMin) / range) * 100, 100)
      : 100;

    setTimeout(_loadHistory, 0);

    return `
      <div class="page">

        <!-- SCORE HERO -->
        <div style="padding:32px 16px 24px;text-align:center;
          background:var(--gradient-soft);
          border-bottom:1px solid var(--color-border);">

          <div style="width:110px;height:110px;border-radius:50%;
            background:var(--gradient-orb);box-shadow:var(--shadow-glow);
            display:flex;align-items:center;justify-content:center;
            font-size:40px;margin:0 auto 20px;
            animation:orbPulse 2s ease-in-out infinite;">✦</div>

          <div style="font-size:52px;font-weight:800;font-family:var(--font-display);
            background:var(--gradient-primary);-webkit-background-clip:text;
            -webkit-text-fill-color:transparent;background-clip:text;
            line-height:1;">${score.toLocaleString('es')}</div>

          <div style="font-size:13px;color:var(--color-text-muted);margin-top:4px;
            font-weight:500;letter-spacing:.3px;">AURA SCORE</div>

          <!-- NIVEL -->
          <div style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;
            background:${level.color}18;border:1px solid ${level.color}40;
            border-radius:999px;padding:6px 16px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${level.color};
              box-shadow:0 0 6px ${level.color};"></div>
            <span style="font-size:14px;font-weight:700;color:${level.color};">
              Nivel ${level.label}
            </span>
          </div>

          <!-- BARRA DE PROGRESO -->
          <div style="margin-top:20px;">
            <div style="height:8px;background:rgba(0,0,0,0.08);border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${progress}%;background:var(--gradient-primary);
                border-radius:999px;transition:width .8s var(--ease-spring);"></div>
            </div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-top:8px;">
              ${next
                ? `${score.toLocaleString('es')} / ${next.min.toLocaleString('es')} para <b style="color:${next.color}">${next.label}</b>`
                : '<b style="color:var(--color-primary)">Nivel máximo alcanzado ✦</b>'}
            </div>
          </div>
        </div>

        <!-- REGLAS -->
        <div style="padding:20px 16px 8px;">
          <div class="section-title" style="margin-bottom:12px;">Cómo ganar Aura</div>
          ${_rules.map(r => `
            <div style="display:flex;align-items:center;gap:12px;
              padding:11px 0;border-bottom:1px solid var(--color-border);">
              <span style="font-size:20px;width:32px;text-align:center;flex-shrink:0;">${r.icon}</span>
              <div style="flex:1;font-size:14px;color:var(--color-text-secondary);">${r.action}</div>
              <div style="font-weight:700;font-size:14px;
                color:${r.points > 0 ? 'var(--color-success)' : 'var(--color-error)'};">
                ${r.points > 0 ? '+' : ''}${r.points}
              </div>
            </div>`).join('')}
        </div>

        <!-- HISTORIAL -->
        <div class="divider--thick"></div>
        <div style="padding:16px 16px 8px;">
          <div class="section-title">Historial reciente</div>
        </div>
        <div id="karma-history"></div>

      </div>
    `;
  }

  function init() {
    AuraRouter.register('karma', render);
  }

  return { init, render, add };
})();
