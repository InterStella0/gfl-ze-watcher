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
            transition: 'all 0.2s ease'
        }}
    >
        <ListItemAvatar>
            <PlayerAvatar uuid={player.id} name={player.name} width={40} height={40} anonymous={player.is_anonymous} />
        </ListItemAvatar>
        {player.is_anonymous?
            <ListItemText
                primary="Anonymous"
                secondary={`${addOrdinalSuffix(player.rank)} Ranked`}
            />:<ListItemText
                primary={player.name}
                secondary={`${addOrdinalSuffix(player.rank)} Ranked`}
                // @ts-ignore
                component={Link}
                href={`/servers/${server.gotoLink}/players/${player.id}`}
            />

        }
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
                {secondsToHours(player[`${mode.toLowerCase()}_playtime`])}hr
            </Typography>
        </Box>
    </ListItem>
);

export default PlayerListItem;