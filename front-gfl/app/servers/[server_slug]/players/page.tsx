import {Box, Grid2, Typography} from "@mui/material";
import StatsCards from "../../../../components/players/StatsCards";
import PlayerRankings from "../../../../components/players/PlayerRankings";
import TopPerformers from "../../../../components/players/TopPerformers";
import PlayersOnline from "../../../../components/players/PlayersOnline";
import PlayerByCountries from "../../../../components/players/PlayerByCountries";
import {getServerSlug} from "../util";
import type {ServerPageProps} from "../page";

export default async function Page({ params }: ServerPageProps){
    const { server_slug } = await params;
    const server = await getServerSlug(server_slug)
    if (!server)
        return <Typography>Server Not found</Typography>

    return <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                Players
            </Typography>
            <Typography variant="h6" color="text.secondary">
                Discover the tryhards and casuals (gigachads) in the community
            </Typography>
        </Box>

        <StatsCards server={server} />

        <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, lg: 8 }}>
                <PlayerRankings server={server} />
                <TopPerformers server={server} />
            </Grid2>

            <Grid2 size={{ xs: 12, lg: 4 }}>
                <PlayersOnline />
                <PlayerByCountries />
            </Grid2>
        </Grid2>
    </Box>
}