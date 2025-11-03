import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import {useLocation, useNavigate, useParams} from 'react-router';
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Tooltip,
    useTheme,
    Chip,
    Stack,
    Alert,
    Button,
    Avatar,
    Menu,
    MenuItem,
    Divider,
} from "@mui/material";
import { Link } from "react-router"
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import {Helmet} from "@dr.pogodin/react-helmet";
import CoffeeIcon from '@mui/icons-material/Coffee';
import ServerProvider from "./ServerProvider.jsx";
import {Logo} from "./CommunitySelector.jsx";
import DiscordIcon from "./DiscordIcon.jsx";
import {fetchUrl} from "../../utils/generalUtils.jsx";
import dayjs from "dayjs";
import LoginDialog from "./LoginDialog.jsx";
import {useAuth} from "../../utils/auth.jsx";

function UserMenu() {
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
    };

    const getAvatarSrc = () => {
        if (user?.avatar && user?.id) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        }
        return null;
    };

    return (
        <>
            <IconButton onClick={handleClick}>
                <Avatar
                    sx={{ width: 32, height: 32 }}
                    src={getAvatarSrc()}
                >
                    {user?.global_name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                        {user?.global_name}
                    </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                    Logout
                </MenuItem>
            </Menu>
        </>
    );
}

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
    const theme = useTheme();
    const { user, loading, checkAuth } = useAuth();
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

    const themeColor = theme.palette.mode === "dark"
        ? theme.palette.background.default
        : theme.palette.primary.main;
    const navigate = useNavigate()
    const location = useLocation()
    const [drawerOpen, setDrawerOpen] = useState(false);
    const {server_id} = useParams()
    const selectedMode = server_id !== undefined && server_id !== null? 'ServerSpecific': 'Community'
    const pages = pagesSelection[selectedMode]
    const {communities} = useContext(ServerProvider)
    const server = communities.flatMap(e => e.servers).find(s => s.id === server_id)
    const community = communities.find(c => c.servers.some(s => s.id === server_id))
    let currentLocation = location.pathname

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth') === 'success') {
            checkAuth();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [checkAuth]);

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

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleNavigate = (link) => {
        navigate(link);
        setDrawerOpen(false);
    };

    const handleOpenCommunityDrawer = () => setCommunityDrawer(true)

    const handleLoginClick = () => {
        setLoginDialogOpen(true);
    };

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
                {!loading && (
                    user ? (
                        <UserMenu />
                    ) : (
                        <Button
                            onClick={handleLoginClick}
                            variant="outlined"
                            size="small"
                        >
                            Login
                        </Button>
                    )
                )}
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
                {!loading && (
                    user ? (
                        <UserMenu />
                    ) : (
                        <Button
                            onClick={handleLoginClick}
                            variant="outlined"
                        >
                            Login
                        </Button>
                    )
                )}
            </Box>

            <Box sx={{ display: { sm: 'none', xs: 'flex' }, width: '48px' }}></Box>
        </Box>

        <LoginDialog
            open={loginDialogOpen}
            onClose={() => setLoginDialogOpen(false)}
        />

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

const ANNOUNCEMENT_STORAGE_KEY = "dismissed_announcement_created_at";
const ROTATION_INTERVAL_MS = 5000;

export function Announcement() {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchUrl("/announcements").then((data) => {
            const storedAt = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
            const dismissedAt = storedAt ? dayjs(storedAt) : null;

            const visible = data
                .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))
                .filter(a => !dismissedAt || dayjs(a.created_at).isAfter(dismissedAt));

            setAnnouncements(visible);
        });
    }, []);

    useEffect(() => {
        if (announcements.length <= 1) return;

        timerRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % announcements.length);
        }, ROTATION_INTERVAL_MS);

        return () => clearInterval(timerRef.current);
    }, [announcements]);

    const current = announcements[currentIndex];

    if (!current) return null;

    const handleClose = () => {
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, current.created_at);
        setAnnouncements([]);
    };

    return (
        <Alert
            severity="info"
            action={
                <IconButton color="inherit" size="small" onClick={handleClose}>
                    <CloseIcon fontSize="inherit" />
                </IconButton>
            }
        >
            {current.text}
        </Alert>
    );
}

export default function ResponsiveAppBar({ setCommunityDrawer }){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar setCommunityDrawer={setCommunityDrawer} />
    </ErrorCatch>
}
