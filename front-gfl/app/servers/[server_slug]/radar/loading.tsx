import {Box, LinearProgress, Skeleton} from "@mui/material";

export default function Loading(){
    return <Box sx={{ width: '100%'}}>
        <LinearProgress variant="indeterminate" />
        <div style={{margin: '1rem'}}>
            <Skeleton variant="rounded" width="100%" height="100%"/>
        </div>
    </Box>
}