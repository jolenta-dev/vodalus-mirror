// @ts-nocheck
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { chatdb, guestdb } = require('./db');
const { ROOT_DIR, PAGES_DIR, ASSETS_DIR } = require('./paths');
const {
  COOKIE_SECRET,
  yesodWinKeys,
  YESOD_KEY_TTL_MS,
  winnerKeys,
  WINNER_KEY_TTL_MS,
  wsAuthTokens,
  WS_AUTH_TTL_MS,
  yesodJourneyRuns,
  YESOD_JOURNEY_WIN_TTL_MS,
  pruneWsAuthTokens,
} = require('./state');
const {
  parseBotanicUpgradeLevels,
  upsertBotanicGardensSave,
  refreshClickerTagHolderCache,
  nameHoldsClickerChatTag,
  computeAvailableChatTagsForUser,
  resolveSelectedChatTag,
  isPrivilegedNickname,
  toConversationId,
  resolveProtectedName,
  parseCommaSeparatedMembers,
  resolveMemberList,
  dmIdAndLabelFromCanonical,
  mergeCreatorAndExtraMembers,
  canAccessConversation,
  isPublicAnnouncementTarget,
  broadcastSeekerJourneyCompletionAnnouncement,
  broadcastPrestigeRedeemedAnnouncement,
  conversationMemberCount,
  bumpPublicRecipientReadState,
  bumpReadStateAfterChatInsert,
  seedReadStateForNewMembers,
  getReadStatsForUser,
  markConversationReadForUser,
  syncVipMembersToVipConversation,
} = require('./conversation');

