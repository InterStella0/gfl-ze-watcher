'use client'
import {useContext, useEffect, useState, useCallback, useMemo} from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    Typography,
    IconButton,
    Collapse,
    useTheme,
    useMediaQuery,
    Avatar
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    Close,
    ExpandMore,
    Circle
} from '@mui/icons-material';
import ErrorCatch from "./ErrorMessage.jsx";
import ServerProvider from "./ServerProvider";
import {Server} from "types/community";
import {useRouter} from "next/navigation";

export function Logo() {
    const theme = useTheme();
    const mode = theme.palette.mode;

    return (
        <Box className="logo" sx={{ alignItems: "center", gap: 2 }}>
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
                ZE Graph
            </Typography>
        </Box>
    );
}

export const getServerAvatarText = (name: string) => {
    const words = name.split(' ');
    return words.length >= 2 ? words[0][0] + words[1][0] : name.substring(0, 2);
}

const COMMUNITY_COLLAPSE = "community"

const getStatusColor = (status) => {
    return status ? '#4CAF50' : '#f44336';
};

function CommunitySelector({ server, setDisplayCommunity, displayCommunity }: {
    server: Server | null,
    displayCommunity: boolean,
    setDisplayCommunity: (value: boolean) => void
}) {

    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery('(max-width:750px)');
    const isCollapseDefault = useMediaQuery(theme.breakpoints.down('lg'));
    const {communities, serversMapped } = useContext(ServerProvider);

    const server_id = server?.id
    const communitySelected = serversMapped[server_id]?.community?.id
    const openDrawer = displayCommunity
    const onClose = () => setDisplayCommunity(false)

    const isCollapsedLast = useMemo(() => {
        if (!isClient) return "false";
        return localStorage.getItem("COMMUNITY_COLLAPSE") ?? "false";
    }, [isClient, server]);

    const [isCollapsed, setIsCollapsed] = useState(false); // Default value for SSR
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedCommunitySelected, setExpandedCommunitySelect] = useState(null);

    useEffect(() => {
        setIsClient(true);
        const savedCollapse = localStorage.getItem(COMMUNITY_COLLAPSE);
        if (savedCollapse !== null) {
            setIsCollapsed(savedCollapse === "true");
        }
    }, []);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem(COMMUNITY_COLLAPSE, isCollapsed.toString());
        }
    }, [isCollapsed, isClient]);


    useEffect(() => {
        if (!isCollapsed && communitySelected) {
            setExpandedCommunitySelect(communitySelected);
        }
    }, [isCollapsed, communitySelected]);

    useEffect(() => {
        if (!expandedCommunitySelected && communitySelected) {
            setExpandedCommunitySelect(communitySelected);
        }
    }, [communitySelected, expandedCommunitySelected]);

    useEffect(() => {
        setIsMobileOpen(openDrawer);
    }, [openDrawer]);

    const drawerWidth = isCollapsed ? 72 : 280;
    const handleToggleCommunity = useCallback((communityId) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setTimeout(() => setExpandedCommunitySelect(communityId), 200);
        } else {
            setExpandedCommunitySelect(prev => prev === communityId ? null : communityId);
        }
    }, [isCollapsed, expandedCommunitySelected]);

    const handleSelectServer = useCallback((server) => {
        router.push(`/servers/${server.gotoLink}`);
        if (isMobile) {
            setIsMobileOpen(false);
            onClose?.();
        }
    }, [router, isMobile, onClose]);

    const handleToggleDrawer = useCallback(() => {
        if (isMobile) {
            setIsMobileOpen(prev => !prev);
            onClose?.();
        } else {
            setIsCollapsed(prev => {
                if (!prev) setExpandedCommunitySelect(null);
                return !prev;
            });
        }
    }, [isMobile, onClose, isCollapsed]);

    const handleDrawerClose = useCallback(() => {
        setIsMobileOpen(false);
        onClose?.();
    }, [onClose]);

    const drawerContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Box sx={{
                padding: "18px 25px",
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                height: '80px',
                background: 'linear-gradient(to right, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), color-mix(in srgb, var(--mui-palette-primary-main) 3%, transparent))',
                borderBottom: '2px solid color-mix(in srgb, var(--mui-palette-primary-main) 30%, transparent)',
            }}>
                {!isCollapsed && <Logo />}
                <IconButton
                    onClick={handleToggleDrawer}
                    size="small"
                    sx={{ ml: isCollapsed ? 0 : 'auto' }}
                >
                    {isMobile ? <Close /> : isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ p: isCollapsed ? 1 : 2, pt: 2, flex: 1, overflow: 'auto' }}>
                {!isCollapsed && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, lineHeight: 1.4 }}
                    >
                        <strong>Communities</strong><br/>
                        Switch between game servers<br/>
                        <span style={{ fontSize: '0.65rem' }}>
                            Tracking {communities.reduce((a, b) => a + b.players, 0)} players
                        </span>
                    </Typography>
                )}

                <List sx={{ p: 0 }}>
                    {communities.map((community, communityIndex) => (
                        <Box key={community.id || communityIndex}>
                            {/* Community Item */}
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => handleToggleCommunity(community.id)}
                                    selected={expandedCommunitySelected === community.id && !isCollapsed}
                                    sx={{
                                        borderRadius: 2,
                                        minHeight: 48,
                                        px: isCollapsed ? 1.5 : 2,
                                        position: 'relative',
                                        '&.Mui-selected': {
                                            bgcolor: 'action.selected',
                                            '&:hover': {
                                                bgcolor: 'action.selected',
                                            }
                                        }
                                    }}
                                >
                                    <Box flexDirection="row" alignItems="space-between" alignContent="center" width='100%' display="flex">
                                        <Avatar
                                            sx={{
                                                width: isCollapsed ? 32 : 40,
                                                height: isCollapsed ? 32 : 40,
                                                fontSize: isCollapsed ? '0.75rem' : '1rem',
                                                bgcolor: communitySelected === community.id ? 'primary.main' : 'grey.400',
                                                border: communitySelected === community.id ? '2px solid': 'none',
                                                borderColor: communitySelected === community.id ? 'primary.main': 'transparent',
                                                color: 'white',
                                                mr: isCollapsed ? 0 : 2,
                                                transition: 'all 0.2s'
                                            }}
                                            src={community.icon_url}
                                        >
                                            {getServerAvatarText(community.name).toUpperCase()}
                                        </Avatar>

                                        {isCollapsed && expandedCommunitySelected === community.id && (
                                            <Circle
                                                sx={{
                                                    fontSize: 8,
                                                    color: theme.palette.primary.main,
                                                    position: 'absolute',
                                                    top: 6,
                                                    right: 6
                                                }}
                                            />
                                        )}

                                        <Collapse in={!isCollapsed} orientation="horizontal">
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            flex: 1
                                                        }}
                                                    >
                                                        {community.name}
                                                    </Typography>
                                                    <Circle
                                                        sx={{
                                                            fontSize: 8,
                                                            color: getStatusColor(community.status)
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: isCollapsed? 'none': 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        👥 {community.players}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {community.status ? 'Online' : 'Offline'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Collapse>

                                        {!isCollapsed && (
                                            <ExpandMore
                                                sx={{
                                                    transform: expandedCommunitySelected === community.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s',
                                                    color: 'text.secondary',
                                                    fontSize: 20,
                                                    marginLeft: 'auto',
                                                    marginTop: 'auto',
                                                    marginBottom: 'auto'
                                                }}
                                            />
                                        )}
                                    </Box>
                                </ListItemButton>
                            </ListItem>

                            {/* Server List */}
                            <Collapse in={expandedCommunitySelected === community.id && !isCollapsed} timeout="auto">
                                <List sx={{ pl: 2, pr: 1, py: 0.5 }}>
                                    {community.servers.map((communityServer) => {
                                        const isSelected = communityServer.gotoLink === server?.gotoLink;
                                        return (
                                            <ListItem key={communityServer.id} disablePadding sx={{ mb: 0.5 }}>
                                                <ListItemButton
                                                    onClick={() => handleSelectServer(communityServer)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        py: 1.5,
                                                        px: 2,
                                                        bgcolor: isSelected ? 'primary.main' : 'background.paper',
                                                        color: isSelected ? 'primary.contrastText' : 'text.primary',
                                                        border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                                        '&:hover': {
                                                            bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                                                        },
                                                        '&.Mui-selected': {
                                                            bgcolor: 'primary.main',
                                                            color: 'primary.contrastText',
                                                            '&:hover': {
                                                                bgcolor: 'primary.dark',
                                                            }
                                                        }
                                                    }}
                                                    selected={isSelected}
                                                >
                                                    <Circle
                                                        sx={{
                                                            fontSize: 8,
                                                            color: getStatusColor(communityServer.status),
                                                            mr: 2,
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: isSelected? 700:500,
                                                                color: isSelected ? 'rgba(255,255,255)'  : 'text.primary',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                lineHeight: 1.2,
                                                                mb: 0.25
                                                            }}
                                                            title={communityServer.name}
                                                        >
                                                            {communityServer.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: isSelected ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                                                display: 'block'
                                                            }}
                                                        >
                                                            {communityServer.players}/{communityServer.max_players} players
                                                        </Typography>
                                                    </Box>
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        </Box>
                    ))}
                </List>
            </Box>
        </Box>
    );

    // ============================================
    // RENDER: Drawer Wrapper
    // ============================================

    const hiddenOnServer = !isClient? {'@media(max-width: 1200px)': {
            display: 'none'
        }}: {}

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? isMobileOpen : true}
            onClose={handleDrawerClose}
            sx={{
                width: isMobile ? 280 : drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: isMobile ? 280 : drawerWidth,
                    boxSizing: 'border-box',
                    position: isMobile ? 'fixed' : 'static',
                    height: '100%',
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    overflowX: 'hidden',
                    border: 'none'
                },
                ...hiddenOnServer
            }}
        >
            {drawerContent}
        </Drawer>
    );
}

function CommunitySelectorDisplay({ server, displayCommunity, setDisplayCommunity }
                                  : { server: Server | null, displayCommunity: boolean, setDisplayCommunity: (value: boolean) => void }) {
    return (
        <ErrorCatch message="Community selector has an error :/">
            <CommunitySelector server={server} displayCommunity={displayCommunity} setDisplayCommunity={setDisplayCommunity} />
        </ErrorCatch>
    );
}

export default CommunitySelectorDisplay;