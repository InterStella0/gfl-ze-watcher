import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import WebAppBar from "./WebAppBar";
import {DiscordUser} from "types/users";
import {Dispatch} from "react";
import {Server} from "types/community";



export default function ResponsiveAppBar(
    { user, server, setDisplayCommunity }
    : { server: Server | null, user: DiscordUser | null, setDisplayCommunity: Dispatch<boolean> }
){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar user={user} server={server} setDisplayCommunity={setDisplayCommunity} />
    </ErrorCatch>
}
