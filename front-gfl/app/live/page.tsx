import LiveServerTrackerPage from "./TrackerPage";
import getServerUser from "../getServerUser.ts";
import {cookies} from "next/headers";
import {Metadata} from "next";
import {getServerSlug} from "../servers/[server_slug]/util.ts";
import {ServerPlayersStatistic} from "types/players.ts";
import {fetchServerUrl, formatTitle} from "utils/generalUtils.ts";


export async function generateMetadata(): Promise<Metadata> {
    return {
        title: formatTitle(`Live Tracker`),
        description: "All Zombie Escape (ZE) player data updates are streamed through here.",
        alternates: {
            canonical: '/live'
        }
    }
}

export default async function Page(){
    const user = await getServerUser(cookies());
    return <LiveServerTrackerPage user={user}/>
}