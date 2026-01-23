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