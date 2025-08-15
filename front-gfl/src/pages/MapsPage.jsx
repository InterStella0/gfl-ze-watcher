import React, { useState, useMemo, useEffect } from 'react';
import {useNavigate, useParams} from 'react-router';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid2,
    TextField,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    useTheme,
    useMediaQuery,
    Container,
    Avatar,
    Stack,
    InputAdornment,
    IconButton,
    CardMedia,
    Skeleton,
    Fade,
    Tooltip,
    TablePagination,
    Pagination,
    CircularProgress,
    Alert,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import {
    Search,
    AccessTime,
    Star,
    StarBorder,
    TrendingUp,
    People,
    Schedule,
    Block,
    PlayArrow,
    Timeline
} from '@mui/icons-material';
import { fetchServerUrl, getMapImage } from "../utils/generalUtils.jsx";
import CurrentMatch from "../components/maps/CurrentMatch.jsx";

dayjs.extend(duration);

export default function GamingDashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { server_id } = useParams();
    const navigate = useNavigate();

    const [mapsData, setMapsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapImages, setMapImages] = useState({});
    const [autocompleteOptions, setAutocompleteOptions] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [sortBy, setSortBy] = useState('LastPlayed');
    const [filterTab, setFilterTab] = useState('all');
    const [favorites, setFavorites] = useState(new Set());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(0);
        }, 3000);

        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (!server_id || !searchInput.trim()) {
            setAutocompleteOptions([]);
            return;
        }

        const loadAutocomplete = async () => {
            try {
                setAutocompleteLoading(true);
                const data = await fetchServerUrl(server_id, '/maps/autocomplete', {
                    params: { map: searchInput.trim() }
                });
                setAutocompleteOptions(data.slice(0, 10));
            } catch (err) {
                console.error('Failed to load autocomplete:', err);
                setAutocompleteOptions([]);
            } finally {
                setAutocompleteLoading(false);
            }
        };

        const timer = setTimeout(loadAutocomplete, 300);
        return () => clearTimeout(timer);
    }, [server_id, searchInput]);

    useEffect(() => {
        if (!server_id) return;

        const loadMaps = async () => {
            try {
                setLoading(true);
                setError(null);

                const filterMode = getFilterMode(filterTab);
                const params = {
                    page: page,
                    sorted_by: sortBy,
                    ...(searchTerm && { search_map: searchTerm }),
                    ...(filterMode && { filter: filterMode })
                };

                const data = await fetchServerUrl(server_id, '/maps/last/sessions', { params });
                setMapsData(data);

                if (data?.maps) {
                    loadMapImages(data.maps);
                }
            } catch (err) {
                setError(err.message || 'Failed to load maps');
            } finally {
                setLoading(false);
            }
        };

        loadMaps();
    }, [server_id, page, sortBy, searchTerm, filterTab]);

    const loadMapImages = async (maps) => {
        const imagePromises = maps.map(async (map) => {
            try {
                const image = await getMapImage(server_id, map.map);
                return { mapName: map.map, image: image?.medium || null };
            } catch (err) {
                return { mapName: map.map, image: null };
            }
        });

        const results = await Promise.all(imagePromises);
        const imageMap = {};
        results.forEach(({ mapName, image }) => {
            imageMap[mapName] = image;
        });

        setMapImages(prev => ({ ...prev, ...imageMap }));
    };

    const getFilterMode = (tab) => {
        switch (tab) {
            case 'casual': return 'Casual';
            case 'tryhard': return 'TryHard';
            case 'available': return 'Available';
            default: return null;
        }
    };

    const getStatusChip = (map) => {
        if (!map.enabled) return (
            <Chip
                label="Disabled"
                color="error"
                size="small"
                icon={<Block />}
                variant="filled"
            />
        );
        if (map.pending_cooldown || map.cooldown) {
            const cooldownText = map.cooldown
                ? formatCooldownTime(map.cooldown)
                : 'Cooldown';
            return (
                <Chip
                    label={cooldownText}
                    color="warning"
                    size="small"
                    icon={<AccessTime />}
                    variant="filled"
                />
            );
        }
        return <Chip label="Ready" color="success" size="small" variant="filled" />;
    };

    const formatCooldownTime = (cooldownDate) => {
        const now = new Date();
        const cooldown = new Date(cooldownDate);
        const diffMs = cooldown - now;

        if (diffMs <= 0) return 'Ready';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
        return `${diffMinutes}m`;
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Never';

        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        return 'Recently';
    };

    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        return `${hours}h`;
    };

    const toggleFavorite = (mapName) => {
        setShowComingSoonDialog(true);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSortChange = (event) => {
        setSortBy(event.target.value);
        setPage(0);
    };

    const handleFilterChange = (event, newValue) => {
        setFilterTab(newValue);
        setPage(0);
    };

    const stats = useMemo(() => {
        return {
            totalMaps: mapsData?.total_maps || 0,
            totalCumulativeTime: 'N/A',
            mostPopularMap: 'N/A',
            avgSessionLength: 'N/A'
        };
    }, [mapsData]);

    if (loading && !mapsData) {
        return (
            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <CurrentMatch />

            <Card sx={{ mb: 3, background: theme.palette.background.paper }}>
                <CardContent>
                    <Grid2 container spacing={2} sx={{ alignItems: 'center' }}>
                        <Grid2 size={{ xs: 12, md: 8 }}>
                            <Autocomplete
                                freeSolo
                                options={autocompleteOptions.map(option => option.map)}
                                inputValue={searchInput}
                                onInputChange={(event, newInputValue) => {
                                    setSearchInput(newInputValue || '');
                                }}
                                onChange={(event, newValue) => {
                                    if (newValue) {
                                        setSearchInput(newValue);
                                        setSearchTerm(newValue);
                                        setPage(0);
                                    }
                                }}
                                loading={autocompleteLoading}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        placeholder="Search maps"
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search color="action" />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <>
                                                    {autocompleteLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            }
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box {...props} component="li">
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {option}
                                        </Typography>
                                    </Box>
                                )}
                                noOptionsText="No maps found"
                                loadingText="Loading maps..."
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Sort by</InputLabel>
                                <Select
                                    value={sortBy}
                                    onChange={handleSortChange}
                                    label="Sort by"
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="LastPlayed">Recently Played</MenuItem>
                                    <MenuItem value="HighestCumHour">Cumulative Hours</MenuItem>
                                    <MenuItem value="UniquePlayers">Unique Players</MenuItem>
                                    <MenuItem value="FrequentlyPlayed">Frequently Played</MenuItem>
                                    <MenuItem value="HighestHour">Highest Hours</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid2>
                    </Grid2>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={filterTab}
                    onChange={handleFilterChange}
                    variant={isMobile ? "scrollable" : "standard"}
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 'medium',
                            textTransform: 'none',
                            fontSize: '0.875rem'
                        }
                    }}
                >
                    <Tab label={`All Maps (${mapsData?.total_maps || 0})`} value="all" />
                    <Tab label="Casual" value="casual" />
                    <Tab label="Tryhard" value="tryhard" />
                    <Tab label="Available Now" value="available" />
                    <Tab label="Favorites" value="favorites" />
                </Tabs>
            </Card>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && mapsData?.maps && (
                <>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Map</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cumulative Hours</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Players</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avg Time</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Last Played</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Favorite</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mapsData.maps.map((map, index) => (
                                        <Fade in timeout={300 + index * 50} key={map.map}>
                                            <TableRow
                                                hover
                                                sx={{
                                                    '&:last-child td, &:last-child th': { border: 0 },
                                                    opacity: !map.enabled ? 0.6 : 1,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => navigate(`/${server_id}/maps/${map.map}/`)}
                                            >
                                                <TableCell sx={{ fontWeight: 'medium' }}>
                                                    {page * rowsPerPage + index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Card sx={{ borderRadius: 1, overflow: 'hidden', width: 80, height: 45 }}>
                                                            {mapImages[map.map] ? (
                                                                <CardMedia
                                                                    component="img"
                                                                    height="45"
                                                                    image={mapImages[map.map]}
                                                                    alt={map.map}
                                                                    sx={{ objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <Skeleton variant="rectangular" width={80} height={45} />
                                                            )}
                                                        </Card>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                                {map.map}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                                {map.is_casual && (
                                                                    <Chip label="CASUAL" size="small" color="success" variant="outlined" />
                                                                )}
                                                                {map.is_tryhard && (
                                                                    <Chip label="TRYHARD" size="small" color="secondary" variant="outlined" />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{getStatusChip(map)}</TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                        {formatDuration(map.total_cum_time)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                                                    {map.unique_players.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                                                    {map.total_sessions}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                                                    {Math.floor(map.total_time / map.total_sessions / 60) || 0}m
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formatTimeAgo(map.last_played)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(map.map);
                                                        }}
                                                        color={favorites.has(map.map) ? 'primary' : 'default'}
                                                        sx={{
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                                transform: 'scale(1.1)',
                                                                color: 'primary.main'
                                                            }
                                                        }}
                                                    >
                                                        {favorites.has(map.map) ? <Star /> : <StarBorder />}
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        </Fade>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                component="div"
                                count={mapsData.total_maps}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Maps per page:"
                            />
                        </TableContainer>
                    </Box>

                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                        <Stack spacing={2}>
                            {mapsData.maps.map((map, index) => (
                                <Fade in timeout={300 + index * 50} key={map.map}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            opacity: !map.enabled ? 0.6 : 1,
                                            '&:hover': {
                                                transform: 'translateY(-1px)',
                                                boxShadow: theme.shadows[4]
                                            }
                                        }}
                                        onClick={() => navigate(`/${server_id}/maps/${map.map}/`)}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box sx={{ flex: 1, mr: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem', lineHeight: 1.2, mb: 1 }}>
                                                        {map.map}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                                        {map.is_casual && (
                                                            <Chip label="CASUAL" size="small" color="success" variant="outlined" />
                                                        )}
                                                        {map.is_tryhard && (
                                                            <Chip label="TRYHARD" size="small" color="secondary" variant="outlined" />
                                                        )}
                                                    </Box>
                                                    {getStatusChip(map)}
                                                </Box>
                                                <IconButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(map.map);
                                                    }}
                                                    color={favorites.has(map.map) ? 'primary' : 'default'}
                                                    sx={{ mt: -0.5 }}
                                                >
                                                    {favorites.has(map.map) ? <Star /> : <StarBorder />}
                                                </IconButton>
                                            </Box>

                                            <Card sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                                                {mapImages[map.map] ? (
                                                    <CardMedia
                                                        component="img"
                                                        height="120"
                                                        image={mapImages[map.map]}
                                                        alt={map.map}
                                                        sx={{ objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <Skeleton variant="rectangular" height={120} />
                                                )}
                                            </Card>

                                            <Grid2 container spacing={2}>
                                                <Grid2 size={{ xs: 6 }}>
                                                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                                            {formatDuration(map.total_cum_time)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                                            Cumulative Hours
                                                        </Typography>
                                                    </Box>
                                                </Grid2>
                                                <Grid2 size={{ xs: 6 }}>
                                                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                                            {map.unique_players.toLocaleString()}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                                            Players
                                                        </Typography>
                                                    </Box>
                                                </Grid2>
                                                <Grid2 size={{ xs: 6 }}>
                                                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                                            {map.total_sessions}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                                            Sessions
                                                        </Typography>
                                                    </Box>
                                                </Grid2>
                                                <Grid2 size={{ xs: 6 }}>
                                                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                                            {formatTimeAgo(map.last_played)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                                            Last Played
                                                        </Typography>
                                                    </Box>
                                                </Grid2>
                                            </Grid2>
                                        </CardContent>
                                    </Card>
                                </Fade>
                            ))}
                        </Stack>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                            <Pagination
                                count={Math.ceil(mapsData.total_maps / rowsPerPage)}
                                page={page + 1}
                                onChange={(event, value) => setPage(value - 1)}
                                color="primary"
                                size="medium"
                                showFirstButton
                                showLastButton
                                sx={{
                                    '& .MuiPaginationItem-root': {
                                        fontSize: '1rem',
                                        minWidth: '44px',
                                        height: '44px'
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                </>
            )}

            <Dialog
                open={showComingSoonDialog}
                onClose={() => setShowComingSoonDialog(false)}
                aria-labelledby="coming-soon-dialog-title"
            >
                <DialogTitle id="coming-soon-dialog-title">
                    Coming Soon
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        The favorites feature is coming soon! Stay tuned for updates.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowComingSoonDialog(false)} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}