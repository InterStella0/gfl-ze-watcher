'use client'
import {ReactElement, use, useState} from "react";
import Box from "@mui/material/Box";
import {Chip, Skeleton, Tab, Tabs} from "@mui/material";
import Typography from "@mui/material/Typography";
import {formatHours, secondsToHours} from "utils/generalUtils";
import {PlayerWithLegacyRanks} from "types/players";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/util.ts";

export default function PlayerStats({ cStatsPromise, player }: { cStatsPromise: Promise<PlayerWithLegacyRanks | null>, player: PlayerInfo}): ReactElement{
    const cStats = use(cStatsPromise)
    const [activeTab, setActiveTab] = useState<number>(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return <Box
        sx={{
            ml: { xs: 0, sm: 2 },
            mt: { xs: 3, sm: 0 },
            backgroundColor: 'background.default',
            borderRadius: 1,
            minWidth: { xs: '100%', sm: 250 },
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
        }}
    >
        <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    minHeight: 42,
                }
            }}
        >
            <Tab label="Play Time" />
            {cStats && <Tab label="CSGO Stats" />}
        </Tabs>

        <Box sx={{ p: 2 }}>
            {activeTab === 0 && (
                <Box>
                    {player ? (
                        <>
                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Total:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ fontWeight: 500, color: 'text.primary' }}
                                >
                                    {formatHours(player.total_playtime)}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Casual:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ fontWeight: 500, color: 'text.primary' }}
                                >
                                    {formatHours(player.casual_playtime)}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Try Hard:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ fontWeight: 500, color: 'text.primary' }}
                                >
                                    {formatHours(player.tryhard_playtime)}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Others:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ fontWeight: 500, color: 'text.primary' }}
                                >
                                    {formatHours(Math.max(player.total_playtime - (player.tryhard_playtime + player.casual_playtime), 0))}
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Skeleton variant="text" sx={{ mb: 1 }} />
                            <Skeleton variant="text" sx={{ mb: 1 }} />
                            <Skeleton variant="text" sx={{ mb: 1 }} />
                            <Skeleton variant="text" />
                        </>
                    )}
                </Box>
            )}

            {activeTab === 1 && cStats && (
                <Box>
                    <Box sx={{
                        mb: 1.5,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center'
                    }}>
                        <Chip
                            variant="filled"
                            label="Untracked"
                            sx={{
                                height: '20px',
                                '& .MuiChip-label': {
                                    padding: '.5rem'
                                }
                            }}
                        />
                    </Box>

                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ color: 'text.secondary' }}
                        >
                            Play Time:
                        </Typography>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 500, color: 'text.primary' }}
                        >
                            {formatHours(cStats.human_time + cStats.zombie_time)}
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ color: 'text.secondary' }}
                        >
                            Headshots:
                        </Typography>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 500, color: 'text.primary' }}
                        >
                            {cStats.headshot}
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ color: 'text.secondary' }}
                        >
                            Leader Count:
                        </Typography>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 500, color: 'text.primary' }}
                        >
                            {cStats.leader_count}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ color: 'text.secondary' }}
                        >
                            Total points:
                        </Typography>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 500, color: 'text.primary' }}
                        >
                            {cStats.points.toFixed(2)}
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    </Box>
}