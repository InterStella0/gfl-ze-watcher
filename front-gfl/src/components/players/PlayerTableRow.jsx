import {PlayerAvatar} from "./PlayerAvatar.jsx";
import dayjs from "dayjs";
import {secondsToHours, secondsToMins, simpleRandom} from "../../utils.jsx";
import {Badge, Skeleton, TableCell, TableRow} from "@mui/material";
import {useNavigate} from "react-router";
import {ErrorBoundary} from "react-error-boundary";

function PlayerInformation({ player, timeUnit = "h" }){
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
    const timeTaken = {
        h: (value) => `${secondsToHours(value)} Hours`,
        m: (value) => `${secondsToMins(value)} Mins`
    }
    return <>
        <TableRow hover
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
            <TableCell>{timeTaken[timeUnit](player.total_playtime)}</TableCell>
        </TableRow>
    </>
}
function PlayerRowError(){
    return <>
    <TableRow>
        <TableCell colSpan={2}>
            Something went wrong :/
        </TableCell>
    </TableRow>
    </>
}

export function PlayerTableRowLoading(){
    const randomNameHeight = simpleRandom(30, 120)
    return <TableRow>
        <TableCell>
            <div style={{display: "flex", flexDirection: 'row', alignContent: 'center'}}>
                <Skeleton variant="circular" width={40} height={40} />
                <div style={{marginLeft: '.5rem'}}>
                    <Skeleton variant="text" height="1.5rem" width={randomNameHeight} />
                    <Skeleton variant="text" height=".8rem" width={160} />
                </div>
            </div>
        </TableCell>
        <TableCell>
            <Skeleton variant="text" width={80} height="1.3rem" />
        </TableCell>
    </TableRow>
}

export default function PlayerTableRow({ player, timeUnit = "h" }){
    return <>
        <ErrorBoundary fallback={<PlayerRowError />}>
            <PlayerInformation player={player} timeUnit={timeUnit} />
        </ErrorBoundary>
    </>
}