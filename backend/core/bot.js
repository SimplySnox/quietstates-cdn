import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
    console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_CLIENT_TOKEN);

if (!client.isReady()) {
    console.log("Bot not ready yet");
    return;
}

export const discordNotify = async (file) => {
    try {
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📁 File Uploaded")
            .setDescription(`**${file.name}**`)
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
        console.error("Discord notify error:", err);
    }
};