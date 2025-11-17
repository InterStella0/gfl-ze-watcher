'use client'
import {useEffect, useRef, useState} from "react";
import {fetchUrl} from "utils/generalUtils";
import dayjs from "dayjs";
import {Alert, IconButton} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ANNOUNCEMENT_STORAGE_KEY = "dismissed_announcement_created_at";
const ROTATION_INTERVAL_MS = 5000;

export default function Announcement() {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchUrl("/announcements").then((data) => {
            const storedAt = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
            const dismissedAt = storedAt ? dayjs(storedAt) : null;

            const visible = data
                .sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)))
                .filter(a => !dismissedAt || dayjs(a.created_at).isAfter(dismissedAt));

            setAnnouncements(visible);
        });
    }, []);

    useEffect(() => {
        if (announcements.length <= 1) return;

        timerRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % announcements.length);
        }, ROTATION_INTERVAL_MS);

        return () => clearInterval(timerRef.current);
    }, [announcements]);

    const current = announcements[currentIndex];

    if (!current) return null;

    const handleClose = () => {
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, current.created_at);
        setAnnouncements([]);
    };

    return (
        <Alert
            severity="info"
            action={
                <IconButton color="inherit" size="small" onClick={handleClose}>
                    <CloseIcon fontSize="inherit" />
                </IconButton>
            }
        >
            {current.text}
        </Alert>
    );
}