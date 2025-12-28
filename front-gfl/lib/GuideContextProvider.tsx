'use client'
import {createContext, ReactNode, use, useContext} from "react";
import {Guide} from "types/guides.ts";

export type GuideContextData = {
    serverSlug?: string | null;
    serverId?: string | null;
    serverGoto: string | null;
    mapName: string;
    guide?: Guide | null
}
export type GuideContextDataInsert = {
    serverSlug?: string | null;
    mapName: string;
    guide?: Guide | null
    guidePromise?: Promise<Guide> | null
}

export const GuideContext = createContext<GuideContextData>({ mapName: "Unknown", serverGoto: null})
export function GuideContextProvider({ value, children }: { value: GuideContextDataInsert, children: ReactNode }) {
    let guide: Guide | null = null
    if (value.guidePromise)
        guide = use(value.guidePromise)

    if (value.guide)
        guide = value.guide

    const serverGoto = value.serverSlug ?? guide?.server_id
    const serverId = guide?.server_id
    const serverSlug = value.serverSlug

    return <GuideContext.Provider value={{ serverSlug, serverId, serverGoto, mapName: value.mapName, guide }}>
        {children}
    </GuideContext.Provider>;
}

export function useGuideContext() {
    return useContext<GuideContextData>(GuideContext);
}