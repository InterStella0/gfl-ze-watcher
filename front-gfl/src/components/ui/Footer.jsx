import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    IconButton,
    Fab,
    useMediaQuery,
    useTheme,
    alpha,
    Tooltip,
    Grid2 as Grid,
    useColorScheme
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import FavoriteIcon from '@mui/icons-material/Favorite';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import StarIcon from '@mui/icons-material/Star';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import Button from "@mui/material/Button";
import SteamIcon from "./SteamIcon.jsx";
import DiscordIcon from "./DiscordIcon.jsx";

const IconLink = ({ href, ariaLabel, icon, tooltip }) => {
    const theme = useTheme();

    return (
        <Tooltip title={tooltip} arrow placement="top">
            <IconButton
                component="a"
                href={href}
                aria-label={ariaLabel}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                    color: 'text.secondary',
                    transition: theme.transitions.create(['background-color', 'transform', 'color'], {
                        duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                        color: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                {icon}
            </IconButton>
        </Tooltip>
    );
};

const ThemeToggle = () => {
    const theme = useTheme();
    const { mode, setMode } = useColorScheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    let nextMode;
    switch (mode) {
        case "system":
            nextMode = prefersDarkMode ? "light": "dark";
            break;
        case "dark":
            nextMode = "light";
            break;
        case "light":
            nextMode = "dark";
            break;
    }

    const modeButtonIcon = nextMode === "dark" ? <DarkModeIcon /> : <LightModeIcon />;

    return (
        <Tooltip title={`Switch to ${nextMode} mode`} arrow placement="top">
            <IconButton
                onClick={() => setMode(nextMode)}
                sx={{
                    color: 'text.secondary',
                    transition: theme.transitions.create(['background-color', 'transform', 'color'], {
                        duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                        color: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                {modeButtonIcon}
            </IconButton>
        </Tooltip>
    );
};

export default function Footer(){
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [currentYear] = useState(new Date().getFullYear());

    const accentColor = theme.palette.primary.main;
    const secondaryAccent = theme.palette.secondary.main;

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <>
            {showScrollTop && (
                <Fab
                    size="small"
                    aria-label="scroll back to top"
                    onClick={scrollToTop}
                    sx={{
                        position: 'fixed',
                        bottom: theme.spacing(3),
                        right: theme.spacing(3),
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                        color: theme.palette.secondary.main,
                        zIndex: theme.zIndex.speedDial,
                        boxShadow: theme.shadows[2],
                        transition: theme.transitions.create(['background-color', 'transform'], {
                            duration: theme.transitions.duration.standard,
                        }),
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.25),
                            transform: 'translateY(-3px)',
                            boxShadow: theme.shadows[4],
                        }
                    }}
                >
                    <KeyboardArrowUpIcon />
                </Fab>
            )}

            <Box
                component="footer"
                sx={{
                    background: theme.palette.mode === "light"
                        ? "linear-gradient(to right, #fff1f9, #fff)"
                        : "linear-gradient(to right, #1a1a1f, #252530)",
                    borderTop: `2px solid ${theme.palette.mode === "light" ? "#ffd6eb" : "#41344d"}`,
                    marginTop: 'auto',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 -4px 20px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.25 : 0.05)}`,
                    py: 2,
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-15px',
                        left: '10%',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(secondaryAccent, 0.1)} 0%, ${alpha(secondaryAccent, 0)} 70%)`,
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: '-20px',
                        right: '15%',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(accentColor, 0.12)} 0%, ${alpha(accentColor, 0)} 70%)`,
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: '40%',
                        left: '80%',
                        width: '25px',
                        height: '25px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0)} 70%)`,
                    }}
                />

                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: isMobile ? 2.5 : 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: isMobile ? 2.5 : 0,
                            }}
                        >
                            <StarIcon
                                sx={{
                                    mr: 1,
                                    color: accentColor,
                                    fontSize: '1.2rem'
                                }}
                            />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: '0.95rem' }}
                            >
                                &copy; {currentYear} ZE Graph. All rights reserved.
                            </Typography>
                        </Box>

                        <Box display="flex" flexDirection="row" alignItems="center" justifyContent="end">
                            <ThemeToggle />

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconLink
                                    href="https://goes.prettymella.site/s/discord-zegraph"
                                    ariaLabel="Discord"
                                    tooltip="Support Server"
                                    icon={<DiscordIcon />}
                                />
                                <Typography
                                    variant="body2"
                                    noWrap
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.75rem',
                                        ml: 0.5,
                                        display: { xs: 'none', md: 'block' }
                                    }}
                                >
                                    Support Server
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconLink
                                    href="https://steamcommunity.com/id/Stella667/"
                                    ariaLabel="Steam"
                                    tooltip="Steam: queeniemella"
                                    icon={<SteamIcon />}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.75rem',
                                        ml: 0.5,
                                        display: { xs: 'none', md: 'block' }
                                    }}
                                >
                                    queeniemella
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconLink
                                    href="https://github.com/InterStella0/gfl-ze-watcher"
                                    ariaLabel="GitHub"
                                    tooltip="GitHub: InterStella0"
                                    icon={<GitHubIcon />}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.75rem',
                                        ml: 0.5,
                                        display: { xs: 'none', md: 'block' }
                                    }}
                                >
                                    InterStella0
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconLink
                                    href="https://ko-fi.com/interstella0"
                                    ariaLabel="Ko-Fi"
                                    tooltip="Support on Ko-Fi: interstella0"
                                    icon={<LocalCafeIcon />}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.75rem',
                                        ml: 0.5,
                                        display: { xs: 'none', md: 'block' }
                                    }}
                                >
                                    interstella0
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            mt: 2,
                            position: 'relative',
                            width: '100%',
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            top: isMobile ? -10 : -15,
                            left: isMobile ? '15%' : '30%',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.5),
                        }} />

                        <Box sx={{
                            position: 'absolute',
                            top: isMobile ? 0 : -8,
                            right: isMobile ? '20%' : '32%',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.secondary.main, 0.5),
                        }} />

                        <Grid container sx={{position: 'relative', width: '100%'}} justifyContent="space-between" alignItems="center" spacing={2} >
                            <Grid size={{xs: 12, sm: 6}} display="flex" justifyContent={{sm: "start", xs: "center", md: 'start'}} >
                                <Box
                                    sx={{
                                        backgroundColor: alpha(
                                            theme.palette.mode === 'dark'
                                                ? theme.palette.primary.dark
                                                : theme.palette.primary.light,
                                            theme.palette.mode === 'dark' ? 0.15 : 0.08
                                        ),
                                        borderRadius: 24,
                                        px: 2.5,
                                        py: 1,
                                        width: "fit-content",
                                        gap: 2,
                                        background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.main, 0.3)})`,
                                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: theme.palette.text.primary,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            letterSpacing: 0.2,
                                        }}
                                    >
                                        Please be nice~
                                    </Typography>
                                </Box>
                            </Grid>

                            <Grid size={{sm: 6, xs: 12}} display="flex" justifyContent={{sm: "end", xs: "center", md: 'end'}}>
                                <Button
                                    href="mailto:contact@prettymella.site"
                                    startIcon={<EmailIcon />}
                                    variant="outlined"
                                    sx={{ borderRadius: '20px' }}
                                >
                                    contact@prettymella.site
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Container>
            </Box>
        </>
    );
};