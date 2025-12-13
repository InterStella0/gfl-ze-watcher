import {Box, Grid2, Grid2 as Grid, LinearProgress, Skeleton, Typography} from "@mui/material";
import {Suspense} from "react";
import PlayerRankings from "components/players/PlayerRankings.tsx";
import TopPerformers from "components/players/TopPerformers.tsx";
import PlayersOnline from "components/players/PlayersOnline.tsx";
import PlayerByCountries from "components/players/PlayerByCountries.tsx";

export default function Loading(){
    return <Box sx={{ width: '100%'}}>
        <LinearProgress variant="indeterminate" />
        <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                    Players
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Discover the tryhards and casuals (gigachads) in the community
                </Typography>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {Array.from({ length: 3}).map((stat, index) => (
                    <Grid size={{ xs: 12, md: 4 }} key={index}>
                        <Skeleton variant="rounded" width="100%" height="190px" />
                    </Grid>
                ))}
            </Grid>
            <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, lg: 8 }}>
                    <Skeleton variant="rounded" width="100%" height="707px" />
                    <Skeleton variant="rounded" width="100%" height="1450px" />
                </Grid2>

                <Grid2 size={{ xs: 12, lg: 4 }}>
                    <Skeleton variant="rounded" width="100%" height="1297px" />
                    <Skeleton variant="rounded" width="100%" height="539px" />
                </Grid2>
            </Grid2>
        </Box>
    </Box>
}