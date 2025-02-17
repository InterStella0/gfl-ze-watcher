import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import TopPlayers from "../components/TopPlayers";
import SearchPlayers from "../components/SearchPlayers";

export default function Players(){
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