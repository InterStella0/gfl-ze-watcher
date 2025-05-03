import {useState, useEffect, useRef, useMemo} from 'react';
import { Box,
    Typography,
    Avatar,
    Chip,
    Grid2 as Grid,
    ListItemText,
    Tab,
    Tabs,
    Badge,
    Alert,
    Tooltip,
    CircularProgress,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    PersonAdd,
    PersonRemove,
    Map,
    Gavel,
    SportsEsports,
    ElectricBolt,
} from '@mui/icons-material';

import {formatFlagName, getMapImage, ICE_FILE_ENDPOINT, InfractionInt, URI} from "../utils.jsx";
import { PlayerAvatar } from "../components/players/PlayerAvatar.jsx";
import dayjs from "dayjs";
import {useNavigate} from "react-router";

const InfractionView = ({event}) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark';
    const rowData = JSON.parse(event.payload)
    const payload = rowData.payload
    const admin = payload.admin;
    const adminId = admin.admin_id
    const player = payload.player
    const playerId = player?.gs_id
    const flags = new InfractionInt(payload.flags);
    try {
        const eventId = `${rowData.id || event.channel}-${player.gs_id}-${payload.timestamp || payload.created_at || Date.now()}`;

        return (
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 1,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                    },
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.shadows[3],
                    textAlign: 'left'
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        height: '4px',
                        width: '100%',
                        top: 0,
                        left: 0,
                        bgcolor: 'error.main',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4
                    }}
                />
                <CardContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'error.main', mr: 1.5 }}>
                            <Gavel />
                        </Avatar>
                        <Typography variant="body1" fontWeight="bold">
                            {event.channel === 'infraction_new'? 'New Infraction': 'Update Infraction'}
                        </Typography>
                        {flags.getAllRestrictedFlags().map((v, i) => <Chip key={i}
                            label={formatFlagName(v)}
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                        />)}

                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{xs: 12, sm: 6}}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ mr: 1 }}>
                                    <PlayerAvatar
                                        uuid={playerId}
                                        name={player.gs_name}
                                        sx={{ width: 32, height: 32 }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {player?.gs_name ?? "Unknown" }
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ID: {playerId ?? "Unknown"}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6}}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Box key={`admin-avatar-${adminId}-${eventId}`} sx={{ mr: 1 }}>
                                    <Avatar
                                        src={ICE_FILE_ENDPOINT.replace('{}', admin.avatar_id)}
                                        title={`${admin.admin_name}'s Avatar`}
                                        alt={admin.admin_name}
                                        sx={{ width: 32, height: 32 }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {admin.admin_name}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12}}>
                            <Box sx={{
                                bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                            }}>
                                {payload.reason && (
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Reason: <strong>{payload.reason}</strong>
                                    </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    {dayjs(payload.created_at).format('lll')}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    } catch (error) {
        console.error('Error rendering infraction event:', error, event);
        return (
            <Card sx={{ mb: 2, borderRadius: 1, bgcolor: theme.palette.background.paper }}>
                <Box
                    sx={{
                        height: '4px',
                        width: '100%',
                        bgcolor: 'warning.main',
                    }}
                />
                <CardContent>
                    <Typography color="error">Error rendering infraction event</Typography>
                </CardContent>
            </Card>
        );
    }
};

const MapActivity = ({event}) => {
    const theme = useTheme()
    const changeType = event.channel
    const payload = useMemo(() => JSON.parse(event.payload), [event])
    const [mapImage, setImage] = useState()
    useEffect(() => {
        getMapImage(payload.map).then(e => setImage(e.medium))
    }, [payload])
    try {
        return (
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 1,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        cursor: 'pointer',
                    },
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.shadows[3]
                }}
                onClick={() => window.open(`/maps/${payload.map}`, '_blank')}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        height: '4px',
                        width: '100%',
                        top: 0,
                        left: 0,
                        bgcolor: 'primary.main',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4
                    }}
                />
                <CardContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body1" fontWeight="bold">
                            {changeType === "map_changed"? "Map Change": "Map Update"}
                        </Typography>
                    </Box>

                    <Grid container spacing={2} alignItems="center">
                        {mapImage && (
                            <Grid size={{ xs: 12, sm: 4, md: 3}}>
                                <Box
                                    component="img"
                                    src={mapImage}
                                    alt={payload.map}
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}
                                />
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: mapImage ? 8 : 12, md: mapImage ? 9 : 12}} sx={{textAlign: 'left'}}>
                            <Typography variant="body2">
                                <strong>{payload.map}</strong>
                            </Typography>
                            <Typography variant="body2">Player Count: {payload.player_count}</Typography>
                            {changeType === "map_update" &&
                                <Typography variant="body2">Lasted {dayjs(payload.ended_at).diff(dayjs(payload.started_at), 'minute')}min</Typography>}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                {dayjs(payload.started_at).format('lll')}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    } catch (error) {
        console.error('Error rendering map activity event:', error, event);
        return (
            <Card sx={{ mb: 2, borderRadius: 1, bgcolor: theme.palette.background.paper }}>
                <Box
                    sx={{
                        height: '4px',
                        width: '100%',
                        bgcolor: 'warning.main',
                    }}
                />
                <CardContent>
                    <Typography color="error">Error rendering map activity event</Typography>
                </CardContent>
            </Card>
        );
    }
};

