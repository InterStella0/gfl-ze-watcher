import {IconButton, Tooltip, useTheme} from "@mui/material";
import {useEffect, useRef} from "react";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider.tsx";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {LayersControl, MapContainer, TileLayer} from "react-leaflet";
import ThemedZoomControl from "components/radars/ThemedZoomControl";
import HomeButton from "components/radars/HomeButton";
import NonTiledWMSLayer from "components/radars/NonTiledWMSLayer";
import {darkBasemap, formWMSUrl, lightBasemap} from "components/radars/RadarPreview";
import L from 'leaflet';  // L is used by nontiledlayer
import 'leaflet.nontiledlayer'
import {formatDateWMS} from "components/radars/TemporalController";
import {Dayjs} from "dayjs";


function formatDateDisplay(dateDisplay: { start: Dayjs, end: Dayjs }) {
    const startStr = formatDateWMS(dateDisplay.start);
    const endStr = formatDateWMS(dateDisplay.end);
    return `${startStr}/${endStr}`
}

export default function RadarMap({ dateDisplay, height, fullscreen = false }) {
    const theme = useTheme();
    const center = [0, 0];
    const timedLayer = useRef(null);
    const maxLimit = dateDisplay? dateDisplay.end.diff(dateDisplay.start, 'day') > 1: true
    const isDarkMode = theme.palette.mode === "dark";
    const zoom = fullscreen? 2: 1;
    const { server } = useServerData()
    const server_id = server.id

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
                            component={Link}
                            color="primary" sx={{ backgroundColor: isDarkMode? 'rgba(0,0,0, .5)': 'rgba(0,0,0, .25)' }}
                            href={`/servers/${server_id}/radar`}
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
                // @ts-ignore (this is a dumb one)
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
                <LayersControl
                    // @ts-ignore it does exist bitch
                    position="bottomleft">
                    <LayersControl.BaseLayer name="Light Basemap" checked={!isDarkMode}>
                        <TileLayer
                            url={lightBasemap}
                            // @ts-ignore it does exist bitch
                            attribution="&copy; OpenStreetMap contributors"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Dark Basemap" checked={isDarkMode}>
                        <TileLayer
                            url={darkBasemap}
                            // @ts-ignore it does exist bitch
                            attribution="&copy; CartoDB"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.Overlay checked={false} name="Live Players">
                        <NonTiledWMSLayer
                            url={formWMSUrl(server?.id, true)}
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
                            url={formWMSUrl(server?.id, false, !maxLimit? formatDateDisplay(dateDisplay): '')}
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
                            // @ts-ignore it does exist bitch
                            attribution="© queeniemella"
                            zIndex={15}
                        />
                    </LayersControl.Overlay>
                </LayersControl>
            </MapContainer>
        </Box>
    </Box>
}