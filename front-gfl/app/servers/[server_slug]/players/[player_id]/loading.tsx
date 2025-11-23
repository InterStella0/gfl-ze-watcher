import {Box, Grid2 as Grid, LinearProgress, Skeleton} from "@mui/material";

export default function Loading(){
    return <Box sx={{ width: '100%'}}>
        <LinearProgress variant="indeterminate" />
        <div style={{margin: '1rem'}}>
            <Grid container spacing={2}>
                <Grid size={{xl: 8, sm: 12}}>
                    <Skeleton variant="rounded" width="100%" height="526px"/>
                </Grid>
                <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <Skeleton variant="rounded" width="100%" height="568px"/>
                </Grid>
                <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}} >
                    <Skeleton variant="rounded" width="100%" height="452px"/>
                </Grid>
                <Grid size={{xl: 4, lg: 4, md: 12, sm:12, xs: 12}} >
                    <Skeleton variant="rounded" width="100%" height="440px"/>
                </Grid>
                <Grid size={{xl: 4, lg: 8, md: 12, sm: 12, xs: 12}}>
                    <Skeleton variant="rounded" width="100%" height="460px"/>
                </Grid>
                <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <Skeleton variant="rounded" width="100%" height="375px"/>
                </Grid>
            </Grid>
        </div>
    </Box>
}