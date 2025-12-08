import jwt from 'jsonwebtoken';
import type {
    GetServerSidePropsContext,
    NextApiRequest,
    NextApiResponse,
} from "next"
import type {AuthOptions} from "next-auth"
import {getServerSession} from "next-auth"
import Steam from "next-auth-steam"
import {NextRequest} from "next/server";
import {STEAM_PROVIDER_ID} from "next-auth-steam";
import {BACKEND_DOMAIN} from "utils/generalUtils.ts";
import {SteamProfile} from "./next-auth-steam/steam.ts";

export function getAuthOptions(req?: NextRequest): AuthOptions {
    return {
        providers: req
            ? [
                Steam(req, {
                    clientSecret: process.env.STEAM_SECRET!,
                    userinfo: {
                        // @ts-expect-error
                        async request(ctx) {
                            const temp_token = jwt.sign(
                                {
                                    sub: ctx.tokens.steamId,
                                    type: 'temp',
                                    name: "Unknown",
                                    iss: "ze-graph",
                                },
                                process.env.NEXTAUTH_SECRET,
                                {expiresIn: '3m'}
                            );

                            try {
                                const response = await fetch(BACKEND_DOMAIN + '/accounts/me', {
                                    headers: {
                                        "Authorization": `Bearer ${temp_token}`
                                    }
                                })

                                const responseJson = await response.json()
                                let profile: SteamProfile | PromiseLike<SteamProfile>;
                                if (responseJson.code === 404){
                                    const responseCreate = await fetch(BACKEND_DOMAIN + '/accounts/create', {
                                        method: "POST",
                                        headers: {
                                            "Authorization": `Bearer ${temp_token}`
                                        }
                                    })
                                    const jsonResponse = await responseCreate.json()
                                    profile = jsonResponse.data
                                }else{
                                    profile = responseJson.data
                                }
                                return profile
                            }catch (e){
                                console.error(e)
                                throw e
                            }
                        }
                    },
                })
            ]
            : [],
        callbacks: {
            jwt({ token, account, profile }) {
                if (account?.provider === STEAM_PROVIDER_ID) {
                    token.steam = profile
                }
                const now = Math.floor(Date.now() / 1000);
                // @ts-expect-error
                const expiresIn = Math.max(token.exp ?? 0 - now, 60);
                token.backendJwt = jwt.sign(
                    {
                        sub: token.sub,
                        type: 'access',
                        name: token.name,
                        iss: "ze-graph",
                    },
                    process.env.NEXTAUTH_SECRET,
                    { expiresIn }
                );

                return token
            },
            session({ session, token }) {
                if ('steam' in token) {
                    // @ts-expect-error
                    session.user.steam = token.steam
                }
                // @ts-expect-error
                session.backendJwt = token.backendJwt
                return session
            }
        }
    }
}

export function auth(
    ...args:
        | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
        | [NextApiRequest, NextApiResponse]
        | []
) {
    const req = args[0] && args[0] instanceof NextRequest? args[0]: null;
    return getServerSession(...args, getAuthOptions(req))
}