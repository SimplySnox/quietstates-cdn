import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import session from "express-session";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import passport from "./auth.js";
import db from "./db.js";
import { r2 } from "./r2.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(cors({
    origin: ["https://assets.simplysnox.com", "http://localhost:5173"],
    credentials: true
}));

app.use(express.json());

app.use(session({
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

const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ error: "Unauthorized" });
};

const upload = multer({ dest: "uploads/" });

/* ---------------- UPLOAD ---------------- */
app.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const { category = "misc" } = req.body;

        if (!file) return res.status(400).json({ error: "No file" });

        const buffer = fs.readFileSync(file.path);
        const safeName = file.originalname.replace(/\s+/g, "-");
        const key = `${category}/${Date.now()}-${safeName}`;

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.mimetype
        }));

        fs.unlinkSync(file.path);

        const url = `${process.env.R2_PUBLIC_URL}/${key}`;

        const newFile = {
            id: uuidv4(),
            name: file.originalname,
            category,
            uploader: req.user.username,
            uploaderId: req.user.id,
            type: file.mimetype,
            size: file.size,
            url,
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

        res.json(newFile);

    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ---------------- DELETE ---------------- */
app.delete("/files/:id", requireAuth, async (req, res) => {
    try {
        const file = db
            .prepare("SELECT * FROM files WHERE id = ?")
            .get(req.params.id);

        if (!file) return res.status(404).json({ error: "Not found" });

        const isOwner = file.uploaderId === req.user.id;
        const hasRole = req.user.roles?.includes("926222761095991306");

        if (!isOwner && !hasRole) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const key = file.url.replace(process.env.R2_PUBLIC_URL + "/", "");

        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key
        }));

        db.prepare("DELETE FROM files WHERE id = ?").run(req.params.id);

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

app.get("/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/unauthorized" }),
    (req, res) => res.redirect("https://assets.simplysnox.com")
);

app.get("/logout", (req, res) => {
    req.logout(() => { });
    res.clearCookie("qs.sid");
    res.redirect("https://assets.simplysnox.com");
});

app.get("/me", (req, res) => {
    res.json(req.user || null);
});

app.listen(PORT, () => {
    console.log(`🚀 API running on ${PORT}`);
});