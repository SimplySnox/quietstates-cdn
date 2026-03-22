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
                },
                {
                    type: 3,
                    name: "search",
                    description: "Search files"
                },
                {
                    type: 3,
                    name: "sort",
                    description: "Sort files",
                    choices: [
                        { name: "Newest", value: "date_desc" },
                        { name: "Oldest", value: "date_asc" },
                        { name: "Largest", value: "size_desc" },
                        { name: "Smallest", value: "size_asc" },
                        { name: "Type", value: "type" }
                    ]
                },
                {
                    type: 5,
                    name: "group",
                    description: "Group by file type"
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