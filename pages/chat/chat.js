// --- Convene chat page: utils, websocket, login, messages, rooms, sidebar, admin UI ---

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// VIP / journey / owner-admin tags + colored name (same rules as chat lines; used in roster + addToList)
function prestigeTagStyle(prestigeLevel) {
  const rainbow = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8f00ff'];
  const lvl = Number(prestigeLevel) || 0;
  if (lvl <= 0) return '';
  const count = Math.min(lvl, rainbow.length);
  const stops = rainbow.slice(0, count);
  if (stops.length === 1) return ' style="color: ' + stops[0] + ';"';
  return ' style="background-image: linear-gradient(90deg, ' + stops.join(', ') + '); -webkit-background-clip: text; background-clip: text; color: transparent;"';
}

/* canonical botanic clicker #1; set from /api/me and /api/chat-tag-preference */
let clickerTagHolder = null;

function getAvailableTags(name, isVip, journeyLevel, prestigeLevel) {
  const tags = [];
  const n = String(name || '').trim().toLowerCase();
  const jl = journeyLevel != null ? journeyLevel : 0;
  const pl = prestigeLevel != null ? Number(prestigeLevel) : 0;
  if (n === 'jolenta') {
    tags.push('OWNER');
    tags.push('THE HOUSE');
    tags.push('THE ARCHON');
  } else if (n === 'admin') {
    tags.push('ADMIN');
  }
  if (isVip && n !== 'jolenta') tags.push('VIP');
  if (pl > 0) tags.push('PRESTIGE ' + String(pl));
  if (jl === 1) tags.push('LVL 1 GAMBLER');
  else if (jl === 2) tags.push('LVL 2 GAMBLER');
  else if (jl === 3) tags.push('LVL 3 GAMBLER');
  else if (jl >= 4) tags.push('AUTARCH');
  if (jl >= 5 || pl > 0) tags.push('MASTER GAMBLER');
  if (clickerTagHolder && n === String(clickerTagHolder).trim().toLowerCase()) tags.push('CARPAL TUNNEL');
  return tags;
}

function tagToSpanHtml(tagText, prestigeLevel) {
  const t = String(tagText || '').trim().toUpperCase();
  if (!t) return '';
  const lvlStyle = (hex) => ' style="color: ' + hex + '; font-weight: bold;"';
  if (t === 'OWNER') return '<span class="message-owner">(OWNER) </span>';
  if (t === 'THE HOUSE') return '<span class="message-the-house">(THE HOUSE) </span>';
  if (t === 'THE ARCHON') return '<span class="message-the-archon">(THE ARCHON) </span>';
  if (t === 'ADMIN') return '<span class="message-admin">(ADMIN) </span>';
  if (t === 'VIP') return '<span class="message-vip">(VIP) </span>';
  if (t === 'LVL 1 GAMBLER') return '<span class="message-journey-1"' + lvlStyle('#9665fc') + '>(LVL 1 GAMBLER) </span>';
  if (t === 'LVL 2 GAMBLER') return '<span class="message-journey-2"' + lvlStyle('#f1d4fa') + '>(LVL 2 GAMBLER) </span>';
  if (t === 'LVL 3 GAMBLER') return '<span class="message-journey-3"' + lvlStyle('#ff3db2') + '>(LVL 3 GAMBLER) </span>';
  if (t === 'AUTARCH') return '<span class="message-journey-4">(AUTARCH) </span>';
  if (t === 'MASTER GAMBLER') return '<span class="message-master-gambler">(MASTER GAMBLER) </span>';
  if (t === 'CARPAL TUNNEL') return '<span class="message-carpal-tunnel">(CARPAL TUNNEL) </span>';
  if (t.startsWith('PRESTIGE ')) {
    const m = t.match(/^PRESTIGE\s+(\d+)$/);
    const pl = m ? Number(m[1]) : (Number(prestigeLevel) || 0);
    return '<span class="message-prestige-tag"' + prestigeTagStyle(pl) + '>(PRESTIGE ' + String(pl || 1) + ') </span>';
  }
  return '<span>(' + escapeHtml(t) + ') </span>';
}

// VIP / journey / owner-admin single selected tag + colored name (same rules as chat lines; used in roster + addToList)
function rosterNameHtml(name, isVip, journeyLevel, color, decoration, prestigeLevel, selectedTag, allTags) {
  const n = String(name || '').trim().toLowerCase();
  const tags = Array.isArray(allTags) && allTags.length ? allTags : getAvailableTags(name, isVip, journeyLevel, prestigeLevel);
  const sel = String(selectedTag || '').trim();
  const chosenTag = sel && tags.includes(sel) ? sel : (tags[0] || '');
  /* Jolenta: always OWNER; THE HOUSE / THE ARCHON / journey tags only when selected in picker. */
  const jolentaFixedRoleTags =
    n === 'jolenta' ? tagToSpanHtml('OWNER', prestigeLevel) : '';
  const jolentaPickerUpper = n === 'jolenta' && chosenTag ? String(chosenTag).trim().toUpperCase() : '';
  const selectedTagHtml =
    n === 'jolenta'
      ? chosenTag && jolentaPickerUpper !== 'OWNER'
        ? tagToSpanHtml(chosenTag, prestigeLevel)
        : ''
      : chosenTag
        ? tagToSpanHtml(chosenTag, prestigeLevel)
        : '';
  /* VIP and ADMIN must stay the immediate previous sibling of .name-color (see chat.css + .name-color).
     Journey/prestige/autarch tags must live inside .name-color so color: inherit applies. */
  const selUpper = chosenTag ? String(chosenTag).trim().toUpperCase() : '';
  const selectedTagOutsideNameColor = selUpper === 'VIP' || selUpper === 'ADMIN';
  const roleTag = jolentaFixedRoleTags + (selectedTagOutsideNameColor ? selectedTagHtml : '');
  const tagInsideNameColor = selectedTagOutsideNameColor ? '' : selectedTagHtml;
  const nameText = n === 'jolenta' ? ('⋆.˚' + escapeHtml(name)) : escapeHtml(name);
  const tooltipHtml = tags.length
    ? tags.map((t) => tagToSpanHtml(t, prestigeLevel)).join('')
    : '<span>(NO TAGS)</span>';
  const displayName =
    n === 'jolenta'
      ? '<span class="message-name">' +
      nameText +
      '</span><span class="message-name-tail" aria-hidden="true">˖<span class="message-name-tail-gold">✧</span>°.</span>'
      : '<span class="message-name">' + nameText + '</span>';
  color = color ?? '#000000';
  let deco = decoration ?? '';
  if (n === 'jolenta') deco = '';
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000';
  const safeDecoration = escapeHtml(deco);
  let decoLead = '';
  let decoTrail = '';
  if (safeDecoration) {
    decoLead = '<span class="message-name-deco">' + safeDecoration + '</span>';
    decoTrail =
      '<span class="message-name-deco message-name-deco--mirror" aria-hidden="true" style="display:inline-block;transform:scale(-1,1)">' +
      safeDecoration +
      '</span>';
  }
  const showVipColors = isVip && n !== 'jolenta';
  const nameColorClass = 'name-color' + (showVipColors ? ' name-color--vip' : '');
  return roleTag + '<span class="' + nameColorClass + '" style="color: ' + safeColor + ';">' + tagInsideNameColor + decoLead + '<span class="chat-name-hover">' + displayName + '<span class="chat-name-hover-box">' + tooltipHtml + '</span></span>' + decoTrail + '</span>';
}

