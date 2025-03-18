import {useContext, useEffect, useState} from "react";
import {getMapImage} from "../utils.jsx";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import LoopIcon from "@mui/icons-material/Loop";
import dayjs from "dayjs";
import PersonIcon from "@mui/icons-material/Person";
import {MapContext} from "../pages/MapPage.jsx";

export default function MapHeader() {
    const [url, setUrl] = useState(null);
    const { name, analyze } = useContext(MapContext);
    useEffect(() => {
        getMapImage(name).then(setUrl);
    }, [name]);

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '1rem' }}>
            <Paper sx={{
                width: '100%',
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
                    />
                ) : (
                    <Box sx={{ width: '100%', height: '200px', bgcolor: 'grey.300' }} />
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
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                            {analyze?.total_playtime}h
                        </Typography>
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'inline' } }}>
                            Total playtime
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 0 } }}>
                        <GroupIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                            {analyze?.total_sessions}
                        </Typography>
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'inline' }}}>
                            Sessions
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 0 } }}>
                        <LoopIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'inline' } }}>
                            Last played
                        </Typography>
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                            {dayjs(analyze?.last_played).fromNow()}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 0 } }}>
                        <PersonIcon sx={{ color: 'white', fontSize: { xs: '0.9rem', sm: '1.25rem' } }} />
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                            {analyze?.unique_players}
                        </Typography>
                        <Typography variant="subtitle1" color="white" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'inline' } }}>
                            have played this map
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
