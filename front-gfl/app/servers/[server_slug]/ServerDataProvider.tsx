'use client'
import {createContext, ReactNode, useContext} from "react";
import {Server} from "../../../types/community";

type ServerData = {server: Server}
export const ServerDataContext = createContext<ServerData | null>(null);
export default function ServerDataProvider({server, children}: {server: Server, children: ReactNode}) {
    return <ServerDataContext.Provider value={{ server }}>
        {children}
    </ServerDataContext.Provider>
}

export function useServerData(): ServerData {
    return useContext(ServerDataContext);
}