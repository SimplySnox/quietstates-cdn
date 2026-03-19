import Database from "better-sqlite3";

const db = new Database("database.sqlite");

// create table
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

export default db;