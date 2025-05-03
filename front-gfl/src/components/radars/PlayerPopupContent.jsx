import {
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    Box,
    Divider,
    IconButton,
    CircularProgress,
    useTheme,
    Alert
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { PlayerAvatar } from "../players/PlayerAvatar.jsx";
import { getFlagUrl, secondsToHours } from "../../utils.jsx";
import NotListedLocationIcon from '@mui/icons-material/NotListedLocation';
import {Link} from "react-router";
const PlayerPopupContent = ({
                                isLoading,
                                countryData,
                                currentPlayers,
                                totalPlayers,
                                page,
                                totalPages,
                                position,
                                error,
                                onPageChange
                            }) => {
    const theme = useTheme();

    // Handle error display
    if (error) {
        return (
            <Card
                variant="outlined"
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    maxWidth: '100%',
                    border: 'none',
                    boxShadow: 'none'
                }}
            >
                <CardContent sx={{ p: 1, pb: '8px !important' }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        py: 1
                    }}>
                        {error === "Unknown country selected" ? (
                            <>
                                    <NotListedLocationIcon sx={{ fontSize: "3rem", my: "1rem" }} />
                                <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.9rem' }}>
                                    Nothing found :/
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                    Coordinates: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                                </Typography>
                            </>
                        ) : (
                            <>
                                <Box
                                    component="span"
                                    sx={{
                                        fontSize: '2rem',
                                        color: theme.palette.warning.main,
                                        mb: 1
                                    }}
                                >
                                    ⚠️
                                </Box>
                                <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '0.9rem' }}>
                                    Error
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                    {error}
                                </Typography>
                            </>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            variant="outlined"
            sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                maxWidth: '100%',
                border: 'none',
                boxShadow: 'none'
            }}
        >
            <CardContent sx={{ p: 1, pb: '8px !important' }}>
                {isLoading ? (
                    <LoadingState />
                ) : (
                    <>
                        <CountryHeader
                            countryData={countryData}
                            position={position}
                            theme={theme}
                        />

                        <Divider sx={{ my: 0.5 }} />

                        <Typography variant="subtitle2" sx={{ mb: 0.25, fontSize: '0.8rem' }}>
                            Players ({totalPlayers})
                        </Typography>

                        <PlayerList
                            players={currentPlayers}
                            theme={theme}
                        />

                        <PaginationControls
                            page={page}
                            totalPages={totalPages}
                            onPageChange={onPageChange}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
};

// Loading indicator component
const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
        <CircularProgress size={24} color="secondary" />
        <Typography variant="body2" sx={{ ml: 1.5, fontSize: '0.8rem' }}>
            Loading player data...
        </Typography>
    </Box>
);

// Country header with flag and info
const CountryHeader = ({ countryData, position, theme }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {countryData?.properties?.code && (
            <img
                src={getFlagUrl(countryData?.properties?.code)}
                alt={countryData?.properties?.name || 'Country Flag'}
                style={{ marginRight: '1rem' }}
            />
        )}
        <Box>
            <Typography variant="subtitle1" color={ theme.palette.primary.main } sx={{ m: 0, fontWeight: 'bold', fontSize: '0.85rem', lineHeight: 1.2 }}>
                {countryData ? `${countryData.properties.name} (${countryData.properties.code})` : 'Loading...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.1 }}>
                {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </Typography>
        </Box>
    </Box>
);

// Player list component - now using PlayerAvatar and more compact
const PlayerList = ({ players, theme }) => (
    <List
        dense
        disablePadding
        sx={{
            maxHeight: '270px',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
                width: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.divider,
                borderRadius: '2px',
            }
        }}
    >
        {players && players.length > 0 ? (
            players.map((player) => (
                <ListItem
                    key={player.id}
                    divider
                    dense
                    alignItems="center"
                    sx={{
                        py: 0.25,
                        px: 0.25,
                        minHeight: '36px',
                        '&:hover': {
                            'backdrop-filter': 'brightness(85%)'
                        }
                    }}
                >
                    <Link to={`/players/${player.id}`}
                          style={{
                              width: '100%', display: 'flex', alignItems: 'center',
                              color: theme.palette.primary.main
                    }}>
                        <PlayerAvatar
                            uuid={player.id}
                            name={player.name}
                            sx={{
                                width: 24,
                                height: 24,
                                mr: 1,
                                ml: '1rem',
                                flexShrink: 0,
                            }}
                        />
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            overflow: 'hidden'
                        }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.8rem',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {player.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.7rem',
                                    lineHeight: 1.1
                                }}
                            >
                                {secondsToHours(player.total_playtime)}h • {player.session_count} sessions
                            </Typography>
                        </Box>
                    </Link>
                </ListItem>
            ))
        ) : (
            <Typography variant="body2" sx={{ p: 0.5, textAlign: 'center', fontSize: '0.8rem' }}>
                No players found
            </Typography>
        )}
    </List>
);

// Pagination controls - made more compact
const PaginationControls = ({ page, totalPages, onPageChange }) => (
    <Box
        className="pagination-controls" // Add this class for disabling click propagation
        sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 0.5
        }}
    >
        <IconButton
            size="small"
            disabled={page === 1}
            onClick={(e) => {
                e.stopPropagation();
                onPageChange(page - 1)
            }}
            sx={{ p: 0.25 }}
        >
            <NavigateBeforeIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>

        <Typography variant="body2" sx={{ mx: 0.5, fontSize: '0.7rem' }}>
            {page} / {totalPages || 1}
        </Typography>

        <IconButton
            size="small"
            disabled={page === totalPages || totalPages === 0}
            onClick={(e) => {

                e.stopPropagation();
                onPageChange(page + 1)
            }}
            sx={{ p: 0.25 }}
        >
            <NavigateNextIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
    </Box>
);

export default PlayerPopupContent;