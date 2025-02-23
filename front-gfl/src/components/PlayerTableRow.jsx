import {PlayerAvatar} from "./PlayerAvatar.jsx";
import dayjs from "dayjs";
import {secondsToHours} from "../utils.jsx";
import {Badge, TableCell, TableRow} from "@mui/material";
import {useNavigate} from "react-router";
import {ErrorBoundary} from "react-error-boundary";

function PlayerInformation({ player }){
    const navigate = useNavigate()
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
    return <>
        <TableRow hover role="checkbox" tabIndex={-1}
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
    </>
}
function PlayerRowError(){
    return <>
    <TableRow hover>
        <TableCell colSpan={2}>
            Something went wrong :/
        </TableCell>
    </TableRow>
    </>
}

export default function PlayerTableRow({ player }){
    return <>
        <ErrorBoundary fallback={<PlayerRowError />}>
            <PlayerInformation player={player} />
        </ErrorBoundary>
    </>
}