function normalizeMemberRosterEntry(m) {
  if (m && typeof m === 'object' && m.name != null) {
    return {
      name: String(m.name),
      vip: !!m.vip,
      journey_level: Number(m.journey_level) || 0,
      prestige_level: Number(m.prestige_level) || 0,
      selected_chat_tag: m.selected_chat_tag ? String(m.selected_chat_tag) : '',
      all_tags: Array.isArray(m.all_tags) ? m.all_tags.map((x) => String(x)) : [],
      color: m.color,
      decoration: m.decoration != null ? String(m.decoration) : ''
    };
  }
  if (typeof m === 'string') {
    return { name: m, vip: false, journey_level: 0, prestige_level: 0, selected_chat_tag: '', all_tags: [], color: '#000000', decoration: '' };
  }
  return { name: '?', vip: false, journey_level: 0, prestige_level: 0, selected_chat_tag: '', all_tags: [], color: '#000000', decoration: '' };
}

// logged-in nickname, optional password for protected names, ws + conversation state
let nickname = null;
let password = null;
let ws;
let reconnectTimer;
let suppressReconnect = false;
let currentConversationId = 'general';
let privilegedControlsBound = false;
let knownConversations = [];
let openConversationIds = ['general'];
let unreadConversationIds = new Set();
let lastReadMessageCount = {};
let oldestMessageId = null;
let isLoadingOlder = false;
let noMoreOlder = false;
const HISTORY_PAGE_SIZE = 150;
const draggableDivModule = import('/assets/javascript/draggable-div.js');
const openDraggableWindows = {};

async function openDraggableModal(key, title, modalEl, hostEl) {
  if (!modalEl || !hostEl) return null;
  if (openDraggableWindows[key] && openDraggableWindows[key].isConnected) return openDraggableWindows[key];
  const existing = new Set(Array.from(document.querySelectorAll('[id^="div-"]')).map((el) => el.id));
  const mod = await draggableDivModule;
  mod.initDraggableDiv(title, modalEl, 'maximized');
  const created = Array.from(document.querySelectorAll('[id^="div-"]')).find((el) => !existing.has(el.id)) || null;
  if (created) {
    const closeBtn = created.querySelector('#draggable-div-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modalEl && hostEl && !hostEl.contains(modalEl)) hostEl.appendChild(modalEl);
        openDraggableWindows[key] = null;
      }, { once: true });
    }
    openDraggableWindows[key] = created;
  }
  return created;
}

function closeDraggableModal(key, modalEl, hostEl) {
  const win = openDraggableWindows[key];
  if (win && win.isConnected) win.remove();
  openDraggableWindows[key] = null;
  if (modalEl && hostEl && !hostEl.contains(modalEl)) hostEl.appendChild(modalEl);
}

function lastReadPersistKey() {
  return 'vodalus.convene.lastReadPerConv:' + encodeURIComponent(nickname || '__anon__');
}

function loadLastReadState() {
  lastReadMessageCount = {};
  try {
    const raw = localStorage.getItem(lastReadPersistKey());
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const v = Math.floor(Number(o[k]));
        if (Number.isFinite(v) && v >= 0) lastReadMessageCount[k] = v;
      }
    }
  } catch (e) { /* ignore */ }
}

function persistLastReadState() {
  try {
    localStorage.setItem(lastReadPersistKey(), JSON.stringify(lastReadMessageCount));
  } catch (e) { /* quota / private mode */ }
}

function parseLastReadObjectFromKey(keyLabel) {
  const out = {};
  try {
    const raw = localStorage.getItem('vodalus.convene.lastReadPerConv:' + encodeURIComponent(keyLabel));
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const v = Math.floor(Number(o[k]));
        if (Number.isFinite(v) && v >= 0) out[k] = v;
      }
    }
  } catch (e) { /* ignore */ }
  return out;
}

function mergeAnonLastReadIntoAfterNickLoad() {
  const anonObj = parseLastReadObjectFromKey('__anon__');
  loadLastReadState();
  for (const k of Object.keys(anonObj)) {
    if (lastReadMessageCount[k] === undefined) lastReadMessageCount[k] = anonObj[k];
  }
  persistLastReadState();
}

function unreadPersistKey() {
  return 'vodalus.convene.unreadConvIds:' + encodeURIComponent(nickname || '__anon__');
}

