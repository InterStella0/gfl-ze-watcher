import {getCommunityData} from "../../getCommunity";
import getServerUser from "../../getServerUser";
import {cookies} from "next/headers";
import ServerDataProvider from "./ServerDataProvider";
import type {ReactNode} from "react";
import 'leaflet/dist/leaflet.css';
import Box from "@mui/material/Box";
import ResponsiveAppSelector from "./ResponsiveAppSelector";

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
                <ResponsiveAppSelector server={server} user={user}>
                    {children}
                </ResponsiveAppSelector>
            </Box>
        </ServerDataProvider>
    </>
}
