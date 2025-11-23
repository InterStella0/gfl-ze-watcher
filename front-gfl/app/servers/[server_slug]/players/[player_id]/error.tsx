"use client"
import {notFound} from "next/navigation";
import {Box, Typography} from "@mui/material";

export default function ErrorBoundary({ error }: { error: Error }){
    if (error.message === "Player not found")
        notFound()

    if (error.message === "Data is not ready")
        return <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h1" color="secondary" fontWeight={900}>
                Calculating...
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                Please be nice~
            </Typography>
            <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                <Typography component="p" color="primary">
                    Sorry, this player's information is still being calculated. Please come back later~
                </Typography>
            </Box>
        </Box>
    else
        return <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h1" color="secondary" fontWeight={900}>
                :/
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
                Something went wrong :/
            </Typography>
            <Box sx={{ margin: "2rem auto", maxWidth: "500px", mt: 3 }}>
                <Typography component="p" color="primary">
                    Something went wrong trying to load this player.
                </Typography>
            </Box>
        </Box>
}