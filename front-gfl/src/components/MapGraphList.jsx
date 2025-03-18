import {useEffect, useRef, useState} from 'react';
import {Box, Typography, Pagination, Skeleton, CircularProgress} from '@mui/material';
import {fetchUrl, getMapImage, SERVER_WATCH, simpleRandom} from "../utils.jsx";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat"
import MapCard from "./MapCard.jsx";
import MapCardSkeleton from "./MapCardSkeleton.jsx";
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
        fetchUrl(`/servers/${SERVER_WATCH}/maps/all/sessions`, { params: { page }})
            .then(resp => {
                setMapData(resp)
                setLoading(false)
            })
        const container = containerRef.current
        if (!container) return
        container.scrollLeft = 0

    }, [page]);

    const handleMapClick = (detail) => {
        onDateChange(dayjs(detail.started_at), detail.ended_at != null? dayjs(detail.ended_at): dayjs())
    }

    return <>
        <Box sx={{ display: {sm: 'flex', xs: 'block'}, justifyContent: 'space-between', alignItems: 'center', p: '8px 16px' }}>
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
