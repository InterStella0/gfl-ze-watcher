import { useContext, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import {addOrdinalSuffix, secondsToHours} from "../../utils.jsx";
import {Badge, Chip, Grid2 as Grid, IconButton, Link, Paper, Skeleton, Tooltip} from "@mui/material";
import dayjs from "dayjs";
import { PlayerAvatar } from "./PlayerAvatar.jsx";
import CategoryChip from "../ui/CategoryChip.jsx";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import PlayerPlayTimeGraph from "./PlayTimeGraph.jsx";

import relativeTime from 'dayjs/plugin/relativeTime'
import SteamIcon from "../ui/SteamIcon.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
dayjs.extend(relativeTime)

function AliasesDropdown({ aliases }) {
    const [expanded, setExpanded] = useState(false);
    const visibleAliases = aliases.slice(0, 4);
    const hiddenAliases = aliases.slice(4);

    return (
        <Box sx={{ position: "relative", display: "block" }}>
            <p>
                {visibleAliases.map((e, i) => <Typography key={i} style={{display: 'inline-block'}} title={
                    `${e.name} on ${dayjs(e.created_at).format("lll")}` }
                                                          variant="span">
                        <span
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: 'inline-block',
                                maxWidth: 150
                        }}
                        >{e.name}</span>
                        {i < visibleAliases.length - 1 && <span style={{verticalAlign: 'top', marginRight: '.2rem'}}>,</span>}
                </Typography>
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

function PlayerCardDetailDisplay(){
    const { data } = useContext(PlayerContext)
    let lastPlayed = data && `Last played ${dayjs(data.last_played).fromNow()} (${secondsToHours(data.last_played_duration)}hr)`
    if (data?.online_since) {
        lastPlayed = `Playing since ${dayjs(data.online_since).fromNow()}`
    }
    return <>
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
                                   title={data.online_since && 'Currently playing on GFL'}
                            >
                                <PlayerAvatar
                                    uuid={data.id} name={data.name}
                                    helmet
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
                            <div style={{display: 'flex', alignItems: 'center', gap: '.8rem'}}>
                                {data? <Typography component="h1"
                                                   fontWeight={800}
                                                   fontSize="1.5rem"
                                                   sx={{margin: '.1rem', display: "inline"}}>
                                        {data.name}
                                </Typography>
                                    : <Skeleton variant="text" sx={{ fontSize: '1rem', margin: '.1rem' }} width={130} />}
                                {data?
                                    <Tooltip title={data.id}>
                                        <Link href={`https://steamcommunity.com/profiles/${data.id}`}>
                                            <SteamIcon />
                                        </Link>
                                    </Tooltip>
                                    : <Skeleton variant="circular" sx={{ fontSize: '1rem', m: '.1rem' }} width={20} />}
                            </div>
                            {data? <p style={{fontSize: '.9rem', fontStyle: 'italic', marginBottom: '.5rem', color: data.online_since? 'green': 'grey'}}>
                                    {lastPlayed}
                            </p>
                                : <Skeleton variant="text" sx={{ fontSize: '1rem', m: '.1rem' }} width={150} />}

                            {
                                data? <AliasesDropdown aliases={data.aliases}/>
                                    : <Skeleton variant="text" sx={{ fontSize: '1rem' }} width={190} />}
                        </div>
                        <div>
                            {data? <>
                                    <Chip label={`Ranked ${addOrdinalSuffix(data.rank)}`} title="Playtime rank"/>
                                    {data.category && data.category !== 'unknown' && <CategoryChip
                                        category={data.category} sx={{mx: '.5rem'}}
                                        title="Player Type"
                                    />}
                                </>
                                : <Skeleton sx={{ fontSize: '2rem', borderRadius: '3rem' }} width={80} />
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
    </>;
}
export default function PlayerCardDetail(){
    return <>
        <Paper sx={{width: "100%"}} elevation={0}>
            <ErrorCatch message="No player detail is available.">
                <PlayerCardDetailDisplay />
            </ErrorCatch>
        </Paper>
    </>
}