import {useDeferredValue, useEffect, useState} from "react";
import { fetchUrl } from "utils/generalUtils.ts";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import PlayerTableRow, {PlayerTableRowLoading} from "./PlayerTableRow.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";


function PlayerListDisplay({ dateDisplay }){
    const [ currentPage, setPage ] = useState(0)
    const pageDef = useDeferredValue(currentPage)
    const [ playersInfoResult, setPlayerInfo ] = useState(null)
    const [ totalPlayers, setPlayerCount ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const { server } = useServerData()
    const server_id = server.id

    useEffect(() => {
        setPlayerInfo(null)
        setPlayerCount(0)
        setPage(0)
    }, [server_id])
    useEffect(() => {
      setPage(0)
    }, [dateDisplay])

    useEffect(() => {
        if (dateDisplay === null) return

        let { start, end } = dateDisplay
        if (!start.isBefore(end)) return
        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        const params = {
            start: start.toJSON(), 
            end: end.toJSON(),
            page: pageDef
        }

        fetchUrl(`/graph/${server_id}/players`, { params, signal })
            .then(data => {
                for (const p of data.players)
                    p.server_id = server_id
                setPlayerInfo(data)
                setPlayerCount(data.total_players)
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
    }, [server_id, pageDef, dateDisplay])
    const playersInfo = playersInfoResult?.players ?? []
    const absoluteLoad = pageDef === currentPage && !loading
    return (
        <Paper sx={{ width: '100%', my: '.5rem' }} elevation={0}>
            <TableContainer sx={{ maxHeight: "54vh" }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" colSpan={3}>
                                <strong>
                                  Unique Players Within {dateDisplay?.start.format('lll')} - {dateDisplay?.end.format('lll')}
                                </strong>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Total Play Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(loading || pageDef !== currentPage || playersInfoResult == null) && Array
                            .from({length: 70})
                            .map((_, index) => <PlayerTableRowLoading key={index}/>)
                        }
                        {absoluteLoad && playersInfo.length === 0 && <>
                            <TableRow>
                                <TableCell colSpan={2}>No players in this list.</TableCell>
                            </TableRow>
                        </>}
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalPlayers}
              page={currentPage}
              rowsPerPage={70}
              rowsPerPageOptions={[-1]}
              onPageChange={(event, newPage) => {
                  setPage(newPage)
                  setPlayerInfo(null)
              }}
            />
        </Paper>
      );
}

export default function PlayerList({ dateDisplay }){
    return <ErrorCatch message="Couldn't load player list.">
        <PlayerListDisplay dateDisplay={dateDisplay} />
    </ErrorCatch>
}