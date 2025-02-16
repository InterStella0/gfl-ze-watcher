import SearchIcon from '@mui/icons-material/Search';
import DebouncedInput from "./DebounchedInput";
import { useEffect, useState } from 'react';
import {fetchUrl, secondsToHours} from '../utils';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    LinearProgress,
    Pagination,
    Typography
} from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar';
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import { Box } from '@mui/material'
import CategoryChip from './CategoryChip';
import { useNavigate } from 'react-router';

export function PlayerCard({ player }){
    const navigate = useNavigate()
    return  <Card sx={{ maxWidth: 345,
                '&[data-active]': {
                backgroundColor: 'action.selected',
                '&:hover': {
                    backgroundColor: 'action.selectedHover',
                },
                }
                }}>
            <Typography gutterBottom variant="h5" component="div" sx={{margin: '.5rem'}}>
                {player.name}
            </Typography>
            <div style={{display: 'flex', alignContent: 'center', justifyContent: 'center'}}>
            <PlayerAvatar uuid={player.id} name={player.name} variant="rounded"
                    sx={{ width: 213, height: 120 }} />
            </div>
            <CardContent>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {secondsToHours(player.total_playtime)} Hour(s)
                </Typography>
                <div  style={{display: 'flex', alignContent: 'center', justifyContent: 'space-evenly', width: "100%"}}>
                    {player.category && player.category != 'unknown' && <CategoryChip category={player.category} />}
                    <Chip label={player.favourite_map} />
                </div>
            </CardContent>
            <CardActions>
                <Button size="small" onClick={() => navigate(`/players/${player.id}`)}>Show</Button>
            </CardActions>
        </Card>
}

export default function SearchPlayers(){
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
                {
                    result && result.map(e =>
                        <Grid size={{xl: 3, lg: 4, md: 6, s: 6, xs: 12}} key={e.id}>
                            <Paper><PlayerCard player={e} /></Paper>
                        </Grid>
                    )
                }

            </Grid>
        </div>
    </>
}