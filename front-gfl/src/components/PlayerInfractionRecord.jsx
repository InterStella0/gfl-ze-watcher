import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import { fetchUrl, formatFlagName, ICE_FILE_ENDPOINT, InfractionInt } from "../utils.jsx";
import { Avatar, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import dayjs from "dayjs";

export default function PlayerInfractionRecord(){
    const { playerId } = useContext(PlayerContext)
    const [ infractions, setInfractions ] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/infractions`)
            .then(infras => infras.map(e => {
                e.flags = new InfractionInt(e.flags)
                return e
            }))
            .then(e => setInfractions(e))
    }, [playerId])

    let records = <>
        <h1>No Records</h1>
    </>

    if (infractions.length > 0){
        records = <>
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
                        {infractions.map((row) => (
                            <TableRow
                                key={row.id}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell>
                                    <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
                                        <Avatar src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)} />
                                        <strong>{row.by}</strong>
                                    </div>
                                </TableCell>
                                <TableCell>{row.reason}</TableCell>
                                <TableCell align="right">{row.flags.getAllRestrictedFlags().map(formatFlagName).join(', ')}</TableCell>
                                <TableCell align="right">{dayjs(row.infraction_time).format('lll')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    }

    return <Paper sx={{minHeight: '385px', p: '1rem'}} elevation={0}>
        <h2>Infractions</h2>
        {records}
    </Paper>
}