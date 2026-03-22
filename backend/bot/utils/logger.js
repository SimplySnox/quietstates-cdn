import client from "../core.js";
import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL = process.env.DISCORD_CHANNEL_ID;
const EMBED_COLOR = 0x2f3136;

export const logDelete = async (user, file) => {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL);

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle("🗑️ File Deleted")
            .addFields(
                { name: "File", value: `\`${file.name}\`` },
                { name: "Category", value: `\`${file.category}\`` },
                { name: "Deleted By", value: `<@${user.id}>` }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.error("Log error:", err);
    }
};