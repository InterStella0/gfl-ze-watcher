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

    const [pendingLocation, setPendingLocation] = useState<string | null>(null);


    useEffect(() => {
        setPendingLocation(null);
    }, [currentLocation]);

    const selectedMode = server !== null ? 'ServerSpecific' : 'Community';
    const pages = pagesSelection[selectedMode];

    const pagesNav = useMemo(() => {
        return Object.entries(pages).map(([pageName, page], i) => {
            const linked = selectedMode === 'ServerSpecific'
                ? page.replace(":server_id", server?.gotoLink)
                : page;

            const activePath = pendingLocation ?? currentLocation;
            const isActive = activePath === linked;

            return (
                <Typography
                    component={Link}
                    key={i}
                    prefetch
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    style={{ '--link-color': theme.palette.primary.main }}
                    href={linked}
                    onClick={() => setPendingLocation(linked)}
                >
                    {pageName}
                </Typography>
            );
        });
    }, [currentLocation, pendingLocation, theme]);

    return <>{pagesNav}</>;
}
