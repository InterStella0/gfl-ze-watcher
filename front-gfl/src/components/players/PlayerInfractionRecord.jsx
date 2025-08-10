import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import {
    fetchServerUrl,
    formatFlagName,
    ICE_FILE_ENDPOINT,
    InfractionFlags,
    InfractionInt
} from "../../utils/generalUtils.jsx";
import {
    Alert,
    Avatar, Card, CardContent, Chip, CircularProgress,
    Dialog,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow, Tooltip, useMediaQuery, useTheme
} from "@mui/material";
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import Typography from "@mui/material/Typography";
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import {useParams} from "react-router";
function ModalInfraction({ infraction, onClose }){
    return <>
        <Dialog onClose={onClose} open={infraction !== null} fullWidth fullScreen>
            {infraction !== null && <>
                <Alert severity="info">I'm showing you infraction from {infraction.source?.replace("https://", "")} because I got lazy half way.</Alert>
                <Box width="100%" height="100%" position="relative">
                    <IconButton sx={{position: 'absolute', top: 0, right: 0, m: '1.1rem'}} onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                    <iframe width="100%" height="100%" src={`${infraction.source}/infractions/${infraction?.id}/`}/>
                </Box>
            </>}
        </Dialog>
    </>
}


function PlayerInfractionRecordBody({ updatedData }) {
    const { playerId } = useContext(PlayerContext);
    const {server_id} = useParams()
    const [infractions, setInfractions] = useState([]);
    const [viewInfraction, setViewInfraction] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        fetchServerUrl(server_id, `/players/${playerId}/infractions`)
            .then(infras => infras.map(e => {
                e.flags = new InfractionInt(e.flags);
                return e;
            }))
            .then(e => setInfractions(e));
    }, [server_id, playerId]);

    useEffect(() => {
        if (updatedData === null) return;
        setInfractions(updatedData);
    }, [updatedData]);

    const handleOnClick = (row) => {
        setViewInfraction(row);
    };

    if (infractions.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '250px',
                    color: 'text.secondary',
                    flexDirection: 'column',
                    gap: 1
                }}
            >
                <BlockIcon sx={{ fontSize: '2rem', opacity: 0.5 }} />
                <Typography variant="h6" component="h3">
                    No Records
                </Typography>
            </Box>
        );
    }

    if (isMobile) {
        return (
            <>
                <ModalInfraction infraction={viewInfraction} onClose={() => setViewInfraction(null)} />

                <Box sx={{ maxHeight: "320px", overflowY: "auto", pt: 1 }}>
                    {infractions.map(row => {
                        const flag = row.flags;
                        const by = flag.hasFlag(InfractionFlags.SYSTEM) ? 'System' : row.by;
                        const restrictions = row.flags.getAllRestrictedFlags().map(formatFlagName).join(', ');

                        return (
                            <Card
                                key={row.id}
                                sx={{
                                    mb: 1.5,
                                    cursor: 'pointer',
                                    backgroundColor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)'
                                    }
                                }}
                                onClick={() => handleOnClick(row)}
                                variant="outlined"
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                        <Avatar
                                            src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)}
                                            title={`${row.by}'s Avatar`}
                                            alt={row.by}
                                            sx={{ width: 36, height: 36, mr: 1.5 }}
                                        />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {by}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {dayjs(row.infraction_time).format('lll')}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        {row.reason || 'No reason provided'}
                                    </Typography>

                                    {restrictions && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {row.flags.getAllRestrictedFlags().map(flag => (
                                                <Chip
                                                    key={flag}
                                                    label={formatFlagName(flag)}
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                    sx={{
                                                        fontSize: '0.7rem',
                                                        height: 24
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            </>
        );
    }

    return (
        <>
            <ModalInfraction infraction={viewInfraction} onClose={() => setViewInfraction(null)} />

            <TableContainer
                sx={{
                    maxHeight: "380px",
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '& .MuiTableCell-root': {
                        py: 1.5,
                        px: 2
                    }
                }}
            >
                <Table aria-label="infractions table" size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                            <TableCell width="20%" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Admin</TableCell>
                            <TableCell width="35%" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Reason</TableCell>
                            <TableCell width="25%" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Restriction</TableCell>
                            <TableCell width="20%" align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Occurred At</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {infractions.map(row => {
                            const flag = row.flags;
                            const by = flag.hasFlag(InfractionFlags.SYSTEM) ? 'System' : row.by;
                            const restrictions = row.flags.getAllRestrictedFlags();

                            return (
                                <TableRow
                                    hover
                                    key={row.id}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': {
                                            backgroundColor: theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.05)'
                                                : 'rgba(0, 0, 0, 0.04)'
                                        }
                                    }}
                                    onClick={() => handleOnClick(row)}
                                >
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar
                                                src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)}
                                                title={`${row.by}'s Avatar`}
                                                alt={row.by}
                                                sx={{ width: 32, height: 32 }}
                                            />
                                            <Typography variant="body2" fontWeight={500}>
                                                {by}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {row.reason || (
                                                <Typography component="span" variant="body2" color="text.secondary" fontStyle="italic">
                                                    No reason provided
                                                </Typography>
                                            )}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {restrictions.length > 0 ? restrictions.map(flag => (
                                                <Chip
                                                    key={flag}
                                                    label={formatFlagName(flag)}
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                    sx={{
                                                        fontSize: '0.7rem',
                                                        height: 24
                                                    }}
                                                />
                                            )) : (
                                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                    None
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="text.secondary">
                                            {dayjs(row.infraction_time).format('lll')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
}

function PlayerInfractionRecordDisplay() {
    const { playerId } = useContext(PlayerContext);
    const [updatedData, setUpdatedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();
    const {server_id} = useParams()
    const updateData = () => {
        setLoading(true);
        fetchServerUrl(server_id, `/players/${playerId}/infraction_update`)
            .then(resp => {
                const infractions = resp.infractions.map(e => {
                    e.flags = new InfractionInt(e.flags);
                    return e;
                });
                infractions.sort((a, b) => dayjs(b.infraction_time).diff(dayjs(a.infraction_time)));
                setUpdatedData(infractions);
            })
            .finally(() => setLoading(false));
    };

    return (
        <Paper
            sx={{
                minHeight: '460px',
                p: 2,
                backgroundColor: 'background.paper',
                borderRadius: 1
            }}
            elevation={0}
        >
            <Box
                display="flex"
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography
                    variant="h6"
                    component="h2"
                    fontWeight="600"
                    sx={{ color: 'text.primary' }}
                >
                    Infractions
                </Typography>

                <Tooltip title="Update infractions">
                    <span> {/* Wrapper to make tooltip work with disabled button */}
                        <IconButton
                            onClick={updateData}
                            disabled={loading}
                            size="small"
                            sx={{
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                '&:hover': {
                                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <RefreshIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <PlayerInfractionRecordBody updatedData={updatedData} />
        </Paper>
    );
}
export default function PlayerInfractionRecord(){
    return  <ErrorCatch message="Infraction couldn't be loaded">
        <PlayerInfractionRecordDisplay />
    </ErrorCatch>
}
