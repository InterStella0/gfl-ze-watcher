import { Grid2 as Grid } from "@mui/material"
import { useEffect, useState } from "react"
import { fetchUrl } from '../utils'
import { useParams } from "react-router"
import PlayerContext from "../components/players/PlayerContext.jsx";
import PlayerCardDetail from "../components/players/PlayerCardDetail.jsx";
import PlayerInfractionRecord from "../components/players/PlayerInfractionRecord.jsx";
import PlayerRegionPlayTime from "../components/players/PlayerRegionPlayTime.jsx";
import PlayerTopMap from "../components/players/PlayerTopMap.jsx";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
// TODO: Handle Player not found error
//  - Time of Day Activity
//  - Session Overlap (Frequently see other players)
//  - Leaves map on (Player Churn Prediction)


function Player(){
    let { player_id } = useParams()
    const [ playerData, setPlayerData ] = useState(null)
    useEffect(() => {
        fetchUrl(`/players/${player_id}/detail`)
        .then(resp => setPlayerData(resp))
    }, [player_id])
    return <>
        <PlayerContext.Provider value={{data: playerData, playerId: player_id}}>
            <div style={{margin: '1rem'}}>
                <Grid container spacing={2}>
                    <Grid size={{xl: 8, sm: 12}}>
                        <PlayerCardDetail />
                    </Grid>
                    <Grid size={{xl: 4, lg: 4, md: 6, sm: 12, xs: 12}}>
                        <PlayerInfractionRecord />
                    </Grid>
                    <Grid size={{xl: 4, lg: 4, md: 6, sm:6, xs: 12}} >
                        <PlayerRegionPlayTime />
                    </Grid>
                    <Grid size={{xl: 8, lg: 4, md: 12, sm: 6, xs: 12}} >
                        <PlayerTopMap />
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