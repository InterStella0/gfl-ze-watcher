import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
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
import { useNavigate, useParams } from "react-router";
import ErrorCatch from "./ErrorMessage.jsx";
import ServerProvider from "./ServerProvider.jsx";

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
export const getServerAvatarText = (name) => {
    const words = name.split(' ');
    return words.length >= 2 ? words[0][0] + words[1][0] : name.substring(0, 2);
}
const COMMUNITY_COLLAPSE = "community"
function CommunitySelector({ openDrawer = false, onClose }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const navigate = useNavigate();
    const { server_id } = useParams();
    const communities = useContext(ServerProvider);
    const isCollapsedLast = localStorage.getItem(COMMUNITY_COLLAPSE)
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedLast === "true");
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedCommunityIndex, setExpandedCommunityIndex] = useState(null);

    useEffect(() => {
        localStorage.setItem(COMMUNITY_COLLAPSE, isCollapsed.toString())
    }, [isCollapsed]);
    const drawerWidth = isCollapsed ? 72 : 280;

    const selectedCommunityIndex = useMemo(() => {
        return communities.findIndex(community =>
            community.servers.some(server => server.id === server_id)
        );
    }, [communities, server_id]);

    useEffect(() => {
        setIsMobileOpen(openDrawer);
    }, [openDrawer]);

    useEffect(() => {
        if (selectedCommunityIndex !== -1 && !isCollapsed) {
            setExpandedCommunityIndex(selectedCommunityIndex);
        }
    }, [selectedCommunityIndex, isCollapsed]);

    const getStatusColor = useCallback((status) => {
        return status ? '#4CAF50' : '#f44336';
    }, []);

    const handleToggleCommunity = useCallback((index) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setTimeout(() => setExpandedCommunityIndex(index), 200);
        } else {
            setExpandedCommunityIndex(prev => prev === index ? null : index);
        }
    }, [isCollapsed]);

    const handleSelectServer = useCallback((server) => {
        navigate(`/${server.id}`);
        if (isMobile) {
            setIsMobileOpen(false);
            onClose?.();
        }
    }, [navigate, isMobile, onClose]);

    const handleToggleDrawer = useCallback(() => {
        if (isMobile) {
            setIsMobileOpen(prev => !prev);
            onClose?.();
        } else {
            setIsCollapsed(prev => {
                if (!prev) setExpandedCommunityIndex(null);
                return !prev;
            });
        }
    }, [isMobile, onClose]);

    const handleDrawerClose = useCallback(() => {
        setIsMobileOpen(false);
        onClose?.();
    }, [onClose]);

    const drawerContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper'
        }}>
            <Box sx={{
                padding: "18px 25px",
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                background: theme.palette.mode === "light"
                    ? "linear-gradient(to right, #fff1f9, #fff1f8)"
                    : "linear-gradient(to right, #1a1a1f, #1a1a1e)",
                borderBottom: `2px solid ${theme.palette.mode === "light" ? "#ffd6eb" : "#41344d"}`,
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
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => handleToggleCommunity(communityIndex)}
                                    selected={expandedCommunityIndex === communityIndex && !isCollapsed}
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
                                    <Avatar
                                        sx={{
                                            width: isCollapsed ? 32 : 40,
                                            height: isCollapsed ? 32 : 40,
                                            fontSize: isCollapsed ? '0.75rem' : '1rem',
                                            bgcolor: selectedCommunityIndex === communityIndex ? 'primary.main' : 'grey.400',
                                            color: 'white',
                                            mr: isCollapsed ? 0 : 2,
                                            transition: 'all 0.2s'
                                        }}
                                        src={community.icon_url}
                                    >
                                        {getServerAvatarText(community.name).toUpperCase()}
                                    </Avatar>

                                    {isCollapsed && selectedCommunityIndex === communityIndex && (
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                                transform: expandedCommunityIndex === communityIndex ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                color: 'text.secondary',
                                                fontSize: 20
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>

                            <Collapse in={expandedCommunityIndex === communityIndex && !isCollapsed} timeout="auto">
                                <List sx={{ pl: 2, pr: 1, py: 0.5 }}>
                                    {community.servers.map((server) => {
                                        const isSelected = server.id === server_id;
                                        return (
                                            <ListItem key={server.id} disablePadding sx={{ mb: 0.5 }}>
                                                <ListItemButton
                                                    onClick={() => handleSelectServer(server)}
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
                                                            color: getStatusColor(server.status),
                                                            mr: 2,
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                color: isSelected ? 'inherit' : 'text.primary',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                lineHeight: 1.2,
                                                                mb: 0.25
                                                            }}
                                                            title={server.name}
                                                        >
                                                            {server.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: isSelected ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                                                display: 'block'
                                                            }}
                                                        >
                                                            {server.players}/{server.max_players} players
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
            }}
        >
            {drawerContent}
        </Drawer>
    );
}

function CommunitySelectorDisplay({ openDrawer = false, onClose = () => {} }) {
    return (
        <ErrorCatch>
            <CommunitySelector openDrawer={openDrawer} onClose={onClose} />
        </ErrorCatch>
    );
}

export default CommunitySelectorDisplay;