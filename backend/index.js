// imports
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import session from "express-session";
import passport from "./auth.js";

import db from "./db.js";
import { r2 } from "./r2.js";

// env
dotenv.config();

// app
const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- CORS (VERY IMPORTANT) ---------------- */
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://assets.simplysnox.com"
        ],
        credentials: true
    })
);

app.use(express.json());

/* ---------------- SESSION (FIXED FOR PRODUCTION) ---------------- */
app.use(
    session({
        name: "qs.sid",
        secret: process.env.SESSION_SECRET || "qs-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: true,          // REQUIRED for HTTPS (Railway/Vercel)
            sameSite: "none",      // REQUIRED for cross-domain cookies
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

/* ---------------- HELPERS ---------------- */
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ error: "Unauthorized" });
};

// temp upload folder
const upload = multer({
    dest: path.resolve("uploads")
});

/* ---------------- UPLOAD ---------------- */
app.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const { category = "misc" } = req.body;

        const uploader = req.user?.username || "unknown";
        const uploaderId = req.user?.id || null;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileBuffer = fs.readFileSync(file.path);

        const safeName = file.originalname.replace(/\s+/g, "-");
        const key = `${category}/${Date.now()}-${safeName}`;

        await r2.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key,
                Body: fileBuffer,
                ContentType: file.mimetype
            })
        );

        fs.unlinkSync(file.path);

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        const newFile = {
            id: uuidv4(),
            name: file.originalname,
            category,
            uploader,
            uploaderId,
            type: file.mimetype,
            size: file.size,
            url: publicUrl,
            createdAt: new Date().toISOString()
        };

        db.prepare(`
            INSERT INTO files 
            (id, name, category, uploader, uploaderId, type, size, url, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newFile.id,
            newFile.name,
            newFile.category,
            newFile.uploader,
            newFile.uploaderId,
            newFile.type,
            newFile.size,
            newFile.url,
            newFile.createdAt
        );

        // webhook
        if (process.env.DISCORD_WEBHOOK) {
            await fetch(process.env.DISCORD_WEBHOOK, {
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

/* ---------------- FILES ---------------- */
app.get("/files", requireAuth, (req, res) => {
    try {
        const files = db
            .prepare("SELECT * FROM files ORDER BY createdAt DESC")
            .all();

        res.json(files);
    } catch {
        res.status(500).json({ error: "Failed to fetch files" });
    }
});

app.get("/files/:category", requireAuth, (req, res) => {
    try {
        const files = db
            .prepare("SELECT * FROM files WHERE category = ? ORDER BY createdAt DESC")
            .all(req.params.category);

        res.json(files);
    } catch {
        res.status(500).json({ error: "Failed to fetch category" });
    }
});

/* ---------------- AUTH ---------------- */
app.get("/auth/discord", passport.authenticate("discord"));

app.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
        failureRedirect: "/unauthorized"
    }),
    (req, res) => {
        res.redirect("https://assets.simplysnox.com");
    }
);

app.get("/logout", (req, res) => {
    req.logout(() => { });
    res.clearCookie("qs.sid");
    res.redirect("https://assets.simplysnox.com");
});

/* ---------------- START ---------------- */
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});