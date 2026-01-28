import { Database } from 'bun:sqlite';

// Create SQLite database with Bun
export const db = new Database('lightloop.db', {
  strict: true,
  create: true,
});

// Enable WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA optimize');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL,
    org_id INTEGER,
    project_id INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    tools TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orgs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clerk_org_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS org_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (org_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS org_licenses (
    org_id INTEGER NOT NULL,
    license TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (org_id, license)
  );

  CREATE TABLE IF NOT EXISTS user_licenses (
    user_id INTEGER NOT NULL,
    license TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, license)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (conversation_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS conversation_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    anchor_message_id INTEGER,
    checkpoint_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    org_id INTEGER,
    project_id INTEGER,
    created_at INTEGER NOT NULL
  );

`);

const ensureColumn = (table: string, column: string, definition: string) => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  const hasColumn = rows.some((row) => row.name === column)
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// Backfill new conversation scope columns for existing databases.
ensureColumn('conversations', 'scope', "TEXT NOT NULL DEFAULT 'personal'")
ensureColumn('conversations', 'org_id', 'INTEGER')
ensureColumn('conversations', 'project_id', 'INTEGER')
ensureColumn('conversations', 'last_active_at', 'INTEGER NOT NULL DEFAULT 0')

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_conversations_last_active
    ON conversations (user_id, scope, org_id, project_id, last_active_at);

  CREATE INDEX IF NOT EXISTS idx_conversation_checkpoints_recent
    ON conversation_checkpoints (conversation_id, created_at);
`)
