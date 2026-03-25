import Database from "better-sqlite3";
import fs from "fs";

const DB_PATH = "/data/database.sqlite";

// Ensure directory exists
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

/* ---------------- USERS TABLE ---------------- */
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    roles TEXT,
    email TEXT,
    updatedAt INTEGER
)
`).run();

/* ---------------- MIGRATIONS ---------------- */

// FILES TABLE
const filesColumns = db.prepare("PRAGMA table_info(files)").all();
if (!filesColumns.some(c => c.name === "uploaderId")) {
    db.prepare("ALTER TABLE files ADD COLUMN uploaderId TEXT").run();
}

// USERS TABLE
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some(c => c.name === "email")) {
    db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
}

export default db;