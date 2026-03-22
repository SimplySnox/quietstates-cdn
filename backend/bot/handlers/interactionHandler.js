import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from "discord.js";

import { getCategories, getFiles, getFileByName } from "../utils/cdnHelpers.js";
import { r2 } from "../../database/r2.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import db from "../../database/db.js";
import { logDelete } from "../utils/logger.js";

const EMBED_COLOR = 0x2f3136;

/* ================= HELPERS ================= */
const getIcon = (type) => {
    if (!type) return "📁";
    if (type.startsWith("image")) return "🖼️";
    if (type.startsWith("video")) return "🎬";
    if (type.startsWith("audio")) return "🎵";

    if (type.includes("javascript") || type.includes("json") || type.includes("html") || type.includes("css"))
        return "💻";

    if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("7z"))
        return "📦";

    return "📁";
};

const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
};

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const formatName = (name, max = 20) =>
    name.length > max ? name.slice(0, max) + "…" : name;

/* ================= MAIN ================= */
export async function handleInteraction(interaction) {
    try {
        /* AUTOCOMPLETE */
        if (interaction.isAutocomplete()) {
            const focused = interaction.options.getFocused(true);

            if (focused.name === "category") {
                return interaction.respond(
                    getCategories()
                        .filter(c => c.includes(focused.value))
                        .slice(0, 25)
                        .map(c => ({ name: c, value: c }))
                );
            }

            if (focused.name === "file") {
                return interaction.respond(
                    db.prepare(`SELECT name FROM files WHERE name LIKE ? LIMIT 25`)
                        .all(`%${focused.value}%`)
                        .map(f => ({ name: f.name, value: f.name }))
                );
            }
        }

        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== "cdn") return;

        const sub = interaction.options.getSubcommand();

        /* ================= LIST ================= */
        if (sub === "list") {
            const category = interaction.options.getString("category");
            const search = interaction.options.getString("search");
            const sort = interaction.options.getString("sort") || "date_desc";
            const group = interaction.options.getBoolean("group") || false;

            let files = getFiles(category);

            if (search) {
                files = files.filter(f =>
                    f.name.toLowerCase().includes(search.toLowerCase())
                );
            }

            files.sort((a, b) => {
                switch (sort) {
                    case "date_asc": return new Date(a.createdAt) - new Date(b.createdAt);
                    case "size_asc": return a.size - b.size;
                    case "size_desc": return b.size - a.size;
                    case "type": return (a.type || "").localeCompare(b.type || "");
                    default: return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });

            let page = 0;
            const perPage = 5;

            const build = () => {
                const totalPages = Math.ceil(files.length / perPage) || 1;
                const chunk = files.slice(page * perPage, page * perPage + perPage);

                const content = group
                    ? Object.entries(
                        chunk.reduce((acc, f) => {
                            const key = (f.type || "other").split("/")[0];
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(f);
                            return acc;
                        }, {})
                    ).map(([type, items]) =>
                        `### ${type.toUpperCase()}\n` +
                        items.map(f =>
                            `• ${getIcon(f.type)} **${formatName(f.name)}**\n> ${formatSize(f.size)} • ${timeAgo(f.createdAt)}`
                        ).join("\n")
                    ).join("\n\n")
                    : chunk.map(f =>
                        `• ${getIcon(f.type)} **${formatName(f.name)}**\n> ${formatSize(f.size)} • ${timeAgo(f.createdAt)}`
                    ).join("\n\n") || "> *No files*";

                return new EmbedBuilder()
                    .setColor(EMBED_COLOR)
                    .setTitle(`📦 CDN Files`)
                    .setDescription(content)
                    .setFooter({ text: `Page ${page + 1}` });
            };

            const buildRows = () => {
                const chunk = files.slice(page * perPage, page * perPage + perPage);

                const rows = chunk.map(f =>
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel(`Open ${formatName(f.name, 12)}`)
                            .setStyle(ButtonStyle.Link)
                            .setURL(f.url),

                        new ButtonBuilder()
                            .setCustomId(`delete_${f.id}`)
                            .setLabel("Delete")
                            .setStyle(ButtonStyle.Danger)
                    )
                );

                rows.push(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("prev").setLabel("◀").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("next").setLabel("▶").setStyle(ButtonStyle.Secondary)
                    )
                );

                return rows;
            };

            await interaction.reply({
                embeds: [build()],
                components: buildRows(),
                flags: 64
            });

            const msg = await interaction.fetchReply();

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on("collect", async (i) => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "Not yours", flags: 64 });

                if (i.customId === "prev") page--;
                else if (i.customId === "next") page++;

                else if (i.customId.startsWith("delete_")) {
                    const id = i.customId.split("_")[1];
                    const file = db.prepare("SELECT * FROM files WHERE id=?").get(id);

                    await i.update({ content: `⏳ Deleting **${file.name}**...`, components: [] });

                    files = files.filter(f => f.id !== id);

                    const key = file.url.replace(`${process.env.R2_PUBLIC_URL}/`, "");

                    await r2.send(new DeleteObjectCommand({
                        Bucket: process.env.R2_BUCKET,
                        Key: key
                    }));

                    db.prepare("DELETE FROM files WHERE id=?").run(id);
                    await logDelete(i.user, file);

                    return i.followUp({
                        embeds: [build()],
                        components: buildRows(),
                        flags: 64
                    });
                }

                await i.update({
                    embeds: [build()],
                    components: buildRows()
                });
            });
        }

        /* ================= DELETE ================= */
        if (sub === "delete") {
            const file = getFileByName(interaction.options.getString("file"));
            if (!file) return interaction.reply({ content: "Not found", flags: 64 });

            const key = file.url.replace(`${process.env.R2_PUBLIC_URL}/`, "");

            await r2.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key
            }));

            db.prepare("DELETE FROM files WHERE id=?").run(file.id);
            await logDelete(interaction.user, file);

            return interaction.reply({
                content: `✅ Deleted ${file.name}`,
                flags: 64
            });
        }

    } catch (err) {
        console.error(err);
    }
}