import {useState, useEffect, useContext, useRef, useDeferredValue} from 'react';
import {
    Typography,
    List,
    ListItem,
    Pagination,
    CircularProgress,
    useTheme,
    Box,
    IconButton,
    Collapse,
    Tooltip,
    useMediaQuery, PaginationItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PeopleIcon from '@mui/icons-material/People';
import { createControlComponent } from '@react-leaflet/core';
import { Control, DomUtil } from 'leaflet';
import { TemporalContext } from "./TemporalController.jsx";
import ReactDOM from "react-dom/client";
import {fetchUrl, getFlagUrl, intervalToServer} from "../../utils/generalUtils.ts";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {ThemeProvider} from "@mui/material/styles";
import {useParams} from "react-router";

function CountryStatsWrapper({ setUpdateFn }) {
    const [data, setData] = useState({});
    useEffect(() => {
        setUpdateFn(setData);
    }, [setUpdateFn]);

    return <ErrorCatch>
        <CountryStatsList reactData={data} />
    </ErrorCatch>
}

const CountryStatsControl = Control.extend({
    options: {
        position: 'topright'
    },

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
        // Create container for the control
        this._container = DomUtil.create('div', 'leaflet-control leaflet-bar country-stats-control');

        // Prevent map click events when interacting with the control
        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.disableScrollPropagation(this._container);

        const reactRoot = ReactDOM.createRoot(this._container);
        reactRoot.render(<CountryStatsWrapper setUpdateFn={(fn) => {
            this._setReactDataFn = fn;
            fn({timeContext: this.options.timeContext, theme: this.options.theme, server_id: this.options.server_id})
        }} />);
        return this._container;
    },

    onRemove: function(map) {
        this._container = null;
    }
});

function fetchStats(server_id, start, interval, isLive){
    if (isLive)
        return fetchUrl(`/radars/${server_id}/live_statistics`)

    const intervalServer = intervalToServer(interval)
    return fetchUrl(`/radars/${server_id}/statistics`, {params:
            { time: start.toISOString(), interval: intervalServer}
    })
}

const CountryStatsList = ({ reactData }) => {
    const backupTheme = useTheme()
    const theme = reactData?.theme || backupTheme
    const { timeContext, server_id } = reactData || {}
    const [page, setPage] = useState(1);
    const [isExpanded, setIsExpanded] = useState(true);
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        in_view_count: 0,
        total_count: 0,
        countries: []
    })
    const pageSize = 5;
    // Use theme breakpoints instead of direct media query
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const startDate = timeContext?.data.cursor
    const interval = timeContext?.data.interval
    const isLive = timeContext?.data.isLive

    useEffect(() => {
        if (!(startDate && interval) && !isLive) return
        setLoading(true)
        fetchStats(server_id, startDate, interval, isLive)
            .then(setData)
            .finally(() => setLoading(false))
    }, [server_id, startDate, interval, isLive]);

    const totalPages = Math.ceil(data.countries.length / pageSize);
    const currentCountries = data.countries.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const toggleExpanded = (e) => {
        e.stopPropagation()
        setIsExpanded(!isExpanded);
    };

    return (
        <ThemeProvider theme={theme}>
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
                    width: isExpanded ? (isMobile ? 120 : 250) : 80,
                    maxWidth: 250,
                    '&:hover': {
                        boxShadow: theme?.shadows[6],
                    }
                }}
            >
                <Tooltip title={isExpanded || isMobile ? "" : "Player Distribution"}>
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
                        onClick={toggleExpanded}
                    >
                        <PeopleIcon />

                        {isExpanded && !isMobile && (
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 600,
                                    color: theme?.palette.text.primary
                                }}
                            >
                                Player Distribution
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
                            justifyContent: isMobile? 'center': 'space-between',
                            alignItems: 'center',
                            mb: 1.5,
                            pb: 1,
                            borderBottom: theme?.palette.mode === 'dark'
                                ? '1px solid rgba(255, 255, 255, 0.05)'
                                : '1px solid rgba(0, 0, 0, 0.05)'
                        }}>
                            { !isMobile && <Typography
                                variant="body2"
                                sx={{
                                    fontSize: '0.75rem',
                                    color: theme?.palette.text.secondary
                                }}
                            >
                                Players On Map:
                            </Typography>}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    color: theme?.palette.text.primary
                                }}
                            >
                                <span title="Total players that set public location">{data.in_view_count} </span>
                                / <span title="Total players in this timeframe">{data.total_count}</span>
                            </Typography>
                        </Box>

                        {/* Country list */}
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={20} thickness={4} />
                            </Box>
                        ) : (
                            <>
                                <List
                                    sx={{
                                        p: 0,
                                        '& .MuiListItem-root': {
                                            px: 0,
                                            py: 0.75,
                                        }
                                    }}
                                >
                                    {currentCountries.map((country) => (
                                        <ListItem
                                            key={country.code}
                                            disablePadding
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Tooltip title={country.name}>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            mr: 1,
                                                            width: 24,
                                                            height: 18,
                                                            overflow: 'hidden',
                                                            borderRadius: 0.5,
                                                            boxShadow: '0 0 1px rgba(0,0,0,0.2)',
                                                        }}
                                                    >
                                                        <img
                                                            src={getFlagUrl(country.code)}
                                                            alt={country.name}
                                                            style={{ width: '100%', height: 'auto', display: 'block' }}
                                                            loading="lazy"
                                                        />
                                                    </Box>
                                                </Tooltip>
                                                {!isMobile && (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontSize: '0.75rem',
                                                            color: theme?.palette.text.secondary,
                                                            maxWidth: 180,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {country.name}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    color: theme?.palette.text.primary
                                                }}
                                            >
                                                {country.count}
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                        <Pagination
                                            count={totalPages}
                                            page={page}
                                            onChange={handlePageChange}
                                            size="small"
                                            renderItem={(item) => {
                                                if (!isMobile) return <PaginationItem {...item} />
                                                if (item.type === 'previous' || item.type === 'next' || item.page === page) {
                                                    return <PaginationItem {...item} />;
                                                }
                                                return null;
                                            }}
                                            sx={{
                                                '& .MuiPaginationItem-root': {
                                                    minWidth: 24,
                                                    height: 24,
                                                    fontSize: '0.7rem',
                                                }
                                            }}
                                        />
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Collapse>
            </Box>
        </ThemeProvider>
    );
};

const StatsControl = createControlComponent(
    (props) => {
        return new CountryStatsControl(props);
    }
);

export default function StatsComponent() {
    const timeContext = useContext(TemporalContext)
    const { server_id } = useParams()
    const theme = useTheme()
    const deferredTimeContext = useDeferredValue(timeContext)
    const ref = useRef()
    const debounced = useRef()
    useEffect(() => {
        if (debounced.current) {
            clearTimeout(debounced.current);
        }
        debounced.current = setTimeout(() => {
            ref.current.updateData({ timeContext: deferredTimeContext, theme, server_id })
        }, 600);
    }, [deferredTimeContext, theme, server_id])
    return (
        <StatsControl ref={ref} timeContext={deferredTimeContext} theme={theme} server_id={server_id} position="topright"/>
    );
}