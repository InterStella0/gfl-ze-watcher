'use client'
import ErrorCatch from "../ui/ErrorMessage.tsx";
import {IconButton, Tooltip, useTheme, Dialog, DialogContent} from "@mui/material";
import Box from "@mui/material/Box";
import {useState} from "react";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import Link from "next/link";
import RadarMap from "components/radars/RadarMap.tsx";

export const lightBasemap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const darkBasemap  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const WMS_URL = "/qgis-server";

export function formWMSUrl(serverId, isLive, time = null){
    if (isLive){
        return `${WMS_URL}?FILTER=player_server_mapped,player_server_mapped:"server_id" = '${serverId}'`
    }
    if (time)
        return `${WMS_URL}?TIME=${time}&FILTER=player_server_timed,player_server_timed:"server_id" = '${serverId}'`
    return `${WMS_URL}?FILTER=player_server_timed,player_server_timed:"server_id" = '${serverId}'`
}



function RadarPreviewDisplay({ dateDisplay }){
    const theme = useTheme();
    const { server } = useServerData()
    const server_id = server.id
    const isDarkMode = theme.palette.mode === "dark";
    const [fullscreenOpen, setFullscreenOpen] = useState(false);

    const handleFullscreenOpen = () => {
        setFullscreenOpen(true);
    };

    const handleFullscreenClose = () => {
        setFullscreenOpen(false);
    };

    return <Box sx={{position: 'relative'}}>
        <Box sx={{borderRadius: '.5rem', overflow: 'hidden'}}>
            <RadarMap dateDisplay={dateDisplay} height="30vh" />
        </Box>
        <Box sx={{position: 'absolute', top: '0', right: '0', m: '.4rem', zIndex: 999}} display="flex" alignItems="center" gap="1rem">
            <Tooltip title="Historical Radar">
                <IconButton
                    component={Link}
                    color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                    href={`/servers/${server_id}/radar`}
                >
                    <OpenInNewIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Fullscreen">
                <IconButton
                    color="primary"
                    sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                    onClick={handleFullscreenOpen}
                >
                    <FullscreenIcon />
                </IconButton>
            </Tooltip>
        </Box>

        <Dialog
            open={fullscreenOpen}
            onClose={handleFullscreenClose}
            fullScreen
            props={{
                paper: {
                    sx: {
                        backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
                    }
                }
            }}
        >
            <DialogContent sx={{ p: 0, position: 'relative' }}>
                <RadarMap dateDisplay={dateDisplay} height="100vh" fullscreen={true} />
                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1200 }} gap="1rem" display="flex" alignItems="center">

                    <Tooltip title="Historical Radar">
                        <IconButton
                            component={Link}
                            color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                            href={`/servers/${server_id}/radar`}
                        >
                            <OpenInNewIcon />
                        </IconButton>
                    </Tooltip>
                    <IconButton
                        onClick={handleFullscreenClose}
                        color="primary"
                        sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogContent>
        </Dialog>
    </Box>
}

export default function RadarPreview({ dateDisplay }){
    return <ErrorCatch>
        <RadarPreviewDisplay dateDisplay={dateDisplay} />
    </ErrorCatch>
}