'use client'
import CommunitySelectorDisplay from "components/ui/CommunitySelector";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar";
import Announcement from "components/ui/Annoucement";
import Footer from "components/ui/Footer";
import RequestServerDialog from "components/ui/RequestServerDialog";
import {ReactNode, use, useState} from "react";
import {SteamProfile} from "../../next-auth-steam/steam.ts";
import {ServerSlugPromise} from "./util.ts";

export default function ResponsiveAppSelector(
    { children, serverPromise, user }: {children: ReactNode, serverPromise: ServerSlugPromise, user: Promise<SteamProfile | null> }
) {
    const server = use(serverPromise)
    const resolvedUser = user ? use(user) : null
    const [ displayCommunity, setDisplayCommunity ] = useState<boolean>(false);
    const [ requestOpen, setRequestOpen ] = useState<boolean>(false);
    return <>
        <CommunitySelectorDisplay server={server} displayCommunity={displayCommunity} setDisplayCommunity={setDisplayCommunity} setRequestOpen={setRequestOpen} />
        <RequestServerDialog user={resolvedUser} open={requestOpen} onClose={() => setRequestOpen(false)} />
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