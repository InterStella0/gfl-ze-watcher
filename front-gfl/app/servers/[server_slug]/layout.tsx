import ResponsiveAppBar from "../../../components/ui/ResponsiveAppBar";
import {getCommunityData} from "../../getCommunity";
import getServerUser from "../../getServerUser";
import {cookies} from "next/headers";
import ServerDataProvider from "./ServerDataProvider";
import type {ReactNode} from "react";
import 'leaflet/dist/leaflet.css';
import Box from "@mui/material/Box";
import CommunitySelectorDisplay from "../../../components/ui/CommunitySelector";
import Footer from "../../../components/ui/Footer";
import Announcement from "../../../components/ui/Annoucement";

export default async function ServerLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ server_slug: string }>;
}) {
    const { server_slug } = await params
    const data = await getCommunityData();
    const server = data.serversMapped[server_slug] || null

    const user = await getServerUser(cookies());

    return <>
        <ServerDataProvider server={server}>
            <Box sx={{ display: 'flex' }}>
                <CommunitySelectorDisplay server={server} />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                    }}
                >   <Box sx={{minHeight: 'calc(100vh - 72px)'}}>
                        <ResponsiveAppBar server={server} user={user} />
                        <Announcement />
                        {children}
                    </Box>
                    <Footer />
                </Box>
            </Box>
        </ServerDataProvider>
    </>
}
