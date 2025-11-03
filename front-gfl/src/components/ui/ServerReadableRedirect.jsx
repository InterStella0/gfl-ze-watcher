import { useParams, Navigate, Outlet } from "react-router";
import { useContext } from "react";
import ServerProvider from "./ServerProvider.jsx";

function ServerRedirect() {
    const { server_id } = useParams();
    const { serversMapped } = useContext(ServerProvider);
    const server = serversMapped[server_id];

    if (!server) {
        return <Outlet />;
    }

    if (server.gotoLink !== server_id) {
        const remainder = window.location.pathname.split(`/${server_id}`)[1] || "";
        const targetPath = `/${server.gotoLink}${remainder}`;
        return <Navigate to={targetPath} replace />;
    }

    return <Outlet />;
}

export default ServerRedirect;