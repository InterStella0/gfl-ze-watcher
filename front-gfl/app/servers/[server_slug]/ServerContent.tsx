'use client'
import { useState } from "react";
import {Avatar, Box, Grid2 as Grid, IconButton, LinearProgress, Stack, Typography} from "@mui/material";
import Paper from '@mui/material/Paper';
import PlayerList from "components/players/PlayerList";
import MapGraphList from "components/maps/MapGraphList";
import dynamic from "next/dynamic";

import {DateSources, useDateState} from "components/graphs/DateStateManager";
import {Server} from "types/community";
import {ServerPlayersStatistic} from "types/players.ts";
import {fetchServerUrl} from "utils/generalUtils.ts";
import {MapPlayedPaginated} from "types/maps.ts";
import {getServerSlug} from "./util.ts";
import {getServerAvatarText} from "components/ui/CommunitySelector.tsx";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";
import Link from "@mui/material/Link";
const RadarPreview = dynamic(() => import("components/radars/RadarPreview"), {
    ssr: false,
});
const ServerGraph = dynamic(() => import("components/graphs/ServerGraph"), {
    ssr: false,
});

export default function ServerContent({ server, description }: {server: Server, description: string}) {
    const [graphLoading, setGraphLoading] = useState<boolean>(false);
    const { start, end, setDates } = useDateState();

    const handleDateForceChange = (newStart, newEnd) => {
        setDates(newStart, newEnd.add(1, 'minutes'), DateSources.EXTERNAL);
    };

    const hasDiscord = !!server.discordLink
    const hasWebsite = !!server.website
    return (
        <>
            <Grid container spacing={2} m='.5rem'>
                <Grid size={{
                    xl: hasDiscord && hasWebsite? 6: !hasDiscord && !hasWebsite? 10: 8,
                    lg: 9,
                    md: 12,
                    sm: 12,
                    xs: 12
                }}>
                    <Paper elevation={0} sx={{p: '1rem', height: '100%'}}>
                        <Stack spacing={2} direction="row"   sx={{
                            justifyContent: "center",
                            alignItems: "center",
                        }} >
                            <Box>
                                <Avatar
                                    sx={{
                                        width: { xs: 40, sm: 48 },
                                        height: { xs: 40, sm: 48 },
                                        fontSize: { xs: '1rem', sm: '1.1rem' },
                                        fontWeight: 'bold',
                                    }}
                                    src={server.community.icon_url}
                                >
                                    {getServerAvatarText(server.community.name)}
                                </Avatar>
                            </Box>
                            <Box>
                                <Typography component="p">
                                    {description}
                                </Typography>
                            </Box>
                        </Stack>

                    </Paper>
                </Grid>
                <Grid size={{
                    xl: 2,
                    lg: 3,
                    md: hasDiscord && hasWebsite? 4: !hasDiscord && !hasWebsite? 12: 6,
                    sm: hasDiscord && hasWebsite? 4: !hasDiscord && !hasWebsite? 12: 6,
                    xs: hasDiscord && hasWebsite? 4: !hasDiscord && !hasWebsite? 12: 6,
                }}>
                    <Paper elevation={0} sx={{p: '1rem', height: '100%'}}>
                        <Stack direction="row" spacing={2} justifyContent="space-between">
                            <Typography noWrap variant="subtitle2" fontSize="1.1rem" fontWeight="bold">
                                Data Source
                            </Typography>
                            <Tooltip title={server.byId? "This server track users by steam ID": "This server is track users by name."}>
                                <IconButton size="small">
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <Typography component="p">
                            {server.source ? (
                                <Link href={server.source} target="_blank" rel="noopener noreferrer">
                                    {new URL(server.source).hostname}
                                </Link>
                            ) : (
                                "Steam Browser"
                            )}
                        </Typography>
                    </Paper>
                </Grid>
                {hasWebsite?
                    <Grid size={{
                        xl: 2,
                        lg: 6,
                        md: hasDiscord? 4: 6,
                        sm: hasDiscord? 4: 6,
                        xs: hasDiscord? 4: 6,
                    }}>
                        <Paper elevation={0} sx={{p: '1rem', height: '100%'}}>
                            <Typography noWrap variant="subtitle2" fontSize="1.1rem" fontWeight="bold">
                                Website
                            </Typography>
                            <Typography component="p">
                                <Link href={server.website} target="_blank" rel="noopener noreferrer">
                                    {new URL(server.website).hostname}
                                </Link>
                            </Typography>
                        </Paper>
                    </Grid>: null
                }
                {hasDiscord?
                    <Grid size={{
                        xl: 2,
                        lg: 6,
                        md: hasWebsite? 4: 6,
                        sm: hasWebsite? 4: 6,
                        xs: hasWebsite? 4: 6,
                    }}>
                        <Paper elevation={0} sx={{p: '1rem', height: '100%'}}>
                            <Typography noWrap variant="subtitle2" fontSize="1.1rem" fontWeight="bold">
                                Discord
                            </Typography>
                            <Typography component="p">
                                <Link href={server.discordLink} target="_blank" rel="noopener noreferrer">
                                    Invite Link
                                </Link>
                            </Typography>
                        </Paper>
                    </Grid>: null
                }
                <Grid size={{ xl: 9, md: 8, sm: 12 }}>
                    <Grid>
                        <Paper elevation={0}>
                            <ServerGraph setLoading={setGraphLoading} />
                            {graphLoading && <LinearProgress />}
                        </Paper>
                    </Grid>
                </Grid>
                <Grid size={{ xl: 3, md: 4, sm: 12 }}>
                    <Paper elevation={0}>
                        <PlayerList dateDisplay={{ start, end }} />
                    </Paper>
                </Grid>

                <Grid size={{ xl: 9, md: 8, sm: 12 }}>
                    <Paper elevation={0}>
                        <MapGraphList onDateChange={handleDateForceChange} />
                    </Paper>
                </Grid>
                <Grid size={{ xl: 3, md: 4, sm: 12, xs: 12 }}>
                    <RadarPreview dateDisplay={{ start, end }} />
                </Grid>
            </Grid>
        </>
    );
}