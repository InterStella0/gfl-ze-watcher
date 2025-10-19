import ErrorCatch from "../ui/ErrorMessage.jsx";
import {LayersControl, MapContainer, TileLayer} from "react-leaflet";
import NonTiledWMSLayer from "./NonTiledWMSLayer.jsx";
import {formatDateWMS} from "./TemporalController.jsx";
import L from "leaflet";
import {IconButton, Tooltip, useTheme, Dialog, DialogContent} from "@mui/material";
import Box from "@mui/material/Box";
import {useEffect, useRef, useState} from "react";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {useNavigate, useParams} from "react-router";
import ThemedZoomControl from "./ThemedZoomControl.jsx";
import HomeButton from "./HomeButton.jsx";
import Typography from "@mui/material/Typography";

export const lightBasemap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const darkBasemap  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const WMS_URL = "/qgis-server";

function formatDateDisplay(dateDisplay){
    const startStr = formatDateWMS(dateDisplay.start);
    const endStr = formatDateWMS(dateDisplay.end);
    return `${startStr}/${endStr}`
}
export function formWMSUrl(serverId, isLive, time = null){
    if (isLive){
        return `${WMS_URL}?FILTER=player_server_mapped,player_server_mapped:"server_id" = '${serverId}'`
    }
    if (time)
        return `${WMS_URL}?TIME=${time}&FILTER=player_server_timed,player_server_timed:"server_id" = '${serverId}'`
    return `${WMS_URL}?FILTER=player_server_timed,player_server_timed:"server_id" = '${serverId}'`
}

function RadarMap({ dateDisplay, height, fullscreen = false }) {
    const navigate = useNavigate()
    const theme = useTheme();
    const center = [0, 0];
    const timedLayer = useRef(null);
    const maxLimit = dateDisplay? dateDisplay.end.diff(dateDisplay.start, 'day') > 1: true
    const isDarkMode = theme.palette.mode === "dark";
    const zoom = fullscreen? 2: 1;
    const {server_id} = useParams()
    const worldBounds = L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
    )

    useEffect(() => {
        const ref = timedLayer.current
        if (ref === null || dateDisplay === null || maxLimit) return

        ref.setParams({
            ...ref.options,
            TIME: formatDateDisplay(dateDisplay),
        });
    }, [maxLimit, timedLayer, dateDisplay, fullscreen]);
    const fontSize = {xs: '.8rem', sm: '1rem', md: '1.1rem'}
    return <Box  sx={{position: "relative"}}>
        {maxLimit && <Box sx={{position: "absolute", top: 0, left: 0, right: 0, bottom: 0}} zIndex={1290}>
            <Box
                height='100%' display='flex' justifyContent='center'
                alignItems='center' sx={{
                    backgroundColor: 'rgba(0, 0, 0, .7)',

            }} gap="1rem" flexDirection="column"

            >
                <Typography fontWeight={600} sx={{ fontSize }}>
                    Time lookup cannot be higher than 1 day.
                </Typography>
                <Box gap="1rem" display="flex" alignItems='center'>
                    <Typography fontWeight={600} sx={{ fontSize }}>Go to</Typography>
                    <Tooltip title="Historical Radar">
                        <IconButton
                            color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                            onClick={() => navigate(`/${server_id}/radar`)}
                        >
                            <OpenInNewIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography fontWeight={600} sx={{ fontSize }}>instead.</Typography>
                </Box>
            </Box>
        </Box>}
        <Box >
        <MapContainer
            key={server_id}
            center={center}
            zoom={zoom}
            style={{ height: height, width: '100%', cursor: 'default' }}
            zoomControl={false}
            zoomAnimation={true}
            zoomAnimationThreshold={8}
            fadeAnimation={true}
            zoomDelta={0.25}
            minZoom={fullscreen? 2: 1}
            maxBounds={worldBounds}
            maxBoundsViscosity={.5}
            wheelPxPerZoomLevel={300}
        >
            {fullscreen && <ThemedZoomControl />}
            {fullscreen && <HomeButton />}
            <LayersControl position="bottomleft">
                <LayersControl.BaseLayer name="Light Basemap" checked={!isDarkMode}>
                    <TileLayer
                        url={lightBasemap}
                        attribution="&copy; OpenStreetMap contributors"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Dark Basemap" checked={isDarkMode}>
                    <TileLayer
                        url={darkBasemap}
                        attribution="&copy; CartoDB"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.Overlay checked={false} name="Live Players">
                    <NonTiledWMSLayer
                        url={formWMSUrl(server_id, true)}
                        layers="player_server_mapped"
                        version="1.1.1"
                        format="image/png"
                        transparent={true}
                        opacity={0.8}
                        attribution="© queeniemella"
                        zIndex={20}
                    />
                </LayersControl.Overlay>

                <LayersControl.Overlay checked={true} name="Historical Players">
                    {!maxLimit && <NonTiledWMSLayer
                        url={formWMSUrl(server_id, false, !maxLimit? formatDateDisplay(dateDisplay): '')}
                        ref={timedLayer}
                        layers="player_server_timed"
                        version="1.1.1"
                        format="image/png"
                        transparent={true}
                        opacity={0.8}
                        attribution="© queeniemella"
                        zIndex={20}
                    />}
                </LayersControl.Overlay>
                <LayersControl.Overlay checked={true} name="Countries">
                    <TileLayer
                        url={`/tiles/countries_${isDarkMode ? 'dark' : 'light'}/{z}/{x}/{y}.png`}
                        attribution="© queeniemella"
                        zIndex={15}
                    />
                </LayersControl.Overlay>
            </LayersControl>
        </MapContainer>
        </Box>
    </Box>
}

function RadarPreviewDisplay({ dateDisplay }){
    const navigate = useNavigate();
    const theme = useTheme();
    const {server_id} = useParams()
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
                    color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                    onClick={() => navigate(`/${server_id}/radar`)}
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
                            color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                            onClick={() => navigate(`/${server_id}/radar`)}
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