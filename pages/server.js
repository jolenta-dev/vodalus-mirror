const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { WebSocketServer } = require('ws');
const http = require('http');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'squi?mb!o';
const cookie = require('cookie');
const cookieSignature = require('cookie-signature');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const chatdb = new Database('chat.db');
const yesodWinKeys = new Map();
const YESOD_KEY_TTL_MS = 5 * 60 * 1000;
const winnerKeys = new Map();
const WINNER_KEY_TTL_MS = 2 * 60 * 1000;
const wsAuthTokens = new Map();
const WS_AUTH_TTL_MS = 60 * 1000;

function pruneWsAuthTokens() {
    const now = Date.now();
    for (const [k, v] of wsAuthTokens) {
        if (v.exp <= now) wsAuthTokens.delete(k);
    }
}
const yesodJourneyRuns = new Map();
const YESOD_JOURNEY_WIN_TTL_MS = 10 * 60 * 1000;

// chat + journey db schema bootstrap
chatdb.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('room', 'dm')),
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT,
      PRIMARY KEY (conversation_id, user_name),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      conversation_id TEXT NOT NULL DEFAULT 'general',
      kind TEXT NOT NULL DEFAULT 'message',
      name TEXT,
      message TEXT,
      color TEXT,
      decoration TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      scope TEXT NOT NULL DEFAULT 'global'
    );
  
    CREATE TABLE IF NOT EXISTS protected_names (
      name TEXT PRIMARY KEY,
      password TEXT,
      vip BOOLEAN DEFAULT FALSE,
      color TEXT DEFAULT '#c71585',
      decoration TEXT DEFAULT '⋆˙⟡',
      journey_level INTEGER DEFAULT 0,
      prestige_level INTEGER DEFAULT 0
    );
  
    CREATE TABLE IF NOT EXISTS journey_phrases (
      id INTEGER PRIMARY KEY,
      phrase TEXT,
      used BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS conversation_read_state (
      user_name TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      last_read_message_id INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_name, conversation_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  `);
chatdb.prepare("INSERT OR IGNORE INTO conversations (id, type, label) VALUES ('general', 'room', 'general')").run();
const announcementColumns = chatdb.prepare("PRAGMA table_info(announcements)").all();
if (!announcementColumns.some(c => c.name === 'conversation_id')) {
    chatdb.exec("ALTER TABLE announcements ADD COLUMN conversation_id TEXT");
}
const protectedNameColumns = chatdb.prepare("PRAGMA table_info(protected_names)").all();
if (!protectedNameColumns.some(c => c.name === 'prestige_level')) {
    chatdb.exec("ALTER TABLE protected_names ADD COLUMN prestige_level INTEGER DEFAULT 0");
}
if (!protectedNameColumns.some(c => c.name === 'selected_chat_tag')) {
    chatdb.exec("ALTER TABLE protected_names ADD COLUMN selected_chat_tag TEXT DEFAULT ''");
}

function computeAvailableChatTagsForUser(name, vip, journeyLevel, prestigeLevel) {
    const tags = [];
    const lower = String(name || '').trim().toLowerCase();
    const jl = Number(journeyLevel) || 0;
    const pl = Number(prestigeLevel) || 0;
    if (lower === 'jolenta') {
        tags.push('OWNER');
        tags.push('THE HOUSE');
        tags.push('THE ARCHON');
    } else if (lower === 'admin') {
        tags.push('ADMIN');
    }
    if (vip && lower !== 'jolenta') tags.push('VIP');
    if (pl > 0) tags.push(`PRESTIGE ${pl}`);
    if (jl === 1) tags.push('LVL 1 GAMBLER');
    else if (jl === 2) tags.push('LVL 2 GAMBLER');
    else if (jl === 3) tags.push('LVL 3 GAMBLER');
    else if (jl >= 4) tags.push('AUTARCH');
    if (jl >= 5 || pl > 0) tags.push('MASTER GAMBLER');
    return tags;
}

function resolveSelectedChatTag(name, vip, journeyLevel, prestigeLevel, selectedTag) {
    const tags = computeAvailableChatTagsForUser(name, vip, journeyLevel, prestigeLevel);
    const selected = String(selectedTag || '').trim();
    if (selected && tags.includes(selected)) return selected;
    return tags.length ? tags[0] : '';
}

const insertPublicSystemAnnouncementStmt = chatdb.prepare(
    'INSERT INTO announcements (author, message, date, scope, conversation_id) VALUES (?, ?, ?, ?, ?)'
);
const SEEKER_JOURNEY_COMPLETION_MESSAGE = 'a seeker of truth and penitence has completed their journey...';
const PRESTIGE_REDEEMED_MESSAGE = 'a torturer has returned to that old iron gate... good luck on your passage {prestige_level}, {name}.';
// middleware + static assets
app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/indev', express.static(__dirname));

// tiny proxy endpoint for now playing widget
app.get('/api/lastfm', (req, res) => {
  const url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jolenta_&api_key=99d2c48aa9dc8a960f85a1765e11bb80&format=json&limit=1';
  fetch(url).then(r => r.json()).then(data => res.json(data)).catch(() => res.status(500).json({ error: 'Last.fm unavailable' }));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

// stuff for Katharine
// conversation helpers
function isPrivilegedNickname(nickname) {
    const n = (nickname || '').toLowerCase();
    return n === 'admin' || n === 'jolenta';
}

function toConversationId(label) {
    const base = (label || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || `room-${Date.now()}`;
}

/** Canonical name from protected_names, or null if unregistered. */
function resolveProtectedName(name) {
    if (!name || !String(name).trim()) return null;
    const row = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(String(name).trim());
    return row ? row.name : null;
}

function parseCommaSeparatedMembers(members) {
    return (String(members || '')).split(',').map((s) => s.trim()).filter(Boolean);
}

function resolveMemberList(rawNames) {
    const unknown = [];
    const seen = new Set();
    const canonical = [];
    for (const m of rawNames) {
        const resolved = resolveProtectedName(m);
        if (!resolved) {
            unknown.push(m);
            continue;
        }
        const key = resolved.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        canonical.push(resolved);
    }
    return { canonical, unknown };
}

/** Sorted pair → stable dm id (slug-slug) and label (canonical-canonical). */
function dmIdAndLabelFromCanonical(canonicalA, canonicalB) {
    const sorted = [canonicalA, canonicalB].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const slugA = toConversationId(sorted[0]);
    const slugB = toConversationId(sorted[1]);
    const id = `${slugA}-${slugB}`;
    const label = `${sorted[0]}-${sorted[1]}`;
    return { id, label };
}

function mergeCreatorAndExtraMembers(creatorCanon, resolvedExtra) {
    const seen = new Set([creatorCanon.toLowerCase()]);
    const allMembers = [creatorCanon];
    for (const c of resolvedExtra) {
        const k = c.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        allMembers.push(c);
    }
    return allMembers;
}

function canAccessConversation(conversationId, nickname) {
    const conversation = chatdb.prepare('SELECT id, type FROM conversations WHERE id = ?').get(conversationId);
    if (!conversation) return false;
    const memberCountRow = chatdb.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId);
    const memberCount = memberCountRow ? memberCountRow.count : 0;
    const lowerNickname = (nickname || '').toLowerCase();
    if (lowerNickname === 'admin') return true;
    if (lowerNickname === 'jolenta' && conversation.type === 'room' && memberCount > 2) return true;
    if (memberCount === 0) return true; // public room
    if (!nickname) return false;
    const memberRow = chatdb.prepare(`
        SELECT 1
        FROM conversation_members
        WHERE conversation_id = ? AND LOWER(user_name) = LOWER(?)
    `).get(conversationId, nickname);
    return !!memberRow;
}

function isPublicAnnouncementTarget(conversationId) {
    if (!conversationId) return false;
    if (String(conversationId).toLowerCase() === 'vip') return true;
    const memberCountRow = chatdb.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId);
    const memberCount = memberCountRow ? memberCountRow.count : 0;
    return memberCount === 0;
}

function broadcastSeekerJourneyCompletionAnnouncement() {
    const date = new Date().toLocaleString();
    insertPublicSystemAnnouncementStmt.run('system', SEEKER_JOURNEY_COMPLETION_MESSAGE, date, 'public', null);
    const outbound = {
        name: 'system',
        message: SEEKER_JOURNEY_COMPLETION_MESSAGE,
        date,
        vip: false,
        color: '#000000',
        decoration: '',
        journey_level: 0,
        kind: 'announcement',
        scope: 'public'
    };
    wss.clients.forEach((client) => {
        if (client.readyState !== 1) return;
        if (isPublicAnnouncementTarget(client.conversationId)) {
            client.send(JSON.stringify({ type: 'message', data: outbound }));
        }
    });
}

function broadcastPrestigeRedeemedAnnouncement(name, prestigeLevel) {
    const date = new Date().toLocaleString();
    const displayPrestigeLevel = Number(prestigeLevel) + 1;
    insertPublicSystemAnnouncementStmt.run('system', PRESTIGE_REDEEMED_MESSAGE.replace('{prestige_level}', displayPrestigeLevel).replace('{name}', name), date, 'public', null);
    const outbound = {
        name: 'system',
        message: PRESTIGE_REDEEMED_MESSAGE.replace('{prestige_level}', displayPrestigeLevel).replace('{name}', name),
        date,
        vip: false,
        color: '#000000',
        decoration: '',
        journey_level: 0,
        kind: 'announcement',
        scope: 'public'
    };
    wss.clients.forEach((client) => {
        if (client.readyState !== 1) return;
        if (isPublicAnnouncementTarget(client.conversationId)) {
            client.send(JSON.stringify({ type: 'message', data: outbound }));
        }
    });
}

function conversationMemberCount(conversationId) {
    const row = chatdb.prepare('SELECT COUNT(*) AS count FROM conversation_members WHERE conversation_id = ?').get(conversationId);
    return row ? row.count : 0;
}

/** Public rooms: notify all registered names + anyone who already has read state in this room (covers unclaimed nicknames that have chatted). */
function bumpPublicRecipientReadState(conversationId, senderDisplayName, prevMaxMessageId, insertIgnore) {
    const recipients = new Set();
    chatdb.prepare('SELECT name FROM protected_names').all().forEach((r) => {
        if (r && r.name) recipients.add(r.name);
    });
    chatdb.prepare('SELECT DISTINCT user_name FROM conversation_read_state WHERE conversation_id = ?').all(conversationId).forEach((r) => {
        if (r && r.user_name) recipients.add(r.user_name);
    });
    const senderLower = String(senderDisplayName).toLowerCase();
    recipients.forEach((u) => {
        if (u.toLowerCase() === senderLower) return;
        insertIgnore.run(u, conversationId, prevMaxMessageId);
    });
}

function bumpReadStateAfterChatInsert(conversationId, senderDisplayName, newMessageId, prevMaxMessageId) {
    const insertIgnore = chatdb.prepare(`
        INSERT OR IGNORE INTO conversation_read_state (user_name, conversation_id, last_read_message_id)
        VALUES (?, ?, ?)
    `);
    if (conversationMemberCount(conversationId) > 0) {
        const members = chatdb.prepare('SELECT user_name FROM conversation_members WHERE conversation_id = ?').all(conversationId);
        for (const { user_name } of members) {
            if (user_name.toLowerCase() === String(senderDisplayName).toLowerCase()) continue;
            insertIgnore.run(user_name, conversationId, prevMaxMessageId);
        }
    } else {
        bumpPublicRecipientReadState(conversationId, senderDisplayName, prevMaxMessageId, insertIgnore);
    }
    const upsert = chatdb.prepare(`
        INSERT INTO conversation_read_state (user_name, conversation_id, last_read_message_id)
        VALUES (?, ?, ?)
        ON CONFLICT(user_name, conversation_id) DO UPDATE SET
            last_read_message_id = excluded.last_read_message_id
    `);
    upsert.run(senderDisplayName, conversationId, newMessageId);
}

function seedReadStateForNewMembers(conversationId, userNames) {
    if (conversationMemberCount(conversationId) === 0) return;
    const maxId = chatdb.prepare(`
        SELECT COALESCE(MAX(id), 0) FROM messages
        WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
    `).pluck().get(conversationId);
    const insertIgnore = chatdb.prepare(`
        INSERT OR IGNORE INTO conversation_read_state (user_name, conversation_id, last_read_message_id)
        VALUES (?, ?, ?)
    `);
    userNames.forEach((u) => insertIgnore.run(u, conversationId, maxId));
}

function getReadStatsForUser(conversationId, nickname) {
    const total = chatdb.prepare(`
        SELECT COUNT(*) AS c FROM messages
        WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
    `).pluck().get(conversationId);
    if (!nickname) {
        return { serverReadTracked: false, unreadChatCount: 0, readChatLineCount: total, totalChatLines: total };
    }
    const row = chatdb.prepare(`
        SELECT last_read_message_id FROM conversation_read_state
        WHERE conversation_id = ? AND LOWER(user_name) = LOWER(?)
    `).get(conversationId, nickname);
    let lastRead = row ? row.last_read_message_id : null;
    if (lastRead == null) {
        lastRead = chatdb.prepare(`
            SELECT COALESCE(MAX(id), 0) FROM messages
            WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
        `).pluck().get(conversationId);
    }
    const unread = chatdb.prepare(`
        SELECT COUNT(*) FROM messages
        WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement' AND id > ?
    `).pluck().get(conversationId, lastRead);
    const readChatLineCount = Math.max(0, total - unread);
    return {
        serverReadTracked: true,
        unreadChatCount: unread,
        readChatLineCount,
        totalChatLines: total
    };
}

function markConversationReadForUser(conversationId, nickname) {
    if (!nickname) return;
    let userNameForRow = nickname;
    const memberRow = chatdb.prepare(`
        SELECT user_name FROM conversation_members
        WHERE conversation_id = ? AND LOWER(user_name) = LOWER(?)
    `).get(conversationId, nickname);
    if (memberRow) {
        userNameForRow = memberRow.user_name;
    } else if (conversationMemberCount(conversationId) === 0) {
        const pr = chatdb.prepare('SELECT name FROM protected_names WHERE LOWER(name) = LOWER(?)').get(nickname);
        if (pr) userNameForRow = pr.name;
    } else {
        return;
    }
    const maxId = chatdb.prepare(`
        SELECT COALESCE(MAX(id), 0) FROM messages
        WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
    `).pluck().get(conversationId);
    chatdb.prepare(`
        INSERT INTO conversation_read_state (user_name, conversation_id, last_read_message_id)
        VALUES (?, ?, ?)
        ON CONFLICT(user_name, conversation_id) DO UPDATE SET
            last_read_message_id = excluded.last_read_message_id
    `).run(userNameForRow, conversationId, maxId);
}

function syncVipMembersToVipConversation() {
    chatdb.prepare("INSERT OR IGNORE INTO conversations (id, type, label) VALUES ('vip', 'room', 'VIP')").run();
    const vipRows = chatdb.prepare('SELECT name FROM protected_names WHERE vip = 1').all();
    const insertMember = chatdb.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_name, role) VALUES (?, ?, ?)');
    vipRows.forEach((row) => {
        if (row && row.name) {
            insertMember.run('vip', row.name, 'member');
            seedReadStateForNewMembers('vip', [row.name]);
        }
    });
}
syncVipMembersToVipConversation();

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
    res.json({ tags, selected });
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
    chatdb.prepare('INSERT INTO protected_names (name, password) VALUES (?, ?)').run(name, hashed);
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

    const roll = Math.floor(Math.random() * 100) + 1;
    const failThresholdByStage = [95, 85, 75, 65]; // 0.06% to win
    const failThreshold = failThresholdByStage[Math.max(0, Math.min(run.stage, 3))];
    if (roll <= failThreshold) {
        yesodJourneyRuns.set(lowerName, { stage: 0, wonAt: 0 });
        return res.json({ success: true, outcome: 'fail', stage: 0 });
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

// stuff for Katharine cookies and websockets
// websocket heartbeat + connection lifecycle
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.isAlive === false) return client.terminate();
        client.isAlive = false;
        client.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

wss.on('connection', (ws, request) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const requestedConversationId = reqUrl.searchParams.get('conversationId');
    const wsAuth = reqUrl.searchParams.get('wsAuth');
    let nicknameFromToken = null;
    if (wsAuth) {
        const entry = wsAuthTokens.get(wsAuth);
        if (entry && entry.exp > Date.now()) {
            nicknameFromToken = entry.nickname;
            wsAuthTokens.delete(wsAuth);
        }
    }
    const cookies = cookie.parse(request.headers.cookie || '');
    const signedVal = cookies.chat_sid;
    const nicknameFromCookie = (signedVal && cookieSignature.unsign(signedVal, COOKIE_SECRET)) || null;
    ws.nickname = nicknameFromToken || nicknameFromCookie;
    const requestedId = requestedConversationId || 'general';
    ws.conversationId = canAccessConversation(requestedId, ws.nickname) ? requestedId : 'general';
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    if (ws.conversationId !== requestedId) {
        ws.send(JSON.stringify({ type: 'error', data: 'you do not have access to that chat' }));
    }

    const historyMessages = chatdb.prepare(`
        SELECT m.name, m.message, m.date, COALESCE(p.vip, 0) AS vip, 
            COALESCE(m.color, p.color, '#000000') AS color, 
            COALESCE(m.decoration, p.decoration, '') AS decoration,
            COALESCE(p.journey_level, 0) AS journey_level,
            COALESCE(p.prestige_level, 0) AS prestige_level,
            COALESCE(p.selected_chat_tag, '') AS selected_chat_tag,
            m.kind,
            m.conversation_id AS conversationId
        FROM messages m
        LEFT JOIN protected_names p ON LOWER(p.name) = LOWER(m.name)
        WHERE m.conversation_id = ?
          AND m.kind != 'announcement'
    `).all(ws.conversationId);
    const convCreatedRow = chatdb.prepare('SELECT created_at FROM conversations WHERE id = ?').get(ws.conversationId);
    const convCreatedMs = convCreatedRow && convCreatedRow.created_at
        ? (new Date(convCreatedRow.created_at).getTime() || 0)
        : 0;
    const announcementRows = chatdb.prepare(`
        SELECT a.author AS name, a.message, a.date, 0 AS vip,
            '#000000' AS color, '' AS decoration, 0 AS journey_level, 0 AS prestige_level,
            'announcement' AS kind, NULL AS conversationId,
            a.scope AS _scope
        FROM announcements a
        WHERE a.scope = 'global'
            OR (a.scope = 'public' AND ? = 1)
            OR (a.scope = 'here' AND a.conversation_id = ?)
    `).all(isPublicAnnouncementTarget(ws.conversationId) ? 1 : 0, ws.conversationId);
    const historyAnnouncements = announcementRows.filter((row) => {
        if (row._scope === 'here') return true;
        return (new Date(row.date).getTime() || 0) >= convCreatedMs;
    }).map(({ _scope, ...rest }) => rest);
    const history = historyMessages.map((row) => ({
        ...row,
        all_tags: computeAvailableChatTagsForUser(row.name, !!row.vip, row.journey_level, row.prestige_level),
        selected_chat_tag: resolveSelectedChatTag(row.name, !!row.vip, row.journey_level, row.prestige_level, row.selected_chat_tag)
    })).concat(historyAnnouncements).sort((a, b) => {
        const aTime = new Date(a.date).getTime() || 0;
        const bTime = new Date(b.date).getTime() || 0;
        return aTime - bTime;
    });
    ws.send(JSON.stringify({ type: 'history', data: history }));

    // live message handling for chat + announcements
    ws.on('message', async (raw) => {
        const parsed = JSON.parse(raw);
        const { message, mode, sendToAllChats } = parsed;
        if (!message) return;

        let nameToUse;
        if (ws.nickname) {
            nameToUse = ws.nickname;
        } else {
            const { name, password } = parsed;
            if (!name) return;
            nameToUse = name;
            const protected_name = chatdb.prepare('SELECT name, password, color, decoration FROM protected_names WHERE LOWER(name) = LOWER(?)').get(name);
            if (protected_name && (!password || !(await bcrypt.compare(password, protected_name.password))))
                return ws.send(JSON.stringify({ type: 'error', data: 'wrong password for nickname' }));
        }

        const protected_name = chatdb.prepare('SELECT name, color, decoration, journey_level, prestige_level, selected_chat_tag FROM protected_names WHERE LOWER(name) = LOWER(?)').get(nameToUse);
        const displayName = protected_name ? protected_name.name : nameToUse;
        const color = protected_name ? protected_name.color : null;
        const decoration = protected_name ? protected_name.decoration : null;
        const journey_level = protected_name ? (protected_name.journey_level || 0) : 0;
        const prestige_level = protected_name ? (protected_name.prestige_level || 0) : 0;
        const date = new Date().toLocaleString();
        const kind = mode === 'announcement' ? 'announcement' : 'message';
        const sessionName = (ws.nickname || '').toLowerCase();
        const isPrivilegedUser = sessionName === 'admin' || sessionName === 'jolenta';
        if ((kind === 'announcement' || !!sendToAllChats) && !isPrivilegedUser) {
            return ws.send(JSON.stringify({ type: 'error', data: 'not authorized for this message mode' }));
        }
        const insertMessage = chatdb.prepare('INSERT INTO messages (conversation_id, kind, name, message, color, decoration, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const vipRow = chatdb.prepare('SELECT vip FROM protected_names WHERE LOWER(name) = LOWER(?)').get(nameToUse);
        const vip = !!(vipRow && vipRow.vip);
        const all_tags = computeAvailableChatTagsForUser(displayName, vip, journey_level, prestige_level);
        const selected_chat_tag = resolveSelectedChatTag(displayName, vip, journey_level, prestige_level, protected_name ? protected_name.selected_chat_tag : '');
        const outbound = { name: displayName, message, date, vip, color, decoration, journey_level, prestige_level, selected_chat_tag, all_tags, kind, conversationId: ws.conversationId };
        if (kind === 'announcement') {
            const scope = (parsed.scope === 'public' || parsed.scope === 'here') ? parsed.scope : 'global';
            const scopeConversationId = scope === 'here' ? ws.conversationId : null;
            chatdb.prepare('INSERT INTO announcements (author, message, date, scope, conversation_id) VALUES (?, ?, ?, ?, ?)').run(displayName, message, date, scope, scopeConversationId);
            wss.clients.forEach(client => {
                if (client.readyState !== 1) return;
                if (scope === 'global') {
                    client.send(JSON.stringify({ type: 'message', data: { ...outbound, scope } }));
                    return;
                }
                if (scope === 'public') {
                    if (isPublicAnnouncementTarget(client.conversationId)) {
                        client.send(JSON.stringify({ type: 'message', data: { ...outbound, scope } }));
                    }
                    return;
                }
                if (scope === 'here' && client.conversationId === ws.conversationId) {
                    client.send(JSON.stringify({ type: 'message', data: { ...outbound, scope } }));
                }
            });
            return;
        }
        if (sendToAllChats) {
            const roomIds = chatdb.prepare("SELECT id FROM conversations WHERE type = 'room'").all().map(r => r.id);
            chatdb.transaction(() => {
                roomIds.forEach((roomId) => {
                    const prevMax = chatdb.prepare(`
                        SELECT COALESCE(MAX(id), 0) FROM messages
                        WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
                    `).pluck().get(roomId);
                    insertMessage.run(roomId, kind, displayName, message, color, decoration, date);
                    const newId = Number(chatdb.prepare('SELECT last_insert_rowid()').pluck().get());
                    bumpReadStateAfterChatInsert(roomId, displayName, newId, prevMax);
                });
            })();
            wss.clients.forEach((client) => {
                if (client.readyState !== 1) return;
                roomIds.forEach((roomId) => {
                    if (!canAccessConversation(roomId, client.nickname)) return;
                    const roomData = { ...outbound, conversationId: roomId };
                    client.send(JSON.stringify({ type: 'message', data: roomData }));
                });
            });
            return;
        }
        const messageRoomId = ws.conversationId;
        chatdb.transaction(() => {
            const prevMax = chatdb.prepare(`
                SELECT COALESCE(MAX(id), 0) FROM messages
                WHERE conversation_id = ? AND COALESCE(kind, 'message') != 'announcement'
            `).pluck().get(messageRoomId);
            insertMessage.run(messageRoomId, kind, displayName, message, color, decoration, date);
            const newId = Number(chatdb.prepare('SELECT last_insert_rowid()').pluck().get());
            bumpReadStateAfterChatInsert(messageRoomId, displayName, newId, prevMax);
        })();
        wss.clients.forEach((client) => {
            if (client.readyState !== 1) return;
            if (!canAccessConversation(messageRoomId, client.nickname)) return;
            client.send(JSON.stringify({ type: 'message', data: { ...outbound, conversationId: messageRoomId } }));
        });
    });
});

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
    res.json({ nickname, journey_level, vip, prestige_level, tags, selected_chat_tag });
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
        fs.writeFileSync('/var/www/vodalus.org/assets/html/jolentas_status.html', `<html><p><span class="status-announcement">Jolenta's current status:</span> <br> <span class="status-message">${status}</span> </p></html>`);
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

// guestbook endpoints
const guestdb = new Database('/var/www/vodalus.org/pages/guestbook.db');
guestdb.exec('CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY, name TEXT, website TEXT, note TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP)');

app.get('/api/names', (req, res) => {
    const rows = guestdb.prepare('SELECT name, date, website, note FROM names').all();
    const pnStmt = chatdb.prepare(
        'SELECT vip, journey_level, prestige_level, color, decoration FROM protected_names WHERE LOWER(name) = LOWER(?)'
    );
    const names = rows.map((r) => {
        const p = pnStmt.get(r.name);
        return {
            name: r.name,
            date: r.date,
            website: r.website,
            note: r.note,
            vip: p ? !!p.vip : false,
            journey_level: p && p.journey_level != null ? Number(p.journey_level) : 0,
            prestige_level: p && p.prestige_level != null ? Number(p.prestige_level) : 0,
            color: p && p.color ? p.color : '#000000',
            decoration: p && p.decoration != null ? String(p.decoration) : ''
        };
    });
    res.json(names);
});

app.post('/api/names', (req, res) => {
    const { name, website, note } = req.body;
    if (!name) return res.status(400).json({ error: 'no name given' });
    guestdb.prepare('INSERT INTO names (name, website, note) VALUES (?, ?, ?)').run(name, website, note);
    res.json({ success: true });
});

// server start
server.listen(3001, () => console.log('running on localhost:3001'));
