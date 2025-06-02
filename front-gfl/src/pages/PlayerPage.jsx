import {Box, Grid2 as Grid, Typography} from "@mui/material"
import { useEffect, useState } from "react"
import {fetchServerUrl, formatTitle, secondsToHours} from '../utils'
import { useParams } from "react-router"
import PlayerContext from "../components/players/PlayerContext.jsx";
import PlayerCardDetail from "../components/players/PlayerCardDetail.jsx";
import PlayerInfractionRecord from "../components/players/PlayerInfractionRecord.jsx";
import PlayerRegionPlayTime from "../components/players/PlayerRegionPlayTime.jsx";
import PlayerTopMap from "../components/players/PlayerTopMap.jsx";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
import {Helmet} from "@dr.pogodin/react-helmet";
import dayjs from "dayjs";
import PlayerMightFriends from "../components/players/PlayerMightFriends.jsx";
import PlayerHourOfDay from "../components/players/PlayerHourOfDay.jsx";
// TODO: Handle Player not found error
//  - Time of Day Activity


function Player(){
    let { player_id, server_id } = useParams()
    const [ playerData, setPlayerData ] = useState(null)
    const [ error, setError ] = useState(null)
    useEffect(() => {
        fetchServerUrl(server_id, `/players/${player_id}/detail`)
            .then(resp => setPlayerData(resp))
            .then(() => fetchServerUrl(server_id, `/players/${player_id}/playing`))
            .then(data => {
                setPlayerData(value => {
                    if (!value) return value

                    let prop = {...value}
                    prop.last_played = data.started_at
                    prop.last_played_ended = data.ended_at
                    return prop
                })
            })
            .catch(e => setError(e))
    }, [server_id, player_id])
    if (error){
        if (error.code === 404)
            return <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h1" color="secondary" fontWeight={900}>
                    404
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                    Player Not Found
                </Typography>
                <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                    <Typography component="p" color="primary">
                        The player you're trying to look for does not exist!
                    </Typography>
                </Box>
            </Box>
        else
            return <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h1" color="secondary" fontWeight={900}>
                    {error.code}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                    Something went wrong :/
                </Typography>
                <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                    <Typography component="p" color="primary">
                        Something went wrong trying to load this player.
                    </Typography>
                </Box>
            </Box>
    }
    return <>
        <Helmet prioritizeSeoTags key={playerData? `${playerData?.id}-fetch`: player_id} defer={false}>
            <title>{formatTitle(playerData?.name ?? player_id ?? 'Player')}</title>
            <link rel="canonical" href={`${window.location.origin}/players/${player_id}`} />
            <meta name="description" content={`Information for ${playerData?.name ?? "player"}'s activity in the server.`} />
            <meta property="og:title" content={formatTitle(playerData?.name ?? player_id)}/>
            <meta name="og:description" content={`Information for ${playerData?.name ?? "player"}'s activity in the server.`} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={`${window.location.origin}/players/${player_id}`} />
            <meta property="og:image:width" content="150" />
            <meta property="og:image:height" content="150" />

            <meta name="twitter:card" content={
                `Information for ${playerData?.name ?? "player"}'s activity in the server. 
                ${playerData?.name ?? "player"} has a total playtime of ${secondsToHours(playerData?.total_playtime)}h. 
                ${playerData?.name ?? "player"} was on GFL ${dayjs(playerData?.last_played).fromNow()}
                `
            } />
            <meta name="twitter:title" content={formatTitle(playerData?.name ?? player_id)} />
            <meta name="twitter:description" content={`Information for ${playerData?.name ?? "player"}'s activity in the server.`} />
        </Helmet>
        <PlayerContext.Provider value={{data: playerData, playerId: player_id}}>
            <div style={{margin: '1rem'}}>
                <Grid container spacing={2}>
                    <Grid size={{xl: 8, sm: 12}}>
                        <PlayerCardDetail />
                    </Grid>
                    <Grid size={{xl: 4, lg: 8, md: 12, sm: 12, xs: 12}}>
                        <PlayerMightFriends />
                    </Grid>
                    <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}} >
                        <PlayerTopMap />
                    </Grid>
                    <Grid size={{xl: 4, lg: 4, md: 12, sm:12, xs: 12}} >
                        <PlayerRegionPlayTime />
                    </Grid>
                    <Grid size={{xl: 4, lg: 8, md: 12, sm: 12, xs: 12}}>
                        <PlayerInfractionRecord />
                    </Grid>
                    <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}}>
                        <PlayerHourOfDay />
                    </Grid>
                </Grid>
            </div>
        </PlayerContext.Provider>
    </>
}

export default function PlayerPage(){
    return <ErrorCatch message="Player Page is broken.">
        <Player />
    </ErrorCatch>
}