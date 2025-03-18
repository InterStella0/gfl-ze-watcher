import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchUrl, formatFlagName, ICE_FILE_ENDPOINT, InfractionFlags, InfractionInt} from "../utils.jsx";
import {
    Alert,
    Avatar,
    Dialog,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import dayjs from "dayjs";
import ErrorCatch from "./ErrorMessage.jsx";
import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
function ModalInfraction({ infraction, onClose }){
    return <>
        <Dialog onClose={onClose} open={infraction !== null} fullWidth fullScreen>
            {infraction !== null && <>
                <Alert severity="info">I'm showing you infraction from bans.gflclans.com because I got lazy half way.</Alert>
                <Box width="100%" height="100%" position="relative">
                    <IconButton sx={{position: 'absolute', top: 0, right: 0, m: '1.1rem'}} onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                    <iframe width="100%" height="100%" src={`https://bans.gflclan.com/infractions/${infraction?.id}/`}/>
                </Box>
            </>}
        </Dialog>
    </>
}


function PlayerInfractionRecordDisplay(){
    const { playerId } = useContext(PlayerContext)
    const [ infractions, setInfractions ] = useState([])
    const [ viewInfraction, setViewInfraction ] = useState(null)
    useEffect(() => {
        fetchUrl(`/players/${playerId}/infractions`)
            .then(infras => infras.map(e => {
                e.flags = new InfractionInt(e.flags)
                return e
            }))
            .then(e => setInfractions(e))
    }, [playerId])
    const handleOnClick = (row) => {
        setViewInfraction(row)
    }
    let records = <>
        <h1>No Records</h1>
    </>

    if (infractions.length > 0){
        records = <>
            <ModalInfraction infraction={viewInfraction} onClose={() => setViewInfraction(null)}/>
            <TableContainer sx={{ maxHeight: "320px"}}>
                <Table aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell style={{fontWeight: 'bold'}}>Admin</TableCell>
                            <TableCell style={{fontWeight: 'bold'}}>Reason</TableCell>
                            <TableCell style={{fontWeight: 'bold'}} align="right">Restriction</TableCell>
                            <TableCell style={{fontWeight: 'bold'}} align="right">Occurred At</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {infractions.map((row) => {
                            const flag = row.flags
                            const by = flag.hasFlag(InfractionFlags.SYSTEM) ? 'System': row.by
                            return <TableRow hover
                                key={row.id}
                                sx={{'&:last-child td, &:last-child th': {border: 0}, cursor: 'pointer'}}
                                onClick={() => handleOnClick(row)}
                            >
                                <TableCell>
                                    <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
                                        <Avatar src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)}/>
                                        <strong>{by}</strong>
                                    </div>
                                </TableCell>
                                <TableCell>{row.reason}</TableCell>
                                <TableCell
                                    align="right">{row.flags.getAllRestrictedFlags().map(formatFlagName).join(', ')}</TableCell>
                                <TableCell align="right">{dayjs(row.infraction_time).format('lll')}</TableCell>
                            </TableRow>
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    }
    return records
}

export default function PlayerInfractionRecord(){
    return <Paper sx={{minHeight: '385px', p: '1rem'}} elevation={0}>
        <h2>Infractions</h2>
        <ErrorCatch message="Infraction couldn't be loaded">
            <PlayerInfractionRecordDisplay />
        </ErrorCatch>
    </Paper>
}
