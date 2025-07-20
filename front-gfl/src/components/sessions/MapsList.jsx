import { useNavigate } from 'react-router';
import {Paper, Typography, Card, CardContent, Box, Skeleton} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatTime } from '../../utils/sessionUtils.js';
import { useMapsData } from './useMapsData.js';
import {simpleRandom} from "../../utils/generalUtils.jsx";


function MapsListSkeleton(){
    return Array.from({ length: simpleRandom(2, 6) }).map((_, index) => (
        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexDirection={{xs: "column", sm: 'row'}}>
                    <Box display="flex" gap={2} alignItems="center">
                        <Skeleton variant="text" width={120} height={32} />
                        <Skeleton variant="text" width={60} height={24} />
                    </Box>
                    <Skeleton variant="text" width={200} height={20} />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{xs: "column", sm: 'row'}}>
                    <Box>
                        <Skeleton variant="text" width={100} height={20} />
                        <Skeleton variant="text" width={80} height={48} />
                    </Box>
                    <Skeleton variant="rectangular" width={120} height={80} sx={{ borderRadius: 1 }} />
                </Box>
            </CardContent>
        </Card>
    ))
}

export const MapsList = ({ server_id, player_id, session_id }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { maps, mapImages, loading } = useMapsData(server_id, player_id, session_id);

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Maps Played
            </Typography>
            {loading && <MapsListSkeleton />}
            {!loading && maps.map((map) => (
                <Card
                    key={map.time_id}
                    variant="outlined"
                    sx={{
                        mb: 2,
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: 'action.hover'
                        }
                    }}
                    onClick={() => navigate(`/${server_id}/maps/${map.map}/sessions/${map.time_id}`)}
                >
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexDirection={{xs: "column", sm: 'row'}}>
                            <Box display="flex" gap={2} alignItems="center">
                                <Typography variant="h6" component="h4" fontSize={{sm: "1.5rem", xs: ".9rem"}}>
                                    {map.map}
                                </Typography>
                                <Typography variant="p" component="p" color="text.secondary" fontSize={{sm: "1.1rem", xs: ".8rem"}}>
                                    #{map.time_id}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {formatTime(map.started_at)} - {map.ended_at ? formatTime(map.ended_at) : 'Ongoing'}
                                {map.ended_at && ` (${Math.floor((new Date(map.ended_at) - new Date(map.started_at)) / (1000 * 60))}m)`}
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexDirection={{xs: "column", sm: 'row'}}>
                            <Box alignItems={{xs: "center", sm: 'flex-start'}}>
                                {map.match_data && map.match_data.length > 0 ? (
                                    <>
                                        <Typography
                                            variant="body1"
                                            color={map.match_data[0].human_score > map.match_data[0].zombie_score ? 'success.main' : 'error.main'}
                                        >
                                            FINAL SCORE
                                        </Typography>
                                        <Typography variant="h4" fontWeight="bold" textAlign={{xs: "center", sm: 'flex-start'}}>
                                            {map.match_data[0].human_score} - {map.match_data[0].zombie_score}
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography variant="body1" color="text.secondary">
                                        No score data available
                                    </Typography>
                                )}
                            </Box>
                            <Box textAlign="right">
                                {mapImages[map.map] ? (
                                    <img
                                        src={mapImages[map.map]}
                                        alt={map.map}
                                        style={{
                                            width: '120px',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: theme.shape.borderRadius,
                                            border: `1px solid ${theme.palette.divider}`
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            width: 120,
                                            height: 80,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'background.paper'
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            No Image
                                        </Typography>
                                    </Paper>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Paper>
    );
};