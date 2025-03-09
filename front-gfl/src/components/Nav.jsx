import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import {useLocation, useNavigate} from 'react-router';
import {Alert, IconButton, Link, Menu, MenuItem, useColorScheme, useMediaQuery} from "@mui/material";
import { useState } from "react";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ErrorCatch from "./ErrorMessage.jsx";
import './Nav.css'

const pages = {
    'Server': '/',
    'Players': '/players',
    // 'Maps': '/maps'
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
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const navigate = useNavigate()
    const location = useLocation()
    const [anchorElNav, setAnchorElNav] = useState(null);
    const [ openMenu, setOpenMenu] = useState(false)

    if (!mode) { // first render
        return null;
    }

    const handleMenuClose = () => {
        setOpenMenu(false)
    }
    const handleMenuOpen = e => {
        setAnchorElNav(e.currentTarget)
        setOpenMenu(true)
    }

    const handleCloseNavMenu = (link) => {
        navigate(link);
        handleMenuClose()
    }

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
        return <Button className={`nav-link ${isActive? 'active': ''}`} key={i}
                onClick={() => navigate(page)}>
            {pageName}
        </Button>
    })
    return <Box component="nav" sx={(theme) => ({
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

        <Box className="nav-links" sx={{display: {xs: 'none', sm: 'flex'}}}>{pagesNav}</Box>

        <Box sx={{display: {xs: 'inline-block', sm: 'none'}}}>
            <MenuIcon onClick={handleMenuOpen}/>
        </Box>
        <Menu
            anchorEl={anchorElNav}
            open={openMenu}
            onClose={() => setOpenMenu(false)}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
        >{Object.entries(pages).map(([page, link]) => (
            <MenuItem key={page} onClick={() => handleCloseNavMenu(link)}>{page}</MenuItem>
        ))
        }
        </Menu>


        <Logo mode={mode} display={{sm: "none", xs: 'flex'}} />
        <Box className="nav-right" sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <IconButton onClick={() => setMode(nextMode)} title={`Switch to ${nextMode}`}>
                {modeButtonicon}
            </IconButton>
            <IconButton href="https://github.com/InterStella0/gfl-ze-watcher" sx={{ mx: ".4rem" }}>
                <GitHubIcon />
            </IconButton>
        </Box>
    </Box>
}
export default function ResponsiveAppBar(){
    const currentDomain = window.location.hostname;
    const showInfo = !["gflgraph.prettymella.site"].includes(currentDomain)
    return <ErrorCatch message="App bar is broken.">
        <WebAppBar />
        {showInfo &&
            <Alert severity="warning">
                I'm moving to a new domain because my subscription ran out. The new domain is
                <Link href="https://gflgraph.prettymella.site" color="secondary" sx={{marginLeft: '.4rem'}}>
                gflgraph.prettymella.site
                </Link>
            </Alert>}
    </ErrorCatch>
}