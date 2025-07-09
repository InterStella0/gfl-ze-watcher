import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {addOrdinalSuffix, fetchServerUrl, secondsToHours} from "../../utils/generalUtils.jsx";
import {
    ButtonGroup, Chip,
    IconButton, List, ListItem, ListItemText, MenuItem,
    Paper, Select,
    Skeleton,
    Tooltip, useTheme, Tab, Tabs
} from "@mui/material";
import dayjs from "dayjs";
import { PlayerAvatar } from "./PlayerAvatar.jsx";
import CategoryChip from "../ui/CategoryChip.jsx";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import PlayerPlayTimeGraph from "./PlayTimeGraph.jsx";

import relativeTime from 'dayjs/plugin/relativeTime'
import SteamIcon from "../ui/SteamIcon.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Button from "@mui/material/Button";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {useParams} from "react-router";
dayjs.extend(relativeTime)

function AliasesDropdown({ aliases }) {
    const [expanded, setExpanded] = useState(false);
    const primaryAlias = aliases[0]?.name || '';
    const remainingCount = aliases.length - 1;

    return (
        <Box sx={{ position: "relative" }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                    }}
                >
                    {primaryAlias}
                </Typography>

                {remainingCount > 0 && (
                    <IconButton
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                        sx={{
                            p: 0.5,
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            }
                        }}
                    >
                        {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                )}

                {remainingCount > 0 && (
                    <Typography
                        component="span"
                        sx={{
                            fontSize: '0.8rem',
                            color: 'text.disabled',
                        }}
                    >
                        +{remainingCount} more
                    </Typography>
                )}
            </Box>

            {expanded && (
                <Paper
                    elevation={3}
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 10,
                        mt: 0.5,
                        maxHeight: '200px',
                        width: { xs: '220px', sm: '250px' },
                        overflowY: "auto",
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <List dense disablePadding>
                        {aliases.map((alias, i) => (
                            <ListItem key={i} disablePadding sx={{
                                borderBottom: i < aliases.length - 1 ? '1px solid' : 'none',
                                borderColor: 'divider'
                            }}>
                                <ListItemText
                                    primary={alias.name}
                                    secondary={dayjs(alias.created_at).format("lll")}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                    }}
                                    secondaryTypographyProps={{
                                        variant: 'caption',
                                    }}
                                    sx={{ px: 2, py: 0.5 }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    );
}

function RankChip({ label, rank, title }) {
    const theme = useTheme();
    return (
        <Box
            component="span"
            title={title}
            sx={{
                px: 1.5,
                py: 0.4,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.main}25)`,
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'primary.main',
                fontSize: '0.75rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
            }}
        >
            {label} {addOrdinalSuffix(rank)}
        </Box>
    );
}
function PlayerCardDetailDisplay() {
    const { data } = useContext(PlayerContext);
    const { server_id } = useParams()
    const [ cStats, setCStats ] = useState()
    const [activeTab, setActiveTab] = useState(0);
    const theme = useTheme()
    const [groupByTime, setGroupByTime] = useState("daily")
    const isDark = theme.palette.mode === "dark"
    const ranks = data?.ranks

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleGroupChange = (e) => {
        setGroupByTime(e.target.value)
    }

    const formatHours = (seconds) => {
        return `${secondsToHours(seconds)} hrs`;
    };

    let lastPlayedText = data ? `Last online ${dayjs(data.last_played).fromNow()} (${secondsToHours(data.last_played_duration)}hr)` : '';
    if (data?.online_since) {
        lastPlayedText = `Playing since ${dayjs(data.online_since).fromNow()}`;
    }
    const steamId = data && !data.id.includes('-')? data.id: data?.associated_player_id? data.associated_player_id: null

    useEffect(() => {
        setCStats(null)
        if (server_id !== '65bdad6379cefd7ebcecce5c' || !data?.id) return

        fetchServerUrl(server_id, `/players/${data.id}/legacy_stats`)
            .then(setCStats)
            .catch(() => setCStats(null))
    }, [server_id, data?.id]);

    return (
        <Box>
            <Box
                sx={{
                    maxWidth: '100%',
                    backgroundColor: 'background.paper',
                    borderRadius: 1,
                    p: { xs: 2, sm: 2 },
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'center', sm: 'flex-start' },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box
                    sx={{
                        mr: { xs: 0, sm: 2 },
                        mb: { xs: 2, sm: 0 },
                        position: 'relative',
                    }}
                >
                    {data ? (
                        <PlayerAvatar
                            uuid={data.id}
                            name={data.name}
                            helmet
                            variant="rounded"
                            sx={{
                                width: { xs: 100, sm: 120 },
                                height: { xs: 100, sm: 120 },
                                borderRadius: 1
                            }}
                        />
                    ) : (
                        <Skeleton
                            variant="rounded"
                            width={120}
                            height={120}
                            sx={{ borderRadius: 1 }}
                        />
                    )}
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: { xs: 'center', sm: 'flex-start' },
                        textAlign: { xs: 'center', sm: 'left' },
                        justifyContent: 'space-between',
                        minHeight: { sm: 120 },
                    }}
                >
                    <Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 0.5,
                                justifyContent: { xs: 'center', sm: 'flex-start' },
                            }}
                        >
                            {data ?
                                <>
                                    <Typography
                                        variant="h6"
                                        component="h1"
                                        sx={{
                                            fontWeight: 400,
                                            color: 'text.primary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            mr: 1
                                        }}
                                    >
                                        {data.name}
                                    </Typography>
                                    {steamId && <>
                                        <Tooltip title="View Steam Profile">
                                            <IconButton
                                                size="small"
                                                component="a"
                                                href={`https://steamcommunity.com/profiles/${steamId}`}
                                                target="_blank"
                                                sx={{
                                                    color: 'text.secondary',
                                                    p: 0.5
                                                }}
                                            >
                                                <SteamIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </>}
                                </> : (
                                    <Skeleton variant="text" width={150} />
                                )}
                        </Box>

                        {data ? (
                            <Typography
                                variant="body2"
                                sx={{
                                    mb: 0.5,
                                    fontStyle: 'italic',
                                    color: data.online_since ? 'success.main' : 'text.secondary',
                                    fontSize: '0.85rem',
                                }}
                            >
                                <AccessTimeIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle', mr: 0.5 }} />
                                {lastPlayedText}
                            </Typography>
                        ) : (
                            <Skeleton variant="text" width={200} />
                        )}

                        {data ? (
                            <AliasesDropdown aliases={data.aliases} />
                        ) : (
                            <Skeleton variant="text" width={150} />
                        )}
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            mt: { xs: 2, sm: 'auto' },
                            gap: 1,
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                mt: { xs: 2, sm: 'auto' },
                                gap: 1,
                                justifyContent: { xs: 'center', sm: 'flex-start' },
                                maxWidth: '100%',
                            }}
                        >
                            {data ? (
                                <>
                                    {activeTab === 0 ? (
                                        <>
                                            {ranks && <RankChip label="Ranked" rank={ranks?.server_playtime}/>}
                                            {data.category && data.category !== 'unknown' && (
                                                <CategoryChip category={data.category} size="medium"/>
                                            )}
                                            {ranks && <RankChip label="Global" rank={ranks?.global_playtime} title="Global playtime regardless of communities"/>}
                                            {ranks && <RankChip label="Tryhard" rank={ranks?.tryhard_playtime}/>}
                                            {ranks && <RankChip label="Casual" rank={ranks?.casual_playtime}/>}
                                            {ranks && ranks?.highest_map_rank &&
                                                        <RankChip
                                                            label={`${ranks?.highest_map_rank?.map} -`}
                                                            rank={ranks?.highest_map_rank?.rank}
                                                            title={`Top ${ranks?.highest_map_rank?.rank} on ${ranks?.highest_map_rank?.map} (${secondsToHours(ranks?.highest_map_rank?.total_playtime)}hr)`}/>
                                            }
                                        </>
                                    ) : (
                                        cStats && (
                                            <>
                                                <RankChip label="Ranked" rank={cStats.rank_total_playtime} />
                                                <RankChip label="Boss Killer" rank={cStats.rank_boss_killed} />
                                                <RankChip label="Leader" rank={cStats.rank_leader_count} />
                                                <RankChip label="Points" rank={cStats.rank_points} />
                                                <RankChip label="Zombie Killer" rank={cStats.rank_zombie_killed} />
                                                <RankChip label="Headshots" rank={cStats.rank_headshot} />
                                            </>
                                        )
                                    )}
                                </>
                            ) : (
                                <Skeleton variant="text" width={100} height={24} />
                            )}
                        </Box>
                    </Box>
                </Box>

                <Box
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
                                {data ? (
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
                                                {formatHours(data.total_playtime)}
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
                                                {formatHours(data.casual_playtime)}
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
                                                {formatHours(data.tryhard_playtime)}
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
                                                {formatHours(data.total_playtime - (data.tryhard_playtime + data.casual_playtime))}
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
            </Box>

            <Box
                sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            >
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexDirection={{sm: 'row', xs: 'column'}}
                    gap=".5rem"
                    p={1.5}
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        color: 'text.primary',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                    }}
                >
                    <Typography>
                        Play Time History
                    </Typography>
                    <Box>
                        <ButtonGroup
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                overflow: 'hidden',
                                border: `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            <Button
                                disableRipple
                                sx={{
                                    cursor: 'default',
                                    backgroundColor: isDark
                                        ? theme.palette.primary.light
                                        : theme.palette.primary.main,
                                    color: isDark ? 'black' : 'white',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    px: 2,
                                    py: 0.5,
                                    fontSize: '0.875rem',
                                    '&:hover': {
                                        backgroundColor: isDark
                                            ? theme.palette.primary[200]
                                            : theme.palette.primary.dark,
                                    },
                                }}
                            >
                                Group By
                            </Button>

                            <Select
                                value={groupByTime}
                                onChange={handleGroupChange}
                                variant="outlined"
                                sx={{
                                    color: theme.palette.primary.main,
                                    backgroundColor: 'transparent',
                                    fontWeight: 500,
                                    px: 2,
                                    py: 0.5,
                                    fontSize: '0.875rem',
                                    '& .MuiSelect-select': {
                                        padding: '6px 16px',
                                    },
                                    '& fieldset': {
                                        border: 'none',
                                    },
                                }}
                            >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                            </Select>
                        </ButtonGroup>
                    </Box>
                </Box>

                <Box sx={{ p: 1, height: '240px' }}>
                    <PlayerPlayTimeGraph groupBy={groupByTime} />
                </Box>
            </Box>
        </Box>
    );
}

export default function PlayerCardDetail(){
    return <>
        <Paper sx={{width: "100%"}} elevation={0}>
            <ErrorCatch message="No player detail is available.">
                <PlayerCardDetailDisplay />
            </ErrorCatch>
        </Paper>
    </>
}