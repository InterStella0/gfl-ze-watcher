import SearchIcon from '@mui/icons-material/Search';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GroupIcon from '@mui/icons-material/Group';
import DebouncedInput from "../ui/DebounchedInput.jsx";
import { useEffect, useState } from 'react';
import {fetchServerUrl, simpleRandom} from '../../utils.jsx';
import {
    LinearProgress,
    Pagination, Skeleton,
    Typography,
    Button
} from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar.jsx';
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Box } from '@mui/material'
import {useNavigate, useParams, useSearchParams} from 'react-router';
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.jsx";

function PlayerCardDisplay({ player }){
    const navigate = useNavigate()
    const {server_id} = useParams()
    return <Paper elevation={1}
                  onClick={() => navigate(`/${server_id}/players/${player.id}`)}
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
            <PlayerAvatar uuid={player.id} name={player.name} variant="circle"
                          sx={{ width: 120, height: 120 }} />
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
            Last online {dayjs(player.last_played).fromNow()}
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

function EmptySearchState() {
    return (
        <Box
            sx={{
                textAlign: 'center',
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh'
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    width: '100%',
                    maxWidth: 800,
                    mx: 'auto'
                }}
            >
                <PersonSearchIcon
                    sx={{
                        fontSize: 60,
                        color: 'primary.main',
                        mb: 2,
                        opacity: 0.9
                    }}
                />

                <Typography variant="h5" component="h2" gutterBottom>
                    Find Players
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                    Enter a player's name in the search box above to find them
                </Typography>
            </Paper>
        </Box>
    );
}


function SearchPlayersDisplay(){
    const [params, setParams] = useSearchParams()
    const search = params.get("q")
    const [ result, setResult ] = useState([])
    const [ matching, setMatching ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const [ page, setPage] = useState(1)
    const {server_id} = useParams()

    useEffect(() => {
        if (search === null || search.trim() === "") return
        let search2 = search.trim()
        setLoading(true)
        const params = {player_name: search2, page: page - 1}
        fetchServerUrl(server_id, "/players/search", { params })
            .then(e => {
                setMatching(e.total_players)
                setResult(e.players)
            })
            .then(() => setLoading(false))
    }, [server_id, search, page])

    const hasSearchQuery = search && search.trim() !== "";

    return <>
        {loading && <LinearProgress />}
        <Paper
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
                alignItems: 'center'
            }}
        >
            <SearchIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <DebouncedInput
                initialValue={search ?? ""}
                color="neutral"
                size="m"
                variant="soft"
                timeout={1000}
                placeholder="Search for players..."
                slotProps={{ margin: '.2rem', width: '100%' }}
                onChangeValue={(value) => setParams({"q": value})}
            />
        </Paper>

        {hasSearchQuery ? (
            <>
                <Paper
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 1
                    }}
                >
                    {!loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">
                                Found <strong>{matching}</strong> player{matching !== 1 ? 's' : ''} matching "<strong>{search}</strong>"
                            </Typography>
                            {matching > 40 && (
                                <Pagination
                                    count={Math.ceil(matching / 40)}
                                    variant="outlined"
                                    color="primary"
                                    page={page}
                                    onChange={(_, e) => setPage(e)}
                                    size="medium"
                                />
                            )}
                        </Box>
                    )}
                </Paper>

                <Box sx={{ mb: 4 }}>
                    <Grid container spacing={2}>
                        {loading && Array.from({length: 8}).map((_, index) => (
                            <Grid size={{xl: 3, lg: 4, md: 6, s: 6, xs: 12}} key={index}>
                                <PlayerCardLoading />
                            </Grid>
                        ))}

                        {!loading && result.length > 0 ? (
                            result.map(e => (
                                <Grid size={{xl: 3, lg: 4, md: 6, s: 6, xs: 12}} key={e.id}>
                                    <PlayerCard player={e} />
                                </Grid>
                            ))
                        ) : (
                            !loading && (
                                <Paper
                                    sx={{
                                        width: '100%',
                                        textAlign: 'center',
                                        py: 4,
                                        px: 2,
                                        mt: 2,
                                        borderRadius: 1,
                                        bgcolor: 'background.paper'
                                    }}
                                >
                                    <Typography variant="h6" color="text.secondary">
                                        No players found matching "{search}"
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Try a different search term
                                    </Typography>
                                </Paper>
                            )
                        )}
                    </Grid>
                </Box>
            </>
        ) : (
            <EmptySearchState />
        )}
    </>
}


export default function SearchPlayers(){
    return <ErrorCatch message="Search players couldn't be loaded.">
        <SearchPlayersDisplay />
    </ErrorCatch>
}