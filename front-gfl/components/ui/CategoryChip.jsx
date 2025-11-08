import { Box, useTheme } from "@mui/material";

const CATEGORY_COLORS = {
    'casual': {
        color: 'success.main',
        bgLight: 'rgba(76, 175, 80, 0.1)',
        bgDark: 'rgba(76, 175, 80, 0.15)'
    },
    'tryhard': {
        color: 'error.main',
        bgLight: 'rgba(211, 47, 47, 0.1)',
        bgDark: 'rgba(211, 47, 47, 0.15)'
    },
    'mixed': {
        color: 'primary.main',
        bgLight: 'rgba(63, 117, 208, 0.1)',
        bgDark: 'rgba(63, 117, 208, 0.15)'
    }
};

export default function CategoryChip({ category, size = "medium", ...other }) {
    const theme = useTheme();
    const colorInfo = CATEGORY_COLORS[category] || {
        color: 'text.secondary',
        bgLight: 'rgba(0, 0, 0, 0.1)',
        bgDark: 'rgba(255, 255, 255, 0.1)'
    };

    // Adjust padding based on size
    const padding = size === "small" ? { px: 1.5, py: 0.4 } : { px: 2, py: 0.5 };
    const fontSize = size === "small" ? "0.75rem" : "0.875rem";

    return (
        <Box
            component="span"
            sx={{
                ...padding,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? colorInfo.bgDark : colorInfo.bgLight,
                color: colorInfo.color,
                border: '1px solid',
                borderColor: colorInfo.color,
                fontSize: fontSize,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                ...other.sx
            }}
            title={other.title || `Player Type: ${category}`}
        >
            {category}
        </Box>
    );
}