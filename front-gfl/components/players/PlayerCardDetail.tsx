import {ReactElement} from "react";
import {addOrdinalSuffix, fetchServerUrl, secondsToHours} from "../../utils/generalUtils";
import {
    IconButton,
    Paper,
    Tooltip
} from "@mui/material";
import dayjs from "dayjs";
import { PlayerAvatar } from "./PlayerAvatar";
import CategoryChip from "../ui/CategoryChip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import relativeTime from 'dayjs/plugin/relativeTime'
import SteamIcon from "../ui/SteamIcon";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/page";
import {PlayerWithLegacyRanks} from "../../types/players";
import PlayerDetailHourBar from "./PlayerDetailHourBar";
import {Server} from "../../types/community";
import PlayerStats from "./PlayerStats";
import PlayerAliasesButton from "./PlayerAliasesButton";
dayjs.extend(relativeTime)

function AliasesDropdown({ aliases }) {
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

                {remainingCount > 0 && <PlayerAliasesButton aliases={aliases} />}

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
        </Box>
    );
}

function RankChip({ label, rank, title = undefined }) {
    return (
        <Box
            component="span"
            title={title}
            sx={{
                px: 1.5,
                py: 0.4,
                borderRadius: 2,
                background: `linear-gradient(135deg, primary.main 15, primary.main 25)`,
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
async function getCStatsCSGO(server_id: string, player_id: string): Promise<PlayerWithLegacyRanks | null> {
    if (server_id !== '65bdad6379cefd7ebcecce5c') return null
    try{
        return await fetchServerUrl(server_id, `/players/${player_id}/legacy_stats`)
    }catch(e){
        return null
    }
}

async function PlayerCardDetailDisplay({ server, player }: { server: Server, player: PlayerInfo }): Promise<ReactElement> {
    const cStats = await getCStatsCSGO(server.id, player.id)
    const ranks = player?.ranks
    let lastPlayedText = `Last online ${dayjs(player.last_played).fromNow()} (${secondsToHours(player.last_played_duration)}hr)`;
    if (player.online_since) {
        lastPlayedText = `Playing since ${dayjs(player.online_since).fromNow()}`;
    }
    const steamId = !player.id.includes('-')? player.id: player?.associated_player_id? player.associated_player_id: null

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
                <PlayerAvatar
                    uuid={player.id}
                    name={player.name}
                    variant="rounded"
                    sx={{
                        width: { xs: 100, sm: 120 },
                        height: { xs: 100, sm: 120 },
                        borderRadius: 1
                    }}
                />

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
                            {player.name}
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
                                    <SteamIcon />
                                </IconButton>
                            </Tooltip>
                        </>}

                        </Box>

                        <Typography
                            variant="body2"
                            sx={{
                                mb: 0.5,
                                fontStyle: 'italic',
                                color: player.online_since ? 'success.main' : 'text.secondary',
                                fontSize: '0.85rem',
                            }}
                        >
                            <AccessTimeIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle', mr: 0.5 }} />
                            {lastPlayedText}
                        </Typography>
                        <AliasesDropdown aliases={player.aliases} />
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
                        {ranks && <RankChip label="Ranked" rank={ranks?.server_playtime}/>}
                        {player.category && player.category !== 'unknown' && (
                            <CategoryChip category={player.category} size="medium"/>
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
                        </Box>
                    </Box>
                </Box>

                <PlayerStats player={player} cStats={cStats}/>
            </Box>
            <PlayerDetailHourBar player={player} server={server} />
        </Box>
    );
}

export default async function PlayerCardDetail({ server, player }: { server: Server, player: PlayerInfo }) {
    return <>
        <Paper sx={{width: "100%"}} elevation={0}>
            <ErrorCatch message="No player detail is available.">
                <PlayerCardDetailDisplay server={server} player={player} />
            </ErrorCatch>
        </Paper>
    </>
}