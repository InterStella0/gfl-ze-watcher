'use client'
import CommunitySelectorDisplay from "components/ui/CommunitySelector";
import Box from "@mui/material/Box";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar";
import Announcement from "components/ui/Annoucement";
import Footer from "components/ui/Footer";
import {ReactNode, use, useState} from "react";
import {DiscordUser} from "types/users";
import {ServerSlugPromise} from "./util.ts";

export default function ResponsiveAppSelector(
    { children, serverPromise, user }: {children: ReactNode, serverPromise: ServerSlugPromise, user: DiscordUser | null }
) {
    const server = use(serverPromise)
    const [ displayCommunity, setDisplayCommunity ] = useState<boolean>(false);
    return <>
        <CommunitySelectorDisplay server={server} displayCommunity={displayCommunity} setDisplayCommunity={setDisplayCommunity} />
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                overflow: 'auto',
            }}
        >   <Box sx={{minHeight: 'calc(100vh - 72px)'}}>
                <ResponsiveAppBar server={server} user={user} setDisplayCommunity={setDisplayCommunity} />
                <Announcement />
                {children}
            </Box>
        <Footer />
        </Box>
    </>
}