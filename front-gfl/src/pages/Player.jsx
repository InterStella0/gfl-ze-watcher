import {
    Avatar,
    Chip,
    Grid2 as Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Badge, Skeleton, IconButton, Card, CardContent, Link
} from "@mui/material"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {fetchUrl, formatFlagName, ICE_FILE_ENDPOINT, InfractionInt, secondsToHours} from '../utils'
import { PlayerAvatar } from "../components/PlayerAvatar"
import { useParams } from "react-router"
import CategoryChip from "../components/CategoryChip"
import { Bar , PolarArea} from "react-chartjs-2"
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, TimeScale,
    LineController, PolarAreaController, RadialLinearScale, ArcElement,
    BarController
  } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { REGION_COLORS } from "../components/ServerGraph"
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {ExpandLess, ExpandMore} from "@mui/icons-material";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  PolarAreaController, 
  RadialLinearScale,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin,
  annotationPlugin
);


function AliasesDropdown({ aliases }) {
    const [expanded, setExpanded] = useState(false);
    const visibleAliases = aliases.slice(0, 4);
    const hiddenAliases = aliases.slice(4);

    return (
        <Box sx={{ position: "relative", display: "block" }}>
            <p>
                {visibleAliases.map((e, i) => <>
                    <Typography
                        key={i}
                        title={dayjs(e.created_at).format("lll")}
                        sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300}}
                        variant="span"
                    >
                        {e.name}
                    </Typography>
                    {i < visibleAliases.length - 1 && ', '}
                    </>
                )}
                {hiddenAliases.length > 0 && (
                    <IconButton onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                )}
            </p>
            {expanded && (
                <Paper
                    elevation={3}
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 10,
                        maxHeight: 200,
                        overflowY: "auto",
                        padding: 1,
                        borderRadius: 2,
                        boxShadow: 3,
                    }}
                >
                    {hiddenAliases.map((e, i) => (
                        <Typography
                            key={i + 4}
                            title={dayjs(e.created_at).format("lll")}
                            sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300, display: "block" }}
                        >
                            {e.name}
                        </Typography>
                    ))}
                </Paper>
            )}
        </Box>
    );
}




function PlayerCardDetail(){
    const { data } = useContext(PlayerContext)
    // TODO: Player Most played Map (Background)
    function PlayTime({prefix, seconds}){
        return <div>
        <span>
            {prefix}
            <strong style={{margin: '.3rem .5rem'}}>
                {secondsToHours(seconds)} Hours
            </strong>
        </span>
    </div>
    }

    return <>
        <Paper style={{width: "100%"}}>
            <Grid container spacing={2}>
                <Grid size={{xl: 9, md: 8, sm: 7, xs: 12}}>
                    <div style={{display: 'flex', flexDirection: 'row', padding: '1.5rem'}}>
                        <div>
                            {data ?
                                <Badge color="success"
                                       badgeContent={data.online_since && " "}
                                       anchorOrigin={{
                                           vertical: 'bottom',
                                           horizontal: 'right',
                                       }}
                                       title={data.online_since && `Playing since ${dayjs(data.online_since).fromNow()}`}
                                >
                                    <PlayerAvatar
                                        uuid={data.id} name={data.name}
                                        variant="rounded" sx={{
                                        width: {xs: 100, sm: 130, md: 130, lg: 150},
                                        height: {xs: 100, sm: 130, md: 130, lg: 150}
                                    }}/>
                                </Badge> :
                                <Skeleton variant="rounded" sx={{
                                    width: {xs: 100, sm: 130, md: 130, lg: 150},
                                    height: {xs: 100, sm: 130, md: 130, lg: 150}
                                }}/>
                            }
                        </div>
                        <div style={{
                            margin: '1rem 2rem',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                {data? <h2 style={{margin: '.1rem'}}>{data.name}</h2>
                                    : <Skeleton variant="text" sx={{ fontSize: '1rem', margin: '.1rem' }} width={130} />}
                                {data? <Link href={`https://steamcommunity.com/profiles/${data.id}`}>{data.id}</Link>
                                    : <Skeleton variant="text" sx={{ fontSize: '1rem', m: '.1rem' }} width={150} />}

                                {
                                    data? <AliasesDropdown aliases={data.aliases}/>
                                        : <Skeleton variant="text" sx={{ fontSize: '1rem' }} width={190} />}
                            </div>
                            <div>
                                {data? <>
                                        <Chip label={`Rank ${data.rank}`} title="Playtime rank"/>
                                        {data.category && data.category !== 'unknown' && <CategoryChip
                                            category={data.category} sx={{mx: '.5rem'}}
                                            title="Player Type"
                                        />}
                                    </>
                                    : <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                                }
                            </div>
                        </div>
                        <div>
                        </div>
                    </div>
                </Grid>
                <Grid size={{xl: 3, md: 4, sm: 5, xs: 12}} sx={{textAlign: 'right'}}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '100%'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-evenly',
                            margin: '1rem'
                        }}>
                            {data? <PlayTime prefix="Total" seconds={data.total_playtime}/>:
                                <Skeleton variant="text" sx={{ fontSize: '1rem' }} width={180} />
                            }
                            {data? <PlayTime prefix="Casual" seconds={data.casual_playtime}/>:
                                <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                            }
                            {data? <PlayTime prefix="Try Hard" seconds={data.tryhard_playtime}/>:
                                <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                            }
                        </div>
                    </div>
                </Grid>
            </Grid>

            <PlayerPlayTimeGraph/>
        </Paper>
    </>;
}

