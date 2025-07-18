import {useEffect, useState} from "react";
import {fetchServerUrl, getMapImage, secondsToHours, simpleRandom} from "../../utils/generalUtils.jsx";
import dayjs from "dayjs";
import Paper from "@mui/material/Paper";
import {Box, CircularProgress, Grid2 as Grid, Skeleton, Tooltip, Typography, useTheme} from "@mui/material";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import CategoryChip from "../ui/CategoryChip.jsx";
import SessionPlayedGraph from "../graphs/SessionPlayedGraph.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useParams} from "react-router";
import AccessAlarmsIcon from '@mui/icons-material/AccessAlarms';
import SportsScoreIcon from '@mui/icons-material/SportsScore';

export default function LastPlayedMapCard({ detail, onClick }){
    return <ErrorCatch>
        <LastPlayedMapCardDisplay detail={detail} onClick={onClick} />
    </ErrorCatch>
}

export function LastPlayedMapCardSkeleton(){
    const titleWidth = simpleRandom(50, 180)
    return <Paper
        sx={{
            flex: '0 0 auto',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            position: 'relative',
        }}
    >
        <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', height: 100 }}>
            <Skeleton variant="rectangular" height={100} />

            <Box sx={{
                gap: '.3rem', display: 'flex', flexDirection: 'row',
                position: 'absolute',
                bottom: 0,
                top: 0,
                m: '.4rem'
            }}>
                <Skeleton variant="rounded" width={60} height={20} />
            </Box>
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
                <Skeleton
                    variant="text"
                    width={50}
                    sx={{
                        position: 'absolute',
                        fontSize: '1.3rem',
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        px: '6px',
                        py: '2px',
                        m: '.5rem',
                        bottom: 0,
                        right: 0,
                        borderRadius: '4px',
                    }}
                />
            </Box>
        </Box>
        <Grid container>
            <Grid size={{sm: 7, xs: 12}}>
                <Box sx={{ p: 1.25 }}>
                    <Skeleton
                        variant="text"
                        width={titleWidth}
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            mb: 0.5,
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start'}}>
                            <Skeleton variant="text" width={150} />
                            <Skeleton variant="text" width={70} />
                        </Box>
                    </Box>
                </Box>
            </Grid>
            <Grid size={{sm: 5, xs: 12}}>
                <div style={{
                    display: 'table',
                    width: '100%',
                    height: '100%',
                }}>
                    <div style={{
                        display: 'table-cell',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                    }} >
                        <Paper elevation={0} sx={{m: '.3rem', width: '90%'}}>
                            <Skeleton variant="rounded" width="100%" height={40} />
                        </Paper>
                    </div>
                </div>
            </Grid>
        </Grid>
    </Paper>

}

