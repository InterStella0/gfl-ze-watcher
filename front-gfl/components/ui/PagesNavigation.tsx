'use client'
import Link from "@mui/material/Link";
import {Server} from "types/community";
import {useTheme} from "@mui/material";
import {useEffect, useState} from "react";


export const pagesSelection = {
    'ServerSpecific': {
        'Communities': '/',
        'Server': '/servers/:server_id',
        'Players': '/servers/:server_id/players',
        'Maps': '/servers/:server_id/maps',
        'Radar': '/servers/:server_id/radar',
    },
    'Community': {
        'Communities': '/',
        'Tracker': '/live',
    }
}


export default function PagesNavigation({ server }: { server: Server }) {
    const theme = useTheme();
    const [currentLocation, setCurrentLocation] = useState<string>('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentLocation(window.location.pathname)
        }
    }, [])
    const selectedMode = server !== null? 'ServerSpecific': 'Community'
    const pages = pagesSelection[selectedMode]

    const pagesNav = Object.entries(pages).map((element, i) => {
        const [pageName, page] = element
        const linked = selectedMode === 'ServerSpecific'? page.replace(":server_id", server?.gotoLink): page
        const isActive = currentLocation === linked
        return <Link className={`nav-link ${isActive? 'active': ''}`} key={i}
                     style={{ '--link-color': theme.palette.primary.main }}
                     href={linked}>
            {pageName}
        </Link>
    })
    return <>
        {pagesNav}
    </>
}