'use client'
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {ButtonGroup, MenuItem, Select, useTheme} from "@mui/material";
import Button from "@mui/material/Button";
import PlayerPlayTimeGraph from "./PlayTimeGraph";
import {useEffect, useState} from "react";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import {Server} from "types/community.ts";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";

export default function PlayerDetailHourBar({ player, server }: { server: Server, player: ServerPlayerDetailed }){
    const theme = useTheme();
    const [groupByTime, setGroupByTime] = useState<"daily" | "monthly" | "yearly">("daily")
    const [isClient, setIsClient] = useState<boolean>(false);
    const isDark = isClient && theme.palette.mode === "dark"

    useEffect(() => {
        setIsClient(true);
    }, [])

    const handleGroupChange = (e: any) => {
        setGroupByTime(e.target.value)
    }

    return <Box
        sx={{
            backgroundColor: 'background.paper',
            borderRadius: 1,
            overflow: 'hidden',
        }}
    >
        <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexDirection={{sm: 'row', xs: 'column'}}
            gap=".5rem"
            p={1.5}
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                color: 'text.primary',
                fontWeight: 500,
                fontSize: '0.9rem',
            }}
        >
            <Typography>
                Play Time History
            </Typography>
            <Box>
                <ButtonGroup
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Button
                        disableRipple
                        sx={{
                            cursor: 'default',
                            backgroundColor: isDark
                                ? theme.palette.primary.light
                                : theme.palette.primary.main,
                            color: isDark ? 'black' : 'white',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                            '&:hover': {
                                backgroundColor: isDark
                                    ? theme.palette.primary[200]
                                    : theme.palette.primary.dark,
                            },
                        }}
                    >
                        Group By
                    </Button>

                    <Select
                        value={groupByTime}
                        onChange={handleGroupChange}
                        variant="outlined"
                        sx={{
                            color: theme.palette.primary.main,
                            backgroundColor: 'transparent',
                            fontWeight: 500,
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                            '& .MuiSelect-select': {
                                padding: '6px 16px',
                            },
                            '& fieldset': {
                                border: 'none',
                            },
                        }}
                    >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                </ButtonGroup>
            </Box>
        </Box>

        <Box sx={{ p: 1, height: '240px' }}>
            <PlayerPlayTimeGraph groupBy={groupByTime} player={player} server={server} />
        </Box>
    </Box>
}