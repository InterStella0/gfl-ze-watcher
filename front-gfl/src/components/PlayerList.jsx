import { useEffect, useRef, useState } from "react";
import { fetchUrl, SERVER_WATCH, debounce } from "../utils";
import humanizeDuration from 'humanize-duration';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import {LinearProgress} from "@mui/material";
import { PlayerAvatar } from "./PlayerAvatar";


export default function PlayerList({ dateDisplay }){
    const [ page, setPage ] = useState(0)
    const [ totalPlayers, setTotalPlayers ] = useState(0)
    const [ playersInfo, setPlayerInfo ] = useState([])
    const [ loading, setLoading ] = useState(false)
    const debouncedLoadingRef = useRef()

    useEffect(() => {
      setPage(0)
    }, [dateDisplay])

    useEffect(() => {
      debouncedLoadingRef.current = debounce((gonnaShow) => {
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
        debouncedLoadingRef.current && debouncedLoadingRef.current(true)
        const params = {
            start: start.toJSON(), 
            end: end.toJSON(),
            page: page
        }
        fetchUrl(`/graph/${SERVER_WATCH}/players`, { params })
              .then(data => {
                setTotalPlayers(data.total_player_counts)
                setPlayerInfo(data.players)
                debouncedLoadingRef.current.cancel()
                setLoading(false)
            }).catch(e => {
              debouncedLoadingRef.current.cancel()
              setLoading(false)
            })
    }, [page, dateDisplay])
    return (
        <Paper sx={{ width: '100%' }}>
          <TableContainer sx={{ maxHeight: "85vh" }}>
            <Table stickyHeader aria-label="sticky table">
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
                {playersInfo.length == 0 &&  <TableRow>
                    <TableCell colSpan={2}>No players in this list.</TableCell>
                  </TableRow>
                }
                {playersInfo.length > 0 && playersInfo.map((row) => {
                    return (
                      <TableRow hover role="checkbox" tabIndex={-1} key={row.player_id}>
                          <TableCell>
                            <div style={{display: "flex", flexDirection: 'row', alignContent: 'center'}}>
                              <PlayerAvatar uuid={row.player_id} name={row.player_name} />
                              <p style={{marginLeft: '.5rem'}}>{row.player_name}</p>
                            </div>
                            </TableCell>
                          <TableCell>{humanizeDuration(row.played_time * 1000, {maxDecimalPoints: 2})}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalPlayers}
            page={page}
            rowsPerPage={70} 
            rowsPerPageOptions={-1}
            onPageChange={(event, newPage) => setPage(newPage)}
          />
        </Paper>
      );
}