function getPersistedUnreadIds(keyLabel) {
  try {
    const raw = localStorage.getItem('vodalus.convene.unreadConvIds:' + encodeURIComponent(keyLabel));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function loadUnreadState() {
  unreadConversationIds.clear();
  try {
    const raw = localStorage.getItem(unreadPersistKey());
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((id) => unreadConversationIds.add(id));
  } catch (e) { /* ignore */ }
}

function persistUnreadState() {
  try {
    localStorage.setItem(unreadPersistKey(), JSON.stringify([...unreadConversationIds]));
    if (window.applyConveneNavUnreadMarker) window.applyConveneNavUnreadMarker();
  } catch (e) { /* quota / private mode */ }
}

function markConversationReadOnServer(conversationId) {
  if (!nickname || !conversationId) return;
  fetch('/api/conversations/' + encodeURIComponent(conversationId) + '/mark-read', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).catch(() => { });
}

function applyServerUnreadFromKnownConversations() {
  if (!nickname) return;
  let changed = false;
  let tabsChanged = false;
  knownConversations.forEach((c) => {
    if (!c.serverReadTracked) return;
    if (typeof c.readChatLineCount === 'number') {
      lastReadMessageCount[c.id] = c.readChatLineCount;
      changed = true;
    }
    if (c.unreadChatCount > 0) {
      unreadConversationIds.add(c.id);
      if (!openConversationIds.includes(c.id)) {
        openConversationIds.push(c.id);
        tabsChanged = true;
      }
      changed = true;
    } else if (unreadConversationIds.delete(c.id)) {
      changed = true;
    }
  });
  if (changed) {
    persistLastReadState();
    persistUnreadState();
  }
  if (tabsChanged) persistChatTabState();
}

function readStoredOpenTabs(keyLabel) {
  try {
    const raw = localStorage.getItem('vodalus.convene.openTabs:' + encodeURIComponent(keyLabel));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function countChatMessageLines() {
  return document.querySelectorAll('#message-list li.chat-message-line').length;
}

function removeUnreadDivider() {
  document.querySelectorAll('#message-list li.chat-unread-divider').forEach((el) => el.remove());
}

function maybeInsertUnreadDivider() { // really great function name very helpful
  const list = document.getElementById('message-list');
  if (!list) return;
  removeUnreadDivider();
  const id = currentConversationId;
  const msgs = list.querySelectorAll('li.chat-message-line');
  const M = msgs.length;
  let prev = lastReadMessageCount[id];
  if (prev === undefined || prev === null) return;
  prev = Math.floor(Number(prev));
  if (!Number.isFinite(prev) || prev < 0) prev = 0;
  lastReadMessageCount[id] = prev;
  if (prev > M) lastReadMessageCount[id] = prev = M;
  if (M <= prev) {
    persistLastReadState();
    return;
  }
  const div = document.createElement('li');
  div.className = 'chat-unread-divider';
  div.setAttribute('role', 'separator');
  div.setAttribute('aria-label', 'New messages');
  div.innerHTML = '<span class="chat-unread-divider__line"></span><span class="chat-unread-divider__label">new</span><span class="chat-unread-divider__line"></span>';
  if (prev <= 0) {
    const first = msgs[0];
    if (!first) return;
    list.insertBefore(div, first);
  } else {
    const afterEl = msgs[prev - 1];
    if (!afterEl) return;
    afterEl.after(div);
  }
  persistLastReadState();
}

function snapshotLastReadForConversation(convId) {
  if (!convId) return;
  if (document.getElementById('chat').style.display === 'none') return;
  const list = document.getElementById('message-list');
  if (!list) return;
  const divider = list.querySelector('li.chat-unread-divider');
  let n;
  if (divider) {
    const msgs = list.querySelectorAll('li.chat-message-line');
    n = 0;
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING) n++;
      else break;
    }
  } else {
    n = countChatMessageLines();
  }
  lastReadMessageCount[convId] = n;
  persistLastReadState();
}

function scrollUnreadDividerIntoList(list, divUnread) {
  if (!list || !divUnread) return;
  const pad = Math.max(24, Math.floor(list.clientHeight * 0.2));
  const top = divUnread.offsetTop;
  list.scrollTop = Math.max(0, top - pad);
}

/** Re-run divider after server read stats update when history already rendered (e.g. stayed on #general). */
function refreshUnreadDividerForCurrentView() {
  const list = document.getElementById('message-list');
  if (!list || !nickname) return;
  const hid = currentConversationId;
  const conv = knownConversations.find((c) => c.id === hid);
  if (!conv || !conv.serverReadTracked) return;
  if (!list.querySelectorAll('li.chat-message-line').length) return;
  if (typeof lastReadMessageCount[hid] !== 'number') return;
  maybeInsertUnreadDivider();
  const divUnread = list.querySelector('li.chat-unread-divider');
  if (divUnread) {
    requestAnimationFrame(() => scrollUnreadDividerIntoList(list, divUnread));
  }
}

function isLiveMessageFromSelf(data) {
  return (data.name || '').toLowerCase() === (nickname || '').toLowerCase();
}

function ensureUnreadTabForConversation(conversationId) {
  const byId = new Map(knownConversations.map((c) => [c.id, c]));
  function finish() {
    if (!openConversationIds.includes(conversationId)) {
      openConversationIds.push(conversationId);
    }
    unreadConversationIds.add(conversationId);
    persistUnreadState();
    persistChatTabState();
    renderConversationTabs();
  }
  if (!byId.has(conversationId)) {
    loadConversations().then(finish).catch(finish);
  } else {
    finish();
  }
}

function chatTabsStorageKey() {
  return 'vodalus.convene.openTabs:' + encodeURIComponent(nickname || '__anon__');
}

function orderOpenTabsByKnownConversations(ids) {
  const want = new Set(ids);
  return knownConversations.map((c) => c.id).filter((id) => want.has(id));
}

function persistChatTabState() {
  try {
    localStorage.setItem(chatTabsStorageKey(), JSON.stringify({
      ids: openConversationIds,
      currentId: currentConversationId
    }));
  } catch (e) { /* quota / private mode */ }
}

function applyTabStateAfterLoadConversations() {
  const allIds = knownConversations.map((c) => c.id);
  const primary = readStoredOpenTabs(nickname || '__anon__');
  const anonOnly = nickname ? readStoredOpenTabs('__anon__') : null;
  const idSet = new Set();
  if (primary && Array.isArray(primary.ids)) {
    primary.ids.filter((id) => allIds.includes(id)).forEach((id) => idSet.add(id));
  }
  if (anonOnly && Array.isArray(anonOnly.ids)) {
    anonOnly.ids.filter((id) => allIds.includes(id)).forEach((id) => idSet.add(id));
  }
  let nextOpen;
  if (idSet.size) {
    nextOpen = orderOpenTabsByKnownConversations([...idSet]);
  } else if (primary && Array.isArray(primary.ids) && primary.ids.length) {
    nextOpen = orderOpenTabsByKnownConversations(primary.ids.filter((id) => allIds.includes(id)));
    if (!nextOpen.length) nextOpen = null;
  }
  if (!nextOpen || !nextOpen.length) {
    const defaultIds = new Set();
    if (allIds.includes('general')) defaultIds.add('general');
    for (const id of unreadConversationIds) {
      if (allIds.includes(id)) defaultIds.add(id);
    }
    nextOpen = orderOpenTabsByKnownConversations([...defaultIds]);
    if (!nextOpen.length && allIds.length) {
      nextOpen = allIds.includes('general') ? ['general'] : [allIds[0]];
    }
  }
  let nextCurrent = currentConversationId;
  if (primary && primary.currentId && allIds.includes(primary.currentId) && nextOpen.includes(primary.currentId)) {
    nextCurrent = primary.currentId;
  } else if (anonOnly && anonOnly.currentId && allIds.includes(anonOnly.currentId) && nextOpen.includes(anonOnly.currentId)) {
    nextCurrent = anonOnly.currentId;
  }
  if (!allIds.includes(nextCurrent)) nextCurrent = allIds[0];
  if (!nextOpen.includes(nextCurrent)) nextOpen = nextOpen.concat([nextCurrent]);
  openConversationIds = orderOpenTabsByKnownConversations(nextOpen);
  currentConversationId = nextCurrent;
}

// optional signed ws token (cookie session); reconnect on close unless suppressed
function connect() {
  const params = new URLSearchParams();
  params.set('conversationId', currentConversationId);
  function openWebSocket(wsAuthToken) {
    if (wsAuthToken) params.set('wsAuth', wsAuthToken);
    params.set('conversationId', currentConversationId);
    ws = new WebSocket(`wss://${location.host}/chat?${params.toString()}`);
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'history') {
        const list = document.getElementById('message-list');
        list.innerHTML = '';
        oldestMessageId = null;
        noMoreOlder = false;
        isLoadingOlder = false;
        let _msgCount = 0;
        data.forEach(({ id, name, message, date, vip, color, decoration, journey_level, prestige_level, selected_chat_tag, all_tags, kind }) => {
          if (kind === 'announcement') {
            addAnnouncementToList(name, message, date);
            return;
          }
          _msgCount++;
          if (id != null && (oldestMessageId == null || id < oldestMessageId)) oldestMessageId = id;
          addToList(name, message, date, vip, color, decoration, journey_level || 0, prestige_level || 0, selected_chat_tag || '', all_tags || [], id);
        });
        if (_msgCount < HISTORY_PAGE_SIZE) noMoreOlder = true;
        const hid = currentConversationId;
        unreadConversationIds.delete(hid);
        persistUnreadState();
        if (lastReadMessageCount[hid] === undefined) {
          lastReadMessageCount[hid] = countChatMessageLines();
          persistLastReadState();
        } else {
          maybeInsertUnreadDivider();
        }
        const divUnread = list.querySelector('li.chat-unread-divider');
        if (divUnread) {
          requestAnimationFrame(() => {
            scrollUnreadDividerIntoList(list, divUnread);
          });
        } else {
          const M = countChatMessageLines();
          const prev = lastReadMessageCount[hid];
          if (typeof prev === 'number' && prev < M) {
            renderConversationTabs();
          } else {
            list.scrollTop = list.scrollHeight;
            lastReadMessageCount[hid] = M;
            persistLastReadState();
            renderConversationTabs();
          }
        }
      }
      if (type === 'message') {
        if (data.kind === 'announcement') {
          addAnnouncementToList(data.name, data.message, data.date);
          document.getElementById('message-list').scrollTop = document.getElementById('message-list').scrollHeight;
        } else {
          const conv = data.conversationId || currentConversationId;
          if (conv === currentConversationId) {
            addToList(data.name, data.message, data.date, data.vip, data.color, data.decoration, data.journey_level || 0, data.prestige_level || 0, data.selected_chat_tag || '', data.all_tags || []);
            const list = document.getElementById('message-list');
            list.scrollTop = list.scrollHeight;
            unreadConversationIds.delete(conv);
            persistUnreadState();
            if (list.querySelector('li.chat-unread-divider')) {
              persistLastReadState();
              renderConversationTabs();
            } else {
              lastReadMessageCount[conv] = countChatMessageLines();
              persistLastReadState();
              renderConversationTabs();
            }
          } else if (!isLiveMessageFromSelf(data)) {
            ensureUnreadTabForConversation(conv);
          }
        }
      }
      if (type === 'error') alert(data);
    };
    ws.onclose = () => {
      clearTimeout(reconnectTimer);
      if (!suppressReconnect) reconnectTimer = setTimeout(connect, 2500);
      suppressReconnect = false;
    };
    ws.onerror = () => {
      ws.close();
    };
  }
  fetch('/api/ws-auth', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => openWebSocket(body && body.token))
    .catch(() => openWebSocket(null));
}
loadLastReadState();
loadUnreadState();
connect();

