import { Typography, Box, IconButton, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { formatTime } from 'utils/sessionUtils.js';
import dayjs from "dayjs";
import {SessionInfo} from "../../app/servers/[server_slug]/util";
import {Server} from "types/community";
import Link from "components/ui/Link.tsx";
import Image from "next/image";

export default function MapSessionHeader({ sessionInfo, server, mapImage }
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
                    {mapImage && <Image
                        src={mapImage}
                        alt={sessionInfo.map}
                        height={80}
                        width={100}
                        style={{ borderRadius: '1rem' }}
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
                    suppressHydrationWarning
                    label={`${sessionInfo ? dayjs(sessionInfo.started_at).format("YYYY-MM-DD") : ''} • ${sessionInfo ? formatTime(sessionInfo.started_at) : ''}-${ended}`}
                    color="secondary"
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};