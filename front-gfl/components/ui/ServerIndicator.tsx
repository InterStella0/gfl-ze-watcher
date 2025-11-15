import Box from "@mui/material/Box";
import {Chip, Stack} from "@mui/material";
import Typography from "@mui/material/Typography";
import {CommunityBase, Server} from "types/community";
import {Dispatch} from "react";

export default function ServerIndicator(
    { server, community, setDisplayCommunity }
    : { server: Server; community: CommunityBase; setDisplayCommunity: Dispatch<boolean> | null }
) {
    if (!server || !community) return null;

    const isClickable = setDisplayCommunity !== null
    const onHover = isClickable? {
        cursor: 'pointer',
        '&:hover': {
            transform: 'translateY(-1px)',
            '& .MuiChip-root': {
                transform: 'scale(1.02)',
            }
        },
        '&:active': {
            transform: 'translateY(0px)',
        }
    }: {}
    return (
        <Box
            sx={{
                p: 1,
                borderRadius: 1.5,
                transition: 'all 0.2s ease-in-out',
                ...onHover
            }}
            onClick={() => setDisplayCommunity?.(true)}
        >
            <Stack direction="row" gap={1} alignItems="center">
                <Chip
                    label={community.name}
                    variant="filled"
                    size="small"
                    sx={{
                        maxWidth: '120px',
                        height: '24px',
                        transition: 'transform 0.2s ease-in-out',
                        '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem'
                        },
                        color: 'white',
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                    }}
                >
                    /
                </Typography>
                <Chip
                    label={server.name}
                    variant="outlined"
                    size="small"
                    sx={{
                        maxWidth: '160px',
                        height: '24px',
                        transition: 'transform 0.2s ease-in-out',
                        '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem'
                        },
                    }}
                />
            </Stack>
        </Box>
    );
}