function registerRoutes(app) {
app.use('/public', express.static(path.join(ROOT_DIR, 'public')));
app.use('/pages', express.static(PAGES_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/indev', express.static(path.join(ROOT_DIR, 'indev')));

app.get('/api/lastfm', (req, res) => {
  const url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jolenta_&api_key=99d2c48aa9dc8a960f85a1765e11bb80&format=json&limit=1';
  fetch(url).then(r => r.json()).then(data => res.json(data)).catch(() => res.status(500).json({ error: 'Last.fm unavailable' }));
});

// one shared quote per utc calendar day, pulled from botns.txt
const botnsPath = path.join(ASSETS_DIR, 'other', 'botns.txt');
let cachedDailyQuote = { date: '', quote: '' };
function getDailyQuote() {
    const today = new Date().toISOString().split('T')[0];
    if (cachedDailyQuote.date !== today) {
        const quotes = fs.readFileSync(botnsPath, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
        const quote = quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : '';
        cachedDailyQuote = { date: today, quote };
    }
    return cachedDailyQuote;
}
app.get('/api/daily-quote', (req, res) => {
    try {
        res.json(getDailyQuote());
    } catch (e) {
        res.status(500).json({ error: 'failed to load daily quote' });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(PAGES_DIR, 'chat', 'chat.html')));

// stuff for Katharine
// conversation helpers
// conversations api
app.get('/api/conversations', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    const allRooms = chatdb.prepare(`
        SELECT id, COALESCE(label, id) AS label, type
        FROM conversations
        WHERE type = 'room'
    `).all();
    const rooms = allRooms.filter((room) => canAccessConversation(room.id, nickname));
    let dms = [];
    if (nickname) {
        const lowerNickname = nickname.toLowerCase();
        if (lowerNickname === 'admin') {
            dms = chatdb.prepare(`
                SELECT DISTINCT id, COALESCE(label, id) AS label, type
                FROM conversations
                WHERE type = 'dm'
            `).all();
        } else {
            dms = chatdb.prepare(`
                SELECT DISTINCT c.id, COALESCE(c.label, c.id) AS label, c.type
                FROM conversations c
                JOIN conversation_members cm ON cm.conversation_id = c.id
                WHERE c.type = 'dm' AND LOWER(cm.user_name) = LOWER(?)
            `).all(nickname);
        }
    }
    const map = new Map();
    rooms.concat(dms).forEach((c) => map.set(c.id, c));
    const conversations = Array.from(map.values()).sort((a, b) => {
        if (a.id === 'general') return -1;
        if (b.id === 'general') return 1;
        return String(a.label).localeCompare(String(b.label));
    });
    if (nickname) {
        const prBaseline = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(nickname);
        const nameForBaseline = prBaseline ? prBaseline.name : nickname;
        const insertPublicBaseline = chatdb.prepare(`
            INSERT OR IGNORE INTO conversation_read_state (user_name, conversation_id, last_read_message_id)
            SELECT ?, ?, COALESCE(MAX(id), 0) FROM messages
            WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
        `);
        conversations.forEach((c) => {
            if (conversationMemberCount(c.id) === 0) {
                insertPublicBaseline.run(nameForBaseline, c.id, c.id);
            }
        });
    }
    conversations.forEach((c) => {
        const st = getReadStatsForUser(c.id, nickname);
        c.serverReadTracked = st.serverReadTracked;
        c.unreadChatCount = st.unreadChatCount;
        c.readChatLineCount = st.readChatLineCount;
        c.totalChatLines = st.totalChatLines;
    });
    res.json({ conversations });
});

app.get('/api/conversations/:conversationId/messages', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    const conversationId = req.params.conversationId;
    if (!canAccessConversation(conversationId, nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    const beforeId = Number(req.query.beforeId);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 150));
    if (!Number.isFinite(beforeId) || beforeId <= 0) {
        return res.status(400).json({ error: 'beforeId required' });
    }
    const rows = chatdb.prepare(`
        SELECT m.id AS id, m.name, m.message, m.date, COALESCE(p.vip, 0) AS vip,
            COALESCE(m.color, p.color, '#000000') AS color,
            COALESCE(m.decoration, p.decoration, '') AS decoration,
            COALESCE(p.journey_level, 0) AS journey_level,
            COALESCE(p.prestige_level, 0) AS prestige_level,
            COALESCE(p.selected_chat_tag, '') AS selected_chat_tag,
            m.kind
        FROM messages m
        LEFT JOIN protected_names p ON LOWER(p.name) = LOWER(m.name)
        WHERE m.conversation_id = ?
          AND m.kind != 'announcement'
          AND m.id < ?
        ORDER BY m.id DESC
        LIMIT ?
    `).all(conversationId, beforeId, limit);
    const messages = rows.map((row) => ({
        ...row,
        all_tags: computeAvailableChatTagsForUser(row.name, !!row.vip, row.journey_level, row.prestige_level),
        selected_chat_tag: resolveSelectedChatTag(row.name, !!row.vip, row.journey_level, row.prestige_level, row.selected_chat_tag)
    })).sort((a, b) => {
        const aTime = new Date(a.date).getTime() || 0;
        const bTime = new Date(b.date).getTime() || 0;
        return aTime - bTime;
    });
    const beforeRow = chatdb.prepare('SELECT date FROM messages WHERE id = ?').get(beforeId);
    const beforeMs = beforeRow ? (new Date(beforeRow.date).getTime() || 0) : 0;
    const lowerMs = rows.length === limit && messages.length
        ? (new Date(messages[0].date).getTime() || 0)
        : 0;
    const convCreatedRow = chatdb.prepare('SELECT created_at FROM conversations WHERE id = ?').get(conversationId);
    const convCreatedMs = convCreatedRow && convCreatedRow.created_at
        ? (new Date(convCreatedRow.created_at).getTime() || 0)
        : 0;
    const annRows = chatdb.prepare(`
        SELECT a.author AS name, a.message, a.date, 0 AS vip,
            '#000000' AS color, '' AS decoration, 0 AS journey_level, 0 AS prestige_level,
            'announcement' AS kind, NULL AS conversationId,
            a.scope AS _scope
        FROM announcements a
        WHERE a.scope = 'global'
            OR (a.scope = 'public' AND ? = 1)
            OR (a.scope = 'here' AND a.conversation_id = ?)
    `).all(isPublicAnnouncementTarget(conversationId) ? 1 : 0, conversationId);
    const announcements = annRows.filter((row) => {
        const ts = new Date(row.date).getTime() || 0;
        if (beforeMs && ts >= beforeMs) return false;
        if (ts < lowerMs) return false;
        if (row._scope === 'here') return true;
        return ts >= convCreatedMs;
    }).map(({ _scope, ...rest }) => rest);
    res.json({ messages, announcements });
});

app.post('/api/conversations/:conversationId/mark-read', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!nickname) return res.status(401).json({ error: 'not logged in' });
    const conversationId = req.params.conversationId;
    if (!canAccessConversation(conversationId, nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    markConversationReadForUser(conversationId, nickname);
    res.json({ success: true });
});

app.get('/api/conversations/:conversationId/members', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    const conversationId = req.params.conversationId;
    const conv = chatdb.prepare('SELECT id, type FROM conversations WHERE id = ?').get(conversationId);
    if (!conv) {
        return res.status(404).json({ error: 'chat not found' });
    }
    if (!canAccessConversation(conversationId, nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    const memberCountRow = chatdb.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId);
    const memberCount = memberCountRow ? memberCountRow.count : 0;

    let rows;
    if (memberCount === 0 && conv.type === 'room') {
        rows = chatdb.prepare(`
            SELECT name,
                   COALESCE(vip, 0) AS vip,
                   COALESCE(journey_level, 0) AS journey_level,
                   COALESCE(prestige_level, 0) AS prestige_level,
                   COALESCE(selected_chat_tag, '') AS selected_chat_tag,
                   COALESCE(color, '#c71585') AS color,
                   COALESCE(decoration, '⋆˙⟡') AS decoration
            FROM protected_names
            ORDER BY LOWER(name)
        `).all();
    } else {
        rows = chatdb.prepare(`
            SELECT COALESCE(p.name, cm.user_name) AS name,
                   COALESCE(p.vip, 0) AS vip,
                   COALESCE(p.journey_level, 0) AS journey_level,
                   COALESCE(p.prestige_level, 0) AS prestige_level,
                   COALESCE(p.selected_chat_tag, '') AS selected_chat_tag,
                   COALESCE(p.color, '#000000') AS color,
                   COALESCE(p.decoration, '') AS decoration
            FROM conversation_members cm
            LEFT JOIN protected_names p ON LOWER(p.name) = LOWER(cm.user_name)
            WHERE cm.conversation_id = ?
            ORDER BY LOWER(COALESCE(p.name, cm.user_name))
        `).all(conversationId);
    }

    const members = rows.map((r) => {
        const vip = !!r.vip;
        const lower = String(r.name || '').trim().toLowerCase();
        /* protected_names defaults (pink, ⋆˙⟡) are VIP styling; ordinary non-VIPs must not inherit them in the roster */
        const keepDbColor = vip || lower === 'jolenta' || lower === 'admin';
        const color = keepDbColor ? r.color : '#000000';
        const decoration =
            vip && r.decoration != null && String(r.decoration).trim() !== ''
                ? String(r.decoration)
                : '';
        return {
            name: r.name,
            vip,
            journey_level: r.journey_level != null ? r.journey_level : 0,
            prestige_level: r.prestige_level != null ? r.prestige_level : 0,
            selected_chat_tag: resolveSelectedChatTag(
                r.name,
                vip,
                r.journey_level != null ? r.journey_level : 0,
                r.prestige_level != null ? r.prestige_level : 0,
                r.selected_chat_tag
            ),
            all_tags: computeAvailableChatTagsForUser(
                r.name,
                vip,
                r.journey_level != null ? r.journey_level : 0,
                r.prestige_level != null ? r.prestige_level : 0
            ),
            color,
            decoration
        };
    });
    res.json({ members });
});

app.post('/api/conversations/:conversationId/members/remove', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!isPrivilegedNickname(nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    const conversationId = req.params.conversationId;
    const conv = chatdb.prepare('SELECT id, type FROM conversations WHERE id = ?').get(conversationId);
    if (!conv || (conv.type !== 'room' && conv.type !== 'dm')) {
        return res.status(404).json({ error: 'chat not found' });
    }
    const { members } = req.body || {};
    const raw = parseCommaSeparatedMembers(members);
    if (!raw.length) {
        return res.status(400).json({ error: 'enter at least one name to remove' });
    }
    const selectMember = chatdb.prepare(`
        SELECT user_name FROM conversation_members
        WHERE conversation_id = ? AND LOWER(user_name) = LOWER(?)
    `);
    const notMembers = [];
    const toRemove = [];
    const seen = new Set();
    for (const name of raw) {
        const row = selectMember.get(conversationId, name);
        if (!row) {
            notMembers.push(name);
            continue;
        }
        const k = row.user_name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        toRemove.push(row.user_name);
    }
    if (notMembers.length) {
        return res.status(400).json({ error: `not a member of this chat: ${notMembers.join(', ')}` });
    }
    const deleteMember = chatdb.prepare(`
        DELETE FROM conversation_members
        WHERE conversation_id = ? AND LOWER(user_name) = LOWER(?)
    `);
    try {
        chatdb.transaction(() => {
            toRemove.forEach((m) => deleteMember.run(conversationId, m));
        })();
    } catch (e) {
        return res.status(500).json({ error: 'failed to remove members' });
    }
    res.json({ success: true, removed: toRemove });
});

app.get('/api/chat-tag-preference', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!nickname) return res.status(401).json({ error: 'not logged in' });
    const row = chatdb.prepare(
        'SELECT name, vip, journey_level, prestige_level, selected_chat_tag FROM protected_names WHERE LOWER(name) = LOWER(?)'
    ).get(nickname);
    if (!row) return res.status(404).json({ error: 'only registered names can set chat tag preference' });
    const tags = computeAvailableChatTagsForUser(row.name, !!row.vip, row.journey_level, row.prestige_level);
    const selected = resolveSelectedChatTag(row.name, !!row.vip, row.journey_level, row.prestige_level, row.selected_chat_tag);
    res.json({ tags, selected, clicker_tag_holder: clickerTagHolderCanonical });
});

app.post('/api/chat-tag-preference', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!nickname) return res.status(401).json({ error: 'not logged in' });
    const requested = String((req.body && req.body.tag) || '').trim();
    const row = chatdb.prepare(
        'SELECT name, vip, journey_level, prestige_level FROM protected_names WHERE LOWER(name) = LOWER(?)'
    ).get(nickname);
    if (!row) return res.status(404).json({ error: 'only registered names can set chat tag preference' });
    const tags = computeAvailableChatTagsForUser(row.name, !!row.vip, row.journey_level, row.prestige_level);
    if (!requested || !tags.includes(requested)) {
        return res.status(400).json({ error: 'invalid tag for this user', tags });
    }
    chatdb.prepare('UPDATE protected_names SET selected_chat_tag = ? WHERE LOWER(name) = LOWER(?)').run(requested, row.name);
    res.json({ success: true, selected: requested });
});

