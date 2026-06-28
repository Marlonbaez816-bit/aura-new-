/* ============================================
   AURA — chat.js
   Mensajes directos reales con Supabase
   Tablas: conversations, messages, profiles
   ============================================ */

window.AuraChat = (() => {
  let _conversations = [];
  let _activeConvId  = null;
  let _pollInterval  = null;

  // ── Cargar lista de conversaciones ────────────
  async function loadConversations() {
    const user = AuraAuth.currentUser();
    if (!user) return;

    const { data, error } = await (await SupaDB.from('conversations'))
      .eq('user_a', user.id)
      .order('updated_at', { ascending: false })
      .select(`
        id, last_message, last_message_at, unread_count,
        other_user:user_b ( id, name, handle, avatar_url )
      `);

    // También traer donde el user es user_b
    const { data: data2 } = await (await SupaDB.from('conversations'))
      .eq('user_b', user.id)
      .order('updated_at', { ascending: false })
      .select(`
        id, last_message, last_message_at, unread_count,
        other_user:user_a ( id, name, handle, avatar_url )
      `);

    const all = [...(data || []), ...(data2 || [])];
    all.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    _conversations = all;

    _renderList();
  }

  // ── Renderizar lista ──────────────────────────
  function _renderList() {
    const container = document.getElementById('chat-list');
    if (!container) return;

    if (!_conversations.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">💬</div>
          <div class="empty-state__title">Sin mensajes</div>
          <div class="empty-state__text">Busca a alguien y empieza a chatear</div>
        </div>`;
      return;
    }

    container.innerHTML = _conversations.map(conv => {
      const other   = conv.other_user || {};
      const init    = (other.name || 'A')[0].toUpperCase();
      const timeAgo = _timeAgo(conv.last_message_at);

      return `
        <div class="user-item" onclick="AuraChat.openChat('${conv.id}', '${other.id}', '${other.name}')">
          <div style="position:relative;">
            <div class="avatar avatar-md" style="background:var(--gradient-soft);display:flex;
              align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);overflow:hidden;">
              ${other.avatar_url
                ? `<img src="${other.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
                : init}
            </div>
          </div>
          <div class="user-item__info">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div class="user-item__name">${other.name || 'Usuario'}</div>
              <div style="font-size:11px;color:var(--color-text-muted);">${timeAgo}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
              <div class="user-item__bio">${conv.last_message || '...'}</div>
              ${conv.unread_count > 0
                ? `<div class="badge" style="position:static;margin-left:8px;">${conv.unread_count}</div>`
                : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Abrir conversación ────────────────────────
  async function openChat(convId, otherUserId, otherName) {
    _activeConvId = convId;

    AuraModal.show({
      title: otherName || 'Mensaje',
      content: `
        <div style="display:flex;flex-direction:column;height:62dvh;">
          <div id="messages-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;
            gap:8px;padding-bottom:8px;">
            <div class="skeleton" style="height:12px;width:50%;border-radius:6px;margin:auto;"></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <input class="input-field" id="chat-input" placeholder="Escribe un mensaje..."
              style="flex:1;" onkeydown="if(event.key==='Enter')AuraChat._sendMessage('${convId}','${otherUserId}')">
            <button onclick="AuraChat._sendMessage('${convId}','${otherUserId}')"
              class="btn btn-primary" style="flex-shrink:0;width:44px;height:44px;padding:0;border-radius:50%;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      `,
      onClose: () => {
        if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
      }
    });

    await _loadMessages(convId);

    // Marcar como leído
    await SupaDB.update('conversations', { id: convId }, { unread_count: 0 });
    loadConversations();

    // Polling liviano cada 4 segundos
    _pollInterval = setInterval(() => _loadMessages(convId), 4000);
  }

  // ── Cargar mensajes de una conversación ───────
  async function _loadMessages(convId) {
    const { data } = await (await SupaDB.from('messages'))
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(60)
      .select('id, content, sender_id, created_at');

    const container = document.getElementById('messages-list');
    if (!container) return;

    const me = AuraAuth.currentUser();
    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <div class="empty-state__icon">👋</div>
          <div class="empty-state__text">Di hola para empezar</div>
        </div>`;
      return;
    }

    container.innerHTML = data.map(msg => {
      const isMe = msg.sender_id === me?.id;
      const time = new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      return `
        <div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};">
          <div class="chat-bubble chat-bubble--${isMe ? 'out' : 'in'}">
            ${msg.content}
            <div style="font-size:10px;opacity:0.6;margin-top:4px;text-align:right;">${time}</div>
          </div>
        </div>`;
    }).join('');

    // Scroll al fondo
    container.scrollTop = container.scrollHeight;
  }

  // ── Enviar mensaje ────────────────────────────
  async function _sendMessage(convId, otherUserId) {
    const input = document.getElementById('chat-input');
    const text  = input?.value?.trim();
    if (!text) return;

    const me = AuraAuth.currentUser();
    if (!me) return;

    input.value = '';

    // Si no hay conversación aún, crearla
    let cId = convId;
    if (!cId || cId === 'undefined') {
      const { data: newConv } = await SupaDB.insert('conversations', {
        user_a:          me.id,
        user_b:          otherUserId,
        last_message:    text,
        last_message_at: new Date().toISOString(),
        unread_count:    1,
      });
      cId = newConv?.[0]?.id;
      if (!cId) { AuraToast.show('Error al enviar', 'error'); return; }
    }

    // Insertar mensaje
    const { error } = await SupaDB.insert('messages', {
      conversation_id: cId,
      sender_id:       me.id,
      content:         text,
    });

    if (error) { AuraToast.show('No se pudo enviar', 'error'); return; }

    // Actualizar última actividad de la conversación
    await SupaDB.update('conversations', { id: cId }, {
      last_message:    text,
      last_message_at: new Date().toISOString(),
    });

    // Recargar mensajes
    await _loadMessages(cId);
  }

  // ── Iniciar chat con un usuario nuevo ─────────
  async function startChatWith(otherUserId, otherName) {
    const me = AuraAuth.currentUser();
    if (!me) { AuraAuth.showLoginScreen(); return; }

    // Buscar conversación existente
    const { data: existing } = await (await SupaDB.from('conversations'))
      .eq('user_a', me.id)
      .eq('user_b', otherUserId)
      .select('id');

    const { data: existing2 } = await (await SupaDB.from('conversations'))
      .eq('user_a', otherUserId)
      .eq('user_b', me.id)
      .select('id');

    const conv = existing?.[0] || existing2?.[0];
    openChat(conv?.id || null, otherUserId, otherName);
  }

  // ── Buscar usuarios para chatear ──────────────
  async function _searchUsers(term) {
    if (!term || term.length < 2) {
      document.getElementById('user-search-results').innerHTML = '';
      return;
    }

    const { data } = await (await SupaDB.from('profiles'))
      .select('id, name, handle, avatar_url');

    const results = (data || []).filter(p =>
      p.name?.toLowerCase().includes(term.toLowerCase()) ||
      p.handle?.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 8);

    const container = document.getElementById('user-search-results');
    if (!container) return;

    container.innerHTML = results.map(p => {
      const init = (p.name || 'A')[0].toUpperCase();
      return `
        <div class="user-item" onclick="AuraChat.startChatWith('${p.id}', '${p.name}')">
          <div class="avatar avatar-sm" style="background:var(--gradient-soft);display:flex;
            align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);">
            ${p.avatar_url
              ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
              : init}
          </div>
          <div class="user-item__info">
            <div class="user-item__name">${p.name}</div>
            <div class="user-item__bio">${p.handle || ''}</div>
          </div>
        </div>`;
    }).join('') || `<div style="padding:12px 16px;font-size:14px;color:var(--color-text-muted);">Sin resultados</div>`;
  }

  // ── Render página chats ───────────────────────
  function render() {
    setTimeout(loadConversations, 0);
    return `
      <div class="page">
        <div style="padding:12px 16px;">
          <input class="input-field input-field--search"
            placeholder="Buscar personas..."
            oninput="AuraChat._searchUsers(this.value)">
        </div>
        <div id="user-search-results"></div>
        <div style="padding:4px 16px 10px;">
          <span style="font-size:12px;font-weight:600;color:var(--color-text-muted);letter-spacing:.5px;">MENSAJES</span>
        </div>
        <div id="chat-list">
          ${Array(3).fill(0).map(() => `
            <div class="user-item">
              <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
              <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                <div class="skeleton" style="height:13px;width:40%;border-radius:5px;"></div>
                <div class="skeleton" style="height:11px;width:65%;border-radius:5px;"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  // ── Utilidad ──────────────────────────────────
  function _timeAgo(iso) {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return diff + 's';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400)return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  function init() {
    AuraRouter.register('chat', render);
  }

  return { init, render, openChat, startChatWith, _sendMessage, _searchUsers };
})();
