import { createLayerComponent } from '@react-leaflet/core'
import {MapContainer, TileLayer, WMSTileLayer, LayersControl, useMap} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IconButton, Tooltip, useTheme } from "@mui/material";
import L from 'leaflet'
import 'leaflet.nontiledlayer'
import Paper from "@mui/material/Paper";
import InfoIcon from "@mui/icons-material/Info";
import {useEffect} from "react";
import {WMS_URL} from "../utils.jsx";

function createNonTiledWMS({ url, layers, ...options }, context) {
    return {instance: L.nonTiledLayer.wms(url, {layers, ...options}), context}
}

function updateNonTiledWMS(layer, props, prevProps) {
    if (props.opacity !== prevProps.opacity) {
        layer.setOpacity(props.opacity)
    }
}

const NonTiledWMSLayer = createLayerComponent(
    createNonTiledWMS, updateNonTiledWMS
)

const HomeButton = () => {
    const map = useMap();
    const theme = useTheme()

    // Create a custom Leaflet control when the component mounts
    useEffect(() => {
        // Create a custom control
        const resetViewControl = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.backgroundColor = theme.palette.background.paper;
                container.style.padding = '0';
                container.style.overflow = 'hidden';

                // Create React root element
                const reactContainer = L.DomUtil.create('div', '', container);
                reactContainer.style.width = '34px';
                reactContainer.style.height = '34px';
                reactContainer.style.cursor = 'pointer';
                reactContainer.title = 'Reset View';

                // Use ReactDOM to render the Material UI icon into the container
                try {
                    // Create and render the home icon with inline React
                    const homeIconElement = document.createElement('div');
                    homeIconElement.style.display = 'flex';
                    homeIconElement.style.justifyContent = 'center';
                    homeIconElement.style.alignItems = 'center';
                    homeIconElement.style.width = '100%';
                    homeIconElement.style.height = '100%';
                    reactContainer.appendChild(homeIconElement);

                    // Create SVG home icon using Material UI style
                    const homeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    homeIcon.setAttribute('style', 'width: 20px; height: 20px;');
                    homeIcon.setAttribute('viewBox', '0 0 24 24');
                    homeIcon.setAttribute('fill', theme.palette.text.primary);

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z');
                    homeIcon.appendChild(path);

                    homeIconElement.appendChild(homeIcon);
                } catch (error) {
                    // Fallback to text if rendering icon fails
                    reactContainer.innerHTML = '⌂';
                    reactContainer.style.fontSize = '20px';
                    reactContainer.style.textAlign = 'center';
                    reactContainer.style.lineHeight = '34px';
                }

                // Add event handler
                L.DomEvent
                    .on(reactContainer, 'click', L.DomEvent.preventDefault)
                    .on(reactContainer, 'click', () => {
                        map.setView([0, 0], 2);
                    });

                return container;
            }
        });

        // Add the control to the map
        const control = new resetViewControl();
        map.addControl(control);

        // Cleanup when component unmounts
        return () => {
            map.removeControl(control);
        };
    }, [map, theme]);

    return null;
};

