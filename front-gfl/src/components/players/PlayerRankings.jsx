import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    TextField,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Pagination,
    Divider,
    CircularProgress,
    Autocomplete,
    Skeleton
} from '@mui/material';
import {
    Search,
    EmojiEvents
} from '@mui/icons-material';
import { fetchServerUrl } from "../../utils/generalUtils.jsx";
import PlayerListItem from "./PlayerListItem.jsx";

const PlayerListSkeleton = ({ count = 5, showMatchedSkeleton = false }) => (
    <>
        {showMatchedSkeleton && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
                <Skeleton variant="text" width="40%" height={20} />
            </Box>
        )}
        <List>
            {Array.from({ length: count }).map((_, index) => (
                <ListItem
                    key={index}
                    sx={{
                        borderRadius: 1,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        minHeight: 80
                    }}
                >
                    <ListItemAvatar>
                        <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={<Skeleton variant="text" width="40%" height={24} />}
                        secondary={
                            <Box sx={{ mt: 0.5 }}>
                                <Skeleton variant="text" width="60%" height={20} />
                            </Box>
                        }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="text" width={60} height={32} />
                    </Box>
                </ListItem>
            ))}
        </List>
    </>
);

const PlayerRankings = ({ serverId, navigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [rankingTab, setRankingTab] = useState(0);
    const [rankingPage, setRankingPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [playerRankings, setPlayerRankings] = useState(null);
    const [playerRankingsLoading, setPlayerRankingsLoading] = useState(true);
    const [playerRankingsError, setPlayerRankingsError] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState('');

    const rankingModes = useMemo(() => [
        {id: 'total', label: "Total Time", value: 'Total'},
        {id: 'casual', label: "Casual", value: 'Casual'},
        {id: 'tryhard', label: "Tryhard", value: 'TryHard'},
    ], []);

    const fetchPlayerRankings = async () => {
        try {
            setPlayerRankingsLoading(true);
            setPlayerRankingsError(null);
            const currentMode = rankingModes[rankingTab];
            const params = {
                page: rankingPage - 1,
                mode: currentMode.value,
                ...(debouncedSearchTerm.trim() && {player_name: debouncedSearchTerm.trim()})
            };
            const data = await fetchServerUrl(serverId, '/players/table', {params});
            setPlayerRankings(data);
            setTotalPages(Math.ceil((data?.total_players || 0) / 5));
        } catch (error) {
            console.error('Error fetching player rankings:', error);
            setPlayerRankingsError(error.message);
        } finally {
            setPlayerRankingsLoading(false);
        }
    };

    const fetchSearchSuggestions = async (inputValue) => {
        if (!inputValue.trim()) {
            setSearchSuggestions([]);
            return;
        }
        try {
            setSearchLoading(true);
            const params = {player_name: inputValue};
            const data = await fetchServerUrl(serverId, '/players/autocomplete', {params});
            setSearchSuggestions(data || []);
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            setSearchSuggestions([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchInputChange = (newValue) => {
        setSearchInputValue(newValue);
        setSearchTerm(newValue);

        if (!newValue.trim()) {
            setDebouncedSearchTerm('');
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && searchTerm.trim()) {
            setDebouncedSearchTerm(searchTerm.trim());
        }
    };

    const getTotalPages = () => {
        return totalPages;
    };

    useEffect(() => {
        fetchPlayerRankings();
    }, [serverId, rankingTab, rankingPage, debouncedSearchTerm]);

    useEffect(() => {
        setRankingPage(1);
    }, [debouncedSearchTerm, rankingTab]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setDebouncedSearchTerm('');
            return;
        }

        const timeoutId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSearchSuggestions(searchInputValue);
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [searchInputValue, serverId]);

    return (
        <Card sx={{mb: 3}}>
            <Box sx={{p: 2, display: 'flex', alignItems: 'center', gap: 1}}>
                <EmojiEvents color="primary"/>
                <Typography variant="h6" fontWeight={600}>
                    Player Rankings
                </Typography>
            </Box>
            <Divider/>
            <Box sx={{p: 2}}>
                <Autocomplete
                    freeSolo
                    options={searchSuggestions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                    inputValue={searchInputValue}
                    onInputChange={(event, newInputValue, reason) => {
                        if (reason === 'input') {
                            handleSearchInputChange(newInputValue);
                        }
                    }}
                    onChange={(event, value) => {
                        if (value && typeof value === 'object') {
                            handleSearchInputChange(value.name);
                            setDebouncedSearchTerm(value.name);
                        } else if (typeof value === 'string') {
                            handleSearchInputChange(value);
                            if (value.trim()) {
                                setDebouncedSearchTerm(value.trim());
                            }
                        }
                    }}
                    loading={searchLoading}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            fullWidth
                            variant="outlined"
                            placeholder="Search for your favorite players... (Press Enter to search)"
                            onKeyPress={handleKeyPress}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: <Search sx={{mr: 1, color: 'text.secondary'}}/>,
                                endAdornment: (
                                    <>
                                        {searchLoading && <CircularProgress color="inherit" size={20}/>}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    sx={{mb: 2}}
                    blurOnSelect={false}
                    clearOnBlur={false}
                    selectOnFocus={false}
                />
                <Tabs value={rankingTab} onChange={(e, v) => setRankingTab(v)} sx={{mb: 2}}>
                    {rankingModes.map((mode, index) => (
                        <Tab key={mode.id} label={mode.label}/>
                    ))}
                </Tabs>
                {playerRankingsLoading ? (
                    <PlayerListSkeleton showMatchedSkeleton={!!debouncedSearchTerm} />
                ) : playerRankingsError ? (
                    <Box sx={{p: 2, textAlign: 'center'}}>
                        <Typography color="error">Error loading player rankings: {playerRankingsError}</Typography>
                    </Box>
                ) : (
                    <>
                        {playerRankings?.players?.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No players found
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {debouncedSearchTerm ?
                                        `No results found for "${debouncedSearchTerm}". Try adjusting your search.` :
                                        'No players available at the moment.'
                                    }
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                {debouncedSearchTerm && (
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Found {playerRankings?.total_players?.toLocaleString() || 0} players matching "{debouncedSearchTerm}"
                                        </Typography>
                                    </Box>
                                )}
                                <List>
                                    {playerRankings?.players?.map((player) => (
                                        <PlayerListItem
                                            key={player.id}
                                            player={player}
                                            mode={rankingModes[rankingTab].value}
                                            navigate={navigate}
                                            serverId={serverId}
                                        />
                                    ))}
                                </List>
                            </>
                        )}
                        <Box sx={{display: 'flex', justifyContent: 'center', mt: 2}}>
                            <Pagination
                                count={Math.max(1, getTotalPages())}
                                page={rankingPage}
                                onChange={(e, page) => setRankingPage(page)}
                                color="primary"
                                disabled={playerRankingsLoading}
                            />
                        </Box>
                    </>
                )}
            </Box>
        </Card>
    );
};

export default PlayerRankings;