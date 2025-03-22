import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import TopPlayers from "../components/players/TopPlayers.jsx";
import SearchPlayers from "../components/players/SearchPlayers.jsx";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";

function Players(){
    return <Grid container spacing={2}>
      <Grid size={{xl: 9, md: 8, sm: 12, xs: 12}}>
        <Paper sx={{minHeight: '80hv', width: '100%'}} elevation={0}>
          <div  >
            <SearchPlayers />
          </div>
        </Paper>
      </Grid>
      <Grid size={{xl: 3, md: 4, sm: 12, xs: 12}}>
        <Paper>
            <TopPlayers />
        </Paper>
      </Grid>
  </Grid>
}

export default function PlayersPage(){
  return <ErrorCatch message="Players Page is broken.">
    <Players />
  </ErrorCatch>
}