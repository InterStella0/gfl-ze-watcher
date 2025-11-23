'use client'
import MapsSearchControls from "components/maps/MapsSearchControls";
import MapsFilterTabs from "components/maps/MapsFilterTab";
import {Box} from "@mui/material";
import MapsTable from "components/maps/MapsTable";
import MapsMobileView from "components/maps/MapsMobileView";
import LoginDialog from "components/ui/LoginDialog";
import {use, useEffect, useState} from "react";
import {fetchServerUrl} from "utils/generalUtils";
import {MapPlayedPaginated} from "types/maps.ts";
import {ServerSlugPromise} from "../util.ts";
import {DiscordUser} from "types/users.ts";

export default function MapsSearchIndex({ serverPromise, userPromise }: { serverPromise: ServerSlugPromise, userPromise: Promise<DiscordUser | null> }) {
    const server = use(serverPromise)
    const user = use(userPromise)
    const server_id = server.id;
    const [mapsData, setMapsData] = useState<MapPlayedPaginated | null>(null);
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
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

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

                const data: MapPlayedPaginated = await fetchServerUrl(server_id, '/maps/last/sessions', { params });
                setMapsData(data);

                if (user && data?.maps) {
                    const favoriteSet = new Set();
                    data.maps.forEach(map => {
                        if (map.is_favorite) {
                            favoriteSet.add(map.map);
                        }
                    });
                    setFavorites(favoriteSet);
                }
            } catch (err) {
                setError(err.message || 'Failed to load maps');
            } finally {
                setLoading(false);
            }
        };

        loadMaps();
    }, [server_id, page, sortBy, searchTerm, filterTab, user]);

    const getFilterMode = (tab) => {
        switch (tab) {
            case 'casual': return 'Casual';
            case 'tryhard': return 'TryHard';
            case 'available': return 'Available';
            case 'favorites': return 'Favorite';
            default: return null;
        }
    }

    const toggleFavorite = async (mapName) => {
        if (!user) {
            setLoginDialogOpen(true);
            return;
        }

        const isFavorited = favorites.has(mapName);
        try {
            if (isFavorited) {
                await fetchServerUrl(server_id, `/maps/${encodeURIComponent(mapName)}/unset-favorite`, {
                    method: 'POST',
                });
                setFavorites(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(mapName);
                    return newSet;
                });
            } else {
                await fetchServerUrl(server_id, '/maps/set-favorite', {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        map_name: mapName,
                    })
                })
                setFavorites(prev => new Set([...prev, mapName]));
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    }

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };


    return <>
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
                server={server}
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
                server={server}
                mapsData={mapsData}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                page={page}
                rowsPerPage={rowsPerPage}
                setPage={setPage}
                loading={loading}
            />
        </Box>

        <LoginDialog
            open={loginDialogOpen}
            onClose={() => setLoginDialogOpen(false)}
        />
    </>
}