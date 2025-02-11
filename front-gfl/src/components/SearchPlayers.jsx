import SearchIcon from '@mui/icons-material/Search';
import DebouncedInput from "./DebounchedInput";
import { useEffect, useRef, useState } from 'react';
import { fetchUrl } from '../config';
import { Avatar, Button, Card, CardActions, CardContent, CardMedia, Chip, Typography } from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar';
import { Grid2 as Grid } from "@mui/material";
import Paper from '@mui/material/Paper';
import humanizeDuration from 'humanize-duration';

const CATEGORY_PLAYER = {
    'casual': 'success',
    'tryhard': 'danger',
    'mixed': 'primary'
}

export function PlayerCard({ player }){
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
                    {humanizeDuration(player.total_playtime * 1000, {maxDecimalPoints: 2})}
                </Typography>
                <div  style={{display: 'flex', alignContent: 'center', justifyContent: 'space-evenly', width: "100%"}}>
                    {player.category && player.category != 'unknown' && <Chip label={player.category} color={CATEGORY_PLAYER[player.category]} />}
                    <Chip label={player.favourite_map} />
                </div>
            </CardContent>
            <CardActions>
                <Button size="small">Show</Button>
            </CardActions>
        </Card>
}

export default function SearchPlayers(){
    const [search, setSearch ] = useState(null)
    const [ result, setResult ] = useState([])
    const [ matching, setMatching ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const [ page, setPage] = useState(0)
    useEffect(() => {
        if (search === null || search.trim() === "") return
        let search2 = search.trim()
        setLoading(true)
        const params = {player_name: search2, page}
        fetchUrl("/players/search", { params })
        .then(e => {
            setMatching(e.total_players)
            setResult(e.players)
        })
        .then(() => setLoading(false))
    }, [search, page])
    return <>
        <DebouncedInput
            // startDecorator={<SearchIcon />}
            color="neutral"
            size="lg"
            variant="soft"
            sx={{margin: '1rem'}}
            timeout={1000}
            onChangeValue={(value) => setSearch(value)}
            />
        
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            {
                result && result.map(e => 
                <Grid size={3} key={e.id}>
                    <Paper><PlayerCard player={e} /></Paper>
                </Grid>
            )
            }
            
        </Grid>
    </>
}