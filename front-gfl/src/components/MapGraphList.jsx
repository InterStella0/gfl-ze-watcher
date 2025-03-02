import {useEffect, useRef, useState} from 'react';
import {Box, Typography, Pagination, Skeleton, CircularProgress} from '@mui/material';
import {fetchUrl, getMapImage, SERVER_WATCH, simpleRandom} from "../utils.jsx";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat"
import Paper from "@mui/material/Paper";
import ErrorCatch from "./ErrorMessage.jsx";
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
dayjs.extend(LocalizedFormat)

export default function MapGraphList({ onDateChange }) {
    const [ page, setPage ] = useState(0)
    const [ mapData, setMapData ] = useState(null)
    const [ loading, setLoading ] = useState(false)
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current

        if (!container) return

        const handleWheel = (event) => {
            event.preventDefault();
            container.scrollLeft += event.deltaY
        }

        container.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            container.removeEventListener("wheel", handleWheel);
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        fetchUrl(`/servers/${SERVER_WATCH}/maps`, { params: { page }})
            .then(resp => {
                setTimeout(() => {
                    setMapData(resp)
                    setLoading(false)
                }, 2000)
            })
        const container = containerRef.current
        if (!container) return
        container.scrollLeft = 0

    }, [page]);

    const handleMapClick = (detail) => {
        onDateChange(dayjs(detail.started_at), detail.ended_at != null? dayjs(detail.ended_at): dayjs())
    }

    return <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '8px 16px' }}>
            <Typography
                variant="subtitle2"
                sx={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
                Sessions
            </Typography>
            <Pagination
                count={Math.ceil((mapData?.total_sessions ?? 0) / 10)}
                variant="outlined"
                color="primary"
                siblingCount={0}
                page={page + 1}
                onChange={(_, e) => setPage(e - 1)} />
        </Box>
        <Box
            sx={{
                display: 'flex',
                overflowX: 'auto',
                gap: '12px',
                p: '1rem',
            }}
            ref={containerRef}
        >   {loading && Array.from({length: 10}).map((_, i) => <MapCardSkeleton key={i} />)}
            {!loading && mapData && mapData.maps.map((mapDetail) =>
                <MapCard key={mapDetail.time_id} detail={mapDetail} onClick={handleMapClick} />
            )}
        </Box>
    </>
}
function MapCard({ detail, onClick }){
    return <ErrorCatch message="Failed to display this map.">
        <MapCardDisplay detail={detail} onClick={onClick} />
    </ErrorCatch>
}
function MapCardDisplay({ detail, onClick }){
    const [image, setImage] = useState()
    useEffect(() => {
        getMapImage(detail.map).then(setImage)
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
function MapCardSkeleton() {
    return (
        <Paper
            sx={{
                flex: "0 0 auto",
                width: 180,
                borderRadius: "8px",
                overflow: "hidden",
                transition: "all 0.2s ease",
                position: "relative",
            }}
        >
            <Box sx={{ position: "relative", width: "100%", height: 100 }}>
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                        p: 1,
                    }}
                >
                    <Skeleton variant="text" width={40} height={20} sx={{
                        position: "absolute",
                        bottom: 0, right: 0,
                        borderRadius: "4px",
                        m: '.5rem' }} />
                </Box>
            </Box>

            <Box sx={{ p: 1.25 }}>
                <Skeleton variant="text" width={simpleRandom(70, 120)} height="1.4rem" />
                <Skeleton variant="text" width="60%" height='1.2rem' sx={{ mt: 0.5, mb: '.2rem' }} />
            </Box>
        </Paper>
    );
}
