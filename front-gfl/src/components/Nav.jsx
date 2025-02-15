import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router';
import {Menu, MenuItem} from "@mui/material";
import {useState} from "react";

const pages = ['Server', 'Players',
    // 'Maps'
];

export default function ResponsiveAppBar() {
    const [anchorElNav, setAnchorElNav] = useState(null);
    const [ openMenu, setOpenMenu] = useState(false)
    const navigate = useNavigate()
    const handleMenuClose = () => {
        setOpenMenu(false)
    }
    const handleMenuOpen = e => {
        setAnchorElNav(e.currentTarget)
        setOpenMenu(true)
    }

    const handleCloseNavMenu = (page) => {
          const link = page !== 'Server'? page.toLowerCase(): ''
          navigate(`/${link}`);
          handleMenuClose()
    }

    return <AppBar position="static">
        <Container maxWidth="xl">
            <Toolbar disableGutters
                     sx={{
                         width: "100%",
                     }}>
                <Typography
                    variant="h6"
                    noWrap
                    component="a"
                    sx={{
                        mr: 2,
                        display: {xs: 'none', md: 'flex'},
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '.3rem',
                        color: 'white !important',
                        textDecoration: 'none',
                    }}
                >
                    Graph LULE
                </Typography>

                <Box sx={{flexGrow: 1, display: {xs: 'flex', md: 'none'}}}>
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
                >{pages.map(page => (
                        <MenuItem key={page} onClick={() => handleCloseNavMenu(page)}>{page}</MenuItem>
                    ))
                    }
                </Menu>
                <Typography
                    variant="h5"
                    noWrap
                    component="a"
                    sx={{
                        mr: 2,
                        display: {xs: 'flex', md: 'none'},
                        flexGrow: 1,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '.3rem',
                        color: 'white !important',
                    }}
                >
                    Graph LULE
                </Typography>
                <Box sx={{flexGrow: 1, display: {xs: 'none', md: 'flex'}}}>
                    {pages.map((page) => (
                        <Button key={page}
                            onClick={_ => handleCloseNavMenu(page)}
                            sx={{my: 2, color: 'white', display: 'block'}}
                        >
                            {page}
                        </Button>
                    ))}
                </Box>
                <Box sx={{flexGrow: 0}}>
                    <a href="https://github.com/InterStella0/gfl-ze-watcher" style={{color: "white"}}><GitHubIcon/></a>
                </Box>
            </Toolbar>
        </Container>
    </AppBar>;
}