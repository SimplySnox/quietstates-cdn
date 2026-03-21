import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = "/data/database.sqlite";

// Ensure /data exists
if (!fs.existsSync("/data")) fs.mkdirSync("/data", { recursive: true });

const db = new Database(DB_PATH);

// Files table
db.prepare(`
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    uploader TEXT,
    uploaderId TEXT,
    type TEXT,
    size INTEGER,
    url TEXT,
    createdAt TEXT
)
`).run();

// Migration: add uploaderId if missing
const columnsFiles = db.prepare("PRAGMA table_info(files)").all();
if (!columnsFiles.some(c => c.name === "uploaderId")) {
    db.prepare("ALTER TABLE files ADD COLUMN uploaderId TEXT").run();
}

// Users table for Discord login caching
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    roles TEXT,
    updatedAt INTEGER
)
`).run();

export default db;