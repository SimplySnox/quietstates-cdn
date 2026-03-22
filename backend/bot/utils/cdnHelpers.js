import db from "../../database/db.js";

export const getCategories = () => {
    return db.prepare(`
        SELECT DISTINCT category FROM files
        WHERE name != ''
        ORDER BY category ASC
    `).all().map(c => c.category);
};

export const getFiles = (category) => {
    let query = `SELECT * FROM files WHERE name != ''`;
    let params = [];

    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }

    query += ` ORDER BY createdAt DESC`;
    return db.prepare(query).all(...params);
};

export const getFileByName = (name) => {
    return db.prepare(`SELECT * FROM files WHERE name=?`).get(name);
};