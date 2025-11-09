import ErrorCatch from "../ui/ErrorMessage.jsx";
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme} from "@mui/material";
import Box from "@mui/material/Box";
import {PlayerTableRowLoading} from "./PlayerTableRow.jsx";
import Typography from "@mui/material/Typography";
import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchServerUrl, secondsToHours} from "../../utils/generalUtils.ts";
import {PlayerAvatar} from "./PlayerAvatar.tsx";
import {useNavigate, useParams} from "react-router";
import dayjs from "dayjs";
import Paper from "@mui/material/Paper";
import WarningIcon from "@mui/icons-material/Warning";

function PlayerFriendRow({ player }){
    const navigate = useNavigate()
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === "dark";
    const {server_id} = useParams()
    return <>
        <TableRow
            hover
            onClick={(e) => {
                e.preventDefault();
                navigate(`/${server_id}/players/${player.id}`);
            }}
            sx={{
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
            }}
        >
            <TableCell sx={{ py: 1.2, pl: 1.5 }}>
                <a
                    href={`/${server_id}/players/${player.id}`}
                    onClick={(e) => e.preventDefault()}
                    style={{ display: "none" }}
                >
                    {player.name}
                </a>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PlayerAvatar uuid={player.id} name={player.name} />

                    <Box sx={{ ml: 2 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                                mb: 0.5
                            }}
                        >
                            {player.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: { md: '0.75rem', xs: '.6rem', sm: '.7rem'},
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                            }}
                        >
                            Last met {dayjs(player.last_seen).fromNow()}
                        </Typography>
                    </Box>
                </Box>
            </TableCell>
            <TableCell
                align="right"
                sx={{
                    py: 1.2,
                    pr: 3,
                    verticalAlign: 'middle'
                }}
            >
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.5,
                        py: 0.75,
                        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: '4px',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        minWidth: '90px'
                    }}
                >
                    {secondsToHours(player.total_time_together)}h
                </Box>
            </TableCell>
        </TableRow>
    </>
}


function PlayerFriend({ player }){
    return <ErrorCatch message={`Couldn't load ${player?.name}`}>
        <PlayerFriendRow player={player} />
    </ErrorCatch>
}

function PlayerMightFriendsDisplayed(){
    const { playerId } = useContext(PlayerContext)
    const [ loading, setLoading ] = useState(false)
    const [ playersInfo, setPlayersInfo ] = useState([])
    const [ error, setError ] = useState(null)
    const {server_id} = useParams()
    useEffect(() => {
        setLoading(true)
        setError(null)
        fetchServerUrl(server_id, `/players/${playerId}/might_friends`)
            .then(setPlayersInfo)
            .catch(setError)
            .finally(() => setLoading(false))
    }, [server_id, playerId]);

    return <Paper elevation={0} sx={{ p: '1rem'}}>
        <Typography
            variant="h6"
            component="h2"
            fontWeight="600"
            sx={{ color: 'text.primary', mb: '1rem' }}
        >
            Mutual sessions
        </Typography>
        {error && <Box height="440px" display="flex" alignItems="center" justifyContent="center">
            <Box gap="1rem" display="flex">
                <WarningIcon />
                <Typography>{error.message || "Something went wrong :/"}</Typography>
            </Box>
        </Box>}
        {!error && <TableContainer sx={{maxHeight: {md: '440px', sm: 'auto'}, borderRadius: '1rem'}}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{fontWeight: 600, width: '100%'}}>Name</TableCell>
                        <TableCell><Typography fontWeight={600} textAlign="right">Time With</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {!loading && playersInfo.length === 0 && <TableRow>
                        <TableCell colSpan={2}>No players in this list.</TableCell>
                    </TableRow>
                    }
                    {loading && Array.from({length: 10}).map((_, index) => <PlayerTableRowLoading key={index}/>)}
                    {!loading && playersInfo.map(player => <PlayerFriend player={player} key={player.id}/>)}
                </TableBody>
            </Table>
        </TableContainer>}
    </Paper>
}
export default function PlayerMightFriends(){
    return <ErrorCatch>
        <PlayerMightFriendsDisplayed />
    </ErrorCatch>
}