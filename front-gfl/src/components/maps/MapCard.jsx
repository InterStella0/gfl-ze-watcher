import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useEffect, useState} from "react";
import {getMapImage, simpleRandom} from "../../utils.jsx";
import dayjs from "dayjs";
import Paper from "@mui/material/Paper";
import {Box, CircularProgress, Skeleton, Typography} from "@mui/material";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";

export default function MapCard({ detail, onClick }){
    return <ErrorCatch message="Failed to display this map.">
        <MapCardDisplay detail={detail} onClick={onClick} />
    </ErrorCatch>
}
function MapCardDisplay({ detail, onClick }){
    const [image, setImage] = useState()
    useEffect(() => {
        getMapImage(detail.map).then(e => setImage(e.small))
    }, [detail])
    const startedAt = dayjs(detail.started_at)
    const endedAt = detail.ended_at != null? dayjs(detail.ended_at): dayjs()
    const duration = endedAt.diff(startedAt, 'minutes')

    const handleOnClick = () => {
        onClick(detail)
    }

    return <Paper
        key={detail.time_id}
        onClick={handleOnClick}
        sx={{
            flex: '0 0 auto',
            width: 180,
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
            },
        }}

    >
        <Box sx={{ position: 'relative', width: '100%', height: 100 }}>
            {(image === undefined || image === null) && <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                {image === undefined && <CircularProgress/>}
                {image === null && <ImageNotSupportedIcon />}
            </div>}
            {image !== undefined && <Box
                component="img"
                src={image}
                alt={detail.map}
                sx={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    display: 'block',
                }}
            />}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    p: 1,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        fontSize: '0.7rem',
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        px: '6px',
                        py: '2px',
                        m: '.5rem',
                        bottom: 0,
                        right: 0,
                        borderRadius: '4px',
                    }}
                >
                    {duration}m
                </Typography>
            </Box>
        </Box>

        <Box sx={{ p: 1.25 }}>
            <Typography
                variant="subtitle2"
                sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    mb: 0.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {detail.map}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start'}}>
                    <Typography sx={{ color: '#888' }} variant="subtitle2"><small>{startedAt.format('L LT')}</small></Typography>
                </Box>
            </Box>
        </Box>
    </Paper>
}
