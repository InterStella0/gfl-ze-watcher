import {Box, Typography, Paper} from "@mui/material";
import LockIcon from '@mui/icons-material/Lock';

export default function AccessDenied() {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 4,
                    textAlign: 'center',
                    maxWidth: 500,
                }}
            >
                <LockIcon
                    sx={{
                        fontSize: 64,
                        color: 'error.main',
                        mb: 2,
                    }}
                />
                <Typography variant="h4" gutterBottom>
                    Access Denied
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    This player has chosen to anonymize their profile. You need to be logged in as this player, or be a community administrator to view this profile.
                </Typography>
            </Paper>
        </Box>
    );
}
