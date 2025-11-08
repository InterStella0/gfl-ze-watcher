import {Typography} from "@mui/material";
import {getCommunityData} from "../../getCommunity";
import ResponsiveAppBar from "../../../components/ui/ResponsiveAppBar";
import getServerUser from "../../getServerUser";
import {cookies} from "next/headers";


interface ServerPageProps {
    params: Promise<{ server_slug: string }>;
}
export default async function Page({ params }: ServerPageProps){

    const { server_slug } = await params
    const data = await getCommunityData();
    const server = data.serversMapped[server_slug]
    if (!server)
        return <>Not found</>
    const user = await getServerUser(cookies())
    return <>
        <Typography>Meow {server.name} ABC</Typography>
    </>
}