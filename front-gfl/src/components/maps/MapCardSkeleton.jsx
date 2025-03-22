import Paper from "@mui/material/Paper";
import {Box, Skeleton} from "@mui/material";
import {simpleRandom} from "../../utils.jsx";

export default function MapCardSkeleton() {
    return (
        <Paper
            sx={{
                flex: "0 0 auto",
                width: 180,
                borderRadius: "8px",
                overflow: "hidden",
                transition: "all 0.2s ease",
                position: "relative",

            }}
        >
            <Box sx={{ position: "relative", width: "100%", height: 100 }}>
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                        p: 1,
                    }}
                >
                    <Skeleton variant="text" width={40} height={20} sx={{
                        position: "absolute",
                        bottom: 0, right: 0,
                        borderRadius: "4px",
                        m: '.5rem' }} />
                </Box>
            </Box>

            <Box sx={{ p: 1.25 }}>
                <Skeleton variant="text" width={simpleRandom(70, 120)} height="1.4rem" />
                <Skeleton variant="text" width="60%" height='1.2rem' sx={{ mt: 0.5, mb: '.2rem' }} />
            </Box>
        </Paper>
    );
}