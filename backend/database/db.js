import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = "/data/database.sqlite";

// Ensure /data exists
if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
}

const db = new Database(DB_PATH);

/* ---------------- FILES TABLE ---------------- */
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

/* ---------------- USERS TABLE (FIX) ---------------- */
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    roles TEXT,
    updatedAt INTEGER
)
`).run();

/* ---------------- MIGRATIONS ---------------- */
const columns = db.prepare("PRAGMA table_info(files)").all();

if (!columns.some(c => c.name === "uploaderId")) {
    db.prepare("ALTER TABLE files ADD COLUMN uploaderId TEXT").run();
}

export default db;