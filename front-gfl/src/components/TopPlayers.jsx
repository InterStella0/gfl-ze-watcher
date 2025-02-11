import { LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import dayjs from "dayjs";
import humanizeDuration from "humanize-duration";
import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import { fetchUrl, SERVER_WATCH } from "../utils";
import { useNavigate } from "react-router";

export default function TopPlayers(){
    const [endDate, setEnd] = useState(dayjs())
    const [startDate, setStart] = useState(endDate.subtract(7, 'days'))
    const [ loading, setLoading ] = useState(false)
    const [ playersInfo, setPlayerInfo ] = useState([])
    const navigate = useNavigate()
    useEffect(() => {
        setLoading(true)
        const params = {
            start: startDate.toJSON(), 
            end: endDate.toJSON(),
            page: 0
        }
        fetchUrl(`/graph/${SERVER_WATCH}/players`, { params })
            .then(data => {
                setPlayerInfo(data.players.slice(0, 10))
                setLoading(false)
            }).catch(e => {
              setLoading(false)
            })
    }, [startDate, endDate])
    return <>
        <TableContainer sx={{ maxHeight: "90vh" }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell align="center" colSpan={3}>
                    <strong>Most active players within 2 weeks.</strong>
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
                      <TableRow hover role="checkbox" tabIndex={-1} key={row.player_id} onClick={() => navigate(`/players/${row.player_id}`)}
                              style={{cursor: 'pointer'}}>
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
    </>
}