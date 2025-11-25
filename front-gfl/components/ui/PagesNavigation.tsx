'use client'
import Link from "next/link";
import {Server} from "types/community";
import {Button, Typography, useTheme} from "@mui/material";
import {useEffect, useMemo, useState} from "react";
import {usePathname} from "next/navigation";


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
    const currentLocation = usePathname();

    const selectedMode = server !== null? 'ServerSpecific': 'Community'
    const pages = pagesSelection[selectedMode]

    const pagesNav = useMemo(() => Object.entries(pages).map((element, i) => {
        const [pageName, page] = element
        const linked = selectedMode === 'ServerSpecific'? page.replace(":server_id", server?.gotoLink): page
        const isActive = currentLocation === linked
        return <Typography component={Link} className={`nav-link ${isActive? 'active': ''}`} key={i}
                     style={{ '--link-color': theme.palette.primary.main }}
                     href={linked}>
            {pageName}
        </Typography>
    }), [currentLocation, theme])
    return <>
        {pagesNav}
    </>
}