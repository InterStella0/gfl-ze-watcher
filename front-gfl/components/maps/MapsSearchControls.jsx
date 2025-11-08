import {
    Card,
    CardContent,
    Grid2,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Autocomplete,
    CircularProgress,
    Box,
    Typography,
    useTheme
} from '@mui/material';
import { Search } from '@mui/icons-material';


export default function MapsSearchControls({
    searchInput,
    setSearchInput,
    setSearchTerm,
    setPage,
    sortBy,
    setSortBy,
    autocompleteOptions,
    autocompleteLoading,
}) {
    const theme = useTheme();
    return (
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
                                    slotProps={{
                                        input: {
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
                                        }
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
                                onChange={(event) => {
                                    setSortBy(event.target.value);
                                    setPage(0);
                                }}
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
    );
}