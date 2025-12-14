import {Paper, Typography, Card, CardContent, Box} from '@mui/material';
import { formatTime } from 'utils/sessionUtils.js';
import {Server} from "types/community";
import {PlayerSessionMapPlayed} from "../../app/servers/[server_slug]/util";
import dayjs from "dayjs";
import Link from "components/ui/Link.tsx";


export default function MapsList(
    { maps, mapImages, server }
    : { maps: PlayerSessionMapPlayed[], mapImages: Record<string, string>, server: Server}
){
    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Maps Played
            </Typography>
            {maps.map((map) => (
                <Card
                    key={map.time_id}
                    variant="outlined"
                    sx={{ mb: 2 }}
                >
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexDirection={{xs: "column", sm: 'row'}}>
                            <Box display="flex" gap={2} alignItems="center">
                                <Typography variant="h6" fontSize={{sm: "1.5rem", xs: ".9rem"}}
                                    href={`/servers/${server.gotoLink}/maps/${map.map}/sessions/${map.time_id}`}
                                    component={Link}
                                >
                                    {map.map}
                                </Typography>
                                <Typography component="p" color="text.secondary" fontSize={{sm: "1.1rem", xs: ".8rem"}}>
                                    #{map.time_id}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {formatTime(map.started_at)} - {map.ended_at ? formatTime(map.ended_at) : 'Ongoing'}
                                {map.ended_at && ` (${dayjs(map.ended_at).diff(dayjs(map.started_at), 'minute')}m)`}
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
                                        <Typography variant="h4" fontWeight="bold" textAlign={{xs: "center", sm: 'left'}}>
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
                                            borderRadius: 'var(--mui-shape-borderRadius)',
                                            border: `1px solid var(--mui-palette-divider)`
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