'use client'
import {createContext, ReactNode, useEffect, useState} from "react";
import {Community} from "types/community";
import {CommunitiesData, getCommunity} from "../../app/getCommunity";

const ServerProvider = createContext<CommunitiesData>(null)


export function CommunityServerProvider({ initialData, children }: {initialData: Community[], children: ReactNode}) {
    const [communities, setCommunities] = useState(initialData);

    useEffect(() => {
        const refresh = async () => {
            try {
                await getCommunity().then(setCommunities);
            } catch (err) {
                console.error('Failed to refresh communities:', err);
            }
        };

        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, []);
    return <ServerProvider.Provider value={new CommunitiesData(communities)}>
        {children}
    </ServerProvider.Provider>
}
export default ServerProvider;
