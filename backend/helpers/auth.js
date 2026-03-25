import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import db from "../database/db.js";
import sendLoginEmail from "./mailer.js";
import { UAParser } from "ua-parser-js";

const ALLOWED_USERS = [
    "424342692106076166",
    "630858684418752523",
    "536686057648029706"
];

const ALLOWED_ROLES = [
    "926222761095991306"
];

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
    new DiscordStrategy(
        {
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK,
            scope: ["identify", "email", "guilds", "guilds.members.read"],
            passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const existing = db
                    .prepare("SELECT * FROM users WHERE id = ?")
                    .get(profile.id);

                const now = Date.now();
                const email = profile.email || null;

                // ✅ Extract IP (handles proxies like Cloudflare, Nginx, etc.)
                const ip =
                    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                    req.socket?.remoteAddress ||
                    "Unknown";

                // ✅ Parse device (clean output)
                const ua = new UAParser(req.headers["user-agent"]);
                const browser = ua.getBrowser().name || "Unknown Browser";
                const os = ua.getOS().name || "Unknown OS";
                const device = `${browser} on ${os}`;

                // ✅ Get approximate location from IP (free IP-API)
                let location = "Unknown location";
                try {
                    const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
                    const geo = await geoRes.json();

                    if (geo.status === "success") {
                        location = `${geo.city}, ${geo.country}`;
                    }
                } catch {
                    // fail silently (don’t break auth flow)
                }

                // Cache check (1 hour)
                if (existing && now - existing.updatedAt < 60 * 60 * 1000) {
                    const roles = JSON.parse(existing.roles);
                    profile.roles = roles;

                    const allowed =
                        ALLOWED_USERS.includes(profile.id) ||
                        roles.some(r => ALLOWED_ROLES.includes(r));

                    return allowed ? done(null, profile) : done(null, false);
                }

                // Fetch roles from Discord
                const res = await fetch(
                    `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                if (!res.ok) return done(null, false);

                const member = await res.json();
                const roles = member.roles || [];

                const isFirstLogin = !existing;

                // Save user
                db.prepare(`
                    INSERT OR REPLACE INTO users (id, username, email, roles, updatedAt)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    profile.id,
                    profile.username,
                    email,
                    JSON.stringify(roles),
                    now
                );

                // ✅ Send enhanced email
                if (isFirstLogin && email) {
                    sendLoginEmail(
                        email,
                        profile.username,
                        ip,
                        device,
                        location
                    ).catch(console.error);
                }

                profile.roles = roles;

                const allowed =
                    ALLOWED_USERS.includes(profile.id) ||
                    roles.some(r => ALLOWED_ROLES.includes(r));

                return allowed ? done(null, profile) : done(null, false);

            } catch (err) {
                console.error("Auth error:", err);
                return done(err, null);
            }
        }
    )
);

export default passport;