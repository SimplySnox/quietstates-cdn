import {
    Client,
    GatewayIntentBits,
    ActivityType,
    PresenceUpdateStatus,
    Events
} from "discord.js";

import { registerCommands } from "./commands/cdn.js";
import { handleInteraction } from "./handlers/interactionHandler.js";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
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