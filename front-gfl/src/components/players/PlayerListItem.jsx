import {
    Box,
    Typography,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material';
import { PlayerAvatar } from "./PlayerAvatar.jsx";
import {addOrdinalSuffix, secondsToHours} from "../../utils/generalUtils.jsx";

const PlayerListItem = ({ player, mode = 'Total', navigate, serverId }) => (
    <ListItem
        sx={{
            borderRadius: 1,
            mb: 1,
            border: 1,
            borderColor: 'divider',
            cursor: 'pointer',
            '&:hover': {
                bgcolor: 'action.hover',
                transform: 'translateY(-1px)',
                boxShadow: 2
            },
            transition: 'all 0.2s ease'
        }}
        onClick={() => navigate(`/${serverId}/players/${player.id}`)}
    >
        <ListItemAvatar>
            <PlayerAvatar uuid={player.id} name={player.name} />
        </ListItemAvatar>
        <ListItemText
            primary={player.name}
            secondary={`${addOrdinalSuffix(player.rank)} Ranked`}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
                {secondsToHours(player[`${mode.toLowerCase()}_playtime`])}hr
            </Typography>
        </Box>
    </ListItem>
);

export default PlayerListItem;