import { useSearchParams } from "react-router";
import { useState } from "react";
import Graph from "../components/Graph";
import PlayerList from "../components/PlayerList";
import dayjs from "dayjs";
import { Grid2 as Grid, LinearProgress } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Alert, AlertTitle } from "@mui/material";
export default function Server() {
    let [ searchParams, setSearchParams ] = useSearchParams();
    const [ graphLoading, setGraphLoading ] = useState(false)
    let givenDate = null

    if (searchParams && searchParams.get('start') && searchParams.get('end'))
        givenDate = {start: dayjs(searchParams.get('start')), end: dayjs(searchParams.get('end'))}

    const [ dateDisplay, setDateDisplay ] = useState(givenDate)
    function onDateChange(start, end){
        setSearchParams({start, end})
        setDateDisplay({start, end})
    }
  
    return <Grid container spacing={2}>
        <Grid size={9}>
          <Paper>
            <Graph onDateChange={onDateChange} dateDisplay={dateDisplay} setLoading={setGraphLoading}/>
            {graphLoading && <LinearProgress />}
            <Alert severity="info">
              Region times are defined by me (queeniemella). Argue with me if you disagree.
            </Alert>
        </Paper>
        </Grid>
        <Grid size={3}>
          <Paper>
            <PlayerList dateDisplay={dateDisplay} />
            
          </Paper>
        </Grid>
        <Grid size={3}>
          <Paper>
          
          </Paper>
        </Grid>
      </Grid>
  }