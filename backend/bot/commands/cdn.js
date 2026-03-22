import { REST, Routes } from "discord.js";

export const cdnCommand = {
    name: "cdn",
    description: "Manage CDN files",
    options: [
        {
            type: 1,
            name: "list",
            description: "List files",
            options: [
                {
                    type: 3,
                    name: "category",
                    description: "Filter category",
                    autocomplete: true
                }
            ]
        },
        {
            type: 1,
            name: "delete",
            description: "Delete file",
            options: [
                {
                    type: 3,
                    name: "file",
                    description: "File name",
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ]
};

export async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_CLIENT_TOKEN);

    await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: [cdnCommand] }
    );

    console.log("✅ Commands registered");
}