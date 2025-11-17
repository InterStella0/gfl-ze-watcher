'use client'
import {alpha, IconButton, Tooltip, useColorScheme, useMediaQuery, useTheme} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

export default function ThemeToggle(){
    const theme = useTheme();
    const { mode, setMode } = useColorScheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    let nextMode;
    switch (mode) {
        case "system":
            nextMode = prefersDarkMode ? "light": "dark";
            break;
        case "dark":
            nextMode = "light";
            break;
        case "light":
            nextMode = "dark";
            break;
    }

    const modeButtonIcon = nextMode === "dark" ? <DarkModeIcon /> : <LightModeIcon />;

    return (
        <Tooltip title={`Switch to ${nextMode} mode`} arrow placement="top">
            <IconButton
                onClick={() => setMode(nextMode)}
                sx={{
                    color: 'text.secondary',
                    transition: theme.transitions.create(['background-color', 'transform', 'color'], {
                        duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                        color: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                {modeButtonIcon}
            </IconButton>
        </Tooltip>
    );
};