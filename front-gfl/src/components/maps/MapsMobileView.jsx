import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Grid2,
    Stack,
    Chip,
    IconButton,
    Fade,
    Pagination,
    Skeleton, useTheme
} from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import {getMapImage, secondsToHours, simpleRandom} from "../../utils/generalUtils.jsx";
import {getStatusChip} from "./MapsTable.jsx";
import dayjs from "dayjs";
import {useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";

export const MapsMobileViewSkeleton = () => (
    <Card>
        <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                    <Skeleton variant="text" width={`${simpleRandom(40, 80)}%`} height={24} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 0.8, mb: 1 }}>
                        <Skeleton variant="rounded" width={60} height={20} />
                        {Math.round(simpleRandom(0, 1)) !== 0 && <Skeleton variant="rounded" width={70} height={20}/>}
                    </Box>
                    <Skeleton variant="rounded" width={50} height={24} />
                </Box>
                <Skeleton variant="circular" width={40} height={40} />
            </Box>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
            <Grid2 container spacing={2}>
                {Array.from({ length: 4 }).map((_, j) => (
                    <Grid2 size={{ xs: 6 }} key={j}>
                        <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                            <Skeleton variant="text" width="60%" height={24} sx={{ mx: 'auto' }} />
                            <Skeleton variant="text" width="80%" height={16} sx={{ mx: 'auto' }} />
                        </Box>
                    </Grid2>
                ))}
            </Grid2>
        </CardContent>
    </Card>
);
function MapCardView({ map, favorites, toggleFavorite }){
    const navigate = useNavigate();
    const { server_id }  = useParams();
    const theme = useTheme()
    const [mapImage, setMapImage] = useState(null);
    useEffect(() => {
        getMapImage(server_id, map.map).then(e => setMapImage(e? e.large: null))
    }, [server_id, map.map])

    return <Card
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
                    <Typography
                        variant="h6"
                        noWrap
                        sx={{ fontWeight: 'bold', fontSize: '1rem', lineHeight: 1.2, mb: 1, width: {sm: '24rem', xs: '12rem'} }}
                    >
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
                {mapImage ? (
                    <CardMedia
                        component="img"
                        height="120"
                        image={mapImage}
                        alt={map.map}
                        sx={{ objectFit: 'cover' }}
                    />
                ) : (
                    <Skeleton variant="rectangular" height={120} />
                )}
            </Card>

            <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12 }}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {secondsToHours(map.total_cum_time)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            Cumulative Hours
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 6 }}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {secondsToHours(map.total_time)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            Hours
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
                            {dayjs(map.last_played).fromNow(true)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            Last Played
                        </Typography>
                    </Box>
                </Grid2>
            </Grid2>
        </CardContent>
    </Card>
}
export default function MapsMobileView({
    mapsData,
    favorites,
    toggleFavorite,
    page,
    rowsPerPage,
    setPage,
    loading
}) {
    return (
        <>
            <Stack spacing={2}>
                {!loading && mapsData?.maps?.map((map, index) => (
                    <Fade in timeout={300 + index * 50} key={map.map}>
                        <Box>
                            <MapCardView map={map} favorites={favorites} toggleFavorite={toggleFavorite}/>
                        </Box>
                    </Fade>
                ))}
                {loading && Array.from({ length: 25 }).map((_, index) => {
                    return <MapsMobileViewSkeleton key={index} />
                })}
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                <Pagination
                    count={Math.ceil(mapsData?.total_maps / rowsPerPage)}
                    page={page + 1}
                    onChange={(event, value) => setPage(value - 1)}
                    color="primary"
                    size="medium"
                    showFirstButton
                    showLastButton
                />
            </Box>
        </>
    );
}