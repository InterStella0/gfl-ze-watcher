import {fetchServerUrl, StillCalculate} from "utils/generalUtils";
import {Box, Grid2 as Grid, Typography} from "@mui/material";
import MapHeader from "components/maps/MapHeader";
import MapAnalyzeAttributes from "components/maps/MapAnalyzeAttributes";
import Paper from "@mui/material/Paper";
import MapHeatRegion from "components/maps/MapHeatRegion";
import MapRegionDistribution from "components/maps/MapRegionDistribution";
import MapSessionList from "components/maps/MapSessionList";
import MapTop10PlayerList from "components/maps/MapTop10PlayerList";
import MapAverageSessionDistribution from "components/maps/MapAverageSessionDistribution";
import MapPlayerType from "components/maps/MapPlayerType";
import {getServerSlug} from "../../util";
import {ServerMapDetail} from "types/maps";
import {MapContextProvider} from "./MapContext";

async function getMapInfoDetails(serverId: string, mapName: string): Promise<ServerMapDetail>{
    const toReturn = { info: null, analyze: null, notReady: false, name: mapName}
    toReturn.info = await fetchServerUrl(serverId, `/maps/${mapName}/info`)
    try{
        toReturn.analyze = await fetchServerUrl(serverId, `/maps/${mapName}/analyze`)
    }catch(e){
        if (e instanceof StillCalculate){
            toReturn.notReady = true
        }
    }
    return toReturn as ServerMapDetail
}

export default async function Page({ params }){
    const { map_name, server_slug } = await params
    try{
        const server = await getServerSlug(server_slug)
        const server_id = server.id
        const mapDetail = await getMapInfoDetails(server_id, map_name);
        return <>
            <MapContextProvider value={mapDetail}>
                <Grid container spacing={3}>
                    <Grid size={{xl: 8, lg: 7, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                        <MapHeader />
                    </Grid>
                    <Grid size={{xl: 4, lg: 5, md: 12, sm: 12, xs: 12}} container sx={{p: '2rem'}}>
                        <MapAnalyzeAttributes />
                    </Grid>
                    <Grid size={{xl: 12, lg: 12, md: 12, sm: 12, xs: 12}}>
                        <Paper elevation={0}>
                            <MapHeatRegion />
                            <MapRegionDistribution/>
                        </Paper>
                    </Grid>
                    <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                        <MapSessionList />
                    </Grid>
                    <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                        <MapTop10PlayerList />
                    </Grid>
                    <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}} container>
                        <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                            <MapAverageSessionDistribution />
                        </Grid>
                        <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                            <MapPlayerType />
                        </Grid>
                    </Grid>
                </Grid>
            </MapContextProvider>
        </>
    }catch(error){
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
}