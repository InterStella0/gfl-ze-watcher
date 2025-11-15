import LiveServerTrackerPage from "./TrackerPage";
import getServerUser from "../getServerUser.ts";
import {cookies} from "next/headers";

export default async function Page(){
    const user = await getServerUser(cookies());
    return <LiveServerTrackerPage user={user}/>
}