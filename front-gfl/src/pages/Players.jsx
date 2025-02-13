
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import TopPlayers from "../components/TopPlayers";
import SearchPlayers from "../components/SearchPlayers";

export default function Players(){
    return <Grid container spacing={2}>
      <Grid size={{xl: 9, m: 12}}>
        <Paper sx={{minHeight: '80hv'}}>
          <div style={{minWidth: '500px'}}>
            <SearchPlayers />
          </div>
        </Paper>
      </Grid>
      <Grid size={{xl: 3, m: 0}}>
        <Paper>
            <TopPlayers />
        </Paper>
      </Grid>
  </Grid>
}