import {useContext, useEffect, useState} from "react";
import {getMapImage} from "../../utils.jsx";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import LoopIcon from "@mui/icons-material/Loop";
import dayjs from "dayjs";
import PersonIcon from "@mui/icons-material/Person";
import {MapContext} from "../../pages/MapPage.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {Skeleton} from "@mui/material";

function MapHeaderDisplay() {
    const [url, setUrl] = useState();
    const { name, analyze } = useContext(MapContext);
    const isLoading = !analyze
    useEffect(() => {
        getMapImage(name).then(e => setUrl(e? e.extra_large: null));
    }, [name]);
    const fontSize = { xs: '0.75rem', sm: '0.875rem', md: '1rem' }

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '1rem', height: '100%' }}>
            <Paper sx={{
                width: '100%',
                height: '100%',
                maxHeight: '400px',
                overflow: 'hidden',
                display: 'flex'
            }}>
                {url !== null ? (
                    <img
                        src={url}
                        style={{
                            objectFit: 'cover',
                            width: '100%',
                            maxHeight: '400px',
                            display: 'block'
                        }}
                        alt={`Map ${name}`}
                        title={name}
                        loading="lazy"
                    />
                ) : (
                    <Box sx={{ width: '100%', height: '400px', bgcolor: 'grey.300' }} />
                )}
            </Paper>
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                p: { xs: '0.5rem', sm: '1rem' },
                textAlign: 'start',
                width: '100%',
                backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))'
            }}>
                <Typography
                    variant="h3"
                    fontWeight={700}
                    component="h1"
                    color="white"
                    sx={{
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
                        mb: { xs: 1, sm: 2 }
                    }}
                >
                    {name}
                </Typography>
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: { xs: '0.25rem', sm: '0.5rem' },
                    alignItems: 'center',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 0 } }}>
                        <AccessTimeIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        {isLoading && <>
                            <Skeleton variant="text" fontSize={fontSize} width={50} sx={{ml: 0.5}} />
                            <Skeleton variant="text" fontSize={fontSize} width={100} sx={{ml: 0.5, display: {xs: 'none', sm: 'inline'}}} />
                        </>}
                        {!isLoading && <>
                            <Typography variant="subtitle1" color="white" sx={{ml: 0.5, fontSize}}>
                                {analyze?.total_playtime.toLocaleString('en-US', {minimumFractionDigits: 3})}h
                            </Typography>
                            <Typography variant="subtitle1" color="white" sx={{ml: 0.5, fontSize, display: {xs: 'none', sm: 'inline'}}}>
                                Total playtime
                            </Typography> </>}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 0 } }}>
                        <GroupIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        {isLoading && <>
                            <Skeleton variant="text" fontSize={fontSize} width={30} sx={{ml: 0.5}} />
                            <Skeleton variant="text" fontSize={fontSize} width={60} sx={{ml: 0.5, display: {xs: 'none', sm: 'inline'}}} />
                        </>}
                        {!isLoading &&
                            <>
                                <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize }}>
                                    {analyze?.total_sessions.toLocaleString()}
                                </Typography>
                                <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize, display: { xs: 'none', sm: 'inline' }}}>
                                    Sessions
                                </Typography>
                            </>
                        }

                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 0 } }}>
                        <LoopIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        {isLoading && <>
                            <Skeleton variant="text" fontSize={fontSize} width={70} sx={{ml: 0.5}} />
                            <Skeleton variant="text" fontSize={fontSize} width={90} sx={{ml: 0.5, display: {xs: 'none', sm: 'inline'}}} />
                        </>}
                        {!isLoading && <>
                               <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize, display: { xs: 'none', sm: 'inline' } }}>
                                   Last played
                               </Typography>
                               <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize}}>
                                   {dayjs(analyze?.last_played).fromNow()}
                               </Typography>
                           </>
                        }

                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 0 } }}>
                        <PersonIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        {isLoading && <>
                            <Skeleton variant="text" fontSize={fontSize} width={40} sx={{ml: 0.5}} />
                            <Skeleton variant="text" fontSize={fontSize} width={140} sx={{ml: 0.5, display: {xs: 'none', sm: 'inline'}}} />
                        </>}
                        {!isLoading && <>
                            <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize }}>
                                {analyze?.unique_players.toLocaleString()}
                            </Typography>
                            <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize, display: { xs: 'none', sm: 'inline' } }}>
                                have played this map
                            </Typography>
                        </>}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default function MapHeader(){
    return <ErrorCatch message="Couldn't load map header :/">
        <MapHeaderDisplay />
    </ErrorCatch>
}