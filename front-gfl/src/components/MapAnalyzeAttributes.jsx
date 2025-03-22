import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import {Grid2 as Grid, IconButton, Skeleton} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import {useContext} from "react";
import {MapContext} from "../pages/MapPage.jsx";
import ErrorCatch from "./ErrorMessage.jsx";

function Attribute({ title, value, description, loading = false }){
    return <Paper sx={{width: '100%', height: '150px', borderRadius: '1rem', p: '1rem', textAlign: 'start'}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary" fontWeight={700}>{title}</Typography>
            <Tooltip title={description}>
                <IconButton size="small">
                    <InfoIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
        {loading && <Skeleton variant="text" sx={{fontSize: '2.4rem', fontWeight: 600}}/>}
        {!loading && <Typography variant="h4" fontWeight={600}>
            {value}
        </Typography>}
    </Paper>
}
function MapAnalyzeAttributesDisplay(){
    const { analyze } = useContext(MapContext)
    return <>
        <Grid size={{xl: 6, lg: 6, md: 6, sm: 6, xs: 12}}>
            <Attribute
                title="Average Players Per Session" value={analyze?.avg_players_per_session}
                description="Average of how many players there are for all session"
                loading={!analyze}
            />
        </Grid>
        <Grid size={{xl: 6, lg: 6, md: 6, sm: 6, xs: 12}}>
            <Attribute title="Player Drop-off Rate" value={`${(analyze?.dropoff_rate * 100).toFixed(4)}%`}
                       description="Percentage of players quit after 5 minutes"
                       loading={!analyze}/>
        </Grid>
        <Grid size={{xl: 6, lg: 6, md: 6, sm: 6, xs: 12}}>
            <Attribute title="Average Playtime" value={`${(analyze?.avg_playtime_before_quitting * 60).toFixed(2)}mins`}
                       description="How long each player spent on average on this map"
                       loading={!analyze}/>
        </Grid>
        <Grid size={{xl: 6, lg: 6, md: 6, sm: 6, xs: 12}}>
            <Attribute title="Map Score" value={analyze?.map_score.toFixed(2)}
                       description="Made up score that takes account for total play time, average player time per session, drop-off rate
                                    and unique players."
                       loading={!analyze}/>
        </Grid>
    </>
}

export default function MapAnalyzeAttributes(){
    return <ErrorCatch>
        <MapAnalyzeAttributesDisplay />
    </ErrorCatch>
}