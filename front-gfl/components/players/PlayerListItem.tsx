import {
    Box,
    Typography,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material';
import { PlayerAvatar } from "./PlayerAvatar";
import {addOrdinalSuffix, secondsToHours} from "utils/generalUtils";
import Link from "next/link";
import {PlayerTableRank, RankMode} from "types/players";
import {Server} from "types/community";

const PlayerListItem = ({ player, mode = 'Total', server }: { player: PlayerTableRank, mode: RankMode, server: Server}) => (
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
    >
        <ListItemAvatar>
            <PlayerAvatar uuid={player.id} name={player.name} />
        </ListItemAvatar>
        <ListItemText
            primary={player.name}
            secondary={`${addOrdinalSuffix(player.rank)} Ranked`}
            component={Link}
            href={`/servers/${server.gotoLink}/players/${player.id}`}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
                {secondsToHours(player[`${mode.toLowerCase()}_playtime`])}hr
            </Typography>
        </Box>
    </ListItem>
);

export default PlayerListItem;