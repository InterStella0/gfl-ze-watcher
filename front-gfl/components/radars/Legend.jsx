import {createControlComponent} from "@react-leaflet/core";
import {DomUtil} from "leaflet";
import ReactDOM from "react-dom/client";
import {useEffect, useRef, useState} from "react";
import L from 'leaflet'
import ErrorCatch from "../ui/ErrorMessage.tsx";
import {
    CircularProgress,
    Collapse,
    IconButton, Skeleton,
    Tooltip,
    Typography,
    useTheme
} from "@mui/material";
import Box from "@mui/material/Box";
import {ThemeProvider} from "@mui/material/styles";
import PeopleIcon from "@mui/icons-material/People";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import {WMS_URL} from "./RadarPreview.jsx";


function LegendWrapper({ setUpdateFn }) {
    const [data, setData] = useState({});
    useEffect(() => {
        setUpdateFn(setData);
    }, [setUpdateFn]);

    return <ErrorCatch>
        <LegendWrapped reactData={data} />
    </ErrorCatch>
}
function WMSLegendImage({name, style = ""}){
    const [title, setTitle] = useState(name)
    const [ imageSrc, setImage ] = useState(null)

    useEffect(() => {
        const params = {
            SERVICE: "WMS",
            REQUEST: "GetLegendGraphic",
            LAYERS: name,
            STYLES: style,
            FORMAT: "application/json"
        }
        const url = `${WMS_URL}?${new URLSearchParams(params).toString()}`
        fetch(url)
            .then(resp => resp.json())
            .then(resp => {
                for(const node of resp.nodes){
                    setTitle(node.title)
                    if (node.symbols){
                        for (const symbol of node.symbols){
                            setImage(`data:image/png;base64, ${symbol.icon}`)
                            return
                        }
                    }
                    setImage(`data:image/png;base64, ${node.icon}`)
                    return // Just get first lol
                }
            })

    }, [name, style]);
    return <Box display="flex" flexDirection="row" gap=".5rem" sx={{mt: '.3rem'}}>
        {imageSrc? <img width="20px" height="20px" src={imageSrc} alt={title}/>: <Skeleton width="20px" height="20px" />}
        <Typography>{title}</Typography>
    </Box>
}

function LegendWrapped({ reactData }){
    const backupTheme = useTheme()
    const theme = reactData?.theme || backupTheme
    const isDarkMode = theme.palette.mode === 'dark';
    const [ isExpanded, setExpanded ] = useState(true)
    return <ThemeProvider theme={theme}>
        <Box
            sx={{
                backdropFilter: 'blur(10px)',
                backgroundColor: theme?.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(255, 255, 255, 0.8)',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: theme?.shadows[3],
                transition: 'all 0.3s ease',
                border: theme?.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.1)',
                width: isExpanded? 'auto': 80,
                maxWidth: 250,
                '&:hover': {
                    boxShadow: theme?.shadows[6],
                }
            }}
        >
            <Tooltip title={isExpanded ? "" : "Legend"}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderBottom: isExpanded
                            ? theme?.palette.mode === 'dark'
                                ? '1px solid rgba(255, 255, 255, 0.1)'
                                : '1px solid rgba(0, 0, 0, 0.1)'
                            : 'none',
                        cursor: 'pointer',
                        width: isExpanded ? 'auto' : 'auto',
                        gap: '.5rem',
                    }}
                    onClick={(eve) => {
                        eve.stopPropagation()
                        setExpanded(e => !e)
                    }}
                >
                    <TravelExploreIcon />

                    {isExpanded && (
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                color: theme?.palette.text.primary
                            }}
                        >
                            Legend
                        </Typography>
                    )}
                    <IconButton
                        size="small"
                        sx={{
                            color: theme?.palette.text.secondary,
                            p: 0.5,
                            ml: isExpanded ? 'auto' : 0
                        }}
                    >
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </Box>
            </Tooltip>

            <Collapse in={isExpanded}>
                <Box sx={{ p: 1.5 }}>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                        pb: 1,
                        borderBottom: theme?.palette.mode === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.05)'
                            : '1px solid rgba(0, 0, 0, 0.05)'
                    }}>
                        <Box display="flex" flexDirection="column">
                            <WMSLegendImage name="player_server_timed" />
                            <WMSLegendImage name="player_server_mapped" />
                            <WMSLegendImage name={`countries_${isDarkMode ? 'dark': 'light'}`}/>
                            <WMSLegendImage name="night_shading" />
                        </Box>
                    </Box>

                </Box>
            </Collapse>
        </Box>
    </ThemeProvider>
}

const LegendControlExtends = L.Control.extend({
    initialize: function(options) {
        L.Util.setOptions(this, options)
        this._container = null;
        this._setReactDataFn = () => {}
    },
    updateData: function(data){
        if (this._setReactDataFn) {
            this._setReactDataFn(data);
        }
    },
    onAdd: function(map) {
        this._container = DomUtil.create('div', 'leaflet-control leaflet-bar');

        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.disableScrollPropagation(this._container);

        const reactRoot = ReactDOM.createRoot(this._container);
        reactRoot.render(<LegendWrapper setUpdateFn={(fn) => {
            this._setReactDataFn = fn;
            fn({theme: this.options.theme})
        }} />);
        return this._container;
    },

    onRemove: function(map) {
        this._container = null;
    }
})

const LegendWrapperComponent = createControlComponent(
    (props) => {
        return new LegendControlExtends(props);
    }
);

export default function LegendControl(){
    const theme = useTheme()
    const ref = useRef()
    useEffect(() => {
        ref.current.updateData({ theme })
    }, [ theme ])
    return <LegendWrapperComponent ref={ref} theme={theme} position="topright" />
}