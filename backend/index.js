import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import session from "express-session";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import SQLiteStoreFactory from "better-sqlite3-session-store";
import sqlite3 from "better-sqlite3";

import { discordNotify } from "./core/bot.js";
import passport from "./helpers/auth.js";
import db from "./database/db.js";
import { r2 } from "./database/r2.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Allowed CORS origins
const allowedOrigins = [
    "https://assets.simplysnox.com",
    "http://localhost:5173"
];

app.set("trust proxy", 1);
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.options("*", cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const SQLiteStore = SQLiteStoreFactory(session);
// const sessionDB = new sqlite3("/data/sessions.sqlite");

app.use(session({
    store: new SQLiteStore({
        client: db
    }),
    name: "qs.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        domain: ".simplysnox.com"
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const requireAuth = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: "Unauthorized" });

const upload = multer({ dest: "uploads/" });

/* ---------------- R2 SYNC ---------------- */
const syncR2 = async () => {
    const list = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }));
    const objects = list.Contents || [];

    for (const obj of objects) {
        const url = `${process.env.R2_PUBLIC_URL}/${obj.Key}`;
        const exists = db.prepare("SELECT 1 FROM files WHERE url = ?").get(url);
        if (!exists) {
            const newFile = {
                id: uuidv4(),
                name: obj.Key.split("/").pop(),
                category: obj.Key.split("/")[0] || "misc",
                uploader: "Unknown",
                uploaderId: null,
                type: "application/octet-stream",
                size: obj.Size,
                url,
                createdAt: new Date().toISOString()
            };
            db.prepare(`INSERT INTO files (id,name,category,uploader,uploaderId,type,size,url,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
                .run(Object.values(newFile));
        }
    }
};
syncR2();

/* ---------------- UPLOAD ---------------- */
app.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        let { category = "misc", rename } = req.body;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        const fileName = rename?.trim() || file.originalname;
        const key = `${category}/${fileName}`;
        const buffer = fs.readFileSync(file.path);

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.mimetype
        }));

        fs.unlinkSync(file.path);

        const prefix = "https://cdn.simplysnox.com";
        const url = `${process.env.R2_PUBLIC_URL}/${key}`;
        let newFile = {
            id: uuidv4(),
            name: fileName,
            category,
            uploader: req.user.username,
            uploaderId: req.user.id,
            type: file.mimetype,
            size: file.size,
            url,
            createdAt: new Date().toISOString()
        };

        db.prepare(`INSERT INTO files (id,name,category,uploader,uploaderId,type,size,url,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
            .run(Object.values(newFile));

        const type = newFile.type || "";

        const isImage = type.startsWith("image");
        const isVideo = type.startsWith("video");
        const isAudio = type.startsWith("audio");

        const isCode =
            type.includes("javascript") ||
            type.includes("json") ||
            type.includes("css") ||
            type.includes("html");

        const isArchive =
            type.includes("zip") ||
            type.includes("tar") ||
            type.includes("rar");

        let icon = "📁";
        let label = "File Uploaded";

        if (isImage) {
            icon = "🖼️";
            label = "Image Uploaded";
            category = "image";
        } else if (isVideo) {
            icon = "🎬";
            label = "Video Uploaded";
        } else if (isAudio) {
            icon = "🎵";
            label = "Audio Uploaded";
        } else if (isCode) {
            icon = "💻";
            label = "Code File Uploaded";
        } else if (isArchive) {
            icon = "📦";
            label = "Archive Uploaded";
        }

        // const embed = {
        //     title: `${icon} ${label}`,
        //     description: `> **${newFile.name}**`,
        //     color: 0x5865F2,
        //     fields: [
        //         {
        //             name: "Category",
        //             value: `\`${category}\``,
        //             inline: true
        //         },
        //         {
        //             name: "Uploader",
        //             value: `\`${newFile.uploader}\``,
        //             inline: true
        //         },
        //         {
        //             name: "Size",
        //             value: `\`${(newFile.size / 1024).toFixed(2)} KB\``,
        //             inline: true
        //         }
        //     ],
        //     url: newFile.url,
        //     timestamp: new Date().toISOString(),
        //     footer: {
        //         text: "QS CDN"
        //     }
        // };

        // const components = [
        //     {
        //         type: 1,
        //         components: [
        //             {
        //                 type: 2,
        //                 style: 5,
        //                 label: "Open CDN",
        //                 url: `${prefix}/${newFile.category}/${newFile.name}`
        //             }
        //         ]
        //     }
        // ];

        // if (isImage) {
        //     embed.image = { url: newFile.url };
        // }

        // if (isVideo) {
        //     embed.thumbnail = {
        //         url: "https://cdn-icons-png.flaticon.com/512/727/727245.png"
        //     };
        // }

        // try {
        //     await fetch(process.env.DISCORD_WEBHOOK, {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({
        //             embeds: [embed],
        //             components: components
        //         })
        //     });
        // } catch (err) {
        //     console.error("Webhook failed:", err);
        // }

        res.json(newFile);
        await discordNotify(newFile);

    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ---------------- DELETE ---------------- */
app.delete("/files/:id", requireAuth, async (req, res) => {
    try {
        const file = db.prepare("SELECT * FROM files WHERE id=?").get(req.params.id);
        if (!file) return res.status(404).json({ error: "Not found" });

        const isOwner = file.uploaderId === req.user.id;
        const hasRole = req.user.roles?.includes("926222761095991306");
        if (!isOwner && !hasRole) return res.status(403).json({ error: "Forbidden" });

        const key = file.url.replace(`${process.env.R2_PUBLIC_URL}/`, "");
        await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
        db.prepare("DELETE FROM files WHERE id=?").run(req.params.id);

        res.json({ success: true });

    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ---------------- FILES ---------------- */
app.get("/files", requireAuth, (req, res) => {
    const files = db.prepare("SELECT * FROM files ORDER BY createdAt DESC").all();
    res.json(files);
});

/* ---------------- AUTH ---------------- */
app.get("/auth/discord", passport.authenticate("discord"));
app.get("/auth/discord/callback", passport.authenticate("discord", { failureRedirect: "/unauthorized" }), (req, res) => res.redirect("https://assets.simplysnox.com"));
app.get("/logout", (req, res) => { req.logout(() => { }); res.clearCookie("qs.sid"); res.redirect("https://assets.simplysnox.com"); });
app.get("/me", (req, res) => res.json(req.user || null));

app.listen(PORT, () => console.log(`🚀 API running on ${PORT}`));