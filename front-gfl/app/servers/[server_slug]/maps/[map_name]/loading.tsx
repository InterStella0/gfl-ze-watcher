import {Box, Grid2 as Grid, LinearProgress, Skeleton} from "@mui/material";
import Paper from "@mui/material/Paper";


export default function Loading(){
    return <Box sx={{ width: '100%'}}>
        <LinearProgress variant="indeterminate" />
        <Grid container spacing={3}>
            <Grid size={{xl: 8, lg: 7, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                <Skeleton variant="rounded" height="400px" />
            </Grid>
            <Grid size={{xl: 4, lg: 5, md: 12, sm: 12, xs: 12}} container sx={{p: '2rem'}}>
                <Skeleton variant="rounded" height="400px" width="100%" />
            </Grid>
            <Grid size={{xl: 12, lg: 12, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                <Skeleton variant="rounded" height="518px" />
            </Grid>
            <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                <Skeleton variant="rounded" height="835px" />
            </Grid>
            <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                <Skeleton variant="rounded" height="827px" />
            </Grid>
            <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}} container>
                <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                    <Skeleton variant="rounded" height="431px" />
                </Grid>
                <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                    <Skeleton variant="rounded" height="412px" />
                </Grid>
            </Grid>
        </Grid>
    </Box>
}