// @ts-nocheck
const path = require('path');
const Database = require('better-sqlite3');
const { DATABASES_DIR } = require('./paths');
const chatdb = new Database(path.join(DATABASES_DIR, 'chat.db'));

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
      prestige_level INTEGER DEFAULT 0,
      clicker_count INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS botanic_gardens_saves (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      clicker_count INTEGER NOT NULL DEFAULT 0,
      upgrade1_level INTEGER NOT NULL DEFAULT 0,
      upgrade2_level INTEGER NOT NULL DEFAULT 0,
      upgrade3_level INTEGER NOT NULL DEFAULT 0,
      upgrade4_level INTEGER NOT NULL DEFAULT 0,
      upgrade5_level INTEGER NOT NULL DEFAULT 0,
      upgrade6_level INTEGER NOT NULL DEFAULT 0,
      upgrade7_level INTEGER NOT NULL DEFAULT 0,
      upgrade8_level INTEGER NOT NULL DEFAULT 0,
      upgrade9_level INTEGER NOT NULL DEFAULT 0,
      upgrade10_level INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (name) REFERENCES protected_names(name)
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
if (!protectedNameColumns.some(c => c.name === 'clicker_count')) {
    chatdb.exec("ALTER TABLE protected_names ADD COLUMN clicker_count INTEGER DEFAULT 0");
}
chatdb.exec('CREATE UNIQUE INDEX IF NOT EXISTS botanic_gardens_saves_name_u ON botanic_gardens_saves(name)');

const guestdb = new Database(path.join(DATABASES_DIR, 'guestbook.db'));
guestdb.exec('CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY, name TEXT, website TEXT, note TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP)');
module.exports = { chatdb, guestdb };
