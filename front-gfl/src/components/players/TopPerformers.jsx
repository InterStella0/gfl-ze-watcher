import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    Tabs,
    Tab,
    List,
    ListItem,
    Divider,
    Skeleton
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import { fetchUrl, secondsToHours } from "../../utils/generalUtils.jsx";
import LeaderboardItem from "./LeaderboardItem.jsx";

const getPlayerStatus = (player) => {
    if (player.online_since) return 'online';
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const lastPlayed = new Date(player.last_played);
    return lastPlayed > thirtyMinutesAgo ? 'away' : 'offline';
};

const LeaderboardSkeleton = ({ count = 20 }) => (
    <List>
        {Array.from({ length: count }).map((_, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Skeleton variant="text" width={30} height={24} />
                    <Skeleton variant="circular" width={36} height={36} />
                    <Skeleton variant="text" sx={{ flex: 1 }} />
                    <Skeleton variant="text" width={60} />
                </Box>
            </ListItem>
        ))}
    </List>
);

const TopPerformers = ({ serverId, navigate }) => {
    const [performanceTab, setPerformanceTab] = useState(0);
    const [topPlayers, setTopPlayers] = useState(null);
    const [topPlayersLoading, setTopPlayersLoading] = useState(true);
    const [topPlayersError, setTopPlayersError] = useState(null);

    const timeFrames = useMemo(() => [
        {id: '1d', label: "1 Day", value: 'today'},
        {id: '1w', label: "1 Week", value: 'week1'},
        {id: '2w', label: "2 Weeks", value: 'week2'},
        {id: '1m', label: "1 Month", value: 'month1'},
        {id: '6m', label: "6 Months", value: 'month6'},
        {id: '1yr', label: "A Year", value: 'year1'},
        {id: 'all', label: "All time", value: 'all'},
    ], []);

    const fetchTopPlayers = async () => {
        try {
            setTopPlayersLoading(true);
            setTopPlayersError(null);
            const currentTimeFrame = timeFrames[performanceTab];
            const params = {time_frame: currentTimeFrame.value};
            const data = await fetchUrl(`/graph/${serverId}/top_players`, {params});
            setTopPlayers(data);
        } catch (error) {
            console.error('Error fetching top players:', error);
            setTopPlayersError(error.message);
        } finally {
            setTopPlayersLoading(false);
        }
    };

    useEffect(() => {
        fetchTopPlayers();
    }, [serverId, performanceTab]);

    return (
        <Card>
            <Box sx={{p: 2, display: 'flex', alignItems: 'center', gap: 1}}>
                <Schedule color="primary"/>
                <Typography variant="h6" fontWeight={600}>
                    Top Performers
                </Typography>
            </Box>
            <Divider/>
            <Box sx={{p: 2}}>
                <Tabs
                    value={performanceTab}
                    onChange={(e, v) => setPerformanceTab(v)}
                    sx={{mb: 2}}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                >
                    {timeFrames.map((timeFrame) => (
                        <Tab key={timeFrame.id} label={timeFrame.label}/>
                    ))}
                </Tabs>
                {topPlayersLoading ? (
                    <LeaderboardSkeleton />
                ) : topPlayersError ? (
                    <Box sx={{p: 2, textAlign: 'center'}}>
                        <Typography color="error">Error loading top players: {topPlayersError}</Typography>
                    </Box>
                ) : (
                    <List>
                        {topPlayers?.players?.map((player) => (
                            <LeaderboardItem
                                key={player.id}
                                item={{
                                    rank: player.rank,
                                    id: player.id,
                                    name: player.name,
                                    time: secondsToHours(player.total_playtime),
                                    status: getPlayerStatus(player)
                                }}
                                serverId={serverId}
                                navigate={navigate}
                            />
                        ))}
                    </List>
                )}
            </Box>
        </Card>
    );
};

export default TopPerformers;