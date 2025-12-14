import {Box, Grid2, Typography} from "@mui/material";
import StatsCards from "components/players/StatsCards";
import PlayerRankings from "components/players/PlayerRankings";
import TopPerformers from "components/players/TopPerformers";
import PlayersOnline from "components/players/PlayersOnline.tsx";
import PlayerByCountries from "components/players/PlayerByCountries.tsx";
import {getServerSlug, oneHour} from "../util";
import type {ServerPageProps} from "../page";
import {Metadata} from "next";
import {BriefPlayers, ServerPlayersStatistic} from "types/players.ts";
import {fetchServerUrl, fetchUrl, formatHours, formatTitle} from "utils/generalUtils.ts";
import {Suspense} from "react";

export async function generateMetadata({ params}: ServerPageProps): Promise<Metadata> {
    const { server_slug } = await params

    const server = await getServerSlug(server_slug)
    if (!server)
        return {}

    let description = `Play zombie escape on ${server.community.name} at ${server.fullIp}.`
    try{
        const stats: ServerPlayersStatistic = await fetchServerUrl(server.id, '/players/stats', {next: { revalidate: oneHour }});
        const allTime = stats.all_time
        description += ` There are ${allTime.total_players} unique players across ${allTime.countries} countries all-time.`
    }catch(e){}

    try{
        const params = {time_frame: 'today'};
        const data: BriefPlayers = await fetchUrl(`/graph/${server.id}/top_players`, {params, next: { revalidate: oneHour }});
        const topPlayer = data.players[0]
        description += ` The most playtime player today is ${topPlayer.name} with ${formatHours(topPlayer.total_playtime)}.`
    }catch(e){}

    if (server.players)
        description += ` There are ${server.players} players online right now!`
    return {
        title: formatTitle(`${server.community.name} Players`),
        description: description,
        alternates: {
            canonical: `/servers/${server.readable_link || server.id}/players`
        }
    }
}

export default async function Page({ params }: ServerPageProps){
    const { server_slug } = await params;
    const server = getServerSlug(server_slug)
    return <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                Players
            </Typography>
            <Typography variant="h6" color="text.secondary">
                Discover the tryhards and casuals (gigachads) in the community
            </Typography>
        </Box>

        <StatsCards serverPromise={server} />

        <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, lg: 8 }}>
                <Suspense fallback={<div>Loading...</div>}>
                    <PlayerRankings serverPromise={server} />
                    <TopPerformers serverPromise={server} />
                </Suspense>
            </Grid2>

            <Grid2 size={{ xs: 12, lg: 4 }}>
                <Suspense fallback={<div>Loading...</div>}>
                    <PlayersOnline />
                    <PlayerByCountries />
                </Suspense>
            </Grid2>
        </Grid2>
    </Box>
}