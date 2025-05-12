import { useSearchParams } from "react-router";
import { useState } from "react";
import ServerGraph from "../components/graphs/ServerGraph.jsx";
import PlayerList from "../components/players/PlayerList.jsx";
import dayjs from "dayjs";
import { Grid2 as Grid, LinearProgress } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Alert } from "@mui/material";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
import MapGraphList from "../components/maps/MapGraphList.jsx";
import {Helmet} from "@dr.pogodin/react-helmet";
import {formatTitle} from "../utils.jsx";
import RadarPreview from "../components/radars/RadarPreview.jsx";
function Server() {
    let [ searchParams, setSearchParams ] = useSearchParams();
    const [ graphLoading, setGraphLoading ] = useState(false)
    const [ forceDateChange, setForceDateChange ] = useState(null)
    let givenDate = null

    if (searchParams && searchParams.get('start') && searchParams.get('end'))
        givenDate = {start: dayjs(searchParams.get('start')), end: dayjs(searchParams.get('end'))}

    const [ dateDisplay, setDateDisplay ] = useState(givenDate)
    function onDateChange(start, end){
        setSearchParams({start: start.toISOString(), end: end.toISOString()})
        setDateDisplay({start, end: end})
    }
    function onDateForceChange(start, end){
        setForceDateChange(true)
        onDateChange(start, end.add(1, 'minutes'))
        setTimeout(() => setForceDateChange(null), 3000)
    }
    return <>
        <Helmet prioritizeSeoTags>
            <title>{formatTitle("GFL Activity")}</title>
            <meta property="og:title" content={formatTitle("GFL Activity")}/>
            <meta name="description" content="Shows all activity of the GFL Server including player list."/>
            <link rel="canonical" href={`${window.location.origin}`}/>
            <meta name="keywords" content="Player activity graph for GFL, Games For Life."/>
            <meta property="og:description" content="Track player activity and stats for the GFL server in real-time."/>
            <meta property="og:type" content="website"/>
            <meta property="og:url" content={`${window.location.origin}`}/>
            <meta property="og:image" content={`${window.location.origin}/favicon.ico`}/>
            <meta property="og:image:width" content="1200"/>
            <meta property="og:image:height" content="630"/>
        </Helmet>
        <Grid container spacing={2} m='.5rem'>
            <Grid size={{xl: 9, md: 8, sm: 12}}>
                <Grid>
                    <Paper elevation={0}>
                        <ServerGraph
                            onDateChange={onDateChange}
                            dateDisplay={dateDisplay}
                            setLoading={setGraphLoading}
                            forceDateChange={forceDateChange}
                        />
                        {graphLoading && <LinearProgress />}
                        <Alert severity="info">
                            Region times are defined by me (queeniemella). Argue with me if you disagree.
                            Also my data only goes back until may 2024.
                        </Alert>
                    </Paper>
                </Grid>
            </Grid>
            <Grid size={{xl: 3, md: 4, sm: 12}}>
                <Paper elevation={0}>
                    <PlayerList dateDisplay={dateDisplay} />
                </Paper>
            </Grid>

            <Grid size={{xl: 9, md: 8, sm: 12}}>
                <Paper elevation={0}>
                    <MapGraphList onDateChange={onDateForceChange}/>
                </Paper>
            </Grid>
            <Grid size={{xl: 3, md: 4, sm: 12, xs: 12}}>
                <RadarPreview dateDisplay={dateDisplay} />
            </Grid>
      </Grid>
    </>
  }
export default function ServerPage(){
    return <ErrorCatch message="Server Page is broken.">
        <Server />
    </ErrorCatch>
}