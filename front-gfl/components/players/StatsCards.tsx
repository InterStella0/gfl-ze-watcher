import {ReactElement} from 'react';
import {
    Box,
    Typography,
    Grid2,
    Card,
    CardContent
} from '@mui/material';
import {
    Person,
    Public,
    Schedule
} from '@mui/icons-material';
import { fetchServerUrl, secondsToHours } from "../../utils/generalUtils";
import {Server} from "../../types/community";

const getStatsCards = (stats) => {
    if (!stats) return [];

    return [
        {
            label: 'Total Players',
            thisWeek: stats.week1?.total_players?.toLocaleString() || '0',
            allTime: stats.all_time?.total_players?.toLocaleString() || '0',
            icon: <Person />,
            weekLabel: 'This Week',
            allTimeLabel: 'All Time'
        },
        {
            label: 'Cumulative Hours',
            thisWeek: secondsToHours(stats.week1?.total_cum_playtime || 0),
            allTime: secondsToHours(stats.all_time?.total_cum_playtime || 0),
            icon: <Schedule />,
            weekLabel: 'This Week',
            allTimeLabel: 'All Time'
        },
        {
            label: 'Countries',
            thisWeek: stats.week1?.countries?.toString() || '0',
            allTime: stats.all_time?.countries?.toString() || '0',
            icon: <Public />,
            weekLabel: 'This Week',
            allTimeLabel: 'All Time'
        }
    ];
};

export default async function StatsCards({ server }: {server: Server}): Promise<ReactElement> {
    const stats = await fetchServerUrl(server.id, '/players/stats', {});

    return <Grid2 container spacing={2} sx={{ mb: 3 }}>
            {getStatsCards(stats).map((stat, index) => (
                <Grid2 size={{ xs: 12, md: 4 }} key={index}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2, px: 2 }}>
                            <Box sx={{ color: 'primary.main', mb: 1, fontSize: 28 }}>
                                {stat.icon}
                            </Box>
                            <Typography variant="h6" component="div" fontWeight={600} gutterBottom>
                                {stat.label}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1.5 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="primary.main">
                                        {stat.thisWeek}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stat.weekLabel}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="secondary.main">
                                        {stat.allTime}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stat.allTimeLabel}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid2>
            ))}
    </Grid2>
};