/** Registered users: open existing 2-person (or self) DM or create it. */
app.post('/api/conversations/open-dm', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    const creatorCanon = nickname ? resolveProtectedName(nickname) : null;
    if (!creatorCanon) {
        return res.status(403).json({ error: 'only registered nicknames can start direct messages' });
    }
    const raw = String((req.body && req.body.peer) || '').trim();
    if (!raw) {
        return res.status(400).json({ error: 'enter a nickname' });
    }
    const peerCanon = resolveProtectedName(raw);
    if (!peerCanon) {
        return res.status(400).json({ error: `no registered account for: ${raw}` });
    }
    const insertConv = chatdb.prepare('INSERT INTO conversations (id, type, label) VALUES (?, ?, ?)');
    const insertMember = chatdb.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_name, role) VALUES (?, ?, ?)');

    let id;
    let label;
    let memberList;
    if (peerCanon.toLowerCase() === creatorCanon.toLowerCase()) {
        const pair = dmIdAndLabelFromCanonical(creatorCanon, creatorCanon);
        id = pair.id;
        label = pair.label;
        memberList = [creatorCanon];
    } else {
        const pair = dmIdAndLabelFromCanonical(creatorCanon, peerCanon);
        id = pair.id;
        label = pair.label;
        memberList = [creatorCanon, peerCanon];
    }

    const existing = chatdb.prepare('SELECT id, type, label FROM conversations WHERE id = ?').get(id);
    if (existing) {
        if (existing.type !== 'dm') {
            return res.status(409).json({ error: 'conversation id collision' });
        }
        return res.json({
            success: true,
            existed: true,
            conversation: { id: existing.id, label: existing.label, type: 'dm' }
        });
    }
    try {
        chatdb.transaction(() => {
            insertConv.run(id, 'dm', label);
            memberList.forEach((m) => insertMember.run(id, m, 'member'));
            seedReadStateForNewMembers(id, memberList);
        })();
    } catch (e) {
        return res.status(500).json({ error: 'failed to create direct message' });
    }
    return res.json({ success: true, existed: false, conversation: { id, label, type: 'dm' } });
});

app.post('/api/conversations', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!isPrivilegedNickname(nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    const { name, members, isPublic } = req.body || {};
    const isPublicBool = !!isPublic;
    const insertConv = chatdb.prepare('INSERT INTO conversations (id, type, label) VALUES (?, ?, ?)');
    const insertMember = chatdb.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_name, role) VALUES (?, ?, ?)');

    if (isPublicBool) {
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'room name is required' });
        }
        const label = String(name).trim();
        const existingByLabel = chatdb.prepare(`
            SELECT id FROM conversations
            WHERE type = 'room' AND LOWER(TRIM(COALESCE(label, ''))) = LOWER(?)
        `).get(label);
        if (existingByLabel) {
            return res.status(409).json({ error: 'a chat with this name already exists' });
        }
        const baseId = toConversationId(label);
        if (chatdb.prepare('SELECT 1 FROM conversations WHERE id = ?').get(baseId)) {
            return res.status(409).json({ error: 'a chat with this name already exists' });
        }
        const id = baseId;
        try {
            chatdb.transaction(() => {
                insertConv.run(id, 'room', label);
            })();
        } catch (e) {
            return res.status(500).json({ error: 'failed to create chat' });
        }
        return res.json({ success: true, conversation: { id, label, type: 'room' } });
    }

    const creatorCanon = nickname ? resolveProtectedName(nickname) : null;
    if (!creatorCanon) {
        return res.status(400).json({ error: 'private chats require a registered (claimed) account; you are not in the member registry' });
    }

    const rawFromField = parseCommaSeparatedMembers(members);
    const { canonical: resolvedExtra, unknown } = resolveMemberList(rawFromField);
    if (unknown.length) {
        return res.status(400).json({ error: `no registered account for: ${unknown.join(', ')}` });
    }

    const allMembers = mergeCreatorAndExtraMembers(creatorCanon, resolvedExtra);

    if (allMembers.length === 2) {
        const { id, label } = dmIdAndLabelFromCanonical(allMembers[0], allMembers[1]);
        if (chatdb.prepare('SELECT 1 FROM conversations WHERE id = ?').get(id)) {
            return res.status(409).json({ error: 'a chat with this name already exists' });
        }
        try {
            chatdb.transaction(() => {
                insertConv.run(id, 'dm', label);
                allMembers.forEach((m) => insertMember.run(id, m, 'member'));
                seedReadStateForNewMembers(id, allMembers);
            })();
        } catch (e) {
            return res.status(500).json({ error: 'failed to create chat' });
        }
        return res.json({ success: true, conversation: { id, label, type: 'dm' } });
    }

    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'room name is required (unless exactly two participants for a DM)' });
    }
    const label = String(name).trim();
    const existingByLabel = chatdb.prepare(`
        SELECT id FROM conversations
        WHERE type = 'room' AND LOWER(TRIM(COALESCE(label, ''))) = LOWER(?)
    `).get(label);
    if (existingByLabel) {
        return res.status(409).json({ error: 'a chat with this name already exists' });
    }
    const baseId = toConversationId(label);
    if (chatdb.prepare('SELECT 1 FROM conversations WHERE id = ?').get(baseId)) {
        return res.status(409).json({ error: 'a chat with this name already exists' });
    }
    const id = baseId;
    try {
        chatdb.transaction(() => {
            insertConv.run(id, 'room', label);
            allMembers.forEach((m) => insertMember.run(id, m, 'member'));
            seedReadStateForNewMembers(id, allMembers);
        })();
    } catch (e) {
        return res.status(500).json({ error: 'failed to create chat' });
    }
    return res.json({ success: true, conversation: { id, label, type: 'room' } });
});

