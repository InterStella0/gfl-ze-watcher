'use client'
import {createContext, ReactNode, use, useContext} from "react";
import {ServerMapDetail} from "types/maps";

export const MapContext = createContext<ServerMapDetail>({
    name: "",
    analyze: null,
    notReady: false,
    info: null
})
export function MapContextProvider({ value, children }: { value: Promise<ServerMapDetail>, children: ReactNode }) {
    const responded = use(value)
    return <MapContext.Provider value={responded}>{children}</MapContext.Provider>;
}

export function useMapContext() {
    return useContext<ServerMapDetail>(MapContext);
}