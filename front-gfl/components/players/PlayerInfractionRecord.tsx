'use client'
import {use, useEffect, useState} from "react";
import {
    fetchServerUrl,
    formatFlagName,
    ICE_FILE_ENDPOINT,
    InfractionFlags,
    InfractionInt, StillCalculate
} from "utils/generalUtils";
import {
    Alert, Card, CardContent, Chip, CircularProgress,
    Dialog,
    IconButton,
    Paper, Tooltip, useTheme
} from "@mui/material";
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import Typography from "@mui/material/Typography";
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";
import {PlayerDetailSession, PlayerInfraction, PlayerInfractionUpdate} from "types/players.ts";
import Image from "next/image";
import {Server} from "types/community.ts";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/util.ts";
function ModalInfraction({ infraction, onClose }){
    return <>
        <Dialog onClose={onClose} open={infraction !== null} fullWidth fullScreen>
            {infraction !== null && <>
                <Alert severity="info">I'm showing you infraction from {infraction.source?.replace("https://", "")} because I got lazy half way.</Alert>
                <Box width="100%" height="100%" position="relative">
                    <IconButton sx={{position: 'absolute', top: 0, right: 0, m: '1.1rem'}} onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                    <iframe width="100%" height="100%" src={`${infraction.source}/infractions/${infraction?.id}/`}/>
                </Box>
            </>}
        </Dialog>
    </>
}


function PlayerInfractionRecordBody({ updatedData, player, server }:
                                    { updatedData: PlayerInfraction[], player: PlayerInfo | StillCalculate, server: Server }) {
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const server_id = server.id;
    const [infractions, setInfractions] = useState([]);
    const [viewInfraction, setViewInfraction] = useState(null);
    const theme = useTheme();

    useEffect(() => {
        if (!playerId) return

        fetchServerUrl(server_id, `/players/${playerId}/infractions`)
            .then((infras) => infras.map(e => {
                if (!(e.flags instanceof InfractionInt))
                    e.flags = new InfractionInt(e.flags);
                return e;
            }))
            .then(e => setInfractions(e));
    }, [server_id, playerId]);

    useEffect(() => {
        if (updatedData === null) return;
        setInfractions(updatedData);
    }, [updatedData]);

    const handleOnClick = (row) => {
        setViewInfraction(row);
    };

    if (infractions.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '250px',
                    color: 'text.secondary',
                    flexDirection: 'column',
                    gap: 1
                }}
            >
                <BlockIcon sx={{ fontSize: '2rem', opacity: 0.5 }} />
                <Typography variant="h6" component="h3">
                    No Records
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <ModalInfraction infraction={viewInfraction} onClose={() => setViewInfraction(null)} />

            <Box sx={{ maxHeight: "380px", overflowY: "auto", pt: 1 }}>
                {infractions.map(row => {
                    const flag = row.flags;
                    const by = flag.hasFlag(InfractionFlags.SYSTEM) ? 'System' : row.by;
                    const restrictions = row.flags.getAllRestrictedFlags();

                    return (
                        <Card
                            key={row.id}
                            sx={{
                                mb: 1.5,
                                cursor: 'pointer',
                                backgroundColor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: 2
                                }
                            }}
                            onClick={() => handleOnClick(row)}
                            variant="outlined"
                        >
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                    {row.admin_avatar &&
                                        <Image
                                            src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)}
                                            title={`${row.by}'s Avatar`}
                                            alt={row.by}
                                            width={28}
                                            height={28}
                                            style={{ width: 28, height: 28, marginRight: '1rem', borderRadius: '50%' }}
                                        />
                                    }
                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                        {by}
                                    </Typography>
                                </Box>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: row.reason ? 'text.primary' : 'text.secondary',
                                        fontStyle: row.reason ? 'normal' : 'italic'
                                    }}
                                >
                                    {row.reason || 'No reason provided'}
                                </Typography>

                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    mt: '.5rem',
                                    gap: 1
                                }}>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {restrictions.length > 0 ? restrictions.map((flagName: string) => (
                                            <Chip
                                                key={flagName}
                                                label={formatFlagName(flagName)}
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                sx={{
                                                    fontSize: '0.7rem',
                                                    height: 22
                                                }}
                                            />
                                        )) : (
                                            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                                No restrictions
                                            </Typography>
                                        )}
                                    </Box>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        {dayjs(row.infraction_time).format('lll')}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>
        </>
    );
}

function PlayerInfractionRecordDisplay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}) {
    const {server, player} = use(serverPlayerPromise);
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const [updatedData, setUpdatedData] = useState<PlayerInfraction[] | null>(null);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();
    const server_id = server.id
    const updateData = () => {
        setLoading(true);
        fetchServerUrl(server_id, `/players/${playerId}/infraction_update`)
            .then((resp: PlayerInfractionUpdate) => {
                const infractions: PlayerInfraction[] = resp.infractions.map(e => {
                    if (!(e.flags instanceof InfractionInt))
                        e.flags = new InfractionInt(e.flags);
                    return e;
                });
                infractions.sort((a, b) => dayjs(b.infraction_time).diff(dayjs(a.infraction_time)));
                setUpdatedData(infractions);
            })
            .finally(() => setLoading(false));
    };

    return (
        <Paper
            sx={{
                minHeight: '460px',
                p: 2,
                backgroundColor: 'background.paper',
                borderRadius: 1
            }}
            elevation={0}
        >
            <Box
                display="flex"
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography
                    variant="h6"
                    component="h2"
                    fontWeight="600"
                    sx={{ color: 'text.primary' }}
                >
                    Infractions
                </Typography>

                <Tooltip title="Update infractions">
                    <span> {/* Wrapper to make tooltip work with disabled button */}
                        <IconButton
                            onClick={updateData}
                            disabled={loading}
                            size="small"
                            sx={{
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                '&:hover': {
                                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <RefreshIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <PlayerInfractionRecordBody updatedData={updatedData} player={player} server={server} />
        </Paper>
    );
}
export default function PlayerInfractionRecord({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    return  <ErrorCatch message="Infraction couldn't be loaded">
        <PlayerInfractionRecordDisplay serverPlayerPromise={serverPlayerPromise}  />
    </ErrorCatch>
}
