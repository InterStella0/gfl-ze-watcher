import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { useTheme, Paper, Alert, IconButton, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ReactDOM from 'react-dom/client';
import {ThemeProvider} from "@mui/material/styles";

export default function InfoMessage({
                                        id = "map-info-message",
                                        message = "Player locations are based on Steam public profile."
                                    }) {
    const map = useMap();
    const theme = useTheme();

    const [isExpanded, setIsExpanded] = useState(() => {
        const savedState = localStorage.getItem(`infoMessage_${id}`);
        return savedState !== "collapsed";
    });

    useEffect(() => {
        const container = L.DomUtil.create('div');
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'mousedown', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'touchstart', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'pointerdown', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'contextmenu', L.DomEvent.stopPropagation);
        const reactRoot = ReactDOM.createRoot(container);

        const InfoControl = L.Control.extend({
            options: {
                position: 'topright'
            },

            onAdd: function () {
                renderControl();
                return container;
            }
        });

        const renderControl = () => {
            reactRoot.render(
                <>
                    <ThemeProvider theme={theme}>{
                        isExpanded ? (
                            <Paper
                                elevation={2}
                                sx={{
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                }}
                            >
                                <Alert
                                    icon={<InfoIcon fontSize="small" />}
                                    severity="info"
                                    action={
                                        <IconButton
                                            aria-label="close"
                                            color="inherit"
                                            size="small"
                                            onClick={() => {
                                                setIsExpanded(false);
                                                localStorage.setItem(`infoMessage_${id}`, "collapsed");
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    }
                                    sx={{
                                        '& .MuiAlert-icon': {
                                            color: 'info.main',
                                            opacity: 0.9,
                                            alignItems: 'center'
                                        },
                                        '& .MuiAlert-message': {
                                            fontSize: '0.85rem',
                                            padding: 'auto',
                                            opacity: 0.9
                                        }
                                    }}
                                >
                                    {message}
                                </Alert>
                            </Paper>
                        ) : (
                            <Paper
                                elevation={2}
                                sx={{
                                    m: 1,
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    width: 'auto'
                                }}
                            >
                                <Tooltip title="Show info">
                                    <IconButton
                                        color="info"
                                        size="small"
                                        onClick={() => {
                                            setIsExpanded(true);
                                            localStorage.setItem(`infoMessage_${id}`, "expanded");
                                        }}
                                        sx={{
                                            m: '2px',
                                            backgroundColor: theme => theme.palette.background.paper,
                                            '&:hover': {
                                                backgroundColor: theme => theme.palette.action.hover
                                            }
                                        }}
                                    >
                                        <InfoIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Paper>
                        )
                    }</ThemeProvider>
                </>
            );
        };

        const control = new InfoControl();
        map.addControl(control);

        return () => {
            map.removeControl(control);
        };
    }, [map, theme, isExpanded, id, message]);

    return null;
}
