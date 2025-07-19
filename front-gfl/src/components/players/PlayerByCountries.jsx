import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    List,
    ListItem,
    Pagination,
    Divider,
    Skeleton,
    Button
} from '@mui/material';
import { Public, Radar } from '@mui/icons-material';
import { getFlagUrl, fetchServerUrl } from "../../utils/generalUtils.jsx";

const CountriesSkeleton = () => (
    <List sx={{ p: 1 }}>
        {Array.from({ length: 10 }).map((_, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Skeleton variant="rectangular" width={24} height={16} />
                        <Skeleton variant="text" width={120} />
                    </Box>
                    <Skeleton variant="text" width={40} />
                </Box>
            </ListItem>
        ))}
    </List>
);

const PlayerByCountries = ({ serverId, navigate }) => {
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(true);
    const [countriesError, setCountriesError] = useState(null);
    const [communityPage, setCommunityPage] = useState(1);

    const COUNTRIES_PER_PAGE = 10;

    const fetchCountries = async () => {
        try {
            setCountriesLoading(true);
            setCountriesError(null);
            const data = await fetchServerUrl(serverId, '/players/countries');
            setCountries(data.countries || []);
        } catch (error) {
            console.error('Error fetching countries:', error);
            setCountriesError(error.message);
        } finally {
            setCountriesLoading(false);
        }
    };

    const getPaginatedCountries = () => {
        const startIndex = (communityPage - 1) * COUNTRIES_PER_PAGE;
        const endIndex = startIndex + COUNTRIES_PER_PAGE;
        return countries.slice(startIndex, endIndex);
    };

    const getTotalCountryPages = () => {
        return Math.ceil(countries.length / COUNTRIES_PER_PAGE);
    };

    useEffect(() => {
        fetchCountries();
    }, [serverId]);

    return (
        <Card>
            <Box sx={{p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Public color="primary"/>
                    <Typography variant="h6" fontWeight={600}>
                        Players by countries
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Radar />}
                    onClick={() => navigate(`/${serverId}/radar`)}
                    sx={{
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                            borderColor: 'primary.dark',
                            bgcolor: 'primary.main',
                            color: 'white',
                        }
                    }}
                >
                    View Radar
                </Button>
            </Box>
            <Divider/>
            {countriesLoading ? (
                <CountriesSkeleton />
            ) : countriesError ? (
                <Box sx={{p: 2, textAlign: 'center'}}>
                    <Typography color="error">Error loading countries: {countriesError}</Typography>
                </Box>
            ) : (
                <>
                    <List sx={{p: 1}}>
                        {getPaginatedCountries().map((country, index) => (
                            <ListItem key={country.code} sx={{py: 1}}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    justifyContent: 'space-between'
                                }}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <img
                                            src={getFlagUrl(country.code)}
                                            alt={country.name || 'Country Flag'}
                                            style={{width: '24px', height: '16px'}}
                                        />
                                        <Typography variant="body1">{country.name}</Typography>
                                    </Box>
                                    <Typography variant="body1" color="primary.main" fontWeight={600}>
                                        {country.count}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                    {getTotalCountryPages() > 1 && (
                        <Box sx={{display: 'flex', justifyContent: 'center', p: 2}}>
                            <Pagination
                                count={getTotalCountryPages()}
                                page={communityPage}
                                onChange={(e, page) => setCommunityPage(page)}
                                color="primary"
                                size="small"
                            />
                        </Box>
                    )}
                </>
            )}
        </Card>
    );
};

export default PlayerByCountries;