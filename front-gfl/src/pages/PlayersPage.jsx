import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import TopPlayers from "../components/players/TopPlayers.jsx";
import SearchPlayers from "../components/players/SearchPlayers.jsx";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
import {Helmet} from "@dr.pogodin/react-helmet";
import {formatTitle} from "../utils/generalUtils.jsx";
import Box from "@mui/material/Box";

function Players(){
    return <>
      <Helmet prioritizeSeoTags>
         <title>{formatTitle("Search players")}</title>
         <link rel="canonical" href={`${window.location.origin}/players`} />
         <meta name="description" content="Search for players in GFL that has played before and see the most active players." />
         <meta property="og:title" content={formatTitle("GFL Activity")} />
         <meta property="og:description" content="Search for players in GFL that has played before and see the most active players." />
         <meta property="og:type" content="website" />
         <meta property="og:url" content={`${window.location.origin}/players`} />
         <meta property="og:image" content={`${window.location.origin}/favicon.ico`} />
         <meta property="og:image:width" content="1200" />
         <meta property="og:image:height" content="630" />
      </Helmet>
      <Grid container spacing={2}>
          <Grid size={{xl: 9, md: 8, sm: 12, xs: 12}}>
            <Box sx={{ width: '100%'}} elevation={0}>
              <div  >
                <SearchPlayers />
              </div>
            </Box>
          </Grid>
          <Grid size={{xl: 3, md: 4, sm: 12, xs: 12}}>
            <Paper>
                <TopPlayers />
            </Paper>
          </Grid>
      </Grid>
    </>
}

export default function PlayersPage(){
  return <ErrorCatch message="Players Page is broken.">
    <Players />
  </ErrorCatch>
}