const PlayerActivity = ({event}) => {
    const theme = useTheme()
    const navigate = useNavigate()
    try {
        const payload = JSON.parse(event.payload);
        const isJoin = payload.event_name === 'join';
        const eventId = `${event.id || event.channel}-${payload.player_id}-${payload.timestamp || payload.created_at || Date.now()}`;

        return (
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 1,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        cursor: "pointer"
                    },
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.shadows[3]
                }}
                onClick={() => window.open(`/players/${payload.player_id}`, '_blank')}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        height: '4px',
                        width: '100%',
                        top: 0,
                        left: 0,
                        bgcolor: isJoin ? 'success.main' : 'error.main',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4
                    }}
                />
                <CardContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {/* Important: Add a key to force avatar refresh */}
                        <Box key={`avatar-${payload.player_id}-${eventId}`} sx={{ mr: 1.5 }}>
                            <PlayerAvatar
                                uuid={payload.player_id}
                                name={payload.event_value}
                                sx={{ width: 40, height: 40 }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="body1" fontWeight="bold">
                                {payload.event_value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ID: {payload.player_id}
                            </Typography>
                        </Box>
                        <Chip
                            size="small"
                            icon={isJoin ? <PersonAdd fontSize="small" /> : <PersonRemove fontSize="small" />}
                            label={isJoin ? 'Joined' : 'Left'}
                            color={isJoin ? 'success' : 'error'}
                            sx={{ ml: 'auto' }}
                        />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {dayjs(payload.created_at).format("lll")}
                    </Typography>
                </CardContent>
            </Card>
        );
    } catch (error) {
        console.error('Error rendering player activity event:', error, event);
        return (
            <Card sx={{ mb: 2, borderRadius: 1, bgcolor: theme.palette.background.paper }}>
                <Box
                    sx={{
                        height: '4px',
                        width: '100%',
                        bgcolor: 'warning.main',
                    }}
                />
                <CardContent>
                    <Typography color="error">Error rendering player activity event</Typography>
                </CardContent>
            </Card>
        );
    }
};
const LiveServerTrackerPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isDarkMode = theme.palette.mode === 'dark';

    const [events, setEvents] = useState([]);
    const [selectedTab, setSelectedTab] = useState(0);
    const [isConnected, setIsConnected] = useState(true);
    const eventSourceRef = useRef(null);

    // Counters for each event type
    const [counters, setCounters] = useState({
        playerActivity: 0,
        mapActivity: 0,
        infraction: 0
    });

    useEffect(() => {
        const connectEventSource = () => {
            const eventSource = new EventSource(URI('/events/data-updates'));
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                const newEvent = JSON.parse(event.data);

                if (newEvent.channel === "heartbeat") {
                    return;
                }

                setEvents(prevEvents => {
                    return [newEvent, ...prevEvents];
                });

                setCounters(prev => {
                    const updatedCounters = { ...prev };

                    if (newEvent.channel === 'player_activity') {
                        updatedCounters.playerActivity += 1;
                    } else if (['map_changed', 'map_update'].includes(newEvent.channel)) {
                        updatedCounters.mapActivity += 1;
                    } else if (['infraction_update', 'infraction_new'].includes(newEvent.channel)) {
                        updatedCounters.infraction += 1;
                    }

                    return updatedCounters;
                });
            };

            eventSource.onerror = (error) => {
                console.error('Error with SSE connection:', error);
                setIsConnected(false);

                // Close and attempt to reconnect after delay
                eventSource.close();
                setTimeout(connectEventSource, 5000); // Try to reconnect after 5 seconds
            };

            return eventSource;
        };
        let _ = connectEventSource()
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // Handler for tab changes
    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    // Filter events based on current tab
    const filteredEvents = events.filter(event => {
        if (selectedTab === 0) return true; // All events
        if (selectedTab === 1) return event.channel === 'player_activity';
        if (selectedTab === 2) return ['map_changed', 'map_update'].includes(event.channel);
        if (selectedTab === 3) return ['infraction_new', 'infraction_update'].includes(event.channel);
        return true;
    });

    const renderEvent = (event) => {
        switch (event.channel) {
            case 'player_activity':
                return <PlayerActivity event={event} />;
            case 'map_update':
            case 'map_changed':
                return <MapActivity event={event} />
            case 'infraction_update':
            case 'infraction_new':
                return <InfractionView event={event} />;
            default:
                return (
                    <Card sx={{ mb: 2, borderRadius: 1, bgcolor: theme.palette.background.paper }}>
                        <Box
                            sx={{
                                height: '4px',
                                width: '100%',
                                bgcolor: 'grey.500',
                            }}
                        />
                        <CardContent>
                            <ListItemText
                                primary={`${event.channel}`}
                                secondary={JSON.stringify(event.payload)}
                            />
                        </CardContent>
                    </Card>
                );
        }
    };

    const StyledTab = (props) => (
        <Tab
            {...props}
            sx={{
                borderRadius: '4px',
                transition: 'all 0.2s',
                mx: 0.5,
                '&.Mui-selected': {
                    bgcolor: isDarkMode ? 'rgba(114, 137, 218, 0.2)' : 'rgba(114, 137, 218, 0.1)',
                    color: theme.palette.primary.main,
                    fontWeight: 'bold'
                },
                ...props.sx
            }}
        />
    );

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                <Typography
                    variant="h5"
                    component="h1"
                    sx={{
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <SportsEsports sx={{ mr: 1, color: theme.palette.primary.main }} />
                    Live Feed
                    {!isConnected && (
                        <Tooltip title="Reconnecting...">
                            <CircularProgress size={16} sx={{ ml: 1, color: theme.palette.warning.main }} />
                        </Tooltip>
                    )}
                </Typography>

                <Box sx={{ display: 'flex' }}>
                    <Chip
                        icon={<PersonAdd sx={{ color: theme.palette.common.white }} />}
                        label={`${counters.playerActivity}`}
                        sx={{
                            mr: 1,
                            bgcolor: theme.palette.success.main,
                            color: theme.palette.common.white,
                            '& .MuiChip-label': { fontWeight: 'bold' }
                        }}
                    />
                    <Chip
                        icon={<Map sx={{ color: theme.palette.common.white }} />}
                        label={`${counters.mapActivity}`}
                        sx={{
                            mr: 1,
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.common.white,
                            '& .MuiChip-label': { fontWeight: 'bold' }
                        }}
                    />
                    <Chip
                        icon={<Gavel sx={{ color: theme.palette.common.white }} />}
                        label={`${counters.infraction}`}
                        sx={{
                            bgcolor: theme.palette.error.main,
                            color: theme.palette.common.white,
                            '& .MuiChip-label': { fontWeight: 'bold' }
                        }}
                    />
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    variant={isMobile ? "scrollable" : "standard"}
                    scrollButtons={isMobile ? "auto" : false}
                    sx={{
                        '& .MuiTabs-indicator': {
                            display: 'none',
                        },
                        '& .MuiTabs-flexContainer': {
                            gap: 1,
                        },
                        bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                        p: 1,
                        borderRadius: 1
                    }}
                >
                    <StyledTab
                        label="All Events"
                        icon={<Badge badgeContent={events.length} color="primary">
                            <ElectricBolt />
                        </Badge>}
                        iconPosition="start"
                    />
                    <StyledTab
                        label="Player Activity"
                        icon={<Badge badgeContent={counters.playerActivity} color="success">
                            <PersonAdd />
                        </Badge>}
                        iconPosition="start"
                    />
                    <StyledTab
                        label="Map Changes"
                        icon={<Badge badgeContent={counters.mapActivity} color="info">
                            <Map />
                        </Badge>}
                        iconPosition="start"
                    />
                    <StyledTab
                        label="Infractions"
                        icon={<Badge badgeContent={counters.infraction} color="error">
                            <Gavel />
                        </Badge>}
                        iconPosition="start"
                    />
                </Tabs>
            </Box>

            <Box sx={{
                maxHeight: '68vh',
                overflowY: 'auto',
                px: 1,
                pb: 2,
                '&::-webkit-scrollbar': {
                    width: '6px',
                    height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '10px',
                    '&:hover': {
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    },
                },
            }}>
                {filteredEvents.length === 0 ? (
                    <Alert
                        severity="info"
                        sx={{
                            mt: 2,
                            bgcolor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                            color: theme.palette.text.primary,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                    >
                        No events to display. Waiting for new events...
                    </Alert>
                ) : (
                    <Box>
                        {filteredEvents.map((event, index) => {
                            // Create a unique key for each event to force re-render
                            let uniqueKey;
                            try {
                                const payload = typeof event.payload === 'string' ?
                                    JSON.parse(event.payload) : event.payload;
                                const timestamp = payload.timestamp || payload.created_at || Date.now();
                                uniqueKey = `${event.channel}-${payload.player_id || payload.map_name || index}-${timestamp}`;
                            } catch (e) {
                                uniqueKey = `${event.channel}-${index}-${Date.now()}`;
                            }

                            return (
                                <Box
                                    key={uniqueKey}
                                    sx={{
                                        opacity: 1,
                                        animation: 'fadeIn 0.3s ease-in-out',
                                        '@keyframes fadeIn': {
                                            from: { opacity: 0, transform: 'translateY(-10px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' }
                                        }
                                    }}
                                >
                                    {renderEvent(event)}
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </Box>
    );
};
export default LiveServerTrackerPage;