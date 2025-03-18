import Paper from "@mui/material/Paper";
import {Drawer, Grid2 as Grid} from "@mui/material";
import Typography from "@mui/material/Typography";
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import {MapContext} from "../pages/MapPage.jsx";
import Box from "@mui/material/Box";
import SessionPlayedGraph from "./SessionPlayedGraph.jsx";
import PaginationPage from "./PaginationPage.jsx";
import Button from "@mui/material/Button";
import GroupIcon from "@mui/icons-material/Group";
import SessionPlayerList from "./SessionPlayerList.jsx";

function AllSessions(){
    const { name } = useContext(MapContext)
    const [page, setPage] = useState(0)
    const [ sessions, setSessions ] = useState([])
    const [totalSessions, setTotalSessions] = useState(0)
    useEffect(() => {
        setPage(0)
    }, [name])

    useEffect(() => {
        fetchUrl(`/servers/${SERVER_WATCH}/maps/${name}/sessions`, { params: { page }})
            .then(resp => {
                setSessions(resp.maps)
                setTotalSessions(resp.total_sessions)
            })
    }, [page, name]);
    const sessionGraphs = useMemo(() => {
        return [...sessions.map((e, index) => <SessionGraph key={index} session={e} />)]
    }, [sessions]);
    return <>
        <Paper sx={{p: '1rem'}}>
            <Grid container>
                <Grid size={5}>
                    <Typography variant="h6" color="primary" fontWeight={700} textAlign="start">Sessions</Typography>
                </Grid>
                <Grid size={7}>
                    <Box display="flex" alignItems="right" justifyContent="right">
                        <PaginationPage page={page} totalItems={totalSessions} perPage={5} setPage={setPage} />
                    </Box>
                </Grid>
                <Grid size={12}>
                    {sessionGraphs}
                </Grid>
            </Grid>
        </Paper>
    </>
}
function SessionGraph({ session }){
    const { setShowPlayer } = useContext(MapSessionContext)
    const startedAt = dayjs(session.started_at)
    const endedAt = session.ended_at? dayjs(session.ended_at): dayjs()

    return <Paper sx={{m: '.5rem' }} elevation={0}>
        <Grid container>
            <Grid size={6}>
                <Typography sx={{m: '.5rem', textAlign: 'start'}}>Session #{session.time_id}</Typography>
            </Grid>
            <Grid size={6}>
                <Box alignItems="right" display="flex" flexDirection="row" justifyContent="right" gap=".5rem" m=".5rem">
                    <Typography>{dayjs().diff(startedAt, 'd') < 1? startedAt.fromNow(): startedAt.format('lll')}</Typography>
                    <Typography>•</Typography>
                    <Typography>{endedAt.diff(startedAt, "m")}mins</Typography>
                </Box>
            </Grid>
            <Grid size={12}>
                <Paper sx={{m: '.5rem'}} elevation={1}>
                    <SessionPlayedGraph start={startedAt} end={endedAt} />
                </Paper>
            </Grid>
            <Grid size={4}>
                <Box  alignItems="start" display="flex" sx={{m: '.5rem', mt: '0'}}>
                    <Button variant="outlined" size="small" startIcon={<GroupIcon />} onClick={() => {
                        setShowPlayer(session)
                    }}>Player List</Button>
                </Box>
            </Grid>
        </Grid>
    </Paper>
}
function PlayerSessionList(){
    const { showPlayer, setShowPlayer } = useContext(MapSessionContext)
    return <Drawer open={showPlayer !== null} anchor="right" onClose={() => setShowPlayer(null)}>
        <SessionPlayerList session={showPlayer} />
    </Drawer>
}
const MapSessionContext = createContext(null)
export default function MapSessionList(){
    const [ showPlayer, setShowPlayer ] = useState(null)
    return <Paper elevation={0}>
        <MapSessionContext.Provider value={{ setShowPlayer: setShowPlayer, showPlayer: showPlayer }} >
            <AllSessions />
            <PlayerSessionList />
        </MapSessionContext.Provider>
    </Paper>
}