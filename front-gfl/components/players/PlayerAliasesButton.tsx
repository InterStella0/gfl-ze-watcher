'use client'
import {useState} from "react";
import {IconButton, List, ListItem, ListItemText, Paper} from "@mui/material";
import dayjs from "dayjs";
import {ExpandLess, ExpandMore} from "@mui/icons-material";

export default function PlayerAliasesButton({ aliases }){
    const [expanded, setExpanded] = useState(false);
    return <>
        <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': {
                    backgroundColor: 'action.hover',
                }
            }}
        >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
        {expanded && (
            <Paper
                elevation={3}
                sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 10,
                    mt: 0.5,
                    maxHeight: '200px',
                    width: { xs: '220px', sm: '250px' },
                    overflowY: "auto",
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <List dense disablePadding>
                    {aliases.map((alias, i) => (
                        <ListItem key={i} disablePadding sx={{
                            borderBottom: i < aliases.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider'
                        }}>
                            <ListItemText
                                primary={alias.name}
                                secondary={dayjs(alias.created_at).format("lll")}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                }}
                                secondaryTypographyProps={{
                                    variant: 'caption',
                                }}
                                sx={{ px: 2, py: 0.5 }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        )}
    </>
}