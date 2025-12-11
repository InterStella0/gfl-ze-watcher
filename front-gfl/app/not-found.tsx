import {Box, Typography} from "@mui/material";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import * as React from "react";
import getServerUser from "./getServerUser.ts";

export default function NotFound() {
    const user = getServerUser();
    return <>
        <ResponsiveAppBar userPromise={user} server={null} setDisplayCommunity={null} />
        <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h1" color="secondary" fontWeight={900}>
                404
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                Page Not Found
            </Typography>
            <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                <Typography component="p" color="primary">
                    There is not such page!
                </Typography>
            </Box>
        </Box>
    </>
}