// overlay for password prompts during login / registration
function promptPassword(messageText) {
  const overlay = document.getElementById('password-modal-overlay');
  const modal = document.getElementById('password-modal');
  const messageEl = document.getElementById('password-modal-message');
  const input = document.getElementById('password-modal-input');
  const revealCheckbox = document.getElementById('password-modal-reveal');
  const okBtn = document.getElementById('password-modal-ok');
  const cancelBtn = document.getElementById('password-modal-cancel');

  return new Promise((resolve) => {
    let resolved = false;
    function finish(value) {
      if (resolved) return;
      resolved = true;
      closeDraggableModal('password-modal', modal, overlay);
      input.value = '';
      input.type = 'password';
      if (revealCheckbox) revealCheckbox.checked = false;
      document.removeEventListener('keydown', onEscape);
      input.removeEventListener('keydown', onPasswordKeydown);
      resolve(value);
    }

    function onEscape(e) {
      if (e.key === 'Escape') finish(null);
    }

    function onPasswordKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(input.value);
      }
    }

    messageEl.textContent = messageText;
    input.value = '';
    input.type = 'password';
    if (revealCheckbox) {
      revealCheckbox.checked = false;
      revealCheckbox.onchange = () => {
        input.type = revealCheckbox.checked ? 'text' : 'password';
      };
    }

    okBtn.onclick = () => finish(input.value);
    cancelBtn.onclick = () => finish(null);
    document.addEventListener('keydown', onEscape);
    input.addEventListener('keydown', onPasswordKeydown);
    openDraggableModal('password-modal', 'password', modal, overlay).then(() => input.focus());

  });
}

// hide login, show chat + member sidebar, load room list
function submitName(loginName, pw = null) {
  nickname = loginName;
  password = pw;
  unreadConversationIds = new Set([...getPersistedUnreadIds('__anon__'), ...getPersistedUnreadIds(loginName)]);
  mergeAnonLastReadIntoAfterNickLoad();
  persistUnreadState();
  document.getElementById('setup').style.display = 'none';
  document.getElementById('chat').style.display = 'block';
  document.getElementById('member-list').hidden = false;
  bindPrivilegedControls();
  refreshPrivilegedControls();
  loadConversations();
  const list = document.getElementById('message-list');
  list.scrollTop = list.scrollHeight;
}

// nickname + password login; register flow for new names
document.getElementById('input-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('join-btn').click(); });
document.getElementById('join-btn').addEventListener('click', () => {
  const name = document.getElementById('input-name').value;
  if (!name) return alert('please enter a nickname.');
  const tryLogin = (password = null) => fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });
  tryLogin().then(async r => {
    if (r.status === 401) {
      const pw = await promptPassword('You have entered a protected nickname. Please enter the password to join.');
      if (!pw) return alert('You have failed to enter a password. Cannot use protected nickname.');
      const retry = await tryLogin(pw);
      if (!retry.ok) {
        const res = await retry.json();
        return alert(res.error || 'Wrong password for nickname. If you have forgotten this password, contact Jolenta to reclaim it.');
      }
      submitName(name, pw);
    } else if (!r.ok) {
      const res = await r.json();
      return alert(res.error || 'Login failed.');
    } else {
      // unclaimed nickname: ask user if they want to claim with a password
      const pw = await promptPassword('You have entered a new nickname! \n \nEnter a password here if you would like to claim it. If you leave this blank and press OK, your nickname will be unclaimed.');
      if (pw && pw.trim() !== "") {
        // user entered a password, try to register/claim name
        fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, password: pw }),
        }).then(r => r.json()).then(res => {
          if (res.error) return alert(res.error);
          submitName(name, pw);
        }).catch(err => alert(err.message || 'Request failed'));
      } else {
        // user chose not to claim—just continue and use unclaimed nickname (no password)
        submitName(name, null);
      }
    }
  }).catch(err => {
    alert(err.message || 'Network/login error. Try refreshing. If problem persists, contact Jolenta.');
  });
});

