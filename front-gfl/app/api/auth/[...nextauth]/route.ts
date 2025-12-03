import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord";

export const { handlers, signIn, signOut } = NextAuth({
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET
        })
    ]
})