app.post('/api/conversations/:conversationId/members', (req, res) => {
    const nickname = req.signedCookies.chat_sid || null;
    if (!isPrivilegedNickname(nickname)) {
        return res.status(403).json({ error: 'not authorized' });
    }
    const conversationId = req.params.conversationId;
    const conv = chatdb.prepare('SELECT id, type FROM conversations WHERE id = ?').get(conversationId);
    if (!conv || (conv.type !== 'room' && conv.type !== 'dm')) {
        return res.status(404).json({ error: 'chat not found' });
    }
    const memberCountRow = chatdb.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId);
    const memberCount = memberCountRow ? memberCountRow.count : 0;
    if (conv.type === 'dm' && memberCount >= 2) {
        return res.status(400).json({ error: 'this DM already has two participants' });
    }
    const { members } = req.body || {};
    const raw = parseCommaSeparatedMembers(members);
    if (!raw.length) {
        return res.status(400).json({ error: 'enter at least one member name' });
    }
    const { canonical, unknown } = resolveMemberList(raw);
    if (unknown.length) {
        return res.status(400).json({ error: `no registered account for: ${unknown.join(', ')}` });
    }
    let toAdd = canonical;
    if (conv.type === 'dm') {
        const slots = 2 - memberCount;
        if (canonical.length > slots) {
            return res.status(400).json({ error: `this DM can only add ${slots} more participant(s)` });
        }
        toAdd = canonical.slice(0, slots);
    }
    const insertMember = chatdb.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_name, role) VALUES (?, ?, ?)');
    try {
        chatdb.transaction(() => {
            toAdd.forEach((member) => insertMember.run(conversationId, member, 'member'));
            seedReadStateForNewMembers(conversationId, toAdd);
        })();
    } catch (e) {
        return res.status(500).json({ error: 'failed to add members' });
    }
    res.json({ success: true, added: toAdd });
});

// protected_names table stuff
// nickname claim/register + phrase redeem + cosmetics
app.post('/api/register', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'name and password are required' });
    const exists = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (exists) return res.status(409).json({ error: 'name already claimed. to reclaim, contact jolenta' });
    const hashed = await bcrypt.hash(password, 10);
    chatdb.prepare("INSERT INTO protected_names (name, password, color, decoration) VALUES (?, ?, '#000000', '')").run(name, hashed);
    res.json({ success: true });
});

app.post('/api/phrases', async (req, res) => {
    const { phrase } = req.body;
    if (!phrase) return res.status(400).json({ error: 'phrase is required' });
    const exists = chatdb.prepare('SELECT phrase FROM journey_phrases WHERE LOWER(phrase) = LOWER(?)').get(phrase); // not sure how often this will get triggered
    if (exists) return res.status(409).json({ error: 'phrase already added.' });
    chatdb.prepare('INSERT INTO journey_phrases (phrase) VALUES (?)').run(phrase);
    broadcastSeekerJourneyCompletionAnnouncement();
    res.json({ success: true });
});

app.post('/api/phrase_redeem', async (req, res) => {
    const { phrase, name, password } = req.body;
    if (!phrase || !name) return res.status(400).json({ error: 'phrase and name are required' });
    const phraseRow = chatdb.prepare('SELECT id, used FROM journey_phrases WHERE LOWER(phrase) = LOWER(?)').get(phrase);
    if (!phraseRow) return res.status(404).json({ error: 'phrase not found' });
    if (phraseRow.used) return res.status(409).json({ error: 'phrase already used' });
    const nameRow = chatdb.prepare('SELECT name, password, vip, journey_level, prestige_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!nameRow) {
        return res.status(403).json({ error: 'Name must be registered before redeeming.', code: 'register_first' });
    }
    if (nameRow.password != null && nameRow.password !== '') {
        if (!password || !(await bcrypt.compare(password, nameRow.password)))
            return res.status(401).json({ error: 'password required for protected nickname' });
    }
    const level = nameRow.journey_level != null ? nameRow.journey_level : 0;
    const nextLevel = level >= 4 ? level : level + 1;
    const setVip = nameRow.vip ? '' : ', vip = 1';
    chatdb.prepare('UPDATE protected_names SET journey_level = ?' + setVip + ' WHERE LOWER(name) = LOWER(?)').run(nextLevel, name);
    if (!nameRow.vip) {
        chatdb.prepare("INSERT OR IGNORE INTO conversations (id, type, label) VALUES ('vip', 'room', 'VIP')").run();
        const canonical = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
        if (canonical && canonical.name) {
            chatdb.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_name, role) VALUES (?, ?, ?)').run('vip', canonical.name, 'member');
            seedReadStateForNewMembers('vip', [canonical.name]);
        }
    }
    chatdb.prepare('UPDATE journey_phrases SET used = 1 WHERE LOWER(phrase) = LOWER(?)').run(phrase);
    const updated = chatdb.prepare('SELECT journey_level, prestige_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    res.json({
        success: true,
        journey_level: updated && updated.journey_level != null ? updated.journey_level : 1,
        prestige_level: updated && updated.prestige_level != null ? Number(updated.prestige_level) : (nameRow.prestige_level != null ? Number(nameRow.prestige_level) : 0)
    });
});

app.post('/api/prestige_redeem', async (req, res) => {
    const { name, password } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = chatdb.prepare('SELECT name, password, journey_level, prestige_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    if (row.password != null && row.password !== '') {
        if (!password || !(await bcrypt.compare(password, row.password)))
            return res.status(401).json({ error: 'wrong password for nickname' });
    }
    const journeyLevel = row.journey_level != null ? Number(row.journey_level) : 0;
    if (journeyLevel < 5) {
        return res.status(403).json({ error: 'you have not yet reached the pinnacle of Autarchy' });
    }
    const parsedPrestigeLevel = Number(row.prestige_level);
    const prestigeLevel = Number.isFinite(parsedPrestigeLevel) ? parsedPrestigeLevel : 0;
    const nextPrestigeLevel = prestigeLevel + 1;
    const nextJourneyLevel = Math.max(0, journeyLevel - 5);
    chatdb.prepare('UPDATE protected_names SET prestige_level = ?, journey_level = ? WHERE LOWER(name) = LOWER(?)')
        .run(nextPrestigeLevel, nextJourneyLevel, row.name);
    res.json({ success: true, prestige_level: nextPrestigeLevel, journey_level: nextJourneyLevel });
    broadcastPrestigeRedeemedAnnouncement(row.name, nextPrestigeLevel);
});


// Tier cosmetics for journey levels 1–3 
const JOURNEY_DEFAULT_COLOR = '#c71585';
const JOURNEY_DEFAULT_DECORATION = '⋆˙⟡';
const JOURNEY_TIER_COSMETICS = {
    1: { color: '#9665fc', decoration: '⋆˚꩜｡' },
    2: { color: '#f1d4fa', decoration: '⋆ ˚｡⋆୨୧˚' },
    3: { color: '#ff3db2', decoration: '₊˚⊹♡' }
};

