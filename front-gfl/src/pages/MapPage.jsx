// TODO: total play time
//       - session list with graph like github
//       - top 10 players time
//       - Session Abandonment Rate
//       - New Player Attraction
//       - Engagement Score (AUC Player Count)
//       - Peak Playtime for Each Map
//       - Regional Popularity
//       - Player Distribution Per Map (Casual vs Tryhard players)


import {Grid2 as Grid} from "@mui/material";
import {createContext, useContext, useEffect, useState} from "react";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import {useParams} from "react-router";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MapHeader from "../components/MapHeader.jsx";
import MapSessionList from "../components/MapSessionList.jsx";

function Attribute({ title, value }){
    return <Paper sx={{width: '100%', height: '150px', borderRadius: '1rem', p: '1rem', textAlign: 'start'}}>
        <Typography variant="h6" color="primary" fontWeight={700}>
            {title}
        </Typography>
        <Typography variant="h4" fontWeight={600}>
            {value}
        </Typography>
    </Paper>
}
function MapAnalyzeAttributes(){
    const { analyze } = useContext(MapContext)
    return <>
        <Grid size={6}>
            <Attribute title="Average Players Per Session" value={analyze?.avg_players_per_session || '...'} />
        </Grid>
        <Grid size={5}>
            <Attribute title="Player Drop-off Rate" value={analyze? `${analyze.dropoff_rate.toFixed(2)}%`: '...'} />
        </Grid>
        <Grid size={6}>
            <Attribute title="Average Playtime" value={analyze? `${analyze.avg_playtime_before_quitting.toFixed(2)}h`: '...'} />
        </Grid>
        <Grid size={5}>
            <Attribute title="Map Score" value={analyze?.map_score.toFixed(2) || '...'} />
        </Grid>
    </>
}
function MapPlayerList(){
    return <Paper>
        All time player list
    </Paper>
}

function AverageSessionDistribution(){
    return <Paper>
        ASD
    </Paper>
}
function RegionDistribution(){
    return <Paper>
        Regions
    </Paper>
}
function PlayerTypeDistribution(){
    return <Paper>
        Player Type
    </Paper>
}
export const MapContext = createContext(null)
export default function MapPage(){
    const { map_name } = useParams()
    const [mapDetail, setMapDetail] = useState({ name: map_name, analyze: null})
    useEffect(() => {
        fetchUrl(`/servers/${SERVER_WATCH}/maps/${map_name}/analyze`)
            .then(resp => {
                setMapDetail(prev => ({...prev, analyze: resp}))
            })
    }, [map_name])
    return <MapContext.Provider value={mapDetail}>
        <Grid container spacing={4}>
            <Grid size={8} sx={{p: '2rem'}}>
                <MapHeader />
            </Grid>
            <Grid size={4} container item sx={{p: '2rem'}}>
                <MapAnalyzeAttributes />
            </Grid>
            <Grid size={4} sx={{p: '.5rem'}}>
                <MapSessionList />
            </Grid>
            <Grid size={3} sx={{p: '.5rem'}}>
                <MapPlayerList />
            </Grid>
            <Grid size={4} sx={{p: '.5rem'}}>
                <AverageSessionDistribution />
            </Grid>
            <Grid size={3} sx={{p: '.5rem'}}>
                <RegionDistribution />
            </Grid>
            <Grid size={3} sx={{p: '.5rem'}}>
                <PlayerTypeDistribution />
            </Grid>
        </Grid>
    </MapContext.Provider>
}