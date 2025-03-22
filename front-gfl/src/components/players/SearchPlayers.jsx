import SearchIcon from '@mui/icons-material/Search';
import DebouncedInput from "../ui/DebounchedInput.jsx";
import { useEffect, useState } from 'react';
import {fetchUrl, secondsToHours, simpleRandom} from '../../utils.jsx';
import {
    Badge,
    LinearProgress,
    Pagination, Skeleton,
    Typography
} from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar.jsx';
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Box } from '@mui/material'
import { useNavigate } from 'react-router';
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.jsx";

function PlayerCardDisplay({ player }){
    const navigate = useNavigate()
    let playerAvatarWrap = <PlayerAvatar uuid={player.id} name={player.name} variant="circle"
                                         sx={{ width: 120, height: 120 }} />

    if (player.online_since)
        playerAvatarWrap = <Badge
            color="success"
            title={`Playing since ${dayjs(player.online_since).format('lll')}`}
            badgeContent={player.online_since && " "}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            slotProps={{
                badge: {
                    style: {
                        transform: 'translateY(-10px)',
                    },
                },
            }}
        >
            {playerAvatarWrap}
        </Badge>
    return <Paper elevation={1}
                  onClick={() => navigate(`/players/${player.id}`)}
                  sx={{
                      cursor: 'pointer',
                      transition: '0.3s',
                      p: 2,
                      '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      },
                      '&:active': {
                          transform: 'scale(0.98)',
                      },
                  }}
    >
        <div style={{display: 'flex', alignContent: 'center', justifyContent: 'center'}}>
            {playerAvatarWrap}

        </div>
        <Typography gutterBottom variant="h5" component="p"
                    sx={{margin: '.5rem', maxWidth: '20rem',
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
        }} title={player.name}>
            {player.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {secondsToHours(player.total_playtime)} Hour(s) on GFL
        </Typography>
    </Paper>
}
function PlayerCard({ player }){
    return <ErrorCatch message="Player couldn't be rendered.">
        <PlayerCardDisplay player={player}/>
    </ErrorCatch>
}


function PlayerCardLoading(){
    const randomNameWidth = simpleRandom(30, 250)
    return <Grid size={{xl: 3, lg: 4, md: 6, s: 6, xs: 12}}>
        <Paper>
            <Paper
                elevation={1}
                sx={{
                    cursor: 'pointer',
                    transition: '0.3s',
                    p: 2,
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    },
                    '&:active': {
                        transform: 'scale(0.98)',
                    },
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'column'
                }}>

                <div style={{display: 'flex', alignContent: 'center', justifyContent: 'center'}}>
                    <Skeleton variant="circular" width={120} height={120} />

                </div>
                <Skeleton variant="text" width={randomNameWidth} />
                <Skeleton variant="text" width={190} />
            </Paper>
        </Paper>
    </Grid>
}


function SearchPlayersDisplay(){
    const [search, setSearch ] = useState(null)
    const [ result, setResult ] = useState([])
    const [ matching, setMatching ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const [ page, setPage] = useState(1)
    useEffect(() => {
        if (search === null || search.trim() === "") return
        let search2 = search.trim()
        setLoading(true)
        const params = {player_name: search2, page: page - 1}
        fetchUrl("/players/search", { params })
        .then(e => {
            setMatching(e.total_players)
            setResult(e.players)
        })
        .then(() => setLoading(false))
    }, [search, page])
    return <>
        {loading && <LinearProgress/>}
        <div style={{display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center', padding: '1rem'}}>
            <SearchIcon sx={{marginRight: '1rem'}} />
            <DebouncedInput
                color="neutral"
                size="m"
                variant="soft"
                timeout={1000}
                slotProps={{margin: '.2rem', width: '100%'}}
                onChangeValue={(value) => setSearch(value)}
            />
        </div>
        <div style={{minHeight: 'calc(32px)', margin: '1rem'}}>
            {!loading && search && (search?.trim() === "" || <div style={
                    {display: 'flex', justifyContent: 'space-between',
                        flexDirection: 'row'}
            }>
                <p>Matched {matching} player(s) with the search &#34;{search}&#34;.</p>
                <Box>
                    <Pagination count={Math.ceil(matching / 40)} variant="outlined" color="primary" page={page} onChange={(_, e) => setPage(e)} />
                </Box>
            </div>
            )}
        </div>
        <div style={{padding: '1rem'}}>
            <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: '60vh', margin: '1rem'}}>
                {loading && Array.from({length: 8}).map((_, index) => <PlayerCardLoading key={index} />)}
                {!loading && result.map(e =>
                        <Grid size={{xl: 3, lg: 4, md: 6, s: 6, xs: 12}} key={e.id}>
                            <Paper><PlayerCard player={e} /></Paper>
                        </Grid>
                    )
                }
            </Grid>
        </div>
    </>
}
export default function SearchPlayers(){
    return <ErrorCatch message="Search players couldn't be loaded.">
        <SearchPlayersDisplay />
    </ErrorCatch>
}