const ThemedZoomControl = () => {
    const map = useMap();
    const theme = useTheme();

    useEffect(() => {
        // Create custom zoom control
        const zoomControl = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.backgroundColor = theme.palette.background.paper;

                // Zoom in button
                const zoomInButton = L.DomUtil.create('div', '', container);
                zoomInButton.title = 'Zoom In';
                zoomInButton.style.width = '34px';
                zoomInButton.style.height = '34px';
                zoomInButton.style.cursor = 'pointer';
                zoomInButton.style.display = 'flex';
                zoomInButton.style.justifyContent = 'center';
                zoomInButton.style.alignItems = 'center';
                zoomInButton.style.borderBottom = `1px solid ${theme.palette.divider}`;

                // Create SVG zoom-in icon using Material UI style
                const zoomInIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                zoomInIcon.setAttribute('style', 'width: 20px; height: 20px;');
                zoomInIcon.setAttribute('viewBox', '0 0 24 24');
                zoomInIcon.setAttribute('fill', theme.palette.text.primary);

                const zoomInPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                zoomInPath.setAttribute('d', 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z');
                zoomInIcon.appendChild(zoomInPath);
                zoomInButton.appendChild(zoomInIcon);

                // Zoom out button
                const zoomOutButton = L.DomUtil.create('div', '', container);
                zoomOutButton.title = 'Zoom Out';
                zoomOutButton.style.width = '34px';
                zoomOutButton.style.height = '34px';
                zoomOutButton.style.cursor = 'pointer';
                zoomOutButton.style.display = 'flex';
                zoomOutButton.style.justifyContent = 'center';
                zoomOutButton.style.alignItems = 'center';

                // Create SVG zoom-out icon using Material UI style
                const zoomOutIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                zoomOutIcon.setAttribute('style', 'width: 20px; height: 20px;');
                zoomOutIcon.setAttribute('viewBox', '0 0 24 24');
                zoomOutIcon.setAttribute('fill', theme.palette.text.primary);

                const zoomOutPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                zoomOutPath.setAttribute('d', 'M19 13H5v-2h14v2z');
                zoomOutIcon.appendChild(zoomOutPath);
                zoomOutButton.appendChild(zoomOutIcon);

                // Add event handlers
                L.DomEvent
                    .on(zoomInButton, 'click', L.DomEvent.preventDefault)
                    .on(zoomInButton, 'click', () => {
                        map.zoomIn(1);
                    });

                L.DomEvent
                    .on(zoomOutButton, 'click', L.DomEvent.preventDefault)
                    .on(zoomOutButton, 'click', () => {
                        map.zoomOut(1);
                    });

                return container;
            }
        });

        // Add the control to the map
        const control = new zoomControl();
        map.addControl(control);

        // Cleanup when component unmounts
        return () => {
            map.removeControl(control);
        };
    }, [map, theme]);

    return null;
};
const RadarPage = () => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark';
    const lightBasemap = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const darkBasemap  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const center = [0, 0];
    const zoom   = 2;
    const worldBounds = L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
    );
    return (
        <div style={{ height: 'calc(100vh - 72px)', width: '100%' }}>
            <MapContainer
                center={center} zoom={zoom} style={{ height: 'calc(100vh - 72px)', width: '100%' }} zoomControl={false}
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
                <LayersControl position="topright">
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

                    <LayersControl.Overlay name="Heat Map" checked={!isDarkMode}>
                        <WMSTileLayer
                            url={WMS_URL}
                            layers="countries_counted"
                            format="image/png"
                            transparent={true}
                            attribution="gflmap.prettymella.site © queeniemella"
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay name="Heat Map (Dark)" checked={isDarkMode}>
                        <WMSTileLayer
                            url={WMS_URL}
                            layers="countries_counted_dark"
                            format="image/png"
                            transparent={true}
                            attribution="gflmap.prettymella.site © queeniemella"
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay name="Player Locations" checked>
                        <NonTiledWMSLayer
                            url={WMS_URL}
                            layers="player_server_mapped"
                            version="1.1.1"
                            format="image/png"
                            transparent={true}
                            opacity={0.8}
                            attribution="gflmap.prettymella.site © queeniemella"
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay name="Night Indicator" checked>
                        <WMSTileLayer
                            url={WMS_URL}
                            layers="day_night"
                            format="image/png"
                            transparent={true}
                            attribution="gflmap.prettymella.site © queeniemella"
                        />
                    </LayersControl.Overlay>
                </LayersControl>
                <HomeButton />
                <div className="leaflet-bottom leaflet-left">
                    <Paper
                        className="leaflet-control"
                        elevation={1}
                        sx={{
                            padding: '4px',
                            margin: '10px',
                            borderRadius: '4px',
                            opacity: 0.85,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Tooltip
                            title="Player locations are based on Steam public info profile."
                            placement="right"
                            arrow
                        >
                            <IconButton size="small" color="info">
                                <InfoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </div>
            </MapContainer>
        </div>
    );
};

export default RadarPage;
