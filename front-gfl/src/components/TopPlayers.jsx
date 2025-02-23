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
import { fetchUrl, SERVER_WATCH } from "../utils";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlayerTableRow, {PlayerTableRowLoading} from "./PlayerTableRow.jsx";
import ErrorCatch from "./ErrorMessage.jsx";


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


function TopPlayersInformation(){
    const [ selection, setSelection ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const [ playersInfo, setPlayerInfo ] = useState([])

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
                if (e.name === "AbortError") return
                console.error(e)
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
                {!loading && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
            </TableBody>
        </Table>
    </TableContainer>
}
export default function TopPlayers(){
    return <ErrorCatch message="Couldn't load top player list.">
        <TopPlayersInformation />
    </ErrorCatch>
}