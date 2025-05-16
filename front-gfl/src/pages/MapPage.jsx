// TODO: - New Player Attraction
//       - Engagement Score (AUC Player Count)
//       - Peak Playtime for Each Map
//       - Player Distribution Per Map (Casual vs Tryhard players)
//       - Per session join/leave


import {Box, Grid2 as Grid, Typography} from "@mui/material";
import {createContext, useEffect, useState} from "react";
import {fetchServerUrl, formatTitle} from "../utils.jsx";
import {useParams} from "react-router";
import MapHeader from "../components/maps/MapHeader.jsx";
import MapSessionList from "../components/maps/MapSessionList.jsx";
import MapAnalyzeAttributes from "../components/maps/MapAnalyzeAttributes.jsx";
import MapTop10PlayerList from "../components/maps/MapTop10PlayerList.jsx";
import MapAverageSessionDistribution from "../components/maps/MapAverageSessionDistribution.jsx";
import MapRegionDistribution from "../components/maps/MapRegionDistribution.jsx";
import {Helmet} from "@dr.pogodin/react-helmet";
import MapHeatRegion from "../components/maps/MapHeatRegion.jsx";
import Paper from "@mui/material/Paper";

export const MapContext = createContext(null)
export default function MapPage(){
    const { map_name } = useParams()
    const [mapDetail, setMapDetail] = useState({ name: map_name, analyze: null})
    const [ error, setError ] = useState(null)
    useEffect(() => {
        fetchServerUrl(`/maps/${map_name}/analyze`)
            .then(resp => {
                setMapDetail(prev => ({...prev, analyze: resp}))
            })
            .catch(setError)
    }, [map_name])
    if (error){
        if (error.code === 404)
            return <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h1" color="secondary" fontWeight={900}>
                    404
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                    Map Not Found
                </Typography>
                <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                    <Typography component="p" color="primary">
                        The map you're trying to look for does not exist for this server!
                    </Typography>
                </Box>
            </Box>
        else
            return <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h1" color="secondary" fontWeight={900}>
                    {error.code}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                    Something went wrong :/
                </Typography>
                <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                    <Typography component="p" color="primary">
                        Something went wrong trying to load this map.
                    </Typography>
                </Box>
            </Box>
    }
    return <>
        <Helmet prioritizeSeoTags>
            <title>{formatTitle(map_name)}</title>
            <link rel="canonical" href={`${window.location.origin}/maps/${map_name}`} />
            <meta name="description" content="Activities of a map in GFL Server." />
            <meta property="og:title" content={formatTitle(map_name)}/>
            <meta property="og:description" content="Activities of a map in GFL Server." />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={`${window.location.origin}/maps/${map_name}`} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
        </Helmet>
        <MapContext.Provider value={mapDetail}>
            <Grid container spacing={3}>
                <Grid size={{xl: 8, lg: 7, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                    <MapHeader />
                </Grid>
                <Grid size={{xl: 4, lg: 5, md: 12, sm: 12, xs: 12}} container sx={{p: '2rem'}}>
                    <MapAnalyzeAttributes />
                </Grid>
                <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <Paper elevation={0}>
                        <MapHeatRegion />
                        <MapRegionDistribution />
                    </Paper>
                </Grid>

                <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <MapAverageSessionDistribution />
                </Grid>
                <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapSessionList />
                </Grid>
                <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapTop10PlayerList />
                </Grid>
            </Grid>
        </MapContext.Provider>
    </>
}