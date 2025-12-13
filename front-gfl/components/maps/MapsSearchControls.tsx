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
} from '@mui/material';
import { Search } from '@mui/icons-material';
import {SortByIndex} from "../../app/servers/[server_slug]/maps/MapsSearchIndex.tsx";
import {ServerMap} from "types/maps.ts";


export default function MapsSearchControls({
    searchInput,
    setSearchInput,
    setSearchTerm,
    setPage,
    sortBy,
    setSortBy,
    autocompleteOptions,
    autocompleteLoading,
}: {
    searchInput: string,
    setSearchInput: (searchInput: string) => void,
    setSearchTerm: (searchTerm: string) => void,
    setPage: (page: number) => void,
    sortBy: SortByIndex,
    setSortBy: (sortBy: SortByIndex) => void,
    autocompleteOptions: ServerMap[],
    autocompleteLoading: boolean,

}) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Grid2 container spacing={2} sx={{ alignItems: 'center' }}>
                    <Grid2 size={{ xs: 12, md: 8 }}>
                        <Autocomplete
                            freeSolo
                            options={autocompleteOptions.map(option => option.map)}
                            inputValue={searchInput}
                            onInputChange={(_, newInputValue) => {
                                setSearchInput(newInputValue || '');
                            }}
                            onChange={(_, newValue: string | null) => {
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
                                    setSortBy(event.target.value as SortByIndex);
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