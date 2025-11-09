import ResponsiveAppBar from "../../../components/ui/ResponsiveAppBar";
import {getCommunityData} from "../../getCommunity";
import getServerUser from "../../getServerUser";
import {cookies} from "next/headers";
import ServerDataProvider from "./ServerDataProvider";
import type {ReactNode} from "react";
import 'leaflet/dist/leaflet.css';

export default async function ServerLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: { server_slug: string };
}) {
    const { server_slug } = await params
    const data = await getCommunityData();
    const server = data.serversMapped[server_slug] || null

    const user = await getServerUser(cookies());

    return <>
        <ResponsiveAppBar server={server} user={user} />
        <ServerDataProvider server={server}>
            {children}
        </ServerDataProvider>
    </>
}
