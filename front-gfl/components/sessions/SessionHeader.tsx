import { Typography, Box, IconButton, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PlayerAvatar } from "../players/PlayerAvatar";
import { formatTime } from 'utils/sessionUtils.js';
import {Server} from "types/community";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/util";
import {PlayerSession} from "types/players";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(LocalizedFormat)

export const SessionHeader = (
    { server, player, sessionInfo }
    : { server: Server; player: PlayerInfo; sessionInfo: PlayerSession }

) => {

    return (
        <Box display="flex" alignItems="center" flexDirection={{xs: 'column', sm: 'row'}} mb={3}>
            <Box display="flex" alignItems="center">
                <IconButton
                    color="primary"
                    href={`/servers/${server.gotoLink}/players/${player.id}/`}
                    sx={{ mr: 2 }}
                >
                    <ArrowBack />
                </IconButton>

                <Box display="flex" alignItems="center" mr={2} mb={1}>
                    <PlayerAvatar uuid={player.id} name={player.name} />
                    <Box ml={2}>
                        <Typography variant="h4" component="h1" fontSize={{xs: "medium", sm: 'large'}}>
                            {player.id}&#39;s Session
                        </Typography>
                        <Typography component="p" fontSize={{xs: "small", sm: 'medium'}}>{sessionInfo.id}</Typography>
                    </Box>
                </Box>
            </Box>

            <Box ml="auto">
                <Chip
                    label={`${dayjs(sessionInfo.started_at).format('L LT')} • ${formatTime(sessionInfo.started_at)}-${sessionInfo.ended_at? formatTime(sessionInfo.ended_at): 'now'}`}
                    color="secondary"
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};