'use client'

import {alpha, Fab} from "@mui/material";
import theme from "../../theme";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {useEffect, useState} from "react";

export default function FooterFab(){
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (!showScrollTop)
        return <></>

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return <Fab
            size="small"
            aria-label="scroll back to top"
            onClick={scrollToTop}
            sx={{
                position: 'fixed',
                bottom: theme.spacing(3),
                right: theme.spacing(3),
                backgroundColor: alpha(theme.palette.primary.main, 0.15),
                color: theme.palette.secondary.main,
                zIndex: theme.zIndex.speedDial,
                boxShadow: theme.shadows[2],
                transition: theme.transitions.create(['background-color', 'transform'], {
                    duration: theme.transitions.duration.standard,
                }),
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.25),
                    transform: 'translateY(-3px)',
                    boxShadow: theme.shadows[4],
                }
            }}
        >
            <KeyboardArrowUpIcon />
        </Fab>
}
