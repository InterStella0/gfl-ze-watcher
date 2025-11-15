import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import WebAppBar from "./WebAppBar";
import {Server} from "node:net";
import {DiscordUser} from "../../types/users";



export default function ResponsiveAppBar(
    { user, server, setDisplayCommunity }
    : { server: Server, user: DiscordUser | null, setDisplayCommunity: (value: boolean) => void }
){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar user={user} server={server} setDisplayCommunity={setDisplayCommunity} />
    </ErrorCatch>
}
