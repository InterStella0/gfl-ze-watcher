'use client'
import {Drawer, IconButton, List, ListItem, ListItemButton, ListItemText, Tooltip} from "@mui/material";
import theme from "../../theme";
import {useState} from "react";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import {Logo} from "./CommunitySelector";
import CloseIcon from "@mui/icons-material/Close";
import LoginButton from "./LoginButton";
import DiscordIcon from "./DiscordIcon";
import GitHubIcon from "@mui/icons-material/GitHub";
import CoffeeIcon from "@mui/icons-material/Coffee";
import {pagesSelection} from "./PagesNavigation";
import {Server} from "../../types/community";
import {DiscordUser} from "../../types/users";
import {useRouter} from "next/navigation";

export default function NavDrawerButton({ server, user }: { server: Server | null, user: DiscordUser | null }) {
    const currentLocation = typeof window !== "undefined" ? window.location.pathname : "";
    const [drawerOpen, setDrawerOpen] = useState(false);
    const router = useRouter();
    const selectedMode = server !== null? 'ServerSpecific': 'Community'
    const pages = pagesSelection[selectedMode]

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleNavigate = (link) => {
        setDrawerOpen(false);
        router.push(link);
    };
    return <>
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
        <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
            keepMounted: true,
        }}
        sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 250,
                background: theme.palette.mode === "light"
                    ? "linear-gradient(to bottom, #fff1f9, #fff)"
                    : "linear-gradient(to bottom, #1a1a1f, #252530)",
            },
        }}
    >
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
                        const linked = selectedMode === 'ServerSpecific'? pageLink.replace(":server_id", server.gotoLink): pageLink
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
                    <LoginButton user={user} />
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
    </Drawer>
    </>
}