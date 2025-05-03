import {MapContainer, TileLayer, WMSTileLayer, LayersControl, useMap, useMapEvents} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from "@mui/material";
import L from 'leaflet'
import 'leaflet.nontiledlayer'
import NonTiledWMSLayer from "../components/radars/NonTiledWMSLayer.jsx";
import HomeButton from "../components/radars/HomeButton.jsx";
import ThemedZoomControl from "../components/radars/ThemedZoomControl.jsx";
import TemporalController, { TemporalContext } from "../components/radars/TemporalController.jsx";
import {useRef, useState} from "react";
import dayjs from "dayjs";
import InfoMessage from "../components/radars/InfoMessage.jsx";
import StatsComponent from "../components/radars/StatComponents.jsx";
import PlayerMapControl from "../components/radars/PlayerMapControl.jsx";


const RadarPage = () => {
    const theme = useTheme();
    const wmsLayerRef = useRef([]);
    const temporalQueryRef = useRef(false);
    const [ temporal, setTemporal ] = useState({ cursor: dayjs(), interval: '10min', isLive: true})
    const isDarkMode = theme.palette.mode === 'dark';
    const lightBasemap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const darkBasemap  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const center = [0, 0];
    const zoom   = 2;
    const worldBounds = L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
    );
    const WMS_URL = "/qgis-server";

    const addWmsLayerRef = (ref) => {
        if (ref && !wmsLayerRef.current.includes(ref)) {
            wmsLayerRef.current.push(ref);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 72px)', width: '100%' }}>
            <MapContainer
                center={center} zoom={zoom} style={{ height: 'calc(100vh - 72px)', width: '100%', cursor: 'default' }} zoomControl={false}
                zoomAnimation={true}
                zoomAnimationThreshold={8}
                fadeAnimation={true}
                zoomDelta={0.25}
                minZoom={2}
                maxBounds={worldBounds}
                maxBoundsViscosity={.5}
                wheelPxPerZoomLevel={300}
            >
                <ThemedZoomControl />
                <HomeButton />
                <LayersControl position="topleft">
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

{/*                    <LayersControl.Overlay checked={!isDarkMode && isLive} name="Heat Map">
                            <WMSTileLayer
                                url={WMS_URL}
                                layers="countries_counted"
                                format="image/png"
                                transparent={true}
                                attribution="© queeniemella"
                                zIndex={10}
                            />
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked={isDarkMode && isLive} name="Heat Map (Dark)">
                        <WMSTileLayer
                            url={WMS_URL}
                            layers="countries_counted_dark"
                            format="image/png"
                            transparent={true}
                            attribution="© queeniemella"
                            zIndex={10}
                        />
                    </LayersControl.Overlay>*/}

                    <LayersControl.Overlay checked={temporal.isLive} name="Live Players">
                        <NonTiledWMSLayer
                            url={WMS_URL}
                            layers="player_server_mapped"
                            version="1.1.1"
                            format="image/png"
                            transparent={true}
                            opacity={0.8}
                            attribution="© queeniemella"
                            zIndex={20}
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked={!temporal.isLive} name="Historical Players">
                        <NonTiledWMSLayer
                            ref={addWmsLayerRef}
                            url={WMS_URL}
                            layers="player_server_timed"
                            version="1.1.1"
                            format="image/png"
                            transparent={true}
                            opacity={0.8}
                            attribution="© queeniemella"
                            zIndex={20}
                        />
                    </LayersControl.Overlay>

                    {/*<LayersControl.Overlay checked={isLive} name="Live Night Shading">*/}
                    {/*    <WMSTileLayer*/}
                    {/*        url={`${WMS_URL}?TIME=${dayjs().format("YYYY-MM-DDTHH:mm:ssZ")}`}*/}
                    {/*        layers="night_shading"*/}
                    {/*        version="1.1.1"*/}
                    {/*        format="image/png"*/}
                    {/*        transparent={true}*/}
                    {/*        opacity={0.8}*/}
                    {/*        attribution="© queeniemella"*/}
                    {/*        zIndex={15}*/}
                    {/*    />*/}
                    {/*</LayersControl.Overlay>*/}

                    {/*<LayersControl.Overlay checked={!isLive && ['10min', '30min', '1hour'].includes(intervalRange)} name="Night Shading">*/}
                    {/*    <WMSTileLayer*/}
                    {/*        ref={addWmsLayerRef}*/}
                    {/*        url={WMS_URL}*/}
                    {/*        layers="night_shading"*/}
                    {/*        format="image/png"*/}
                    {/*        transparent={true}*/}
                    {/*        attribution="© queeniemella"*/}
                    {/*        zIndex={15}*/}
                    {/*    />*/}
                    {/*</LayersControl.Overlay>*/}
                </LayersControl>
                <TemporalContext value={{ data: temporal, set: setTemporal, query: temporalQueryRef }}>
                    <TemporalController
                        wmsLayerRef={wmsLayerRef}
                        initialStartDate={dayjs("2024-05-12T03:15:00Z")} // I know my data starts here so.
                        initialEndDate={dayjs()}
                    />
                    <StatsComponent />
                    <PlayerMapControl />
                    <InfoMessage />
                </TemporalContext>
            </MapContainer>
        </div>
    );
};

export default RadarPage;