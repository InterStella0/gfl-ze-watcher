import {AuthenticationError, fetchUrl} from "../utils/generalUtils";
import {cookies} from "next/headers";
import {DiscordUser} from "../types/users";



export default async function getServerUser(cookieStore: ReturnType<typeof cookies>): Promise<DiscordUser> {
    const cookieStored = await cookieStore
    const cookieHeader = Array.from(cookieStored.getAll())
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');

    try{
        return await fetchUrl('/accounts/me', {
                headers: { cookie: cookieHeader },
                credentials: 'include',
                cache: 'no-store',
            }
        );
    }catch (e){
        return null;
    }
}