import { Typography, Box, IconButton, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { formatTime } from 'utils/sessionUtils.js';
import dayjs from "dayjs";
import {SessionInfo} from "../../app/servers/[server_slug]/util";
import {Server} from "types/community";
import Link from "components/ui/Link.tsx";

export default async function MapSessionHeader({ sessionInfo, server, mapImage }
    : { sessionInfo: SessionInfo<"map">, mapImage: string | null, server: Server }
){
    const ended = sessionInfo? sessionInfo.ended_at ? formatTime(sessionInfo.ended_at): ' ongoing' : ''

    return (
        <Box display="flex" alignItems="center" flexDirection={{xs: 'column', sm: 'row'}} mb={3}>
            <Box display="flex" alignItems="center">
                <IconButton
                    href={`/servers/${server.gotoLink}/maps/${sessionInfo.map}/`}
                    color="primary"
                    component={Link}
                    sx={{ mr: 2 }}
                >
                    <ArrowBack />
                </IconButton>

                <Box display="flex" alignItems="center" mr={2} mb={1}>
                    {mapImage && <Box
                        component="img"
                        src={mapImage}
                        alt={sessionInfo.map}
                        sx={{
                            height: { sm: '60px', xs: '60px', md: '100px' },
                            borderRadius: '1rem'
                        }}
                    />}
                    <Box ml={2}>
                        <Typography variant="h4" component="h1" fontSize={{xs: "small", sm: 'medium'}}    sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: '150px', sm: '300px' }
                        }}>
                            {sessionInfo.map}
                        </Typography>
                        <Typography component="p" fontSize={{xs: "small", sm: 'medium'}}>{sessionInfo.time_id}</Typography>
                    </Box>
                </Box>
            </Box>

            <Box ml={{sm: "auto"}}>
                <Chip
                    label={`${sessionInfo ? dayjs(sessionInfo.started_at).format("YYYY-MM-DD") : ''} • ${sessionInfo ? formatTime(sessionInfo.started_at) : ''}-${ended}`}
                    color="secondary"
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};