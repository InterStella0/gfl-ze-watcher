import {
    Badge,
    Button,
    LinearProgress,
    Menu, MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import dayjs from "dayjs";
import {useEffect, useMemo, useState} from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import { fetchUrl, secondsToHours, SERVER_WATCH } from "../utils";
import { useNavigate } from "react-router";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';


function DurationSelections({ changeSelection }){
    const [ selection, setSelection ] = useState("2w")
    const [ elementAnchor, setElementAnchor ] = useState(null)
    const openMenu = Boolean(elementAnchor)

    const lengths = useMemo(() => [
        { id: '1d', label: "1 Day", value: {unit: 'days', value: 1} },
        { id: '1w', label: "1 Week", value: {unit: 'days', value: 7} },
        { id: '2w', label: "2 Weeks", value: {unit: 'days', value: 14} },
        { id: '1m', label: "1 Month", value: {unit: 'months', value: 1} },
        { id: '6m', label: "6 Months", value: {unit: 'months', value: 6} },
        { id: '1yr', label: "A year", value: {unit: 'years', value: 1} },
        { id: 'all', label: "All time", value: null },
    ], [])

    const selectionData = lengths.find(e => e.id === selection)
    useEffect(() => {
        changeSelection(selectionData)
    }, [selectionData, changeSelection])
    const handleClose = (selected) => {
        if (selected !== null)
            setSelection(selected.id)
        setElementAnchor(null)
    }

    return <>
        <Button
            onClick={event => setElementAnchor(event.currentTarget)}
            variant="outlined"
            color="secondary"
            endIcon={<KeyboardArrowDownIcon />}>
            {selectionData.label}
        </Button>
        <Menu open={openMenu} anchorEl={elementAnchor} onClose={() => handleClose(null)}>
            {lengths.map(e => <MenuItem key={e.id} onClick={() => handleClose(e)}>{e.label}</MenuItem>)}
        </Menu>
    </>
}


export default function TopPlayers(){
    const [ selection, setSelection ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ playersInfo, setPlayerInfo ] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        if (selection === null) return
        const selectedValue = selection.value
        const startDate = selectedValue? dayjs().subtract(selectedValue.value, selectedValue.unit): null
        const endDate = dayjs()
        setLoading(true)
        const params = {
            end: endDate.toJSON(),
            page: 0
        }
        if (startDate !== null){
            params.start = startDate.toJSON()
        }
        fetchUrl(`/graph/${SERVER_WATCH}/players`, { params })
            .then(data => {
                setPlayerInfo(data.players.slice(0, 10))
                setLoading(false)
            }).catch(e => {
              setLoading(false)
            })
    }, [selection])
    return <TableContainer sx={{ maxHeight: "90vh" }}>
        <Table stickyHeader aria-label="sticky table">
            <TableHead>
                <TableRow>
                  <TableCell align="center" colSpan={3}>
                      <strong style={{marginRight: '1rem'}}>Most active players within</strong>
                      <DurationSelections changeSelection={setSelection} />
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
                {playersInfo.map(player => {
                    let playerAvatarWrap = <PlayerAvatar uuid={player.id} name={player.name} />
                    let lastPlayed = `Last played ${dayjs(player.last_played).fromNow()} (${secondsToHours(player.last_played_duration)}hr)`
                    if (player.online_since) {
                        playerAvatarWrap = <Badge
                            color="success"
                            badgeContent={player.online_since && " "}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            title={player.online_since && "Playing on GFL"}
                            slotProps={{
                                badge: {
                                    style: {
                                        transform: 'translate(5px, 5px)',
                                    },
                                },
                            }}
                        >
                            {playerAvatarWrap}
                        </Badge>
                        lastPlayed = `Playing since ${dayjs(player.online_since).fromNow()}`
                    }
                    return (
                      <TableRow hover role="checkbox" tabIndex={-1} key={player.id}
                                onClick={() => navigate(`/players/${player.id}`)}
                              style={{cursor: 'pointer'}}>
                          <TableCell>
                            <div style={{display: "flex", flexDirection: 'row', alignContent: 'center'}}>
                                {playerAvatarWrap}
                                <div style={{marginLeft: '.5rem'}}>
                                    <p><strong>{player.name}</strong></p>
                                    <p style={{color: player.online_since? 'green': 'grey', fontSize: '.7rem'}}>{lastPlayed}</p>
                                </div>
                            </div>
                            </TableCell>
                          <TableCell>{secondsToHours(player.total_playtime)} Hours</TableCell>
                      </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </TableContainer>
}