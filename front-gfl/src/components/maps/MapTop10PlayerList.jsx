import {useContext, useEffect, useState} from "react";
import {fetchServerUrl} from "../../utils/generalUtils.jsx";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import PlayerTableRow, {PlayerTableRowLoading} from "../players/PlayerTableRow.jsx";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import {MapContext} from "../../pages/MapPage.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Tooltip from "@mui/material/Tooltip";
import {IconButton} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import {useParams} from "react-router";
import WarningIcon from "@mui/icons-material/Warning";

function MapTop10PlayerListDisplay(){
    const { name } = useContext(MapContext)
    const [ playersInfoResult, setPlayerInfo ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState(null)
    const {server_id} = useParams()

    useEffect(() => {
        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        setPlayerInfo(null)
        fetchServerUrl(server_id, `/maps/${name}/top_players`, { signal })
            .then(data => {
                for(const p of data)
                    p.server_id = server_id
                setPlayerInfo(data)
            })
            .catch(e => {
                if (e === "Value changed") return
                setError(e.message || "Something went wrong :/")
            })
            .finally(() => setLoading(false))
        return () => {
            abortController.abort("Value changed")
        }
    }, [server_id, name])
    const playersInfo = playersInfoResult ?? []
    const absoluteLoad = !loading
    return (
        <Paper sx={{ width: '100%' }} elevation={0}>
            <Box p="1rem" display="flex" justifyContent="space-between">
                <Typography variant="h6" component="h2" color="primary" fontWeight={700}>Top 10 Players</Typography>
                <Box>
                    <Tooltip title="Top 10 players who love the map the most.">
                        <IconButton size="small">
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            {error && <Box minHeight="712px" display="flex" alignItems="center" justifyContent="center">
                <WarningIcon />
                <Typography>{error || "Something went wrong"}</Typography>
            </Box>}
            {!error && <TableContainer component={Box} p="1rem" sx={{minHeight: '712px'}}>
                <Table>
                    <TableBody>
                        {(loading || playersInfoResult == null) && Array
                            .from({length: 10})
                            .map((_, index) => <PlayerTableRowLoading key={index}/>)
                        }
                        {!(loading || playersInfoResult == null) && playersInfo.length === 0 && <TableRow>
                            <TableCell colSpan={2}>No players in this list.</TableCell>
                        </TableRow>
                        }
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id}/>)}
                    </TableBody>
                </Table>
            </TableContainer>}
        </Paper>
    )
}
export default function MapTop10PlayerList(){
    return <ErrorCatch>
        <MapTop10PlayerListDisplay />
    </ErrorCatch>
}