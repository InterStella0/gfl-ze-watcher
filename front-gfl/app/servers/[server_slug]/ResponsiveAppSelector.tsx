'use client'
import CommunitySelectorDisplay from "../../../components/ui/CommunitySelector";
import Box from "@mui/material/Box";
import ResponsiveAppBar from "../../../components/ui/ResponsiveAppBar";
import Announcement from "../../../components/ui/Annoucement";
import Footer from "../../../components/ui/Footer";
import {ReactNode, useState} from "react";
import {Server} from "../../../types/community";
import {DiscordUser} from "../../../types/users";

export default function ResponsiveAppSelector(
    { children, server, user }: {children: ReactNode, server: Server, user: DiscordUser | null }
) {
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