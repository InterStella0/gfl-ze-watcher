import { useEffect, useState} from "react";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import Paper from "@mui/material/Paper";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import PlayerTableRow, {PlayerTableRowLoading} from "./PlayerTableRow.jsx";

export default function SessionPlayerList({ session }){
    const [ playersInfoResult, setPlayerInfo ] = useState(null)
    const [ loading, setLoading ] = useState(false)

    useEffect(() => {
        if (session === null) return

        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        fetchUrl(`/servers/${SERVER_WATCH}/sessions/${session.time_id}/players`, { signal })
            .then(data => {
                setPlayerInfo(data)
                setLoading(false)
            })
            .catch(e => {
                if (e.name === "AbortError") return
                console.error(e)
                setLoading(false)
            })
        return () => {
            abortController.abort("Value changed")
        }
    }, [session])
    const playersInfo = playersInfoResult ?? []
    const absoluteLoad = !loading
    return (
        <Paper sx={{ width: '100%', my: '.5rem' }} elevation={0}>
            <TableContainer>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" colSpan={3}>
                                <strong>
                                    Player within this session
                                </strong>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Total Play Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(loading || playersInfoResult == null) && Array
                            .from({length: 70})
                            .map((_, index) => <PlayerTableRowLoading key={index}/>)
                        }
                        {absoluteLoad && playersInfo.length === 0 && <>
                            <TableRow>
                                <TableCell colSpan={2}>No players in this list.</TableCell>
                            </TableRow>
                        </>}
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} timeUnit="m" />)}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}