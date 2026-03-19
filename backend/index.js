// imports
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import db from "./db.js";
import { r2 } from "./r2.js";

// env
dotenv.config();

// app
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// temp upload folder (local only, deleted after upload)
const upload = multer({
    dest: path.resolve("backend/uploads")
});


// 📤 UPLOAD → R2 + DB
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const { category = "misc", uploader = "unknown" } = req.body;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // read temp file
        const fileBuffer = fs.readFileSync(file.path);

        // create unique path in CDN
        const key = `${category}/${Date.now()}-${file.originalname}`;

        // upload to R2
        await r2.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key,
                Body: fileBuffer,
                ContentType: file.mimetype
            })
        );

        // delete temp file
        fs.unlinkSync(file.path);

        // final CDN URL
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        const newFile = {
            id: uuidv4(),
            name: file.originalname,
            category,
            uploader,
            type: file.mimetype,
            size: file.size,
            url: publicUrl,
            createdAt: new Date().toISOString()
        };

        // save to SQLite
        db.prepare(`
      INSERT INTO files (id, name, category, uploader, type, size, url, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            newFile.id,
            newFile.name,
            newFile.category,
            newFile.uploader,
            newFile.type,
            newFile.size,
            newFile.url,
            newFile.createdAt
        );

        // Discord webhook
        if (process.env.D_WEBHOOK) {
            await fetch(process.env.D_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content:
                        `📁 **New Upload**\n` +
                        `**File**: \`${newFile.name}\`\n` +
                        `**Category**: \`${category}\`\n` +
                        `**By**: \`${uploader}\`\n\n` +
                        `${publicUrl}`
                })
            });
        }

        res.json(newFile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
    }
});


// 📥 GET ALL FILES
app.get("/files", (req, res) => {
    try {
        const files = db
            .prepare("SELECT * FROM files ORDER BY createdAt DESC")
            .all();

        res.json(files);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch files" });
    }
});


// 📥 GET FILES BY CATEGORY
app.get("/files/:category", (req, res) => {
    try {
        const files = db
            .prepare("SELECT * FROM files WHERE category = ? ORDER BY createdAt DESC")
            .all(req.params.category);

        res.json(files);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch category" });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});