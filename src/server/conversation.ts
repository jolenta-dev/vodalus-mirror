// @ts-nocheck
const { chatdb } = require('./db');
const { getWss } = require('./app-context');
function parseBotanicUpgradeLevels(body) {
    const out = [];
    for (let i = 1; i <= 10; i++) {
        const key = `upgrade${i}_level`;
        const raw = body && body[key];
        if (raw === undefined || raw === null) return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 1e9) return null;
        out.push(n);
    }
    return out;
}

function upsertBotanicGardensSave(canonicalName, clickerCount, levels10) {
    chatdb
        .prepare(
            `INSERT INTO botanic_gardens_saves (name, clicker_count, upgrade1_level, upgrade2_level, upgrade3_level, upgrade4_level, upgrade5_level, upgrade6_level, upgrade7_level, upgrade8_level, upgrade9_level, upgrade10_level)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(name) DO UPDATE SET
               clicker_count = excluded.clicker_count,
               upgrade1_level = excluded.upgrade1_level,
               upgrade2_level = excluded.upgrade2_level,
               upgrade3_level = excluded.upgrade3_level,
               upgrade4_level = excluded.upgrade4_level,
               upgrade5_level = excluded.upgrade5_level,
               upgrade6_level = excluded.upgrade6_level,
               upgrade7_level = excluded.upgrade7_level,
               upgrade8_level = excluded.upgrade8_level,
               upgrade9_level = excluded.upgrade9_level,
               upgrade10_level = excluded.upgrade10_level`
        )
        .run(
            canonicalName,
            clickerCount,
            levels10[0],
            levels10[1],
            levels10[2],
            levels10[3],
            levels10[4],
            levels10[5],
            levels10[6],
            levels10[7],
            levels10[8],
            levels10[9]
        );
}

/** canonical protected_names.name for botanic clicker #1; null if no scores */
let clickerTagHolderCanonical = null;
function refreshClickerTagHolderCache() {
    const rows = chatdb
        .prepare(
            'SELECT name FROM protected_names WHERE clicker_count > 0 ORDER BY clicker_count DESC, name COLLATE NOCASE ASC'
        )
        .all();
    clickerTagHolderCanonical = rows[0] ? rows[0].name : null;
}
refreshClickerTagHolderCache();
setInterval(refreshClickerTagHolderCache, 1000 * 60);

function getClickerTagHolderCanonical() {
    return clickerTagHolderCanonical;
}

function nameHoldsClickerChatTag(name) {
    if (!clickerTagHolderCanonical || !name) return false;
    return String(name).trim().toLowerCase() === String(clickerTagHolderCanonical).trim().toLowerCase();
}

/* leaderboard-derived chat tag labels — add new ids here and in tagToSpanHtml (pages/chat.html) + roster-name.js */
const CHAT_TAG_CARPAL_TUNNEL = 'CARPAL TUNNEL';

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
    if (nameHoldsClickerChatTag(name)) tags.push(CHAT_TAG_CARPAL_TUNNEL);
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
    getWss().clients.forEach((client) => {
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
    getWss().clients.forEach((client) => {
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
module.exports = {
  parseBotanicUpgradeLevels,
  upsertBotanicGardensSave,
  refreshClickerTagHolderCache,
  getClickerTagHolderCanonical,
  nameHoldsClickerChatTag,
  computeAvailableChatTagsForUser,
  resolveSelectedChatTag,
  insertPublicSystemAnnouncementStmt,
  SEEKER_JOURNEY_COMPLETION_MESSAGE,
  PRESTIGE_REDEEMED_MESSAGE,
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
};