function PlayerPlayTimeGraph(){
    const { playerId } = useContext(PlayerContext)
    const [ startDate, setStartDate ] = useState()
    const [ endDate, setEndDate ] = useState()
    const [ sessions, setSessions ] = useState()
    const [ yAxis, setYAxis ] = useState()
    const [ loading, setLoading ] = useState(false)
    useEffect(() => {
        setLoading(true)
        fetchUrl(`/players/${playerId}/graph/sessions`)
        .then(resp => resp.map(e => ({y: e.hours, x: e.bucket_time})))
        .then(result => {
            let max = dayjs(result[0].x)
            let min = dayjs(result[0].x)
            let yMin = 0
            let yMax = 0
            for(const current of result){
                yMax = Math.max(yMax, current.y)
                const c = dayjs(current.x)
                if (c.isBefore(min)){
                    min = c
                }else if (c.isAfter(max)){
                    max = c
                }
            }
            setStartDate(min)
            setEndDate(max)
            setYAxis({min: yMin, max: yMax})
            setLoading(false)
            return result
        })
        .then(setSessions)
    }, [ playerId ])
    const dataset = [{
        label: 'Player Hours',
        data: sessions,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        pointRadius: 0
    }]

    const options = useMemo(() => ({
          responsive: true,
          maintainAspectRatio: false,
          tooltip: {
              position: 'nearest'
          },
          interaction: {
            mode: 'x',
            intersect: false,
        },
        scales: {
            x: {
              type: 'time',
              min: startDate?.toDate(),
              max: endDate?.toDate(),
              time: {
                displayFormats: {
                  day: 'MMM DD',            
                  week: 'MMM DD',           
                  month: 'MMM YYYY',        
              }
              },
              ticks: {
                  autoSkip: true,
                  autoSkipPadding: 50,
                  maxRotation: 0
              },
              title: {text: "Time", display: true},
            },
            y: yAxis
          },
          plugins: {
            legend: {
              position: 'top',
            },
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'x'
                },
                zoom: {
                  wheel: {
                    enabled: true,
                  },
                  pinch: {
                    enabled: true
                  },
                  mode: 'x'
                }
              }
          },
        }), [yAxis, startDate, endDate])

    const data = { datasets: dataset }
    return <>{loading? <Skeleton height={200} width="95%" sx={{margin: '1rem'}}>
        </Skeleton>:
        <div style={{height: '200px', margin: '1rem'}}>
            {startDate && endDate &&
                <Bar data={data} options={options} />}
        </div>}
    </>
    
}
function PlayerTopPlayedMap(){
    const { playerId } = useContext(PlayerContext)
    const [maps, setMaps] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/most_played_maps`)
        .then(resp => resp.map(e => ({x: e.map, y: e.duration / 3600})))
        .then(setMaps)
    }, [playerId])

    const options = {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
            y: {beginAtZero: true}
        }
    }
    const data = {
        labels: maps.map(e => e.x),
        datasets: [{
            label: 'Hours',
            data: maps.map(e => e.y),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }]
    }
    return <>
        <Paper sx={{maxHeight: '500px', width: '100%'}}>
            <h3>Top played maps</h3>
            <Paper sx={{height: '300px', padding: '1rem', width: '90%'}} elevation={0}>
                <Bar options={options} data={data} />
            </Paper>
        </Paper>
    </>
}
function PlayerRegionPlayTime(){
    const { playerId } = useContext(PlayerContext)
    const [regions, setTimeRegion] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/regions`)
        .then(resp => resp.map(e => ({x: e.name, y: e.duration / 3600})))
        .then(setTimeRegion)
    }, [playerId])
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {beginAtZero: true}
        }
    }
    const data = {
        labels: regions.map(e => e.x),
        datasets: [{
            label: 'Hours',
            data: regions.map(e => e.y),
            backgroundColor: regions.map(e => REGION_COLORS[e.x])
        }]
    }
    return <Paper sx={{maxHeight: '500px', width: '100%'}}>
        <h3>Region</h3>
        <Paper sx={{height: '300px', padding: '1rem', width: '90%'}} elevation={0}>
            <PolarArea options={options} data={data} />
        </Paper>
    </Paper>
}
function PlayerInfractionRecord(){
    const { playerId } = useContext(PlayerContext) 
    const [ infractions, setInfractions ] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/infractions`)
            .then(infras => infras.map(e => {
                e.flags = new InfractionInt(e.flags)
                return e
            }))
            .then(e => setInfractions(e))
    }, [playerId])
    
    let records = <>
        <h1>No Records</h1>
    </>

    if (infractions.length > 0){
        records = <>
            <TableContainer sx={{ maxHeight: "320px"}}>
                <Table aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell style={{fontWeight: 'bold'}}>Admin</TableCell>
                            <TableCell style={{fontWeight: 'bold'}}>Reason</TableCell>
                            <TableCell style={{fontWeight: 'bold'}} align="right">Restriction</TableCell>
                            <TableCell style={{fontWeight: 'bold'}} align="right">Occured At</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {infractions.map((row) => (
                        <TableRow
                        key={row.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                        <TableCell>
                            <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
                                <Avatar src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)} />
                                <strong>{row.by}</strong>
                            </div>
                        </TableCell>
                        <TableCell>{row.reason}</TableCell>
                        <TableCell align="right">{row.flags.getAllRestrictedFlags().map(formatFlagName).join(', ')}</TableCell>
                        <TableCell align="right">{dayjs(row.infraction_time).format('lll')}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    }

    return <Paper sx={{minHeight: '385px', padding: '1rem'}}>
        <h2>Infractions</h2>
        {records}
    </Paper>
}
const PlayerContext = createContext(null)
export default function Player(){
    let { player_id } = useParams();
    const [ playerData, setPlayerData ] = useState(null)
    useEffect(() => {
        fetchUrl(`/players/${player_id}/detail`)
        .then(resp => setPlayerData(resp))
    }, [player_id])
    return <>
        <PlayerContext.Provider value={{data: playerData, playerId: player_id}}>
            <div style={{margin: '1rem'}}>
                <Grid container spacing={2}>
                    <Grid size={{xl: 8, sm: 12}}>
                        <PlayerCardDetail />
                    </Grid>
                    <Grid size={{xl: 4, lg: 4, sm: 12, xs: 12}}>
                        <PlayerInfractionRecord />
                    </Grid>
                    <Grid size={{xl: 4, lg: 4, sm: 12, xs: 12}} >
                        <PlayerRegionPlayTime />
                    </Grid>
                    <Grid size={{xl: 8, lg: 4, sm: 12, xs: 12}} >
                        <PlayerTopPlayedMap />
                    </Grid>
                </Grid>
            </div>
        </PlayerContext.Provider>
    </>
}