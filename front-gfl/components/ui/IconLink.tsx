'use client'
import {alpha, IconButton, Tooltip, useTheme} from "@mui/material";

export default function IconLink({ href, ariaLabel, icon, tooltip }){
    const theme = useTheme();

    return (
        <Tooltip title={tooltip} arrow placement="top">
            <IconButton
                component="a"
                href={href}
                aria-label={ariaLabel}
                target="_blank"
                rel="noopener noreferrer"
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
                {icon}
            </IconButton>
        </Tooltip>
    );
};
