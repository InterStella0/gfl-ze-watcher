import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import WebAppBar from "./WebAppBar";



export default function ResponsiveAppBar({ user, server }){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar user={user} server={server} />
    </ErrorCatch>
}
