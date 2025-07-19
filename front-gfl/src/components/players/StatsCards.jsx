import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid2,
    Card,
    CardContent,
    Skeleton
} from '@mui/material';
import {
    Person,
    Public,
    Schedule
} from '@mui/icons-material';
import { fetchServerUrl, secondsToHours } from "../../utils/generalUtils.jsx";

const StatsSkeleton = () => (
    <>
        {[1, 2, 3].map((index) => (
            <Grid2 size={{ xs: 12, md: 4 }} key={index}>
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', py: 2, px: 2 }}>
                        <Skeleton variant="circular" width={28} height={28} sx={{ mx: 'auto', mb: 1 }} />
                        <Skeleton variant="text" width="60%" sx={{ mx: 'auto', mb: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1.5 }}>
                            <Box>
                                <Skeleton variant="text" width={60} height={24} />
                                <Skeleton variant="text" width={40} height={16} />
                            </Box>
                            <Box>
                                <Skeleton variant="text" width={60} height={24} />
                                <Skeleton variant="text" width={40} height={16} />
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid2>
        ))}
    </>
);

const StatsCards = ({ serverId }) => {
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            setStatsError(null);
            const data = await fetchServerUrl(serverId, '/players/stats');
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStatsError(error.message);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [serverId]);

    const getStatsCards = () => {
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

    return (
        <Grid2 container spacing={2} sx={{ mb: 3 }}>
            {statsLoading ? (
                <StatsSkeleton />
            ) : statsError ? (
                <Grid2 size={{ xs: 12 }}>
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="error">Error loading stats: {statsError}</Typography>
                    </Box>
                </Grid2>
            ) : (
                getStatsCards().map((stat, index) => (
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
                ))
            )}
        </Grid2>
    );
};

export default StatsCards;