'use client'
import CommunitySelectorDisplay from "components/ui/CommunitySelector";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar";
import Announcement from "components/ui/Annoucement";
import Footer from "components/ui/Footer";
import {ReactNode, use, useState} from "react";
import {DiscordUser} from "types/users";
import {ServerSlugPromise} from "./util.ts";

export default function ResponsiveAppSelector(
    { children, serverPromise, user }: {children: ReactNode, serverPromise: ServerSlugPromise, user: Promise<DiscordUser> | null }
) {
    const server = use(serverPromise)
    const [ displayCommunity, setDisplayCommunity ] = useState<boolean>(false);
    return <>
        <CommunitySelectorDisplay server={server} displayCommunity={displayCommunity} setDisplayCommunity={setDisplayCommunity} />
        <div className="grow overflow-auto">
            <div className="min-h-[calc(100vh-80px)]">
                <ResponsiveAppBar server={server} userPromise={user} setDisplayCommunity={setDisplayCommunity} />
                <Announcement />
                {children}
            </div>
        <Footer />
        </div>
    </>
}