import {
    Box,
    Typography,
    ListItem,
    Badge
} from '@mui/material';
import { Circle } from '@mui/icons-material';
import { PlayerAvatar } from "./PlayerAvatar";
import Link from "@mui/material/Link";

type statusType = 'online' | 'offline' | 'away' | 'playing'
const getStatusColor = (status: statusType): string => {
    switch (status) {
        case 'online':
        case 'playing':
            return 'success.main';
        case 'away':
            return 'warning.main';
        case 'offline':
            return 'grey.500';
        default:
            return 'grey.500';
    }
};

const getRankColor = (rank: number): string => {
    if (rank === 1) return '#ffd700';
    if (rank === 2) return '#c0c0c0';
    if (rank === 3) return '#cd7f32';
    return 'text.primary';
};

const LeaderboardItem = ({ item, server }) => (
    <ListItem
        sx={{
            py: 1,
            cursor: 'pointer',
            borderRadius: 1,
            '&:hover': {
                bgcolor: 'action.hover',
                transform: 'translateY(-1px)',
                boxShadow: 1
            },
            transition: 'all 0.2s ease'
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            <Typography
                variant="h6"
                fontWeight="bold"
                color={getRankColor(item.rank)}
                sx={{ minWidth: 30, textAlign: 'center' }}
            >
                {item.rank}
            </Typography>
            <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                    <Circle
                        sx={{
                            color: getStatusColor(item.status),
                            fontSize: 10
                        }}
                    />
                }
            >
                <PlayerAvatar uuid={item.id} name={item.name} />
            </Badge>
            <Typography component={Link} variant="body1" sx={{ flex: 1 }} href={`/servers/${server.gotoLink}/players/${item.id}`}>
                {item.name}
            </Typography>
            <Typography variant="body1" color="primary.main" fontWeight={600}>
                {item.time}hr
            </Typography>
        </Box>
    </ListItem>
);

export default LeaderboardItem;