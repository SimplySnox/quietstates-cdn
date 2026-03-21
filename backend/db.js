import Database from "better-sqlite3";

const db = new Database("database.sqlite");

// FILES TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    uploader TEXT,
    type TEXT,
    size INTEGER,
    url TEXT,
    createdAt TEXT
)
`).run();

// MIGRATION: uploaderId
try {
  db.prepare(`ALTER TABLE files ADD COLUMN uploaderId TEXT`).run();
} catch { }

// USERS CACHE TABLE
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    roles TEXT,
    updatedAt INTEGER
)
`).run();

export default db;