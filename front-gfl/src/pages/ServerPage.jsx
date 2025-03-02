import { useSearchParams } from "react-router";
import { useState } from "react";
import ServerGraph from "../components/ServerGraph";
import PlayerList from "../components/PlayerList";
import dayjs from "dayjs";
import { Grid2 as Grid, LinearProgress } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Alert } from "@mui/material";
import ErrorCatch from "../components/ErrorMessage.jsx";
import MapGraphList from "../components/MapGraphList.jsx";
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
  
    return <Grid container spacing={2}>
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
            <Grid sx={{margin: '.5rem'}}>
                <Paper elevation={0}>
                    <MapGraphList onDateChange={onDateForceChange}/>
                </Paper>
            </Grid>
        </Grid>
        <Grid size={{xl: 3, md: 4, sm: 12}}>
          <Paper elevation={0}>
              <PlayerList dateDisplay={dateDisplay} />
          </Paper>
        </Grid>
      </Grid>
  }
export default function ServerPage(){
    return <ErrorCatch message="Server Page is broken.">
        <Server />
    </ErrorCatch>
}