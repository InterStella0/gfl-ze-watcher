import { useSearchParams } from "react-router";
import { useState } from "react";
import ServerGraph from "../components/ServerGraph";
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
        setSearchParams({start: start.toISOString(), end: end.toISOString()})
        setDateDisplay({start, end})
    }
  
    return <Grid container spacing={2}>
        <Grid size={{xl: 9, md: 8, sm: 12}}>
          <Paper>
            <ServerGraph onDateChange={onDateChange} dateDisplay={dateDisplay} setLoading={setGraphLoading}/>
            {graphLoading && <LinearProgress />}
            <Alert severity="info">
              Region times are defined by me (queeniemella). Argue with me if you disagree.
              Also my data only goes back until may 2024.
            </Alert>
        </Paper>
        </Grid>
        <Grid size={{xl: 3, md: 4, sm: 12}}>
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