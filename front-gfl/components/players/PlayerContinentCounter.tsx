'use client'
import {Box, LinearProgress, Stack, Typography, useTheme} from "@mui/material";
import {ContinentStatistics} from "types/players.ts";

export default function PlayerContinentCounter({ continentData, truncate = 3 }: { continentData: ContinentStatistics, truncate?: number }) {
    const theme = useTheme()
    const continentColors = {
        "North America": "#4CAF50",
        "South America": "#8BC34A",
        "Europe": "#2196F3",
        "Asia": "#F44336",
        "Africa": "#FF9800",
        "Oceania": "#9C27B0",
        "Antarctica": "#00BCD4",
        "Seven seas (open ocean)": "#00e1ff",
    };

    const sortedContinents = continentData?.continents
        ? [...continentData.continents].sort((a, b) => b.count - a.count)
        : [];

    return <Box sx={{ mt: 2 }}>
        <Stack spacing={1}>
            {sortedContinents.slice(0, truncate).map((continent) => {
                const percentage = ((continent.count / continentData.contain_countries) * 100).toFixed(2);
                const color = continentColors[continent.name] || theme.palette.primary.main;

                return (
                    <Box key={continent.name}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                {continent.name}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {percentage}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={parseFloat(percentage)}
                            sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: `${color}20`,
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 2,
                                    backgroundColor: color
                                }
                            }}
                        />
                    </Box>
                );
            })}
        </Stack>
    </Box>
}