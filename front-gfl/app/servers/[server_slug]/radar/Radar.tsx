'use client'
// @ts-nocheck
import {ReactElement, useEffect, useRef, useState} from "react";
import {useTheme} from "@mui/material";
import dayjs from "dayjs";
import L from "leaflet/dist/leaflet-src";
import Box from "@mui/material/Box";
import {LayersControl, MapContainer, TileLayer, WMSTileLayer} from "react-leaflet";
import InfoMessage from "components/radars/InfoMessage";
import ThemedZoomControl from "components/radars/ThemedZoomControl";
import HomeButton from "components/radars/HomeButton";
import {darkBasemap, formWMSUrl, lightBasemap} from "components/radars/RadarPreview";
import NonTiledWMSLayer from "components/radars/NonTiledWMSLayer";
import TemporalController, {formatDateWMS, TemporalContext} from "components/radars/TemporalController";
import StatsComponent from "components/radars/StatComponents";
import LegendControl from "components/radars/Legend";
import PlayerMapControl from "components/radars/PlayerMapControl";
import {useServerData} from "../ServerDataProvider";

export default function Radar(): ReactElement {
    const {server} = useServerData()
    const theme = useTheme();
    const countryWMSRef = useRef(null)
    const wmsLayerRef = useRef([]);
    const temporalQueryRef = useRef(false);
    const [ temporal, setTemporal ] = useState({ cursor: dayjs(), interval: '10min', isLive: true})
    const isDarkMode = theme.palette.mode === 'dark';
    const center = [0, 0];
    const zoom   = 2;
    const worldBounds = L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
    );

    const addWmsLayerRef = (ref) => {
        if (ref && !wmsLayerRef.current.includes(ref)) {
            wmsLayerRef.current.push(ref);
        }
    };
    useEffect(() => {
        const ref = countryWMSRef.current
        if (!ref) return

        ref.setParams({
            ...ref.options,
            STYLES: isDarkMode? 'light': 'dark'
        })
    }, [isDarkMode, countryWMSRef])

    const WMS_URL = "/qgis-server";
    return <>
        <Box sx={{ height: 'calc(100vh - 72px)', width: '100%' }}>
            <MapContainer center={center} zoom={zoom} style={{ height: 'calc(100vh - 72px)', width: '100%', cursor: 'default' }} zoomControl={false}
                zoomAnimation={true}
                zoomAnimationThreshold={8}
                fadeAnimation={true}
                zoomDelta={0.25}
                minZoom={2}
                maxBounds={worldBounds}
                maxBoundsViscosity={.5}
                wheelPxPerZoomLevel={300}
            >
                <InfoMessage />
                <ThemedZoomControl />
                <HomeButton />
                <LayersControl position="bottomleft">
                    <LayersControl.BaseLayer name="Light Basemap" checked={!isDarkMode}>
                        <TileLayer
                            url={lightBasemap}
                            attribution="&copy; OpenStreetMap contributors"
                            zIndex={20}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Dark Basemap" checked={isDarkMode}>
                        <TileLayer
                            url={darkBasemap}
                            attribution="&copy; CartoDB"
                            zIndex={20}
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.Overlay checked={temporal.isLive} name="Live Players">
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
                    <LayersControl.Overlay checked={['10min', '30min', '1hour'].includes(temporal.interval)} name="Night Shading">
                        <WMSTileLayer
                            ref={addWmsLayerRef}
                            url={WMS_URL}
                            TIME={`${formatDateWMS(temporal.cursor)}/${formatDateWMS(temporal.cursor.add(10, 'minutes'))}`}
                            layers="night_shading"
                            format="image/png"
                            transparent={true}
                            styles="default"
                            attribution="© queeniemella"
                            zIndex={15}
                        />
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked={!temporal.isLive} name="Historical Players">
                        <NonTiledWMSLayer
                            ref={addWmsLayerRef}
                            url={formWMSUrl(server?.id, false)}
                            layers="player_server_timed"
                            version="1.1.1"
                            format="image/png"
                            transparent={true}
                            opacity={0.8}
                            attribution="© queeniemella"
                            zIndex={20}
                        />
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked={true} name="Countries">
                        <TileLayer
                            url={`/tiles/countries_${isDarkMode ? 'dark' : 'light'}/{z}/{x}/{y}.png`}
                            attribution="© queeniemella "
                            zIndex={16}
                        />
                    </LayersControl.Overlay>
                </LayersControl>
                <TemporalContext value={{ data: temporal, set: setTemporal, query: temporalQueryRef }}>
                    <TemporalController
                        wmsLayerRef={wmsLayerRef}
                        initialStartDate={dayjs("2024-05-12T03:15:00Z")} // I know my data starts here so.
                        initialEndDate={dayjs()}
                    />
                    <StatsComponent />
                    <LegendControl />
                    <PlayerMapControl />
                </TemporalContext>
            </MapContainer>
        </Box>
    </>
};