function LastPlayedMapCardDisplay({ detail, onClick }){
    const [image, setImage] = useState()
    const {server_id} = useParams()
    const [ matchData, setMatchData ] = useState(null)
    const isOnGoing = detail?.last_played_ended === null
    useEffect(() => {
        getMapImage(server_id, detail.map).then(e => setImage(e? e.medium: null))
    }, [server_id, detail])
    useEffect(() => {
        if (!detail?.last_session_id) return
        const sessionId = detail?.last_session_id
        fetchServerUrl(server_id, `/sessions/${sessionId}/match`)
            .then(setMatchData)
    }, [server_id, detail?.last_session_id]);
    const duration = secondsToHours(detail.total_time)
    let cooldownLeft = 0
    let cooldown = null
    if (detail.cooldown){
        cooldown = dayjs(detail.cooldown)
        cooldownLeft = cooldown.diff(dayjs(), 'second')
    }
    const handleOnClick = () => {
        onClick(detail)
    }

    return <Paper
        onClick={handleOnClick}
        sx={{
            flex: '0 0 auto',
            width: '100%',
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
        <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', height: 100 }}>
            {(image === undefined || image === null) && <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                {image === undefined && <CircularProgress/>}
                {image === null && <ImageNotSupportedIcon />}
            </div>}
            {image !== undefined && <img
                src={image}
                alt={detail.map}
                loading="lazy"
                style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    display: 'block',
                }}
            />}

            <Box sx={{
                gap: '.3rem', display: 'flex', flexDirection: 'row',
                position: 'absolute',
                bottom: 0,
                top: 0,
                m: '.4rem'
            }}>
                <Box>
                    {detail.is_tryhard && <CategoryChip size="small" category="tryhard" sx={{ m: '.2rem' }} />}
                    {detail.is_casual && <CategoryChip size="small" category="casual" sx={{ m: '.2rem' }} />}
                </Box>
            </Box>
            {matchData && <>
            <Tooltip title={<div style={{textAlign: 'center'}}>
                <p>Human Score : Zombie Score</p>
                <p>{isOnGoing? "Current match": "Last session score"}</p>
                <small>(Mostly accurate)</small>
            </div>}>
                <Box sx={{
                    gap: '.3rem',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    px: '6px',
                    py: '2px',
                    borderRadius: '4px',
                    m: '.4rem',
                    ...(isOnGoing && {
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.6 },
                            '100%': { opacity: 1 },
                        },
                    }),
                }}>
                    <SportsScoreIcon fontSize="small" />
                    <Typography fontSize="small">
                        {matchData?.human_score} : {matchData?.zombie_score}
                    </Typography>
                </Box>
                </Tooltip>
            </>}

            <Box sx={{
                gap: '.3rem', display: 'flex', flexDirection: 'row',
                alignItems: 'center',
                position: 'absolute',
                left: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                px: '6px',
                py: '2px',
                borderRadius: '4px',
                m: '.4rem'
            }}>
                {cooldownLeft > 0 && <Tooltip title={cooldown?.format('lll')}>
                    <Box display="flex" flexDirection="row"  sx={{ color: theme => theme.palette.warning.main }} gap=".3rem">
                    <AccessAlarmsIcon fontSize="small" />
                    <Typography variant="subtitle2" fontSize=".7rem"
                                display="flex"
                                pt=".1rem"
                                alignItems="center">
                        Cooldown ends in {cooldown?.fromNow(true)}
                    </Typography>
                </Box>

                </Tooltip>}
            </Box>
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
                    {duration}h
                </Typography>
            </Box>
        </Box>
        <Grid container>
            <Grid size={{sm: 7, xs: 12}}>
                <Box sx={{ p: 1.25 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            mb: 0.5,
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {detail.map}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start'}}>
                            {detail.last_played_ended !== null? <>
                                <Typography sx={{ color: '#888' }} variant="subtitle2">
                                    <small>Played {dayjs(detail.last_played).fromNow()} for {dayjs(detail.last_played_ended).diff(dayjs(detail.last_played), 'minutes')}m</small>
                                </Typography>
                            </>: <>

                            </>}
                            {isOnGoing && <>
                                <Typography sx={{ color: '#888' }} variant="subtitle2">
                                    <small>Currently playing {dayjs(detail.last_played).fromNow()}</small>
                                </Typography>
                            </>}
                            <Typography sx={{ color: '#888' }} variant="subtitle2">
                                <small>{detail.total_sessions} Sessions</small>
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Grid>
            <Grid size={{sm: 5, xs: 12}}>
                <div style={{

                    display: 'table',
                    width: '100%',
                    height: '100%',
                }}>
                    <div style={{

                        display: 'table-cell',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                    }} >
                        <Paper elevation={0} sx={{m: '.3rem', width: '90%'}}>
                            <Tooltip title={detail.last_played_ended !== null? 'Last Session Player Count': 'Current Player Count'}>
                                <div style={{paddingRight: '.4rem'}}>
                                    <SessionPlayedGraph sessionId={detail.last_session_id} map={detail.map} />
                                </div>
                            </Tooltip>
                        </Paper>
                    </div>
                </div>
            </Grid>
        </Grid>
    </Paper>
}