import {useNavigate, useParams} from 'react-router';
import { Typography, Box, IconButton, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { formatTime } from '../../utils/sessionUtils.js';
import {useEffect, useState} from "react";
import { getMapImage} from "../../utils/generalUtils.jsx";
import dayjs from "dayjs";

export const MapSessionHeader = ({ sessionInfo }) => {
    const { server_id, map_name, session_id } = useParams();
    const [ mapImage, setMapImage ] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        getMapImage(server_id, map_name).then(e => setMapImage(e? e.small: null))
    }, [server_id, map_name])

    return (
        <Box display="flex" alignItems="center" flexDirection={{xs: 'column', sm: 'row'}} mb={3}>
            <Box display="flex" alignItems="center">
                <IconButton
                    color="primary"
                    onClick={() => navigate(`/${server_id}/maps/${map_name}/`)}
                    sx={{ mr: 2 }}
                >
                    <ArrowBack />
                </IconButton>

                <Box display="flex" alignItems="center" mr={2} mb={1}>
                    {mapImage && <Box
                        component="img"
                        src={mapImage}
                        alt={map_name}
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
                            {map_name}
                        </Typography>
                        <Typography component="p" fontSize={{xs: "small", sm: 'medium'}}>{session_id}</Typography>
                    </Box>
                </Box>
            </Box>

            <Box ml={{sm: "auto"}}>
                <Chip
                    label={`${sessionInfo ? dayjs(sessionInfo.started_at).format("YYYY-MM-DD") : ''} • ${sessionInfo ? formatTime(sessionInfo.started_at) : ''}-${sessionInfo ? formatTime(sessionInfo.ended_at) : ''}`}
                    color="secondary"
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};