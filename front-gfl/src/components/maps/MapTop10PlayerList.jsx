import {useContext, useEffect, useState} from "react";
import {fetchServerUrl} from "../../utils.jsx";
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

function MapTop10PlayerListDisplay(){
    const { name } = useContext(MapContext)
    const [ playersInfoResult, setPlayerInfo ] = useState(null)
    const [ loading, setLoading ] = useState(false)

    useEffect(() => {
        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        fetchServerUrl(`/maps/${name}/top_players`, { signal })
            .then(data => {
                setPlayerInfo(data)
                setLoading(false)
            })
            .catch(e => {
                if (e === "Value changed") return
                console.error(e)
                setLoading(false)
            })
        return () => {
            abortController.abort("Value changed")
        }
    }, [name])
    const playersInfo = playersInfoResult ?? []
    const absoluteLoad = !loading
    return (
        <Paper sx={{ width: '100%', my: '.5rem' }} elevation={0}>
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
            <TableContainer component={Box} p="1rem">
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
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}
export default function MapTop10PlayerList(){
    return <ErrorCatch>
        <MapTop10PlayerListDisplay />
    </ErrorCatch>
}