import {Box, Paper, Typography} from "@mui/material";
import PlayerContinentCounter from "components/players/PlayerContinentCounter.tsx";
import RadarSessionPreview from "components/sessions/RadarSessionPreview.tsx";

export default function SessionContinents({ sessionInfo, continents }) {
    return <Paper elevation={3} sx={{borderRadius: '.5rem', overflow: 'hidden'}}>
        <Typography variant="h5" component="h3" m="2rem">
            Continent Distribution
        </Typography>
        <Box m="2rem">
            <PlayerContinentCounter continentData={continents} truncate={6} />
        </Box>
        <RadarSessionPreview start={sessionInfo.started_at} end={sessionInfo.ended_at} />
    </Paper>
}