import SteamLogo from '../assets/steam-logo.svg?react';
import {useColorScheme} from "@mui/material";
import {useEffect, useRef} from "react";
export default function SteamIcon(){
    const { mode } = useColorScheme()
    const svgRef = useRef(null);

    useEffect(() => {
        if (svgRef.current) {
            const paths = svgRef.current.querySelectorAll('path');
            if (paths.length > 0) {
                const newColor = mode === 'dark'? 'white': 'black'
                paths[0].setAttribute('fill', newColor);
            }
        }
    }, [mode]);
    return <SteamLogo style={{ fill: 'white' }} ref={svgRef} />;
}