app.post('/api/decrement-journey-level', (req, res) => {
    const sid = req.signedCookies.chat_sid;
    if (!sid) return res.status(401).json({ error: 'not logged in' });
    const row = chatdb.prepare('SELECT name, journey_level, prestige_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(sid);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const level = row.journey_level != null ? row.journey_level : 0;
    const prestigeLevel = row.prestige_level != null ? Number(row.prestige_level) : 0;
    const hasPrestiged = prestigeLevel > 0;
    const isJolenta = String(row.name || '').trim().toLowerCase() === 'jolenta';
    const parsedDecrementBy = Number(req.body && req.body.decrementBy);
    const decrementBy = Number.isInteger(parsedDecrementBy) && parsedDecrementBy > 0 ? parsedDecrementBy : 1;
    const nextLevel = Math.max(0, level - decrementBy);
    if (nextLevel === level) {
        return res.json({ success: true, journey_level: nextLevel, name: row.name });
    }
    if (!isJolenta && !hasPrestiged && nextLevel === 0) {
        chatdb.prepare(
            'UPDATE protected_names SET journey_level = ?, color = ?, decoration = ? WHERE LOWER(name) = LOWER(?)'
        ).run(nextLevel, JOURNEY_DEFAULT_COLOR, JOURNEY_DEFAULT_DECORATION, row.name);
    } else if (!isJolenta && !hasPrestiged && JOURNEY_TIER_COSMETICS[nextLevel]) {
        const { color, decoration } = JOURNEY_TIER_COSMETICS[nextLevel];
        chatdb.prepare(
            'UPDATE protected_names SET journey_level = ?, color = ?, decoration = ? WHERE LOWER(name) = LOWER(?)'
        ).run(nextLevel, color, decoration, row.name);
    } else {
        chatdb.prepare('UPDATE protected_names SET journey_level = ? WHERE LOWER(name) = LOWER(?)').run(nextLevel, row.name);
    }
    res.json({ success: true, journey_level: nextLevel, name: row.name });
});

app.post('/api/colors_decoration', async (req, res) => {
    const { name, color, decoration, password } = req.body || {};
    if (!name || !color || !decoration) return res.status(400).json({ error: 'name, color, and decoration are required' });
    if (!/^#[0-9A-Fa-f]{6}$/.test(String(color))) return res.status(400).json({ error: 'color must be #RRGGBB' });
    if (String(decoration).length > 12 || /[<>"'`]/.test(String(decoration))) {
        return res.status(400).json({ error: 'invalid decoration' });
    }
    const row = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    const nameMatchesCookie = sid && sid === String(row.name || '').toLowerCase();
    if (!nameMatchesCookie) {
        if (!row.password || !password || !(await bcrypt.compare(password, row.password))) {
            return res.status(401).json({ error: 'wrong password for nickname' });
        }
    }
    chatdb.prepare('UPDATE protected_names SET color = ?, decoration = ? WHERE LOWER(name) = LOWER(?)').run(color, decoration, name);
    res.json({ success: true });
});

// clicker api endpoints for SQL db manipulation
app.post('/api/clicker/count', async (req, res) => {
    const { name, password } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = chatdb
        .prepare(
            `SELECT p.name AS name, p.password AS password, p.clicker_count AS clicker_count,
                    COALESCE(b.upgrade1_level, 0) AS upgrade1_level,
                    COALESCE(b.upgrade2_level, 0) AS upgrade2_level,
                    COALESCE(b.upgrade3_level, 0) AS upgrade3_level,
                    COALESCE(b.upgrade4_level, 0) AS upgrade4_level,
                    COALESCE(b.upgrade5_level, 0) AS upgrade5_level,
                    COALESCE(b.upgrade6_level, 0) AS upgrade6_level,
                    COALESCE(b.upgrade7_level, 0) AS upgrade7_level,
                    COALESCE(b.upgrade8_level, 0) AS upgrade8_level,
                    COALESCE(b.upgrade9_level, 0) AS upgrade9_level,
                    COALESCE(b.upgrade10_level, 0) AS upgrade10_level
             FROM protected_names p
             LEFT JOIN botanic_gardens_saves b ON b.name = p.name
             WHERE LOWER(p.name) = LOWER(?)`
        )
        .get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    const nameMatchesCookie = sid && sid === String(row.name || '').toLowerCase();
    if (!nameMatchesCookie) {
        if (!row.password || !password || !(await bcrypt.compare(password, row.password))) {
            return res.status(401).json({ error: 'wrong password for nickname' });
        }
    }
    const clickerCount = row.clicker_count != null ? Number(row.clicker_count) : 0;
    const payload = {
        clicker_count: clickerCount,
        name: row.name,
        upgrade1_level: Number(row.upgrade1_level) || 0,
        upgrade2_level: Number(row.upgrade2_level) || 0,
        upgrade3_level: Number(row.upgrade3_level) || 0,
        upgrade4_level: Number(row.upgrade4_level) || 0,
        upgrade5_level: Number(row.upgrade5_level) || 0,
        upgrade6_level: Number(row.upgrade6_level) || 0,
        upgrade7_level: Number(row.upgrade7_level) || 0,
        upgrade8_level: Number(row.upgrade8_level) || 0,
        upgrade9_level: Number(row.upgrade9_level) || 0,
        upgrade10_level: Number(row.upgrade10_level) || 0
    };
    res.json(payload);
});

app.post('/api/clicker/update-count', async (req, res) => {
    const body = req.body || {};
    const { name, password, newCount } = body;
    if (!name || newCount === undefined || newCount === null) {
        return res.status(400).json({ error: 'name and newCount are required' });
    }
    const nextCount = Number(newCount);
    if (!Number.isFinite(nextCount) || nextCount < 0 || !Number.isInteger(nextCount)) {
        return res.status(400).json({ error: 'newCount must be a non-negative integer' });
    }
    const row = chatdb.prepare('SELECT name, password, clicker_count FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    const nameMatchesCookie = sid && sid === String(row.name || '').toLowerCase();
    if (!nameMatchesCookie) {
        if (!row.password || !password || !(await bcrypt.compare(password, row.password))) {
            return res.status(401).json({ error: 'wrong password for nickname' });
        }
    }
    const incomingLevels10 = parseBotanicUpgradeLevels(body);
    const b = chatdb
        .prepare(
            `SELECT upgrade1_level, upgrade2_level, upgrade3_level, upgrade4_level, upgrade5_level, upgrade6_level, upgrade7_level, upgrade8_level, upgrade9_level, upgrade10_level
             FROM botanic_gardens_saves WHERE name = ?`
        )
        .get(row.name);
    const currentLevels10 = [];
    for (let i = 1; i <= 10; i++) {
        const v = b ? b[`upgrade${i}_level`] : 0;
        currentLevels10.push(v != null ? Number(v) || 0 : 0);
    }
    const levels10 = incomingLevels10 || currentLevels10;
    const upgradesChanged = !!incomingLevels10 && incomingLevels10.some((v, i) => v !== currentLevels10[i]);

    if (nextCount > row.clicker_count && upgradesChanged) {
        return res.status(409).json({ error: 'stale session: upgrade levels differ from saved state.' });
    }
    if (nextCount < row.clicker_count && !upgradesChanged) {
        return res.status(400).json({ error: 'newCount must be greater than current or show change in upgrades.' });
    }
    chatdb.prepare('UPDATE protected_names SET clicker_count = ? WHERE LOWER(name) = LOWER(?)').run(nextCount, name);
    upsertBotanicGardensSave(row.name, nextCount, levels10);
    refreshClickerTagHolderCache();
    res.json({ success: true, clicker_count: nextCount, name: row.name });
});

app.post('/api/clicker/get-global-counts', async (req, res) => {
    const rows = chatdb
        .prepare(
            `SELECT name, journey_level, prestige_level, vip, color, decoration, clicker_count
             FROM protected_names WHERE clicker_count > 0
             ORDER BY clicker_count DESC, name COLLATE NOCASE ASC`
        )
        .all();
    const globalCounts = rows.map((r) => ({
        name: r.name,
        journey_level: r.journey_level != null ? Number(r.journey_level) : 0,
        prestige_level: r.prestige_level != null ? Number(r.prestige_level) : 0,
        vip: !!r.vip,
        color: r.color ? r.color : '#000000',
        decoration: r.decoration != null ? String(r.decoration) : '',
        clicker_count: r.clicker_count != null ? Number(r.clicker_count) : 0,
        holds_clicker_tag: nameHoldsClickerChatTag(r.name)
    }));
    res.json({ global_counts: globalCounts });
});

// manual announcements endpoint (privileged users only)
app.post('/api/announcements', (req, res) => {
    const nickname = (req.signedCookies.chat_sid || '').toLowerCase();
    if (nickname !== 'admin' && nickname !== 'jolenta') {
        return res.status(403).json({ error: 'not authorized' });
    }
    const { message, scope, conversationId } = req.body || {};
    if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'message is required' });
    }
    const normalizedScope = (scope === 'public' || scope === 'here') ? scope : 'global';
    const scopeConversationId = normalizedScope === 'here' ? (conversationId || 'general') : null;
    const author = req.signedCookies.chat_sid || 'system';
    const date = new Date().toLocaleString();
    chatdb.prepare('INSERT INTO announcements (author, message, date, scope, conversation_id) VALUES (?, ?, ?, ?, ?)').run(author, String(message).trim(), date, normalizedScope, scopeConversationId);
    const outbound = { name: author, message: String(message).trim(), date, vip: false, color: '#000000', decoration: '', journey_level: 0, kind: 'announcement', scope: normalizedScope };
    wss.clients.forEach((client) => {
        if (client.readyState !== 1) return;
        if (normalizedScope === 'global') {
            client.send(JSON.stringify({ type: 'message', data: outbound }));
            return;
        }
        if (normalizedScope === 'public') {
            if (isPublicAnnouncementTarget(client.conversationId)) {
                client.send(JSON.stringify({ type: 'message', data: outbound }));
            }
            return;
        }
        if (normalizedScope === 'here' && client.conversationId === scopeConversationId) {
            client.send(JSON.stringify({ type: 'message', data: outbound }));
        }
    });
    res.json({ success: true });
});

// system announcements endpoint (used by atrium events)
app.post('/api/announcements/system', (req, res) => {
    const { event, name } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event is required' });
    const date = new Date().toLocaleString();
    const insertAnnouncement = chatdb.prepare('INSERT INTO announcements (author, message, date, scope, conversation_id) VALUES (?, ?, ?, ?, ?)');
    let message = null;
    if (event === 'journey_level_decremented') {
        const lookupName = name || req.signedCookies.chat_sid;
        if (lookupName) {
            const row = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(lookupName);
            if (row) {
                message = `${row.name} has lost their title and been demoted`;
            } else {
                message = 'Someone has lost their title and been demoted';
            }
        } else {
            message = 'Someone has lost their title and been demoted';
        }
    } else {
        if (!name) return res.status(400).json({ error: 'name is required for this event' });
        const row = chatdb.prepare('SELECT name, vip, journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
        if (!row) return res.status(404).json({ error: 'name not found' });
        if (event === 'phrase_redeemed') {
            message = `${row.name} has just redeemed the phrase of the Increate's creation!`;
        } else if (event === 'vip_granted') {
            if (!row.vip) return res.status(403).json({ error: 'vip status required for this event' });
            const welcomeMessage = `Welcome ${row.name}`;
            insertAnnouncement.run('system', welcomeMessage, date, 'here', 'vip');
            const outbound = {
                name: 'system',
                message: welcomeMessage,
                date,
                vip: false,
                color: '#000000',
                decoration: '',
                journey_level: 0,
                kind: 'announcement',
                scope: 'here'
            };
            wss.clients.forEach((client) => {
                if (client.readyState !== 1) return;
                if (client.conversationId === 'vip') {
                    client.send(JSON.stringify({ type: 'message', data: outbound }));
                }
            });
            return res.json({ success: true });
        } else if (event === 'all_gambling_complete') {
            const level = row.journey_level != null ? row.journey_level : 0;
            if (level < 4) return res.status(403).json({ error: 'journey level too low for this event' });
            message = `${row.name} has now completed all gambling... that Urth has to offer...`;
        } else if (event === 'yesod_journey') {
            const level = row.journey_level != null ? row.journey_level : 0;
            if (level < 5) return res.status(403).json({ error: 'journey level too low for this event' });
            message = `${row.name} has brought forth the New Sun (and is now a MASTER GAMBLER).`;
        } else {
            return res.status(400).json({ error: 'invalid system event' });
        }
    }
    insertAnnouncement.run('system', message, date, 'public', null);
    const outbound = { name: 'system', message, date, vip: false, color: '#000000', decoration: '', journey_level: 0, kind: 'announcement', scope: 'public' };
    wss.clients.forEach((client) => {
        if (client.readyState !== 1) return;
        if (isPublicAnnouncementTarget(client.conversationId)) {
            client.send(JSON.stringify({ type: 'message', data: outbound }));
        }
    });
    res.json({ success: true });
});

// non-reupdiation stuff for journeys is here
// journey reward/key flow
app.post('/api/winner', async (req, res) => {
    const { name, key } = req.body || {};
    if (!name || !key) return res.status(400).json({ error: 'name and key required' });
    const canonical = chatdb.prepare('SELECT name, journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!canonical) return res.status(404).json({ error: 'name not found' });
    const lowerName = String(canonical.name).toLowerCase();
    const entry = winnerKeys.get(lowerName);
    if (!entry || entry.key !== key || entry.expiresAt < Date.now()) {
        if (entry && entry.expiresAt < Date.now()) winnerKeys.delete(lowerName);
        return res.status(403).json({ error: 'invalid or expired winner key' });
    }
    winnerKeys.delete(lowerName);
    const row = chatdb.prepare('SELECT journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(canonical.name);
    const level = (row && row.journey_level != null) ? row.journey_level : 0;
    const nextLevel = level >= 4 ? level : level + 1;
    chatdb.prepare('UPDATE protected_names SET journey_level = ? WHERE LOWER(name) = LOWER(?)').run(nextLevel, canonical.name);
    res.json({ success: true, journey_level: nextLevel });
});

app.post('/api/winner_key', async (req, res) => {
    const { name, password } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const row = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    const nameMatchesCookie = sid && sid === String(row.name || '').toLowerCase();
    if (!nameMatchesCookie) {
        if (!row.password || !password || !(await bcrypt.compare(password, row.password))) {
            return res.status(401).json({ error: 'wrong password for nickname' });
        }
    }
    const key = crypto.randomBytes(16).toString('hex');
    winnerKeys.set(String(row.name).toLowerCase(), { key, expiresAt: Date.now() + WINNER_KEY_TTL_MS });
    res.json({ success: true, key });
});

app.post('/api/yesod_journey_step', async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const row = chatdb.prepare('SELECT name, journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const level = row.journey_level != null ? row.journey_level : 0;
    if (level < 4 && !isPrivilegedNickname(row.name)) {
        return res.status(403).json({ error: 'you must reach Autarchy (journey level 4) on the main path before this journey' });
    }
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    if (!sid || sid !== String(row.name || '').toLowerCase()) {
        return res.status(401).json({ error: 'must be logged in as this nickname to continue the journey' });
    }

    const lowerName = String(row.name).toLowerCase();
    const existing = yesodJourneyRuns.get(lowerName);
    let run = existing || { stage: 0, wonAt: 0 };
    if (run.wonAt && (Date.now() - run.wonAt) > YESOD_JOURNEY_WIN_TTL_MS) {
        run = { stage: 0, wonAt: 0 };
    }
    if (run.stage >= 4 && run.wonAt && (Date.now() - run.wonAt) <= YESOD_JOURNEY_WIN_TTL_MS) {
        return res.json({ success: true, outcome: 'already_won', stage: 4 });
    }

    if (name === 'jolenta') {
        const roll = Math.floor(Math.random() * 100) + 1;
        const failThresholdByStage = [85, 80, 65, 60]; // 0.4% to win
        const failThreshold = failThresholdByStage[Math.max(0, Math.min(run.stage, 3))];
        if (roll <= failThreshold) {
            yesodJourneyRuns.set(lowerName, { stage: 0, wonAt: 0 });
            return res.json({ success: true, outcome: 'fail', stage: 0 });
        }
    } else {
        const roll = Math.floor(Math.random() * 100) + 1;
        const failThresholdByStage = [95, 85, 75, 65]; // 0.06% to win
        const failThreshold = failThresholdByStage[Math.max(0, Math.min(run.stage, 3))];
        if (roll <= failThreshold) {
            yesodJourneyRuns.set(lowerName, { stage: 0, wonAt: 0 });
            return res.json({ success: true, outcome: 'fail', stage: 0 });
        }
    }
    if (run.stage < 3) {
        const nextStage = run.stage + 1;
        yesodJourneyRuns.set(lowerName, { stage: nextStage, wonAt: 0 });
        return res.json({ success: true, outcome: 'advance', stage: nextStage });
    }
    yesodJourneyRuns.set(lowerName, { stage: 4, wonAt: Date.now() });
    res.json({ success: true, outcome: 'win', stage: 4 });
});

app.post('/api/yesod_win_key', async (req, res) => {
    const { name, password } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const row = chatdb.prepare('SELECT name, password, journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const sid = (req.signedCookies.chat_sid || '').toLowerCase();
    const nameMatchesCookie = sid && sid === String(row.name || '').toLowerCase();
    if (!nameMatchesCookie) {
        if (!row.password || !password || !(await bcrypt.compare(password, row.password))) {
            return res.status(401).json({ error: 'wrong password for nickname' });
        }
    }
    const level = row.journey_level != null ? row.journey_level : 0;
    if (level !== 4 && !isPrivilegedNickname(row.name)) {
        return res.status(403).json({ error: 'must be level 4 to claim yesod key' });
    }
    const lowerName = String(row.name).toLowerCase();
    const run = yesodJourneyRuns.get(lowerName);
    const hasFreshJourneyWin = !!(run && run.stage >= 4 && run.wonAt && (Date.now() - run.wonAt) <= YESOD_JOURNEY_WIN_TTL_MS);
    if (!hasFreshJourneyWin) return res.status(403).json({ error: 'must win the journey before claiming this reward' });
    const key = crypto.randomBytes(16).toString('hex');
    yesodWinKeys.set(lowerName, { key, expiresAt: Date.now() + YESOD_KEY_TTL_MS });
    res.json({ success: true, key });
});

app.post('/api/big_winner', async (req, res) => {
    const { name, key } = req.body || {};
    if (!name || !key) return res.status(400).json({ error: 'name and key required' });
    const row = chatdb.prepare('SELECT journey_level FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!row) return res.status(404).json({ error: 'name not found' });
    const level = row.journey_level != null ? row.journey_level : 0;
    if (level !== 4 && !isPrivilegedNickname(name)) {
        return res.status(403).json({ error: 'must be level 4 to claim this reward' });
    }
    const entry = yesodWinKeys.get(String(name).toLowerCase());
    if (!entry || entry.key !== key || entry.expiresAt < Date.now()) {
        if (entry && entry.expiresAt < Date.now()) yesodWinKeys.delete(String(name).toLowerCase());
        return res.status(403).json({ error: 'invalid or expired win key' });
    }
    yesodWinKeys.delete(String(name).toLowerCase());
    const nextLevel = 5;
    chatdb.prepare('UPDATE protected_names SET journey_level = ? WHERE LOWER(name) = LOWER(?)').run(nextLevel, name);
    res.json({ success: true, journey_level: nextLevel });
});

/* not currently used, keeping in case it's needed later. make sure to re-add proxy_pass for it
app.post('/api/vipcheck', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const row = chatdb.prepare('SELECT vip FROM protected_names WHERE name = ?').get(name);
    return res.json({ vip: !!(row && row.vip) });
});
*/

// login/session cookie endpoints
app.post('/api/login', async (req, res) => {
	const { name, password } = req.body;
	const protected_name = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
	if (!protected_name) {
        res.cookie('chat_sid', name, {httpOnly: true, signed: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000});
        return res.json({ success: true });
    }
	if (!password || !(await bcrypt.compare(password, protected_name.password)))
		return res.status(401).json({ error: 'wrong password for nickname' });
    res.cookie('chat_sid', protected_name.name, {httpOnly: true, signed: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000});
	res.json({ success: true });
});

app.post('/api/adminLogin', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: 'name and password are required' });
    }
    const protected_name = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
    if (!protected_name) {
        return res.status(404).json({ error: 'name not found' });
    }
    let passwordMatch = false;
    try {
        passwordMatch = await bcrypt.compare(password, protected_name.password);
    } catch (e) {
        return res.status(500).json({ error: 'password check failed' });
    }
    if (!passwordMatch) {
        return res.status(401).json({ error: 'wrong password' });
    }
    if (protected_name.name.toLowerCase() !== 'admin' && protected_name.name.toLowerCase() !== 'jolenta') {
        return res.status(403).json({ error: 'not authorized' });
    }
    res.cookie('chat_sid', protected_name.name, { httpOnly: true, signed: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ success: true });
});

app.get('/api/me', (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const nickname = req.signedCookies.chat_sid;
    if (!nickname) return res.status(401).json({ error: 'not logged in' });
    const pnRow = chatdb.prepare('SELECT journey_level, vip, prestige_level, selected_chat_tag FROM protected_names WHERE LOWER(name) = LOWER(?)').get(nickname);
    const journey_level = pnRow ? (pnRow.journey_level != null ? pnRow.journey_level : 0) : null;
    const vip = pnRow ? !!pnRow.vip : false;
    const prestige_level = pnRow && pnRow.prestige_level != null ? Number(pnRow.prestige_level) : 0;
    const tags = computeAvailableChatTagsForUser(nickname, vip, journey_level || 0, prestige_level);
    const selected_chat_tag = resolveSelectedChatTag(nickname, vip, journey_level || 0, prestige_level, pnRow ? pnRow.selected_chat_tag : '');
    res.json({
        nickname,
        journey_level,
        vip,
        prestige_level,
        tags,
        selected_chat_tag,
        clicker_tag_holder: clickerTagHolderCanonical
    });
});

// One-time token so the browser WebSocket can attach a session even if the
// upgrade request does not carry cookies (e.g. misconfigured reverse proxy).
app.get('/api/ws-auth', (req, res) => {
    pruneWsAuthTokens();
    const nickname = req.signedCookies.chat_sid;
    if (!nickname) return res.status(401).json({ error: 'not logged in' });
    const token = crypto.randomBytes(24).toString('hex');
    wsAuthTokens.set(token, { nickname, exp: Date.now() + WS_AUTH_TTL_MS });
    res.json({ token });
});

app.get('/api/gambling-leaderboard', (req, res) => {
    const rows = chatdb
        .prepare(
            `SELECT name, journey_level, prestige_level, vip, color, decoration FROM protected_names
             WHERE (journey_level IS NOT NULL AND journey_level > 0)
                OR (prestige_level IS NOT NULL AND prestige_level > 0)
             ORDER BY prestige_level DESC, journey_level DESC, name COLLATE NOCASE ASC`
        )
        .all()
        .map((r) => ({
            name: r.name,
            journey_level: r.journey_level != null ? Number(r.journey_level) : 0,
            prestige_level: r.prestige_level != null ? Number(r.prestige_level) : 0,
            vip: !!r.vip,
            color: r.color ? r.color : '#000000',
            decoration: r.decoration != null ? String(r.decoration) : ''
        }));
    res.json(rows);
});

// api endpoints for admin dashboard
app.get('/api/admin/sqlDbTables', (req,res) => {
    const tables = chatdb.prepare('PRAGMA table_list;').all();
    res.json({ tables: tables.map(t => ({ name: t.name })) });
});

app.post('/api/admin/sqlDbExecute', async (req,res) => {
    const { table, command, name, password } = req.body;
    if (!table || !command) return res.status(400).json({ error: 'table and command are required' });
    try {
        const protected_name = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
        if (!protected_name || protected_name.name.toLowerCase() !== 'admin' && protected_name.name.toLowerCase() !== 'jolenta') return res.status(404).json({ error: 'name not found' });
        if (!password || !(await bcrypt.compare(password, protected_name.password))) return res.status(401).json({ error: 'wrong password for admin' });
        
        const trimmedCommand = command.trim().replace(/;+$/, '');
        let result;
        if (trimmedCommand.toUpperCase().startsWith('SELECT')) {
            result = chatdb.prepare(trimmedCommand).all();
        } else {
            const runResult = chatdb.prepare(trimmedCommand).run();
            result = [{ changes: runResult.changes, lastInsertRowid: runResult.lastInsertRowid }];
        }
        
        const tableState = chatdb.prepare(`SELECT * FROM ${table}`).all();
        res.json({ result, tableState });
    } catch (e) {
        return res.status(500).json({ error: `SQL error: ${e.message}` });
    }
});

app.post('/api/admin/updateStatus', async (req,res) => {
    const { status, name, password } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    try {
        const protected_name = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
        if (!protected_name || protected_name.name.toLowerCase() !== 'admin' && protected_name.name.toLowerCase() !== 'jolenta') return res.status(404).json({ error: 'name not found' });
        if (!password || !(await bcrypt.compare(password, protected_name.password))) return res.status(401).json({ error: 'wrong password for admin' });
        fs.writeFileSync('/vodalus/assets/html/jolentas_status.html', `<html><p><span class="status-announcement">Jolenta's current status:</span> <br> <span class="status-message">${status}</span> </p></html>`);
        res.json({ success: true, message: 'status updated' });
    } catch (e) {
        return res.status(500).json({ error: `status update failed: ${e.message}` });
    }
});

app.post('/api/admin/resetPassword', async (req, res) => {
    const { username, newPassword, name, password } = req.body;
    if (!username || !newPassword) return res.status(400).json({ error: 'username and newPassword are required' });
    
    try {
        const protected_name = chatdb.prepare('SELECT name, password FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
        if (!protected_name || (protected_name.name.toLowerCase() !== 'admin' && protected_name.name.toLowerCase() !== 'jolenta')) {
            return res.status(404).json({ error: 'admin access required' });
        }
        if (!password || !(await bcrypt.compare(password, protected_name.password))) {
            return res.status(401).json({ error: 'wrong password for admin' });
        }
        
        const targetUser = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(username);
        if (!targetUser) {
            return res.status(404).json({ error: `user '${username}' not found` });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        chatdb.prepare('UPDATE protected_names SET password = ? WHERE LOWER(name) = LOWER(?)').run(hashedPassword, username);
        
        res.json({ success: true, message: `Password for '${targetUser.name}' reset successfully` });
    } catch (e) {
        return res.status(500).json({ error: `password reset failed: ${e.message}` });
    }
});

}

module.exports = { registerRoutes };
