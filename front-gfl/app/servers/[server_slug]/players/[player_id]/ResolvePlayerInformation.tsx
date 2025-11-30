import {Grid2 as Grid} from "@mui/material";
import {ServerPlayerDetailed} from "./page.tsx";
import {use} from "react";
import {StillCalculate} from "utils/generalUtils.ts";
import PlayerCardDetail from "components/players/PlayerCardDetail.tsx";
import PlayerSessionList from "components/players/PlayerSessionList.tsx";
import PlayerTopMap from "components/players/PlayerTopMap.tsx";
import PlayerRegionPlayTime from "components/players/PlayerRegionPlayTime.tsx";
import PlayerInfractionRecord from "components/players/PlayerInfractionRecord.tsx";
import PlayerHourOfDay from "components/players/PlayerHourOfDay.tsx";
import StillCalculatingPlayer from "./StillCalculatingPlayer.tsx";

export default function ResolvePlayerInformation({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed> }) {
    const { server, player } = use(serverPlayerPromise)

    if (player === null || player === undefined || player instanceof StillCalculate || !player.id) {
        return <StillCalculatingPlayer />;
    }

    return <Grid container spacing={2}>
        <Grid size={{xl: 8, sm: 12}}>
            <PlayerCardDetail serverPlayerPromise={serverPlayerPromise} />
        </Grid>
        <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}}>
            <PlayerSessionList serverPlayerPromise={serverPlayerPromise} />
        </Grid>
        <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}} >
            <PlayerTopMap serverPlayerPromise={serverPlayerPromise}  />
        </Grid>
        <Grid size={{xl: 4, lg: 4, md: 12, sm:12, xs: 12}} >
            <PlayerRegionPlayTime serverPlayerPromise={serverPlayerPromise} />
        </Grid>
        <Grid size={{xl: 4, lg: 8, md: 12, sm: 12, xs: 12}}>
            <PlayerInfractionRecord serverPlayerPromise={serverPlayerPromise}  />
        </Grid>
        <Grid size={{xl: 8, lg: 12, md: 12, sm: 12, xs: 12}}>
            <PlayerHourOfDay serverPlayerPromise={serverPlayerPromise}  />
        </Grid>
    </Grid>
}