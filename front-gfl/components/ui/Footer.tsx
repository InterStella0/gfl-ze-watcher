import {
    Box,
    Container,
    Typography,
    Grid2 as Grid,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import StarIcon from '@mui/icons-material/Star';
import Button from "@mui/material/Button";
import SteamIcon from "./SteamIcon";
import DiscordIcon from "./DiscordIcon";
import FooterFab from "./FooterFab";
import ThemeToggle from "./ThemeToggle";
import IconLink from "./IconLink";


export default function Footer(){
    const currentYear = new Date().getFullYear()
    return (
        <>
            <FooterFab />

            <Box
                component="footer"
                sx={{
                    background: 'linear-gradient(to right, color-mix(in srgb, var(--mui-palette-primary-main) 5%, transparent), color-mix(in srgb, var(--mui-palette-primary-main) 20%, transparent))',
                    borderTop: '2px solid color-mix(in srgb, var(--mui-palette-primary-main) 30%, transparent)',
                    marginTop: 'auto',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 -4px 20px color-mix(in srgb, var(--mui-palette-common-black) 5%, transparent)',
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
                        background: `radial-gradient(circle, color-mix(in srgb, var(--mui-palette-secondary-main) 12%, transparent) 0, color-mix(in srgb, var(--mui-palette-secondary-main) 0%, transparent) 70%)`,
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
                        background: `radial-gradient(circle, color-mix(in srgb, var(--mui-palette-secondary-main) 30%, transparent) 0%, color-mix(in srgb, var(--mui-palette-secondary-main) 12%, transparent) 70%)`,
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
                        background: 'radial-gradient(circle, color-mix(in srgb, var(--mui-palette-info-main) 8%, transparent) 0%, transparent 70%)',
                    }}
                />

                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: {sm: 'column', md: 'row'},
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: {sm: 2.5, md: 1.5},
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: {sm: 2.5, md: 0},
                            }}
                        >
                            <StarIcon
                                sx={{
                                    mr: 1,
                                    color: "var(--mui-palette-primary-main)",
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
                                        color: 'var(--mui-palette-secondary-main)',
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
                                        color: 'var(--mui-palette-primary-text)',
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
                                        color: 'var(--mui-palette-secondary-main)',
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
                                        color: 'var(--mui-palette-secondary-main)',
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
                            top: { sm: - 10, md: -15},
                            left: {sm: '15%', md: '30%'},
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 50%, transparent)',

                        }} />

                        <Box sx={{
                            position: 'absolute',
                            top: {sm: 0, md: -8},
                            right: {sm: '20%', md: '32%'},
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'color-mix(in srgb, var(--mui-palette-secondary-main) 50%, transparent)',

                        }} />

                        <Grid container sx={{position: 'relative', width: '100%'}} justifyContent="space-between" alignItems="center" spacing={2} >
                            <Grid size={{xs: 12, sm: 6}} display="flex" justifyContent={{sm: "start", xs: "center", md: 'start'}} >
                                <Box
                                    sx={{
                                        borderRadius: 24,
                                        px: 2.5,
                                        py: 1,
                                        width: 'fit-content',
                                        gap: 2,
                                        background:
                                            'linear-gradient(120deg, color-mix(in srgb, var(--mui-palette-primary-main) 30%, transparent), color-mix(in srgb, var(--mui-palette-secondary-main) 30%, transparent))',
                                        WebkitMask:
                                            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        backgroundColor:
                                            'color-mix(in srgb, var(--mui-palette-primary-light) 8%, transparent)',
                                        '@media (prefers-color-scheme: dark)': {
                                            backgroundColor:
                                                'color-mix(in srgb, var(--mui-palette-primary-dark) 15%, transparent)',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'var(--mui-palette-primary-text)',
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