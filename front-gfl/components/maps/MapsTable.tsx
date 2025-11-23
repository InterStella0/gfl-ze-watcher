'use client'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Card,
    CardMedia,
    Box,
    Typography,
    IconButton,
    TablePagination,
    Skeleton, useTheme
} from '@mui/material';
import { Star, StarBorder, Block, AccessTime } from '@mui/icons-material';
import dayjs from 'dayjs';
import {getMapImage, secondsToHours, simpleRandom} from "utils/generalUtils";
import {useEffect, useState} from "react";
import Link from "@mui/material/Link";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(duration);
dayjs.extend(relativeTime);

const MapsRowSkeleton = () => {
    const [isClient, setIsClient] = useState<boolean>(false)
    useEffect(() => {
        setIsClient(true)
    }, []);
    return <TableRow>
        <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="rectangular" width={80} height={45} />
                <Box>
                    <Skeleton variant="text" width={`${simpleRandom(80, 140, isClient)}px`} />
                    <Skeleton variant="text" width={`${simpleRandom(40, 80, isClient)}px`} />
                </Box>
            </Box>
        </TableCell>
        {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
                <Skeleton variant="text" width={`${simpleRandom(40, 60, isClient)}px`}/>
            </TableCell>
        ))}
    </TableRow>
}

export const getStatusChip = (map) => {
    if (!map.enabled) return (
        <Chip label="Disabled" color="error" size="small" icon={<Block />} variant="filled" />
    );
    if (map.pending_cooldown || map.cooldown) {
        const cooldown = dayjs(map.cooldown);
        if (cooldown.diff(dayjs(), "second") > 0)
            return <Chip label={cooldown.fromNow(true)} color="warning" size="small" icon={<AccessTime />} variant="filled" />;
    }
    if (!map.last_played_ended)
        return <Chip label="Playing" color="info" size="small" variant="filled" />;
    return <Chip label="Ready" color="success" size="small" variant="filled" />;
};

function MapRow({ server, map, favorites, toggleFavorite }) {
    const [ mapImage, setMapImage ] = useState(null);
    const server_id = server.id
    useEffect(() => {
        getMapImage(server_id, map.map).then(e => setMapImage(e? e.small: null))
    }, [server_id, map.map])

    return <TableRow
        sx={{
            '&:last-child td, &:last-child th': { border: 0 },
            opacity: !map.enabled ? 0.6 : 1,
        }}
    >
        <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Card sx={{ borderRadius: 1, overflow: 'hidden', width: 80, height: 45 }}>
                    {mapImage ? (
                        <CardMedia
                            component="img"
                            height="45"
                            image={mapImage}
                            alt={map.map}
                            sx={{ objectFit: 'cover' }}
                        />
                    ) : (
                        <Skeleton variant="rectangular" width={80} height={45} />
                    )}
                </Card>

                <Box>
                    <Typography
                        variant="body2" noWrap sx={{ fontWeight: 'medium', width: {md: '8rem', lg: '9rem', xl: '12rem'} }}
                        component={Link}
                        href={`/servers/${server.gotoLink}/maps/${map.map}/`}
                    >
                        {map.map}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {map.is_casual && (
                            <Chip label="CASUAL" size="small" color="success" variant="outlined" />
                        )}
                        {map.is_tryhard && (
                            <Chip label="TRYHARD" size="small" color="secondary" variant="outlined" />
                        )}
                    </Box>
                </Box>
            </Box>
        </TableCell>
        <TableCell>{getStatusChip(map)}</TableCell>
        <TableCell align="right">
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {secondsToHours(map.total_cum_time)}
            </Typography>
        </TableCell>
        <TableCell align="right">
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {secondsToHours(map.total_time)}
            </Typography>
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
            {map.unique_players.toLocaleString()}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
            {map.total_sessions}
        </TableCell>
        <TableCell align="center">
            <Typography variant="body2" color="text.secondary">
                {dayjs(map.last_played).fromNow()}
            </Typography>
        </TableCell>
        <TableCell align="center">
            <IconButton
                onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(map.map);
                }}
                color={favorites.has(map.map) ? 'primary' : 'default'}
                sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                        transform: 'scale(1.1)',
                        color: 'primary.main'
                    }
                }}
            >
                {favorites.has(map.map) ? <Star /> : <StarBorder />}
            </IconButton>
        </TableCell>
    </TableRow>
}

export default function MapsTable({
    mapsData,
    page,
    rowsPerPage,
    favorites,
    toggleFavorite,
    handleChangePage,
    handleChangeRowsPerPage,
    loading,
    server
}) {
    const theme = useTheme();
    return (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Map</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cumulative Hours</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Hours</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Players</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Last Played</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Favorite</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {!loading && mapsData?.maps?.map((map, index) => (
                        <MapRow server={server} key={index} map={map} toggleFavorite={toggleFavorite} favorites={favorites}/>
                    ))}
                    {loading && Array.from({ length: 25 }).map((_, i) =>
                        <MapsRowSkeleton key={i} />
                    )}
                </TableBody>
            </Table>
            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={mapsData?.total_maps}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Maps per page:"
            />
        </TableContainer>
    );
}