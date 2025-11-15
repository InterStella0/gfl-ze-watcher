import {getServerSlug} from "../../util";
import {fetchServerUrl} from "utils/generalUtils";
import dayjs from "dayjs";
import {DetailedPlayer, DetailedPlayerInfo, PlayerSession} from "types/players";
import {Box, Grid2 as Grid, Typography} from "@mui/material";
import PlayerCardDetail from "components/players/PlayerCardDetail";
import PlayerSessionList from "components/players/PlayerSessionList";
import PlayerTopMap from "components/players/PlayerTopMap";
import PlayerRegionPlayTime from "components/players/PlayerRegionPlayTime";
import PlayerInfractionRecord from "components/players/PlayerInfractionRecord";
import PlayerHourOfDay from "components/players/PlayerHourOfDay";
import {getPlayerDetailed, PlayerInfo} from "./util";

export default async function Page({ params }){
    const { server_slug, player_id } = await params;
    const server = await getServerSlug(server_slug);
    try{
        const player: PlayerInfo = await getPlayerDetailed(server.id, player_id);
        return <div style={{margin: '1rem'}}>
            <Grid container spacing={2}>
                <Grid size={{xl: 8, sm: 12}}>
                    <PlayerCardDetail server={server} player={player} />
                </Grid>
                <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <PlayerSessionList  server={server} player={player} />
                </Grid>
                <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}} >
                    <PlayerTopMap server={server} player={player}  />
                </Grid>
                <Grid size={{xl: 4, lg: 4, md: 12, sm:12, xs: 12}} >
                    <PlayerRegionPlayTime server={server} player={player} />
                </Grid>
                <Grid size={{xl: 4, lg: 8, md: 12, sm: 12, xs: 12}}>
                    <PlayerInfractionRecord server={server} player={player}  />
                </Grid>
                <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}}>
                    <PlayerHourOfDay server={server} player={player}  />
                </Grid>
            </Grid>
        </div>
    }catch(error){
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
        else if (error.code === 202)
            return <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h1" color="secondary" fontWeight={900}>
                    Calculating...
                </Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                    Please be nice~
                </Typography>
                <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                    <Typography component="p" color="primary">
                        Sorry, this player's information is still being calculated. Please come back later~
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
}