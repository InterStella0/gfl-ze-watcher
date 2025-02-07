import { useEffect, useState } from "react";
import { fetchUrl, SERVER_WATCH } from "../config";
import humanizeDuration from 'humanize-duration';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';


export default function PlayerList({ dateDisplay }){
    const [ page, setPage ] = useState(1)
    const [ totalPlayers, setTotalPlayers ] = useState(0)
    const [ playersInfo, setPlayerInfo ] = useState([])

    useEffect(() => {
        if (dateDisplay === null) return

        let { start, end } = dateDisplay
        if (!start.isBefore(end)) return
        const params = {
            start: start.toJSON(), 
            end: end.toJSON(),
            page
        }
        fetchUrl(`/graph/${SERVER_WATCH}/players`, { params })
              .then(data => {
                setTotalPlayers(data.total_player_counts)
                setPlayerInfo(data.players)
            })
    }, [page, dateDisplay])
    return (
        <Paper sx={{ width: '100%' }}>
          <TableContainer sx={{ maxHeight: 840 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell align="center" colSpan={3}>
                    Unique Players
                  </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Total Play Time</TableCell>
                    <TableCell>Sessions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {playersInfo
                  .map((row) => {
                    console.log("TT", row.played_time)
                    return (
                      <TableRow hover role="checkbox" tabIndex={-1} key={row.player_id}>
                          <TableCell>{row.player_name}</TableCell>
                          <TableCell>{humanizeDuration(row.played_time.toFixed(2) * 1000)}</TableCell>
                          <TableCell>{row.sessions.length}</TableCell>
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