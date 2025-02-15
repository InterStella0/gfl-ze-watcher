import Box from "@mui/material/Box";
import {Skeleton} from "@mui/material";

export default function GraphSkeleton() {
    const [min, max] = [2, 80]
    return (
        <Box sx={{ width: "95%", height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 1, paddingX: 2 }}>
            <Skeleton variant="text" width="10%" height={15} sx={{ my: '.5rem' }} />
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, justifyContent: 'space-evenly', width: "90%" }}>
                {Array.from({ length: 50 }).map((_, index) => (
                    <Skeleton
                        key={index}
                        variant="rectangular"
                        width={8}
                        height={Math.random() * max + min}
                    />
                ))}
            </Box>
            <Skeleton variant="text" width="95%" height={15} sx={{ my: '.5rem' }} />
        </Box>
    );
}