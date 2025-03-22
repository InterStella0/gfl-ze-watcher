import {
    Button, IconButton,
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
import { fetchUrl, SERVER_WATCH } from "../../utils.jsx";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlayerTableRow, {PlayerTableRowLoading} from "./PlayerTableRow.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

function DurationSelections({ changeSelection }){
    const [ selection, setSelection ] = useState("2w")
    const [ elementAnchor, setElementAnchor ] = useState(null)
    const openMenu = Boolean(elementAnchor)

    const lengths = useMemo(() => [
        { id: '1d', label: "1 Day", value: 'today' },
        { id: '1w', label: "1 Week", value: 'week1' },
        { id: '2w', label: "2 Weeks", value: 'week2' },
        { id: '1m', label: "1 Month", value: 'month1' },
        { id: '6m', label: "6 Months", value: 'month6' },
        { id: '1yr', label: "A Year", value: 'year1' },
        { id: 'all', label: "All time", value: 'all' },
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
            variant="contained"
            sx={{borderRadius: '10rem'}}
            endIcon={<KeyboardArrowDownIcon />}>
            {selectionData.label}
        </Button>
        <Menu open={openMenu} anchorEl={elementAnchor} onClose={() => handleClose(null)}>
            {lengths.map(e => <MenuItem key={e.id} onClick={() => handleClose(e)}>{e.label}</MenuItem>)}
        </Menu>
    </>
}


function TopPlayersInformation(){
    const [ selection, setSelection ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ playersInfo, setPlayerInfo ] = useState([])
    const [ page, setPage ] = useState(0)
    const end = (page + 1) * 10
    const start = page * 10

    useEffect(() => {
        if (selection === null) return
        const selectedValue = selection.value
        setLoading(true)
        const params = { time_frame: selectedValue}
        fetchUrl(`/graph/${SERVER_WATCH}/top_players`, { params })
            .then(data => {
                setPlayerInfo(data.players)
                setPage(0)
                setLoading(false)
            }).catch(e => {
                console.error(e)
                setLoading(false)
            })
    }, [selection])
    return <TableContainer>
        <Table stickyHeader aria-label="sticky table">
            <TableHead>
                <TableRow>
                  <TableCell align="center" colSpan={3}>
                      <Box display="flex" justifyContent="space-between">
                          <Box>
                              <strong style={{marginRight: '1rem'}}>Most active players within</strong>
                              <DurationSelections changeSelection={setSelection} />
                          </Box>
                          <Box display="flex" flexDirection="row" alignItems="center">
                              <IconButton onClick={() => setPage(0)} disabled={page === 0}><ArrowLeftIcon /></IconButton>
                              <IconButton onClick={() => setPage(1)} disabled={page === 1}><ArrowRightIcon /></IconButton>
                          </Box>
                      </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Total Play Time</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {!loading && playersInfo.length === 0 && <TableRow>
                    <TableCell colSpan={2}>No players in this list.</TableCell>
                  </TableRow>
                }
                {loading && Array.from({length: 10}).map((_, index) => <PlayerTableRowLoading key={index} />)}
                {!loading && playersInfo.slice(start, end).map(player => <PlayerTableRow player={player} key={player.id} />)}
            </TableBody>
        </Table>
    </TableContainer>
}
export default function TopPlayers(){
    return <ErrorCatch message="Couldn't load top player list.">
        <TopPlayersInformation />
    </ErrorCatch>
}