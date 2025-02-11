
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import TopPlayers from "../components/TopPlayers";
import SearchPlayers from "../components/SearchPlayers";

export default function Players(){
    return <Grid container spacing={2}>
      <Grid size={9}>
        <Paper sx={{minHeight: '80hv'}}>
          <div>
            <SearchPlayers />
          </div>
        </Paper>
      </Grid>
      <Grid size={3}>
        <Paper>
            <TopPlayers />
        </Paper>
      </Grid>
  </Grid>
}