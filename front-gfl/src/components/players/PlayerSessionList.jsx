import { useContext, useEffect, useState } from "react";
import {fetchServerUrl, simpleRandom} from "../../utils/generalUtils.jsx";
import {useNavigate, useParams} from "react-router";
import PlayerContext from "./PlayerContext.jsx";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Pagination,
    Chip,
    Stack,
    Button,
    IconButton,
    Skeleton
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function SessionSkeleton() {
    return (
        <Card>
            <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                        <Skeleton variant="text" width={simpleRandom(90, 105)} height={23} />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: { xs: 'none', sm: 'block' }
                            }}
                        >
                            →
                        </Typography>
                        <Skeleton variant="text" width={simpleRandom(90, 105)} height={23} />
                    </Box>
                    <Skeleton variant="rounded" sx={{borderRadius: '10rem'}} width={simpleRandom(35, 75)} height={24} />
                </Box>
            </CardContent>
        </Card>
    );
}

function SessionRow({ session }) {
    const { server_id }  = useParams();
    const { playerId } = useContext(PlayerContext);
    const navigate = useNavigate();
    const calculateDuration = (startedAt, endedAt) => {
        if (!endedAt) return 'Ongoing';
        const start = dayjs(startedAt);
        const end = dayjs(endedAt);
        const duration = end.diff(start, 'minute');
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const isOngoing = (endedAt) => !endedAt;

    return (
        <Card
            sx={{
                '&:hover': {
                    bgcolor: 'action.hover',
                    cursor: 'pointer'
                }
            }}
            onClick={() => navigate(`/${server_id}/players/${playerId}/sessions/${session.id}`)}
        >
            <CardContent sx={{ p: { xs: 1, sm: 2 } }} >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        >
                            {dayjs(session.started_at).format('MMM DD, h:mm a')}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                display: { xs: 'none', sm: 'block' }
                            }}
                        >
                            →
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        >
                            {isOngoing(session.ended_at)
                                ? 'Ongoing': dayjs(session.ended_at).format('MMM DD, h:mm a')
                            }
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                        <Chip
                            label={calculateDuration(session.started_at, session.ended_at)}
                            size="small"
                            color={isOngoing(session.ended_at) ? 'primary' : 'success'}
                            sx={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem'
                            }}
                        />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function PlayerSessionList() {
    const { server_id } = useParams();
    const { playerId } = useContext(PlayerContext);
    const [loading, setLoading] = useState(true);
    const [sessionList, setSessionList] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        if (!playerId) return;

        setLoading(true);
        const abort = new AbortController();

        const params = { page };

        if (selectedDate) {
            params.datetime = formatDateForAPI(selectedDate);
        }

        fetchServerUrl(server_id, `/players/${playerId}/sessions`, {
            params,
            signal: abort.signal
        })
            .then((data) => {
                setSessionList(data.rows);
                setTotalPages(data.total_pages);
                setLoading(false);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch sessions:', error);
                    setLoading(false);
                }
            });

        return () => {
            abort.abort();
        };
    }, [server_id, playerId, page, selectedDate]);

    const handlePageChange = (event, newPage) => {
        setPage(newPage - 1);
    };

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        setPage(0);
    };

    const handlePreviousDay = () => {
        if (selectedDate) {
            setSelectedDate(selectedDate.subtract(1, 'day'));
            setPage(0);
        }
    };

    const handleNextDay = () => {
        if (selectedDate) {
            setSelectedDate(selectedDate.add(1, 'day'));
            setPage(0);
        }
    };

    const formatDateForAPI = (date) => {
        if (!date) return null;
        return date.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: '600' }}>
                    Play Sessions
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {selectedDate && (
                        <IconButton
                            size="small"
                            onClick={handlePreviousDay}
                            color="inherit"
                        >
                            <ChevronLeft />
                        </IconButton>
                    )}
                    <DatePicker
                        label="Filter by date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        slotProps={{
                            textField: {
                                size: 'small',
                                sx: {
                                    minWidth: { xs: '140px', sm: '200px' }
                                }
                            },
                            actionBar: {
                                actions: ['clear']
                            }
                        }}
                    />
                    {selectedDate && (
                        <IconButton
                            size="small"
                            onClick={handleNextDay}
                            color="inherit"
                        >
                            <ChevronRight />
                        </IconButton>
                    )}
                    {selectedDate && (
                        <Button
                            size="small"
                            onClick={() => setSelectedDate(null)}
                            color="inherit"
                            sx={{
                                minWidth: 'auto',
                                px: 1
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </Box>
            </Box>

            <Box sx={{
                maxHeight: { sm: '400px', xs: '100%' },
                overflowY: { sm: 'auto' },
                mb: 3,
                pr: { sm: 1 }
            }}>
                <Stack spacing={1}>
                    {loading ? (
                        Array.from({ length: 10 }).map((_, index) => (
                            <SessionSkeleton key={index} />
                        ))
                    ) : (
                        sessionList.map((session) => (
                            <SessionRow key={session.id} session={session} />
                        ))
                    )}
                </Stack>
            </Box>

            {sessionList.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                        No sessions found for the selected criteria.
                    </Typography>
                </Box>
            )}

            {totalPages > 1 && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 3,
                    px: { xs: 1, sm: 0 }
                }}>
                    <Pagination
                        count={totalPages}
                        page={page + 1}
                        onChange={handlePageChange}
                        color="primary"
                        size={window.innerWidth < 600 ? 'small' : 'medium'}
                    />
                </Box>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Box>
    );
}