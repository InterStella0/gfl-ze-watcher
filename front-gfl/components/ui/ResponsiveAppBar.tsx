import ErrorCatch from "./ErrorMessage.tsx";
import './Nav.css'
import WebAppBar from "./WebAppBar";
import {DiscordUser} from "types/users";
import {Dispatch} from "react";
import {Server} from "types/community";
import LinkLoading from "components/ui/LinkLoading.tsx";


export default function ResponsiveAppBar(
    { userPromise, server, setDisplayCommunity }
    : { server: Server | null, userPromise: Promise<DiscordUser> | null, setDisplayCommunity: Dispatch<boolean> }
){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar userPromise={userPromise} server={server} setDisplayCommunity={setDisplayCommunity} />
        <LinkLoading />
    </ErrorCatch>
}
