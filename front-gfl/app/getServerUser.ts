import {DiscordUser} from "types/users";
import {auth} from "../auth.ts";



export default async function getServerUser(): Promise<DiscordUser | null> {
    const session = await auth()

    if (session?.user) {
        session.user = {
            global_name: session.user.name,
            avatar: session.user.image,
        }
    }
    return session?.user
}