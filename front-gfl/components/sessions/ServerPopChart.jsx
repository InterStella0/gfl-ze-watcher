import {Paper, Typography, Box, useTheme, Skeleton} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getServerPopChartData, getChartOptionsWithAnnotations } from '../../utils/sessionUtils.js';
import { useServerGraph } from './useServerGraph.js';
import { useMapsData } from './useMapsData.js';
import {useMemo} from "react";
import {useParams} from "react-router";


export function ServerMapPopChart ({ sessionInfo }) {
    const { server_id, map_name, session_id } = useParams()
    const { serverGraph, loading } = useServerGraph(server_id, map_name, session_id, "map");
    return <ServerPopChart sessionInfo={sessionInfo} maps={null} serverGraph={serverGraph} loading={loading} />
}
export function ServerPlayerPopChart({sessionInfo, server_id, player_id, session_id}){
    const { maps, loading: mapsLoading } = useMapsData(server_id, player_id, session_id);
    const { serverGraph, loading: graphLoading } = useServerGraph(server_id, player_id, session_id, "player");
    return <ServerPopChart sessionInfo={sessionInfo} maps={maps} serverGraph={serverGraph} loading={graphLoading || mapsLoading} />
}
export const ServerPopChart = ({ sessionInfo, loading, serverGraph, maps }) => {
    const theme = useTheme();
    const data = useMemo(() => {
        return getServerPopChartData(serverGraph, theme)
    }, [serverGraph,  theme]);

    if (loading) {
        return (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" component="h3" mb={2}>
                    Server Population During Session
                </Typography>
                <Box height={300} display="flex" alignItems="center" justifyContent="center">
                    <Skeleton variant="rectangular" sx={{height: "100%", width: "100%"}} />
                </Box>
            </Paper>
        );
    }
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Server Population During Session
            </Typography>
            <Box height={300}>
                <Line
                    data={data}
                    options={getChartOptionsWithAnnotations(maps, sessionInfo, theme, false, 64)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Population changes
            </Typography>
        </Paper>
    );
};