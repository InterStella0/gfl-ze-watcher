'use client'
import Paper from "@mui/material/Paper";
import {Drawer, Grid2 as Grid, Skeleton, Tooltip} from "@mui/material";
import Typography from "@mui/material/Typography";
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import {fetchServerUrl} from "../../utils/generalUtils.ts";
import Box from "@mui/material/Box";
import SessionPlayedGraph from "../graphs/SessionPlayedGraph.jsx";
import PaginationPage from "../ui/PaginationPage.jsx";
import Button from "@mui/material/Button";
import GroupIcon from "@mui/icons-material/Group";
import SessionPlayerList from "../players/SessionPlayerList.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import WarningIcon from "@mui/icons-material/Warning";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import {useMapContext} from "../../app/servers/[server_slug]/maps/[map_name]/MapContext";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "@mui/material/Link";

dayjs.extend(relativeTime);

function AllSessions(){
    const { name } = useMapContext();
    const [page, setPage] = useState(0)
    const [ sessions, setSessions ] = useState([])
    const [ totalSessions, setTotalSessions ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState(null)
    const { server } = useServerData()
    const server_id = server.id

    useEffect(() => {
        setPage(0)
    }, [server_id, name])

    useEffect(() => {
        const abort = new AbortController()
        setLoading(true)
        fetchServerUrl(server_id, `/maps/${name}/sessions`, { params: { page }, signal: abort.signal })
            .then(resp => {
                setSessions(resp.maps)
                setTotalSessions(resp.total_sessions)
            })
            .catch(e => {
                if (e === "New Page") return
                setError(e.message || "Something went wrong")
            })
            .finally(() => setLoading(false))
        return () => {
            abort.abort("New Page")
        }
    }, [server_id, page, name]);
    const sessionGraphs = useMemo(() => {
        return [...sessions.map((e, index) => <SessionGraph key={index} session={e} />)]
    }, [sessions])

    if (error){
        return <>
            <Paper sx={{p: '1rem'}} elevation={0}>
                <Grid container>
                    <Grid size={{lg: 4, md: 5, sm: 4, xs: 12}}>
                        <Typography variant="h6" component="h2" color="primary" fontWeight={700} textAlign="start">Sessions</Typography>
                    </Grid>
                    <Grid size={12}>
                        <Box minHeight="835px" display="flex" gap="1rem" justifyContent="center" alignItems="center">
                            <WarningIcon />
                            <Typography>{error || "Something went wrong :/"}</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </>
    }
    return <>
        <Paper sx={{p: '1rem'}} elevation={0}>
            <Grid container>
                <Grid size={{lg: 4, md: 5, sm: 4, xs: 12}}>
                    <Typography variant="h6" component="h2" color="primary" fontWeight={700} textAlign="start">Sessions</Typography>
                </Grid>
                <Grid size={{lg: 8, md: 7, sm: 8, xs: 12}}>
                    <Box display="flex" alignItems={{md: "right", xs: "center"}} justifyContent={{
                        md: "right",
                        sm: 'right',
                        xs: "center"
                    }} width="100%">
                        <PaginationPage page={page} totalItems={totalSessions} perPage={5} setPage={setPage} />
                    </Box>
                </Grid>
                <Grid size={12}>
                    {loading && <>
                        {Array.from({length: 5}).map((_, index) => <SkeletonSessionGraph key={index} />)}
                    </>}
                    {!loading && sessionGraphs}
                </Grid>
            </Grid>
        </Paper>
    </>
}
function SkeletonSessionGraph(){
    return <Paper sx={{m: '.5rem' }} elevation={0}>
        <Grid container>
            <Grid size={6}>
                <Box display="flex" flexDirection="row">
                    <Typography sx={{m: '.5rem  .1rem .5rem .5rem', textAlign: 'start'}}>Session #</Typography>
                    <Skeleton variant="text" width={30} height="2rem" />
                </Box>
            </Grid>
            <Grid size={6}>
                <Box alignItems="right" display="flex" flexDirection="row" justifyContent="right" gap=".5rem" m=".5rem">
                    <Skeleton variant="text" width={120} />
                    <Typography>•</Typography>
                    <Skeleton variant="text" width={50} />
                </Box>
            </Grid>
            <Grid size={12}>
                <Paper sx={{m: '.5rem', overflow: 'hidden'}} elevation={1}>
                    <Skeleton variant="rectangle" height={50} />
                </Paper>
            </Grid>
            <Grid size={4}>
                <Box  alignItems="start" display="flex" sx={{m: '.5rem', mt: '0'}}>
                    <Skeleton variant="rounded" width={108} height={30} />
                </Box>
            </Grid>
        </Grid>
    </Paper>
}


function SessionGraph({ session }){
    const { server } = useServerData()
    const server_id = server.id
    const { name } = useMapContext()
    const [ matchData, setMatchData ] = useState(null)
    useEffect(() => {
        if (!session?.time_id) return
        const sessionId = session.time_id
        fetchServerUrl(server_id, `/sessions/${sessionId}/match`)
            .then(setMatchData)
    }, [server_id, session?.time_id]);
    const startedAt = dayjs(session.started_at)
    const endedAt = session.ended_at? dayjs(session.ended_at): dayjs()
    const textSizes = {lg: '1rem', md: '.9rem', sm: '.8rem', xs: '.6rem'}
    return <Paper sx={{m: '.5rem' }} elevation={0}>
        <Grid container>
            <Grid size={5}>
                <Typography sx={{m: '.5rem', textAlign: 'start'}} fontSize={{md: '1rem', sm: '.7rem', xs: '.7rem'}}>Session #{session.time_id}</Typography>
            </Grid>
            <Grid size={7}>
                <Box alignItems="right" display="flex" flexDirection="row" justifyContent="right" gap=".5rem" m=".5rem">
                    <Tooltip title="Played at">
                        <Typography fontSize={textSizes}>{dayjs().diff(startedAt, 'd') < 1? startedAt.fromNow(): startedAt.format('lll')}</Typography>
                    </Tooltip>
                    <Typography fontSize={textSizes}>•</Typography>
                    <Tooltip title="Session duration"><Typography fontSize={textSizes}>{endedAt.diff(startedAt, "m")}mins</Typography></Tooltip>
                </Box>
            </Grid>
            <Grid size={12}>
                <Paper sx={{m: '.5rem'}} elevation={1}>
                    <SessionPlayedGraph sessionId={session.time_id} map={name} />
                </Paper>
            </Grid>
            <Grid size={12}>
                <Box alignItems="center" display="flex" sx={{m: '.5rem', mt: '0'}} justifyContent="space-between">
                    <Button component={Link} variant="outlined" size="small" startIcon={<GroupIcon />}
                            href={`/servers/${server.gotoLink}/maps/${name}/sessions/${session?.time_id}`}>Match Info</Button>

                    {matchData && <Tooltip title={<Box sx={{textAlign: 'center'}}>
                        <p>Human Score : Zombie Score</p>
                        <p>Final score <small>(Mostly accurate)</small></p>
                    </Box>}>
                        <Box display="flex" flexDirection="row" gap=".4rem" alignItems="center">
                            <SportsScoreIcon sx={{fontSize: {xs: '1rem', sm: '1.2rem'}}} />
                            <Typography fontSize={{xs: '.8rem', sm: '1rem'}}>{matchData?.human_score} : {matchData?.zombie_score}</Typography>
                        </Box>
                    </Tooltip>}
                </Box>
            </Grid>
        </Grid>
    </Paper>
}
function PlayerSessionList(){
    const { showPlayer, setShowPlayer } = useContext(MapSessionContext)
    return <Drawer open={showPlayer !== null} anchor="right" onClose={() => setShowPlayer(null)}>
        <SessionPlayerList session={showPlayer} onClose={() => setShowPlayer(null)} />
    </Drawer>
}
const MapSessionContext = createContext(null)
function MapSessionListDisplay(){
    const [ showPlayer, setShowPlayer ] = useState(null)
    return <Paper elevation={0}>
        <MapSessionContext.Provider value={{ setShowPlayer: setShowPlayer, showPlayer: showPlayer }} >
            <AllSessions />
            <PlayerSessionList />
        </MapSessionContext.Provider>
    </Paper>
}
export default function MapSessionList(){
    return <ErrorCatch>
        <MapSessionListDisplay />
    </ErrorCatch>
}