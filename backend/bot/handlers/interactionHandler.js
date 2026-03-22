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

const COLOR = 0x2f3136;

/* ================= EXPORT ================= */
export async function handleInteraction(interaction) {
    try {
        /* ---------- AUTOCOMPLETE ---------- */
        if (interaction.isAutocomplete()) {
            const focused = interaction.options.getFocused(true);

            if (focused.name === "category") {
                const categories = getCategories()
                    .filter(c => c.includes(focused.value))
                    .slice(0, 25);

                return interaction.respond(categories.map(c => ({ name: c, value: c })));
            }

            if (focused.name === "file") {
                const files = db.prepare(`
                    SELECT name FROM files
                    WHERE name LIKE ?
                    LIMIT 25
                `).all(`%${focused.value}%`);

                return interaction.respond(files.map(f => ({
                    name: f.name,
                    value: f.name
                })));
            }
        }

        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== "cdn") return;

        const sub = interaction.options.getSubcommand();

        /* ================= LIST ================= */
        if (sub === "list") {
            const category = interaction.options.getString("category");
            const files = getFiles(category);

            let page = 0;
            const perPage = 5;
            const totalPages = Math.ceil(files.length / perPage) || 1;

            const build = () => {
                const chunk = files.slice(page * perPage, page * perPage + perPage);

                return new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle(`CDN Files`)
                    .setDescription(chunk.map(f => `• ${f.name}`).join("\n") || "None")
                    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
            };

            const buildRows = () => {
                const chunk = files.slice(page * perPage, page * perPage + perPage);

                const rows = [];

                chunk.forEach(f => {
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel("Open")
                                .setStyle(ButtonStyle.Link)
                                .setURL(f.url),

                            new ButtonBuilder()
                                .setCustomId(`delete_${f.id}`)
                                .setLabel("Delete")
                                .setStyle(ButtonStyle.Danger)
                        )
                    );
                });

                rows.push(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("prev")
                            .setLabel("◀")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),

                        new ButtonBuilder()
                            .setCustomId("next")
                            .setLabel("▶")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page >= totalPages - 1)
                    )
                );

                return rows;
            };

            const msg = await interaction.reply({
                embeds: [build()],
                components: buildRows(),
                flags: 64,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on("collect", async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "Not yours.", flags: 64 });
                }

                if (i.customId === "prev") page--;
                else if (i.customId === "next") page++;

                else if (i.customId.startsWith("delete_")) {
                    const id = i.customId.split("_")[1];
                    const file = db.prepare("SELECT * FROM files WHERE id=?").get(id);

                    const confirmRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`confirm_${id}`)
                            .setLabel("Confirm Delete")
                            .setStyle(ButtonStyle.Danger),

                        new ButtonBuilder()
                            .setCustomId("cancel")
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Secondary)
                    );

                    return i.update({
                        content: `⚠️ Delete **${file.name}**?\nThis cannot be undone.`,
                        embeds: [],
                        components: [confirmRow]
                    });
                }

                else if (i.customId.startsWith("confirm_")) {
                    await i.deferUpdate();

                    const id = i.customId.split("_")[1];
                    const file = db.prepare("SELECT * FROM files WHERE id=?").get(id);

                    if (!file) {
                        return i.followUp({
                            content: "File no longer exists.",
                            flags: 64
                        });
                    }

                    await i.update({
                        content: `⏳ Deleting **${file.name}**...`,
                        components: []
                    });

                    const key = file.url.replace(`${process.env.R2_PUBLIC_URL}/`, "");

                    await r2.send(new DeleteObjectCommand({
                        Bucket: process.env.R2_BUCKET,
                        Key: key
                    }));

                    db.prepare("DELETE FROM files WHERE id=?").run(id);

                    await logDelete(i.user, file);

                    return i.followUp({
                        content: `✅ Deleted **${file.name}**`,
                        flags: 64
                    });
                }

                else if (i.customId === "cancel") {
                    return i.update({
                        content: "Cancelled.",
                        embeds: [build()],
                        components: buildRows()
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