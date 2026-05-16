// @ts-nocheck
const cookie = require('cookie');
const cookieSignature = require('cookie-signature');
const bcrypt = require('bcrypt');
const { chatdb } = require('./db');
const { COOKIE_SECRET, wsAuthTokens } = require('./state');
const { setWss } = require('./app-context');
const {
  canAccessConversation,
  isPublicAnnouncementTarget,
  computeAvailableChatTagsForUser,
  resolveSelectedChatTag,
  bumpReadStateAfterChatInsert,
} = require('./conversation');

function attachWebSocket(wss) {
  setWss(wss);
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
        SELECT m.id AS id, m.name, m.message, m.date, COALESCE(p.vip, 0) AS vip, 
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
        ORDER BY m.id DESC
        LIMIT 150
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
    const oldestLoadedMessageMs = historyMessages.length === 150
        ? historyMessages.reduce((acc, m) => {
            const t = new Date(m.date).getTime() || 0;
            return acc === 0 || t < acc ? t : acc;
        }, 0)
        : 0;
    const historyAnnouncements = announcementRows.filter((row) => {
        const ts = new Date(row.date).getTime() || 0;
        if (ts < oldestLoadedMessageMs) return false;
        if (row._scope === 'here') return true;
        return ts >= convCreatedMs;
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
}

module.exports = { attachWebSocket };
