import {Box, Typography} from "@mui/material";

export default function NotFound() {
    return (
        <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h1" color="secondary" fontWeight={900}>
                404
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                Map Not Found
            </Typography>
            <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                <Typography component="p" color="primary">
                    The map you're trying to look for does not exist for this server!
                </Typography>
            </Box>
        </Box>
    );
}