import {useEffect, useRef, useState} from 'react';
import { useMap } from 'react-leaflet';
import { useTheme, Paper, Alert, IconButton, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ReactDOM from 'react-dom/client';
import {ThemeProvider} from "@mui/material/styles";
import L from 'leaflet'


function RenderedInfoMessage({ theme, message }){
    const [isExpanded, setIsExpanded] = useState(() => {
        const savedState = localStorage.getItem(`infoMessage`);
        return savedState !== "collapsed";
    })
    return <>
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
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsExpanded(false);
                                    localStorage.setItem(`infoMessage`, "collapsed");
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        }
                        sx={{
                            width: '280px',
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
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsExpanded(true);
                                localStorage.setItem(`infoMessage`, "expanded");
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
}

const InfoControl = L.Control.extend({
    options: {
        position: 'topleft'
    },
    initialize: function(message, theme, options) {
        this.message = message;
        this.theme = theme
        L.setOptions(this, options);
        this._reactRoot = null
    },
    updateTheme: function(theme, message){
        if (this._reactRoot)
            this._reactRoot.render(<RenderedInfoMessage key={Date.now()}  theme={theme} message={message} />)
    },
    onAdd: function () {
        const container = L.DomUtil.create('div');
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'mousedown', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'touchstart', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'pointerdown', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'contextmenu', L.DomEvent.stopPropagation);
        this._reactRoot = ReactDOM.createRoot(container);
        this._reactRoot.render(<RenderedInfoMessage theme={this.theme} message={this.message} />)
        return container;
    }
});
export default function InfoMessage({ message = "Player locations are obtained via Steam public profile." }) {
    const map = useMap();
    const theme = useTheme();
    const controlRef = useRef(null)

    useEffect(() => {
        const control = new InfoControl(theme, message);
        map.addControl(control);
        controlRef.current = control

        return () => {
            map.removeControl(control);
        };
    }, [map, message])

    useEffect(() => {
        if (!controlRef.current) return

        controlRef.current.updateTheme(theme, message)
    }, [controlRef, theme, message])

    return null;
}
