import {getServerSlug} from "../../util";
import {addOrdinalSuffix, DOMAIN, fetchServerUrl, formatHours, formatTitle} from "utils/generalUtils";
import {Box, Grid2 as Grid, Typography} from "@mui/material";
import PlayerCardDetail from "components/players/PlayerCardDetail";
import PlayerSessionList from "components/players/PlayerSessionList";
import PlayerTopMap from "components/players/PlayerTopMap";
import PlayerRegionPlayTime from "components/players/PlayerRegionPlayTime";
import PlayerInfractionRecord from "components/players/PlayerInfractionRecord";
import PlayerHourOfDay from "components/players/PlayerHourOfDay";
import {getPlayerDetailed, PlayerInfo} from "./util";
import {notFound} from "next/navigation";
import {Metadata} from "next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {PlayerMostPlayedMap, PlayerProfilePicture, PlayerRegionTime, PlayerSessionPage} from "types/players.ts";

dayjs.extend(relativeTime);
export async function generateMetadata({ params}: {
    params: { server_slug: string, player_id: string }
}): Promise<Metadata> {
    const { server_slug, player_id } = await params;
    const server = await getServerSlug(server_slug);
    let player: PlayerInfo | null = null
    try{
        player = await getPlayerDetailed(server.id, player_id)
    }catch(error){
        if (error.code === 202){
            return {
                title: formatTitle(player_id),
                description: "The player is still being calculated. Please come back later~",
            }
        }else if (error.code === 404){
            return {
                title: "ZE Graph",
                description: `View player activities on ${server.community.name}`
            };
        }else{
            return {}
        }
    }
    let description = `They have ${formatHours(player.total_playtime)}`
    try{
        const pages: PlayerSessionPage = await fetchServerUrl(
            server.id, `/players/${player.id}/sessions`, { params: { page: 1 } }
        )
        const totalRows = pages.rows.length * pages.total_pages
        description += `, about ${totalRows} sessions,`
    }catch (error){

    }
    if (player.ranks){
        description += ` and ${addOrdinalSuffix(player.ranks.server_playtime)}`
    }
    description += ` on ${server.community.name}.`
    if (player.category){
        let typePlayer = `A ${player.category} player type with `
        if (player.category === "mixed"){
            const higherType =  player.casual_playtime > player.tryhard_playtime? "casual": "tryhard"
            typePlayer += `${formatHours(player[`${higherType}_playtime`])} of ${higherType} time.`
        }else{
            typePlayer += `${formatHours(player[`${player.category}_playtime`])} of ${player.category} time.`
        }
        description += ` ${typePlayer}`;
    }
    if (player.online_since){
        description += ` Currently online in the server since ${dayjs(player.online_since).fromNow()}.`;
    }else{
        description += ` Last online in the server since ${dayjs(player.last_played).fromNow()}.`;
    }
    let image = ""
    try{
        const pfp: PlayerProfilePicture | null = await fetchServerUrl(server.id, `/players/${player.id}/pfp`)
        image = pfp.full
    }catch(error){

    }

    try{
        const mostPlayed: PlayerMostPlayedMap[] = await fetchServerUrl(server.id, `/players/${player.id}/most_played_maps`)
        if (mostPlayed) {
            const fav = mostPlayed[0]
            description += ` Likes ${fav.map} with a playtime of ${formatHours(fav.duration)}.`
        }
    }catch(error){

    }
    try{
        const regions: PlayerRegionTime[] = await fetchServerUrl(server.id, `/players/${player.id}/regions`)
        if (regions) {
            regions.sort((a, b) => b.duration - a.duration);
            const region = regions[0]
            description += ` Mainly plays during ${region.name} time.`
        }
    }catch (error){

    }
    const title = formatTitle(`${player.name} on ${server.community.name}`)
    return {
        title: title,
        description: description,
        openGraph: {
            type: "website",
            title,
            description,
            images: [image],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
        alternates: {
            canonical: '/',
            types: {
                "application/json+oembed": `/api/oembed?url=${DOMAIN}/api/${server.id}/players/${player.id}`,
            },
        },
    }
}

export default async function Page({ params }){
    const { server_slug, player_id } = await params;
    const server = await getServerSlug(server_slug);
    if (!server)
        notFound()
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
            notFound()
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