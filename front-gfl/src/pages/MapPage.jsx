// TODO: - New Player Attraction
//       - Engagement Score (AUC Player Count)
//       - Peak Playtime for Each Map
//       - Player Distribution Per Map (Casual vs Tryhard players)
//       - Per session join/leave


import { Grid2 as Grid } from "@mui/material";
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

export const MapContext = createContext(null)
export default function MapPage(){
    const { map_name } = useParams()
    const [mapDetail, setMapDetail] = useState({ name: map_name, analyze: null})
    useEffect(() => {
        fetchServerUrl(`/maps/${map_name}/analyze`)
            .then(resp => {
                setMapDetail(prev => ({...prev, analyze: resp}))
            })
    }, [map_name])
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
                <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapSessionList />
                </Grid>
                <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapTop10PlayerList />
                </Grid>
                <Grid size={{xl: 4, lg: 6, md: 6, sm: 6, xs: 12}}>
                    <MapAverageSessionDistribution />
                </Grid>
                <Grid size={{xl: 4, lg: 6, md: 6, sm: 6, xs: 12}}>
                    <MapRegionDistribution />
                </Grid>
            </Grid>
        </MapContext.Provider>
    </>
}