import { useEffect, useRef, useState } from "react";
import { fetchUrl, SERVER_WATCH, debounce } from "../utils";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import {LinearProgress} from "@mui/material";
import PlayerTableRow from "./PlayerTableRow.jsx";
import {ErrorBoundary} from "react-error-boundary";
import ErrorCatch from "./ErrorMessage.jsx";



function PlayerListDisplay({ dateDisplay }){
    const [ page, setPage ] = useState(0)
    const [ totalPlayers, setTotalPlayers ] = useState(0)
    const [ playersInfo, setPlayerInfo ] = useState([])
    const [ loading, setLoading ] = useState(false)
    const debouncedLoadingRef = useRef()

    useEffect(() => {
      setPage(0)
    }, [dateDisplay])

    useEffect(() => {
      debouncedLoadingRef.current = debounce(gonnaShow => {
        setLoading(gonnaShow)
      }, 1000, false)
    
      return () => {
        debouncedLoadingRef.current.cancel()
      }
    }, []);

    useEffect(() => {
        if (dateDisplay === null) return

        let { start, end } = dateDisplay
        if (!start.isBefore(end)) return
        const abortController = new AbortController()
        const signal = abortController.signal
        debouncedLoadingRef.current && debouncedLoadingRef.current(true)
        const params = {
            start: start.toJSON(), 
            end: end.toJSON(),
            page: page
        }
        fetchUrl(`/graph/${SERVER_WATCH}/players`, { params, signal })
              .then(data => {
                setTotalPlayers(data.total_players)
                setPlayerInfo(data.players)
                debouncedLoadingRef.current.cancel()
                setLoading(false)
            }).catch(e => {
              debouncedLoadingRef.current.cancel()
              setLoading(false)
            })
        return () => {
            abortController.abort("Value changed")
        }
    }, [page, dateDisplay])
    return (
        <Paper sx={{ width: '100%', my: '.5rem' }} elevation={0}>
            <TableContainer sx={{ maxHeight: "85vh" }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" colSpan={3}>
                                <strong>
                                  Unique Players Within {dateDisplay?.start.format('lll')} - {dateDisplay?.end.format('lll')}
                                </strong>
                            </TableCell>
                        </TableRow>
                        {loading && <tr>
                          <td colSpan={2}>
                          <LinearProgress />
                          </td>
                        </tr>}
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Total Play Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {playersInfo.length === 0 && <TableRow>
                            <TableCell colSpan={2}>No players in this list.</TableCell>
                        </TableRow>
                        }
                        {playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalPlayers}
              page={page}
              rowsPerPage={70}
              rowsPerPageOptions={[-1]}
              onPageChange={(event, newPage) => setPage(newPage)}
            />
        </Paper>
      );
}

export default function PlayerList({ dateDisplay }){
    return <ErrorCatch message="Couldn't load player list.">
        <PlayerListDisplay dateDisplay={dateDisplay} />
    </ErrorCatch>
}