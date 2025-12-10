import LiveServerTrackerPage from "./TrackerPage";
import getServerUser from "../getServerUser.ts";
import {Metadata} from "next";
import { formatTitle} from "utils/generalUtils.ts";


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
    const user = getServerUser();
    return <LiveServerTrackerPage userPromise={user}/>
}