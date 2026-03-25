import {
    Client,
    GatewayIntentBits,
    ActivityType,
    PresenceUpdateStatus,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from "discord.js";

import { registerCommands } from "./commands/cdn.js";
import { handleInteraction } from "./handlers/interactionHandler.js";

const EMBED_COLOR = 0x2f3136;

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

client.once(Events.ClientReady, async () => {
    console.log(`🤖 Bot logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'cdn.simplysnox.com',
            type: ActivityType.Watching
        }],
        status: PresenceUpdateStatus.Idle,
    });

    await registerCommands();
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(process.env.DISCORD_CLIENT_TOKEN);

export default client;

/* ================= NOTIFY - UPLOAD ================= */
export const dscFileUpload = async (file) => {
    try {
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle("📁 File Uploaded")
            .setDescription(`> \`${file.name}\``)
            .addFields(
                { name: "Category", value: `\`${file.category}\``, inline: true },
                { name: "Uploader", value: `\`${file.uploader}\``, inline: true },
                { name: "Size", value: `\`${(file.size / 1024).toFixed(2)} KB\``, inline: true }
            )
            .setURL(file.url)
            .setTimestamp();

        if (file.type?.startsWith("image")) {
            embed.setImage(file.url);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("View on CDN")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://cdn.simplysnox.com/${file.category}/${file.name}`)
        );

        await channel.send({
            embeds: [embed],
            components: [row]
        });

    } catch (err) {
        console.error("@botCore/dscFileUpload error:", err);
    }
};

/* ================= NOTIFY - DELETE ================= */
export const dscFileDelete = async (file, user) => {
    try {
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle("🗑️ File Deleted")
            .setDescription(`> \`${file.name}\``)
            .addFields(
                { name: "Category", value: `\`${file.category}\``, inline: true },
                { name: "Uploader", value: `\`${file.uploader}\``, inline: true },
                { name: "Size", value: `\`${(file.size / 1024).toFixed(2)} KB\``, inline: true },
                {
                    name: "Deleted by",
                    value: user?.id
                        ? `<@${user.id}>`
                        : user?.username
                            ? `\`${user.username}\``
                            : "`Unknown`",
                    inline: true
                }
            )
            .setURL(file.url)
            .setTimestamp();

        await channel.send({
            embeds: [embed],
        });

    } catch (err) {
        console.error("@botCore/dscFileDelete error:", err);
    }
};