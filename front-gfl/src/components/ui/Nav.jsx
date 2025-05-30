import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import {Outlet, useLocation, useNavigate, useParams} from 'react-router';
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Tooltip,
    useColorScheme,
    useMediaQuery,
    useTheme,
    Chip,
    Stack
} from "@mui/material";
import { Link } from "react-router"
import {useContext, useMemo, useState} from "react";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CloseIcon from '@mui/icons-material/Close';
import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import {Helmet} from "@dr.pogodin/react-helmet";
import CoffeeIcon from '@mui/icons-material/Coffee';
import ServerProvider from "./ServerProvider.jsx";
import {Logo} from "./CommunitySelector.jsx";
import DiscordIcon from "./DiscordIcon.jsx";

const pagesSelection = {
    'ServerSpecific': {
        'Communities': '/',
        'Server': '/:server_id',
        'Players': '/:server_id/players',
        'Maps': '/:server_id/maps',
        'Radar': '/:server_id/radar',
    },
    'Community': {
        'Communities': '/',
        'Tracker': '/live',
    }
}

function ServerIndicator({ server, community, theme, onClick }) {
    if (!server || !community) return null;

    const primaryColor = theme.palette.mode === 'light' ? '#a366cc' : '#bd93f9';

    return (
        <Box
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                p: 1,
                borderRadius: 1.5,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: theme.palette.mode === 'light'
                        ? 'rgba(163, 102, 204, 0.06)'
                        : 'rgba(189, 147, 249, 0.06)',
                    transform: 'translateY(-1px)',
                    boxShadow: theme.palette.mode === 'light'
                        ? '0 2px 8px rgba(163, 102, 204, 0.15)'
                        : '0 2px 8px rgba(189, 147, 249, 0.15)',
                    '& .MuiChip-root': {
                        transform: 'scale(1.02)',
                    }
                },
                '&:active': {
                    transform: 'translateY(0px)',
                }
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                    label={community.name}
                    variant="filled"
                    size="small"
                    sx={{
                        maxWidth: '120px',
                        height: '24px',
                        transition: 'transform 0.2s ease-in-out',
                        '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem'
                        },
                        backgroundColor: primaryColor,
                        color: 'white',
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem'
                    }}
                >
                    /
                </Typography>
                <Chip
                    label={server.name}
                    variant="outlined"
                    size="small"
                    sx={{
                        maxWidth: '160px',
                        height: '24px',
                        transition: 'transform 0.2s ease-in-out',
                        '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem'
                        },
                        borderColor: primaryColor,
                        color: primaryColor,
                        backgroundColor: theme.palette.mode === 'light'
                            ? 'rgba(163, 102, 204, 0.08)'
                            : 'rgba(189, 147, 249, 0.08)',
                    }}
                />
            </Stack>
        </Box>
    );
}
function WebAppBar({ setCommunityDrawer }){
    const { mode, setMode } = useColorScheme()
    const theme = useTheme();

    const themeColor = theme.palette.mode === "dark"
        ? theme.palette.background.default
        : theme.palette.primary.main;
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const navigate = useNavigate()
    const location = useLocation()
    const [drawerOpen, setDrawerOpen] = useState(false);
    const {server_id} = useParams()
    const selectedMode = server_id !== undefined && server_id !== null? 'ServerSpecific': 'Community'
    const pages = pagesSelection[selectedMode]
    const communities = useContext(ServerProvider)
    const server = communities.flatMap(e => e.servers).find(s => s.id === server_id)
    const community = communities.find(c => c.servers.some(s => s.id === server_id))
    let currentLocation = location.pathname
    const pagesNav = useMemo(() => Object.entries(pages).map((element, i) => {
        const [pageName, page] = element

        const linked = selectedMode === 'ServerSpecific'? page.replace(":server_id", server_id): page
        const isActive = currentLocation === linked
        return <Link className={`nav-link ${isActive? 'active': ''}`} key={i}
                     style={{ '--link-color': theme.palette.primary.main }}
                     to={linked}>
            {pageName}
        </Link>
    }), [server_id, currentLocation, theme])

    if (!mode) {
        return null;
    }

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleNavigate = (link) => {
        navigate(link);
        setDrawerOpen(false);
    };

    let nextMode
    switch (mode) {
        case "system":
            nextMode = prefersDarkMode ? "light": "dark"
            break;
        case "dark":
            nextMode = "light"
            break;
        case "light":
            nextMode = "dark"
            break;
    }
    const modeButtonicon = nextMode === "dark" ? <DarkModeIcon /> : <LightModeIcon />
    const handleOpenCommunityDrawer = () => setCommunityDrawer(true)

    const drawerContent = (
        <Box sx={{ width: 250 }} role="presentation">
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <Logo />
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <List>
                {Object.entries(pages).map(([pageName, pageLink]) => {
                    const linked = selectedMode === 'ServerSpecific'? pageLink.replace(":server_id", server_id): pageLink
                    const isActive = currentLocation === linked
                    return (
                        <ListItem key={pageName} disablePadding>
                            <ListItemButton
                                onClick={() => handleNavigate(linked)}
                                sx={{
                                    backgroundColor: isActive ?
                                        (theme.palette.mode === 'light' ?
                                            'rgba(255, 128, 191, 0.1)' : 'rgba(189, 147, 249, 0.1)') :
                                        'transparent',
                                    borderLeft: isActive ?
                                        `3px solid ${theme.palette.mode === 'light' ? '#a366cc' : '#bd93f9'}` :
                                        '3px solid transparent',
                                }}
                            >
                                <ListItemText
                                    primary={pageName}
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ?
                                                (theme.palette.mode === 'light' ? '#a366cc' : '#bd93f9') :
                                                'inherit'
                                        }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
                mt: 'auto'
            }}>
                <IconButton onClick={() => setMode(nextMode)} title={`Switch to ${nextMode}`}>
                    {modeButtonicon}
                </IconButton>
                <IconButton
                    href="https://goes.prettymella.site/s/discord-zegraph"
                ><DiscordIcon /></IconButton>
                <IconButton href="https://github.com/InterStella0/gfl-ze-watcher">
                    <GitHubIcon />
                </IconButton>
                <Tooltip title="Donate for free santa win">
                    <IconButton href="https://ko-fi.com/interstella0">
                        <CoffeeIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );

    return <>
        <Helmet>
            <meta name="theme-color" content={themeColor} />
        </Helmet>
        <Box component="nav" sx={(theme) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "15px 25px",
            borderBottom: `2px solid ${theme.palette.mode === "light" ? "#ffd6eb" : "#41344d"}`,
            background: theme.palette.mode === "light"
                ? "linear-gradient(to right, #fff1f9, #fff)"
                : "linear-gradient(to right, #1a1a1f, #252530)",
            boxShadow: theme.palette.mode === "light"
                ? "0 2px 10px rgba(0,0,0,0.05)"
                : "0 2px 10px rgba(0,0,0,0.2)",
        })}>
            <Box
                 sx={{
                     '@media (min-width:750px)': {
                         display: 'flex'
                     },
                     '@media (max-width:750px)': {
                         display: 'none'
                     }, minWidth: 0
                 }}
            >
                <ServerIndicator server={server} community={community} theme={theme} onClick={handleOpenCommunityDrawer} />
            </Box>

            <Box className="nav-links"   sx={{
                '@media (min-width:750px)': {
                    display: 'flex'
                },
                '@media (max-width:750px)': {
                    display: 'none'
                }
            }}>
                {pagesNav}
            </Box>

            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                    '@media (min-width:750px)': {
                        display: 'none'
                    },
                    '@media (max-width:750px)': {
                        display: 'flex'
                    }
                }}
            >
                <MenuIcon />
            </IconButton>

            <Box
                sx={{
                    '@media (min-width:750px)': {
                        display: 'none'
                    },
                    '@media (max-width:750px)': {
                        display: 'flex'
                    }, minWidth: 0, flex: 1, justifyContent: 'center'
                }}
                ml="3rem">
                <ServerIndicator server={server} community={community} theme={theme} onClick={handleOpenCommunityDrawer} />
            </Box>

            <Box className="nav-right"
                 sx={{
                     '@media (min-width:750px)': {
                         display: 'flex'
                     },
                     '@media (max-width:750px)': {
                         display: 'none'
                     }, alignItems: "center"
                 }}

            >
                <IconButton onClick={() => setMode(nextMode)} title={`Switch to ${nextMode}`}>
                    {modeButtonicon}
                </IconButton>
            </Box>

            <Box sx={{ display: { sm: 'none', xs: 'flex' }, width: '48px' }}></Box>
        </Box>

        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
                keepMounted: true,
            }}
            sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': {
                    boxSizing: 'border-box',
                    width: 250,
                    background: theme.palette.mode === "light"
                        ? "linear-gradient(to bottom, #fff1f9, #fff)"
                        : "linear-gradient(to bottom, #1a1a1f, #252530)",
                },
            }}
        >
            {drawerContent}
        </Drawer>
    </>
}

export default function ResponsiveAppBar({ setCommunityDrawer }){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar setCommunityDrawer={setCommunityDrawer} />
        <Outlet />
    </ErrorCatch>
}