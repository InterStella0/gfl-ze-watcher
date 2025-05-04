import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import {useLocation, useNavigate} from 'react-router';
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText, Tooltip,
    useColorScheme,
    useMediaQuery,
    useTheme
} from "@mui/material";
import { Link } from "react-router"
import { useState } from "react";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CloseIcon from '@mui/icons-material/Close';
import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'
import {Helmet} from "@dr.pogodin/react-helmet";
import CoffeeIcon from '@mui/icons-material/Coffee';

const pages = {
    'Server': '/',
    'Players': '/players',
    'Maps': '/maps',
    'Radar': '/radar',
    'Tracker': '/live',
}

function Logo({mode, display}){
    return <Box className="logo" sx={{ display: display, alignItems: "center", gap: 2 }}>
        <Typography
            sx={{
                fontSize: "22px",
                fontWeight: "700",
                background: mode === "light"
                    ? "linear-gradient(45deg, #ff80bf, #a366cc)"
                    : "linear-gradient(45deg, #ff80bf, #bd93f9)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}
        >
            Graph LULE
        </Typography>
    </Box>
}

function WebAppBar(){
    const { mode, setMode } = useColorScheme()
    const theme = useTheme();

    const themeColor = theme.palette.mode === "dark"
        ? theme.palette.background.default
        : theme.palette.primary.main;
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const navigate = useNavigate()
    const location = useLocation()
    const [drawerOpen, setDrawerOpen] = useState(false);

    if (!mode) { // first render
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

    let currentLocation = location.pathname
    const pagesNav = Object.entries(pages).map((element, i) => {
        const [pageName, page] = element
        const isActive = currentLocation === page
        return <Link className={`nav-link ${isActive? 'active': ''}`} key={i}
                     style={{ '--link-color': theme.palette.primary.main }}
                     to={page}>
            {pageName}
        </Link>
    })

    const drawerContent = (
        <Box sx={{ width: 250 }} role="presentation">
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <Logo mode={mode} display="flex" />
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <List>
                {Object.entries(pages).map(([pageName, pageLink]) => {
                    const isActive = currentLocation === pageLink;
                    return (
                        <ListItem key={pageName} disablePadding>
                            <ListItemButton
                                onClick={() => handleNavigate(pageLink)}
                                sx={{
                                    backgroundColor: isActive ?
                                        (theme.palette.mode === 'light' ? 'rgba(255, 128, 191, 0.1)' : 'rgba(189, 147, 249, 0.1)') :
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
                <IconButton href="https://github.com/InterStella0/gfl-ze-watcher">
                    <GitHubIcon />
                </IconButton>
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
            <Logo mode={mode} display={{sm: "flex", xs: 'none'}} />

            <Box className="nav-links" sx={{display: {xs: 'none', sm: 'flex'}}}>
                {pagesNav}
            </Box>

            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ display: { sm: 'none' } }}
            >
                <MenuIcon />
            </IconButton>

            <Logo mode={mode} display={{sm: "none", xs: 'flex'}} />

            <Box className="nav-right" sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <IconButton onClick={() => setMode(nextMode)} title={`Switch to ${nextMode}`}>
                    {modeButtonicon}
                </IconButton>
                <IconButton href="https://github.com/InterStella0/gfl-ze-watcher" sx={{ml: '.8rem'}}>
                    <GitHubIcon />
                </IconButton>
                <Tooltip title="Donate for free santa win">
                    <IconButton href="https://ko-fi.com/interstella0">
                        <CoffeeIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>

        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
                keepMounted: true, // Better open performance on mobile
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

export default function ResponsiveAppBar(){
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar />
    </ErrorCatch>
}