// if chat_sid cookie exists, skip login screen
fetch('/api/me', { credentials: 'include' })
  .then(r => {
    if (r.ok) return r.json();
    return Promise.reject(new Error('not logged in'));
  })
  .then(data => {
    if (data && data.nickname) {
      if (data.clicker_tag_holder != null) clickerTagHolder = data.clicker_tag_holder;
      submitName(data.nickname);
    }
  })
  .catch(() => { });

// composer → websocket normal message
document.getElementById('input-message').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('send-btn').click(); });
document.getElementById('send-btn').addEventListener('click', () => {
  const message = document.getElementById('input-message').value;
  if (!message) return;
  ws.send(JSON.stringify({ name: nickname, message, password, conversationId: currentConversationId, mode: 'normal', sendToAllChats: false }));
  document.getElementById('input-message').value = '';
});

// history + live: announcements vs normal lines
function formatChatTimestampForDisplay(raw) {
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return String(raw);
  return t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
function addAnnouncementToList(name, message, date) {
  const list = document.getElementById('message-list');
  const li = document.createElement('li');
  li.className = 'date-separator';
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) li.dataset.date = d.toDateString();
  li.textContent = '[' + formatChatTimestampForDisplay(date) + '] ' + name + ': ' + message;
  list.appendChild(li);
}
function addToList(name, message, date, isVip, color, decoration, journey_level = 0, prestige_level = 0, selected_chat_tag = '', all_tags = [], id) {
  const list = document.getElementById('message-list');
  const d = new Date(date);
  const dayKey = d.toDateString();
  const last = list.lastElementChild;
  const lastDay = last ? last.dataset.date : null;
  if (lastDay !== dayKey) {
    const sep = document.createElement('li');
    sep.className = 'date-separator';
    sep.dataset.date = dayKey;
    sep.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    list.appendChild(sep);
  }
  var li = document.createElement('li');
  li.className = 'chat-message-line';
  li.dataset.date = dayKey;
  if (id != null) li.dataset.messageId = id;
  const namePart = rosterNameHtml(name, isVip, journey_level, color, decoration, prestige_level, selected_chat_tag, all_tags);
  li.innerHTML = '<span class="message-date">[' + escapeHtml(formatChatTimestampForDisplay(date)) + ']</span> ' + namePart + ' : ' + escapeHtml(message);
  list.appendChild(li);
};

function prependOlderMessages(items) {
  const list = document.getElementById('message-list');
  const prevTop = list.scrollTop;
  const prevHeight = list.scrollHeight;
  const frag = document.createDocumentFragment();
  let lastDay = null;
  items.forEach((item) => {
    const d = new Date(item.date);
    const dayKey = d.toDateString();
    if (item.kind === 'announcement') {
      const li = document.createElement('li');
      li.className = 'date-separator';
      if (!Number.isNaN(d.getTime())) li.dataset.date = dayKey;
      li.textContent = '[' + formatChatTimestampForDisplay(item.date) + '] ' + item.name + ': ' + item.message;
      frag.appendChild(li);
      lastDay = dayKey;
      return;
    }
    if (dayKey !== lastDay) {
      const sep = document.createElement('li');
      sep.className = 'date-separator';
      sep.dataset.date = dayKey;
      sep.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      frag.appendChild(sep);
      lastDay = dayKey;
    }
    const li = document.createElement('li');
    li.className = 'chat-message-line';
    li.dataset.date = dayKey;
    if (item.id != null) li.dataset.messageId = item.id;
    const namePart = rosterNameHtml(item.name, item.vip, item.journey_level || 0, item.color, item.decoration, item.prestige_level || 0, item.selected_chat_tag || '', item.all_tags || []);
    li.innerHTML = '<span class="message-date">[' + escapeHtml(formatChatTimestampForDisplay(item.date)) + ']</span> ' + namePart + ' : ' + escapeHtml(item.message);
    frag.appendChild(li);
  });
  const firstChild = list.firstChild;
  list.insertBefore(frag, firstChild);
  if (firstChild && firstChild.nodeType === 1 && firstChild.classList && firstChild.classList.contains('date-separator') && firstChild.dataset.date === lastDay) {
    firstChild.remove();
  }
  list.scrollTop = list.scrollHeight - prevHeight + prevTop;
}

