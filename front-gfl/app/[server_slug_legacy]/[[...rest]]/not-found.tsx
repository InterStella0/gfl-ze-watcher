import {Box, Typography} from "@mui/material";

export default function NotFound() {
    return (
        <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h1" color="secondary" fontWeight={900}>
                404
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                Server Not Found
            </Typography>
            <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                <Typography component="p" color="primary">
                    The server you're looking for seems to have despawned or never existed.
                    Maybe it’s in another dimension?
                </Typography>
            </Box>
        </Box>
    );
}