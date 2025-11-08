import Box from "@mui/material/Box";
import {Chip, Stack} from "@mui/material";
import Typography from "@mui/material/Typography";

export default function ServerIndicator({ server, community }) {
    if (!server || !community) return null;

    return (
        <Box
            sx={{
                cursor: 'pointer',
                p: 1,
                borderRadius: 1.5,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-1px)',
                    '& .MuiChip-root': {
                        transform: 'scale(1.02)',
                    }
                },
                '&:active': {
                    transform: 'translateY(0px)',
                }
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
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
                        fontSize: '0.75rem'
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