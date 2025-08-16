import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import {
    Container,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from '@mui/material';
import { fetchServerUrl } from "../utils/generalUtils.jsx";
import CurrentMatch from "../components/maps/CurrentMatch.jsx";
import MapsSearchControls from "../components/maps/MapsSearchControls.jsx";
import MapsFilterTabs from "../components/maps/MapsFilterTab.jsx";
import MapsTable from "../components/maps/MapsTable.jsx";
import MapsMobileView from "../components/maps/MapsMobileView.jsx";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";


function MapsPageDisplay() {
    const { server_id } = useParams();

    const [mapsData, setMapsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            } catch (err) {
                setError(err.message || 'Failed to load maps');
            } finally {
                setLoading(false);
            }
        };

        loadMaps();
    }, [server_id, page, sortBy, searchTerm, filterTab]);

    const getFilterMode = (tab) => {
        switch (tab) {
            case 'casual': return 'Casual';
            case 'tryhard': return 'TryHard';
            case 'available': return 'Available';
            default: return null;
        }
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

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <CurrentMatch />

            <MapsSearchControls
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                setSearchTerm={setSearchTerm}
                setPage={setPage}
                sortBy={sortBy}
                setSortBy={setSortBy}
                autocompleteOptions={autocompleteOptions}
                autocompleteLoading={autocompleteLoading}
            />

            <MapsFilterTabs
                filterTab={filterTab}
                setFilterTab={setFilterTab}
                setPage={setPage}
            />

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <MapsTable
                    mapsData={mapsData}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    handleChangePage={handleChangePage}
                    handleChangeRowsPerPage={handleChangeRowsPerPage}
                    loading={loading}
                />
            </Box>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <MapsMobileView
                    mapsData={mapsData}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    setPage={setPage}
                    loading={loading}
                />
            </Box>

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

export default function MapsPage() {
    return <ErrorCatch>
        <MapsPageDisplay />
    </ErrorCatch>
}