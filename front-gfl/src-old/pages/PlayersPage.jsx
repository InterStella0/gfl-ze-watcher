import {
    Box,
    Typography,
    Grid2
} from '@mui/material';
import { useNavigate, useParams } from "react-router";
import StatsCards from "../../components/players/StatsCards.jsx";
import PlayerRankings from "../../components/players/PlayerRankings.jsx";
import TopPerformers from "../../components/players/TopPerformers.jsx";
import PlayersOnline from "../../components/players/PlayersOnline.jsx";
import PlayerByCountries from "../../components/players/PlayerByCountries.jsx";
import {Helmet} from "@dr.pogodin/react-helmet";
import {formatTitle} from "../../utils/generalUtils.ts";
import ErrorCatch from "../../components/ui/ErrorMessage.jsx";

const Players = () => {
    const { server_id: serverId } = useParams();
    const navigate = useNavigate();

    return (<>
        <Helmet prioritizeSeoTags>
            <title>{formatTitle("Players")}</title>
            <link rel="canonical" href={`${window.location.origin}/players`} />
            <meta name="description" content="All players in ZE that has played before and see the most active players." />
            <meta property="og:title" content={formatTitle("ZE Activity")} />
            <meta property="og:description" content="ll players in ZE that has played before and see the most active players." />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={`${window.location.origin}/players`} />
            <meta property="og:image" content={`${window.location.origin}/favicon.ico`} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
        </Helmet>
        <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                    Players
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Discover the tryhards and casuals (gigachads) in the community
                </Typography>
            </Box>

            <StatsCards serverId={serverId} />

            <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, lg: 8 }}>
                    <PlayerRankings serverId={serverId} navigate={navigate} />
                    <TopPerformers serverId={serverId} navigate={navigate} />
                </Grid2>

                <Grid2 size={{ xs: 12, lg: 4 }}>
                    <PlayersOnline serverId={serverId} navigate={navigate} />
                    <PlayerByCountries serverId={serverId} navigate={navigate} />
                </Grid2>
            </Grid2>
        </Box>
    </>);
};

export default function PlayersPage(){
    return <ErrorCatch message="Players Page is broken.">
        <Players />
    </ErrorCatch>
}