import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";

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
            scope: ["identify", "guilds", "guilds.members.read"]
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // fetch guild member
                const res = await fetch(
                    `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                const member = await res.json();

                const hasRole =
                    member.roles &&
                    member.roles.some(r => ALLOWED_ROLES.includes(r));

                const isAllowedUser = ALLOWED_USERS.includes(profile.id);

                if (!hasRole && !isAllowedUser) {
                    return done(null, false);
                }

                return done(null, profile);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

export default passport;