function loadOlderMessages() {
  if (isLoadingOlder || noMoreOlder || !oldestMessageId) return;
  isLoadingOlder = true;
  const conv = currentConversationId;
  const beforeId = oldestMessageId;
  fetch('/api/conversations/' + encodeURIComponent(conv) + '/messages?beforeId=' + encodeURIComponent(beforeId) + '&limit=' + HISTORY_PAGE_SIZE, { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
    .then((payload) => {
      if (conv !== currentConversationId) return;
      const arr = (payload && payload.messages) || [];
      const anns = (payload && payload.announcements) || [];
      if (!arr.length && !anns.length) { noMoreOlder = true; return; }
      const items = arr.concat(anns).sort((a, b) => {
        const at = new Date(a.date).getTime() || 0;
        const bt = new Date(b.date).getTime() || 0;
        return at - bt;
      });
      prependOlderMessages(items);
      let newOldest = oldestMessageId;
      arr.forEach((m) => { if (m.id != null && (newOldest == null || m.id < newOldest)) newOldest = m.id; });
      oldestMessageId = newOldest;
      if (arr.length < HISTORY_PAGE_SIZE) noMoreOlder = true;
    })
    .catch(() => { })
    .finally(() => { isLoadingOlder = false; });
}

document.getElementById('message-list').addEventListener('scroll', (e) => {
  if (e.target.scrollTop <= 80) loadOlderMessages();
});

// admin / owner: announcements + chat admin button
function isPrivilegedUser() {
  const n = (nickname || '').toLowerCase();
  return n === 'admin' || n === 'jolenta';
}

function refreshPrivilegedControls() {
  const visible = isPrivilegedUser();
  document.getElementById('announcements-btn').style.display = visible ? 'inline-block' : 'none';
  document.getElementById('new-chat-btn').style.display = visible ? 'inline-block' : 'none';
  document.getElementById('new-dm-btn').style.display = visible ? 'none' : 'inline-block';
  document.querySelector('.chat-toolbar').classList.toggle('chat-toolbar--privileged', visible);
}

// change room tab → reconnect ws with new conversationId
function switchConversation(conversationId) {
  if (!conversationId || conversationId === currentConversationId) return;
  snapshotLastReadForConversation(currentConversationId);
  markConversationReadOnServer(currentConversationId);
  currentConversationId = conversationId;
  if (!openConversationIds.includes(conversationId)) openConversationIds.push(conversationId);
  openConversationIds = orderOpenTabsByKnownConversations(openConversationIds);
  renderConversationTabs();
  persistChatTabState();
  refreshSidebarMemberList();
  if (ws && ws.readyState <= 1) {
    suppressReconnect = true;
    ws.close();
  }
  connect();
}

function closeConversationTab(conversationId, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (openConversationIds.length <= 1) return;
  const idx = openConversationIds.indexOf(conversationId);
  if (idx === -1) return;
  const closingCurrent = conversationId === currentConversationId;
  if (closingCurrent) snapshotLastReadForConversation(currentConversationId);
  markConversationReadOnServer(conversationId);
  const nextId = idx > 0 ? openConversationIds[idx - 1] : openConversationIds[idx + 1];
  openConversationIds.splice(idx, 1);
  unreadConversationIds.delete(conversationId);
  persistUnreadState();
  delete lastReadMessageCount[conversationId];
  persistLastReadState();
  persistChatTabState();
  if (closingCurrent && nextId) {
    currentConversationId = nextId;
    renderConversationTabs();
    refreshSidebarMemberList();
    if (ws && ws.readyState <= 1) {
      suppressReconnect = true;
      ws.close();
    }
    connect();
  } else {
    renderConversationTabs();
  }
}

// one button per pinned room; click switches conversation
function renderConversationTabs() {
  const mount = document.getElementById('conversation-tabs');
  mount.innerHTML = '';
  const bar = document.createElement('div');
  bar.className = 'chat-tabs';
  bar.setAttribute('role', 'tablist');
  const byId = new Map(knownConversations.map(c => [c.id, c]));
  openConversationIds.forEach((id) => {
    const c = byId.get(id);
    if (!c) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    const active = c.id === currentConversationId;
    btn.className = 'chat-tab' + (active ? ' chat-tab--active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    const label = document.createElement('span');
    label.className = 'chat-tab__label';
    label.textContent = (c.label || c.id) + (unreadConversationIds.has(c.id) ? ' (*)' : '');
    btn.appendChild(label);
    if (openConversationIds.length > 1) {
      const close = document.createElement('span');
      close.className = 'chat-tab__close';
      close.setAttribute('aria-label', 'Close tab');
      close.textContent = '\u00D7';
      close.addEventListener('click', (e) => closeConversationTab(c.id, e));
      btn.appendChild(close);
    }
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.chat-tab__close')) return;
      switchConversation(c.id);
    });
    bar.appendChild(btn);
  });
  mount.appendChild(bar);
}

// GET /api/conversations/:id/members (allowed if you can access the room)
function refreshSidebarMemberList() {
  if (!nickname) return;
  const ul = document.getElementById('member-list-ul');
  if (!ul) return;
  ul.textContent = '';
  const loading = document.createElement('li');
  loading.className = 'member-list-li--empty';
  loading.textContent = '…';
  ul.appendChild(loading);
  fetch('/api/conversations/' + encodeURIComponent(currentConversationId) + '/members', { credentials: 'include' })
    .then((r) => {
      if (!r.ok) return Promise.reject(new Error('members'));
      return r.json();
    })
    .then((data) => {
      ul.textContent = '';
      const arr = data && data.members ? data.members : [];
      if (!arr.length) {
        const li = document.createElement('li');
        li.className = 'member-list-li--empty';
        li.textContent = 'No registered names yet';
        ul.appendChild(li);
        return;
      }
      arr.forEach((raw) => {
        const m = normalizeMemberRosterEntry(raw);
        const li = document.createElement('li');
        li.className = 'member-list-entry';
        li.innerHTML = rosterNameHtml(m.name, m.vip, m.journey_level, m.color, m.decoration, m.prestige_level, m.selected_chat_tag, m.all_tags);
        ul.appendChild(li);
      });
    })
    .catch(() => {
      ul.textContent = '';
      const li = document.createElement('li');
      li.className = 'member-list-li--empty';
      li.textContent = 'Could not load';
      ul.appendChild(li);
    });
}

// fetch rooms user may open; may reconnect ws if current room dropped
function loadConversations() {
  return fetch('/api/conversations', { credentials: 'include' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('failed to load conversations')))
    .then(data => {
      knownConversations = (data && data.conversations) ? data.conversations : [];
      if (!knownConversations.length) knownConversations = [{ id: 'general', label: 'general', type: 'room' }];
      const prevCurrent = currentConversationId;
      applyTabStateAfterLoadConversations();
      if (nickname && prevCurrent !== currentConversationId) {
        snapshotLastReadForConversation(prevCurrent);
        markConversationReadOnServer(prevCurrent);
      }
      applyServerUnreadFromKnownConversations();
      refreshUnreadDividerForCurrentView();
      renderConversationTabs();
      persistChatTabState();
      refreshSidebarMemberList();
      if (ws && ws.readyState <= 1 && prevCurrent !== currentConversationId) {
        suppressReconnect = true;
        ws.close();
        connect();
      }
    })
    .catch(() => {
      knownConversations = [{ id: 'general', label: 'general', type: 'room' }];
      currentConversationId = 'general';
      openConversationIds = ['general'];
      renderConversationTabs();
      persistChatTabState();
      refreshSidebarMemberList();
    });
}

// modal checklist: always mirror which chats are open as tabs (incl. after closing a tab)
function openChatDirectory() {
  const list = document.getElementById('chat-directory-list');
  list.innerHTML = '';
  const openSet = new Set(openConversationIds);
  knownConversations.forEach((c) => {
    const row = document.createElement('label');
    row.style.display = 'block';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = c.id;
    cb.checked = openSet.has(c.id);
    row.appendChild(cb);
    row.appendChild(document.createTextNode(' ' + (c.label || c.id)));
    list.appendChild(row);
  });
  openDraggableModal(
    'chat-directory-modal',
    'available chats',
    document.getElementById('chat-directory-modal'),
    document.getElementById('chat-directory-modal-overlay')
  );
}

// one-time: hark!, chat admin (new room / members), directory buttons
function bindPrivilegedControls() {
  if (privilegedControlsBound) return;
  privilegedControlsBound = true;

  const announcementsBtn = document.getElementById('announcements-btn');
  const announcementOverlay = document.getElementById('new-announcement-modal-overlay');
  const announcementInput = document.getElementById('new-announcement-modal-input');
  const announcementScope = document.getElementById('new-announcement-modal-scope');
  const announcementOk = document.getElementById('new-announcement-modal-ok');
  const announcementCancel = document.getElementById('new-announcement-modal-cancel');

  announcementsBtn.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    openDraggableModal('new-announcement-modal', 'announcement', document.getElementById('new-announcement-modal'), announcementOverlay);
    announcementInput.value = '';
    announcementScope.value = 'global';
    announcementInput.focus();
  });
  announcementOk.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    const message = announcementInput.value.trim();
    if (!message) return;
    ws.send(JSON.stringify({ name: nickname, message, password, conversationId: currentConversationId, mode: 'announcement', scope: announcementScope.value, sendToAllChats: false }));
    closeDraggableModal('new-announcement-modal', document.getElementById('new-announcement-modal'), announcementOverlay);
  });
  announcementInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      announcementOk.click();
    }
  });
  announcementCancel.addEventListener('click', () => {
    closeDraggableModal('new-announcement-modal', document.getElementById('new-announcement-modal'), announcementOverlay);
  });

  const newChatBtn = document.getElementById('new-chat-btn');
  const newChatOverlay = document.getElementById('new-chat-modal-overlay');
  const newChatInput = document.getElementById('new-chat-modal-input');
  const newChatMembersInput = document.getElementById('new-chat-members-input');
  const newChatPublic = document.getElementById('new-chat-modal-public');
  const newChatOk = document.getElementById('new-chat-modal-ok');
  const newChatCancel = document.getElementById('new-chat-modal-cancel');
  const chatAdminTabNew = document.getElementById('chat-admin-tab-new');
  const chatAdminTabMembers = document.getElementById('chat-admin-tab-members');
  const chatAdminPanelNew = document.getElementById('chat-admin-panel-new');
  const chatAdminPanelMembers = document.getElementById('chat-admin-panel-members');
  const chatAdminMembersContext = document.getElementById('chat-admin-members-context');
  const chatAdminMembersList = document.getElementById('chat-admin-members-list');
  const chatEditMembersInput = document.getElementById('chat-edit-members-input');
  const chatEditMembersOk = document.getElementById('chat-edit-members-ok');
  const chatRemoveMembersInput = document.getElementById('chat-remove-members-input');
  const chatRemoveMembersOk = document.getElementById('chat-remove-members-ok');

  function refreshChatAdminMembersContext() {
    const c = knownConversations.find((x) => x.id === currentConversationId);
    const label = c ? (c.label || c.id) : currentConversationId;
    chatAdminMembersContext.textContent = 'Managing members for: ' + label;
  }

  function refreshChatAdminMembersList() {
    if (!isPrivilegedUser()) return;
    chatAdminMembersList.textContent = 'Loading…';
    fetch('/api/conversations/' + encodeURIComponent(currentConversationId) + '/members', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed to load members'))))
      .then((data) => {
        const arr = data && data.members ? data.members : [];
        if (!arr.length) {
          chatAdminMembersList.innerHTML = '<span class="chat-admin-members-empty">No registered names (public room).</span>';
          return;
        }
        chatAdminMembersList.innerHTML = '<ul class="chat-admin-members-ul">' + arr.map((raw) => {
          const m = normalizeMemberRosterEntry(raw);
          return '<li class="member-list-entry">' + rosterNameHtml(m.name, m.vip, m.journey_level, m.color, m.decoration, m.prestige_level, m.selected_chat_tag, m.all_tags) + '</li>';
        }).join('') + '</ul>';
      })
      .catch(() => {
        chatAdminMembersList.textContent = 'Could not load members.';
      });
  }

  function refreshChatAdminMembersPanel() {
    refreshChatAdminMembersContext();
    refreshChatAdminMembersList();
  }

  function setChatAdminTab(which) {
    const isNew = which === 'new';
    chatAdminPanelNew.hidden = !isNew;
    chatAdminPanelMembers.hidden = isNew;
    chatAdminTabNew.classList.toggle('chat-admin-tab--active', isNew);
    chatAdminTabMembers.classList.toggle('chat-admin-tab--active', !isNew);
    if (isNew) newChatInput.focus();
    else {
      refreshChatAdminMembersPanel();
      chatEditMembersInput.focus();
    }
  }

  function syncNewChatMembersFieldDisabled() {
    newChatMembersInput.disabled = newChatPublic.checked;
    if (newChatPublic.checked) newChatMembersInput.value = '';
  }
  newChatPublic.addEventListener('change', syncNewChatMembersFieldDisabled);

  newChatBtn.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    setChatAdminTab('new');
    openDraggableModal('new-chat-modal', 'chat admin', document.getElementById('new-chat-modal'), newChatOverlay);
    newChatInput.value = '';
    newChatMembersInput.value = '';
    chatEditMembersInput.value = '';
    chatRemoveMembersInput.value = '';
    newChatPublic.checked = false;
    syncNewChatMembersFieldDisabled();
    refreshChatAdminMembersContext();
    newChatInput.focus();
  });
  chatAdminTabNew.addEventListener('click', () => setChatAdminTab('new'));
  chatAdminTabMembers.addEventListener('click', () => setChatAdminTab('members'));
  newChatOk.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    const name = newChatInput.value.trim();
    const members = newChatMembersInput.value;
    const isPublic = newChatPublic.checked;
    if (isPublic && !name) return alert('enter a chat name.');
    if (!isPublic && !name && !members.trim()) return alert('enter a chat name, or add another registered member for a 2-person DM.');
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, members, isPublic })
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'failed to create room');
        return payload;
      })
      .then((payload) => {
        closeDraggableModal('new-chat-modal', document.getElementById('new-chat-modal'), newChatOverlay);
        return loadConversations().then(() => {
          if (payload && payload.conversation && payload.conversation.id) switchConversation(payload.conversation.id);
        });
      })
      .catch((err) => alert(err.message || 'failed to create room'));
  });
  chatEditMembersOk.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    const members = chatEditMembersInput.value;
    if (!members.trim()) return;
    fetch('/api/conversations/' + encodeURIComponent(currentConversationId) + '/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ members })
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'failed to add members');
        return payload;
      })
      .then(() => {
        chatEditMembersInput.value = '';
        return loadConversations().then(refreshChatAdminMembersList);
      })
      .catch((err) => alert(err.message || 'failed to add members'));
  });
  chatRemoveMembersOk.addEventListener('click', () => {
    if (!isPrivilegedUser()) return;
    const members = chatRemoveMembersInput.value;
    if (!members.trim()) return;
    fetch('/api/conversations/' + encodeURIComponent(currentConversationId) + '/members/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ members })
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'failed to remove members');
        return payload;
      })
      .then(() => {
        chatRemoveMembersInput.value = '';
        return loadConversations().then(refreshChatAdminMembersList);
      })
      .catch((err) => alert(err.message || 'failed to remove members'));
  });
  newChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatAdminPanelNew.hidden) {
      e.preventDefault();
      newChatOk.click();
    }
  });
  newChatMembersInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatAdminPanelNew.hidden && !newChatMembersInput.disabled) {
      e.preventDefault();
      newChatOk.click();
    }
  });
  chatEditMembersInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatAdminPanelMembers.hidden) {
      e.preventDefault();
      chatEditMembersOk.click();
    }
  });
  chatRemoveMembersInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatAdminPanelMembers.hidden) {
      e.preventDefault();
      chatRemoveMembersOk.click();
    }
  });
  newChatCancel.addEventListener('click', () => {
    closeDraggableModal('new-chat-modal', document.getElementById('new-chat-modal'), newChatOverlay);
  });

  const openChatDirectoryBtn = document.getElementById('open-chat-directory-btn');
  const chatDirectoryOverlay = document.getElementById('chat-directory-modal-overlay');
  const chatDirectoryOk = document.getElementById('chat-directory-modal-ok');
  const chatDirectoryCancel = document.getElementById('chat-directory-modal-cancel');
  const chatTagBtn = document.getElementById('chat-tag-btn');
  const chatTagOverlay = document.getElementById('chat-tag-modal-overlay');
  const chatTagList = document.getElementById('chat-tag-list');
  const chatTagOk = document.getElementById('chat-tag-modal-ok');
  const chatTagCancel = document.getElementById('chat-tag-modal-cancel');
  const newDMBtn = document.getElementById('new-dm-btn');
  const newDMOverlay = document.getElementById('new-dm-modal-overlay');
  const newDMInput = document.getElementById('new-dm-modal-input');
  const newDMOK = document.getElementById('new-dm-modal-ok');
  const newDMCancel = document.getElementById('new-dm-modal-cancel');
  let newDmEscapeHandler = null;

  function closeNewDmModal() {
    if (newDmEscapeHandler) {
      document.removeEventListener('keydown', newDmEscapeHandler);
      newDmEscapeHandler = null;
    }
    closeDraggableModal('new-dm-modal', document.getElementById('new-dm-modal'), newDMOverlay);
  }

  function submitNewDm() {
    const peer = (newDMInput && newDMInput.value || '').trim();
    if (!peer) return alert('enter a nickname.');
    fetch('/api/conversations/open-dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ peer })
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'could not open direct message');
        return payload;
      })
      .then((payload) => {
        closeNewDmModal();
        const conv = payload && payload.conversation;
        const id = conv && conv.id;
        return loadConversations().then(() => {
          if (!id) return;
          if (id !== currentConversationId) switchConversation(id);
          else if (!openConversationIds.includes(id)) {
            openConversationIds.push(id);
            openConversationIds = orderOpenTabsByKnownConversations(openConversationIds);
            renderConversationTabs();
            persistChatTabState();
          }
          const msgInput = document.getElementById('input-message');
          if (msgInput) msgInput.focus();
        });
      })
      .catch((err) => alert(err.message || 'could not open direct message'));
  }

  newDMBtn.addEventListener('click', () => {
    if (newDmEscapeHandler) {
      document.removeEventListener('keydown', newDmEscapeHandler);
      newDmEscapeHandler = null;
    }
    openDraggableModal('new-dm-modal', 'direct message', document.getElementById('new-dm-modal'), newDMOverlay);
    if (newDMInput) {
      newDMInput.value = '';
      newDMInput.focus();
    }
    newDmEscapeHandler = (e) => {
      if (e.key === 'Escape') closeNewDmModal();
    };
    document.addEventListener('keydown', newDmEscapeHandler);
  });
  newDMOK.addEventListener('click', () => submitNewDm());
  newDMCancel.addEventListener('click', () => closeNewDmModal());
  if (newDMInput) {
    newDMInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitNewDm();
      }
    });
  }

  openChatDirectoryBtn.addEventListener('click', () => {
    loadConversations().then(openChatDirectory);
  });
  chatDirectoryOk.addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('#chat-directory-list input[type="checkbox"]:checked')).map((el) => el.value);
    if (!selected.length) {
      closeDraggableModal('chat-directory-modal', document.getElementById('chat-directory-modal'), chatDirectoryOverlay);
      return;
    }
    const prevCurrent = currentConversationId;
    openConversationIds = orderOpenTabsByKnownConversations(selected);
    let nextCurrent = currentConversationId;
    if (!openConversationIds.includes(nextCurrent)) {
      nextCurrent = openConversationIds[0];
    }
    if (nickname && nextCurrent !== prevCurrent) {
      snapshotLastReadForConversation(prevCurrent);
      markConversationReadOnServer(prevCurrent);
    }
    currentConversationId = nextCurrent;
    renderConversationTabs();
    persistChatTabState();
    closeDraggableModal('chat-directory-modal', document.getElementById('chat-directory-modal'), chatDirectoryOverlay);
    if (prevCurrent !== currentConversationId && ws && ws.readyState <= 1) {
      suppressReconnect = true;
      ws.close();
    }
    if (prevCurrent !== currentConversationId) connect();
  });
  chatDirectoryCancel.addEventListener('click', () => {
    closeDraggableModal('chat-directory-modal', document.getElementById('chat-directory-modal'), chatDirectoryOverlay);
  });

  chatTagBtn.addEventListener('click', () => {
    fetch('/api/chat-tag-preference', { credentials: 'include' })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'could not load tags');
        return payload;
      })
      .then((payload) => {
        if (payload.clicker_tag_holder !== undefined) clickerTagHolder = payload.clicker_tag_holder;
        const tags = Array.isArray(payload.tags) ? payload.tags : [];
        chatTagList.innerHTML = '';
        if (!tags.length) {
          chatTagList.textContent = 'No tags available.';
          openDraggableModal('chat-tag-modal', 'chat tag', document.getElementById('chat-tag-modal'), chatTagOverlay);
          return;
        }
        tags.forEach((tag, idx) => {
          const row = document.createElement('label');
          row.className = 'chat-tag-option';
          const cb = document.createElement('input');
          cb.type = 'radio';
          cb.name = 'chat-tag-selection';
          cb.value = tag;
          cb.checked = (tag === payload.selected) || (!payload.selected && idx === 0);
          const fake = document.createElement('span');
          fake.className = 'chat-tag-option-preview';
          fake.innerHTML = tagToSpanHtml(tag, 0).trim();
          row.appendChild(cb);
          row.appendChild(fake);
          chatTagList.appendChild(row);
        });
        openDraggableModal('chat-tag-modal', 'chat tag', document.getElementById('chat-tag-modal'), chatTagOverlay);
      })
      .catch((err) => alert(err.message || 'could not load tags'));
  });
  chatTagOk.addEventListener('click', () => {
    const checked = document.querySelector('#chat-tag-list input[name="chat-tag-selection"]:checked');
    if (!checked) {
      closeDraggableModal('chat-tag-modal', document.getElementById('chat-tag-modal'), chatTagOverlay);
      return;
    }
    fetch('/api/chat-tag-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tag: checked.value })
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload.error || 'failed to save chat tag');
        return payload;
      })
      .then(() => {
        closeDraggableModal('chat-tag-modal', document.getElementById('chat-tag-modal'), chatTagOverlay);
        refreshSidebarMemberList();
        if (ws && ws.readyState <= 1) {
          suppressReconnect = true;
          ws.close();
        }
        connect();
      })
      .catch((err) => alert(err.message || 'failed to save chat tag'));
  });
  chatTagCancel.addEventListener('click', () => {
    closeDraggableModal('chat-tag-modal', document.getElementById('chat-tag-modal'), chatTagOverlay);
  });
}

