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

export default function MapHeader(){
    const [url, setUrl] = useState(null)
    const { name, analyze } = useContext(MapContext)
    useEffect(() => {
        getMapImage(name).then(setUrl)
    }, [name])

    return <Box sx={{position: 'relative', overflow: 'hidden', borderRadius: '1rem'}}>
        <Paper sx={{
             width: '100%',
            maxHeight: '400px',
            overflow: 'hidden',
            display: 'flex'}}>
            {url !== null? <img src={url} style={{
                objectFit: 'cover',
                width: '100%',
                maxHeight: '400px',
                display: 'block'
            }}/>: <></>}
        </Paper>
        <Box sx={{position: 'absolute', bottom: 0, left: 0,
            p: '1rem',
            textAlign: 'start', width: '100%',
            backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))'

        }}>
            <Typography variant="h3" fontWeight={700} component="h1" color="white">
                {name}
            </Typography>
            <Box sx={{display: 'flex', gap: '.5rem', alignItems: 'center',
            }}>
                <AccessTimeIcon sx={{color: 'white'}} />
                <Typography variant="subtitle1" mr='2rem' color="white">
                    {analyze?.total_playtime}h Total Playtime
                </Typography>
                <GroupIcon sx={{color: 'white'}} />
                <Typography variant="subtitle1" mr='2rem' color="white">
                    {analyze?.total_sessions} Sessions
                </Typography>
                <LoopIcon sx={{color: 'white'}}  />
                <Typography variant="subtitle1" mr='2rem' color="white">
                    Last played {dayjs(analyze?.last_played).fromNow()}
                </Typography>
                <PersonIcon sx={{color: 'white'}}  />
                <Typography variant="subtitle1" color="white">
                    {analyze?.unique_players} have played this map
                </Typography>
            </Box>
        </Box>
    </Box>
}
