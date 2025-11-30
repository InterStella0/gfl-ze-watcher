"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Paper, Typography, Button } from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AutorenewIcon from "@mui/icons-material/Autorenew";

export default function StillCalculatingPlayer() {
    const [seconds, setSeconds] = useState(10);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();

    const onRetry = () => {
        setIsRefreshing(true);
        setSeconds(10);

        setTimeout(() => {
            router.refresh();
            setIsRefreshing(false);
        }, 1000);
    };

    useEffect(() => {
        if (seconds === 0) {
            onRetry();
            return;
        }

        const timer = setTimeout(() => {
            setSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    return (
        <Paper
            sx={{
                width: "100%",
                p: 4,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                minHeight: 260,
                opacity: isRefreshing ? 0.6 : 1,
                transition: "opacity 0.4s ease",
            }}
            elevation={0}
        >
            <HourglassEmptyIcon sx={{ fontSize: 48, color: "text.secondary" }} />

            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {isRefreshing ? "Refreshing data..." : "Calculating Player Stats..."}
            </Typography>

            <Typography
                variant="body2"
                sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}
            >
                <AccessTimeIcon sx={{ fontSize: "1rem" }} />
                Retrying in {seconds}s
            </Typography>

            <Button
                variant="outlined"
                startIcon={<AutorenewIcon sx={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />}
                onClick={onRetry}
                disabled={isRefreshing}
                sx={{ mt: 1 }}
            >
                {isRefreshing ? "Refreshing..." : "Retry Now"}
            </Button>

            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </Paper>
    );
}
