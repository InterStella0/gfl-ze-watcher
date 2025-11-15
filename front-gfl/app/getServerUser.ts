import {AuthenticationError, fetchUrl} from "utils/generalUtils";
import {cookies} from "next/headers";
import {DiscordUser} from "types/users";



export default async function getServerUser(cookieStore: ReturnType<typeof cookies>): Promise<DiscordUser | null> {
    const cookieStored = await cookieStore;
    let cookieHeader = Array.from(cookieStored.getAll())
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');

    if (!cookieHeader) return null;

    try {
        return await fetchUrl('/accounts/me', {
            headers: { cookie: cookieHeader },
            credentials: 'include',
            cache: 'no-store',
        });
    } catch (e) {
        if (e instanceof AuthenticationError) {
            return null;
        }
        return null;
    }
}