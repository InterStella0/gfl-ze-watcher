'use client'
import {createContext, ReactNode, useContext} from "react";
import {ServerMapDetail} from "../../../../../types/maps";

export const MapContext = createContext<ServerMapDetail>({
    name: "",
    analyze: null,
    notReady: false,
    info: null
})
export function MapContextProvider({ value, children }: { value: ServerMapDetail, children: ReactNode }) {
    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
    return useContext<ServerMapDetail>(MapContext);
}