import { useState } from 'react';
import { Paper, IconButton,  Alert, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';

export default function InfoMessage({
    id = "map-info-message",
    message = "Player locations are based on Steam public profile."
}){
    // Check localStorage on mount to determine initial state
    const [isExpanded, setIsExpanded] = useState(() => {
        const savedState = localStorage.getItem(`infoMessage_${id}`);
        // Show by default (null) or if explicitly set to "expanded"
        return savedState !== "collapsed";
    });

    // Handle collapsing the message
    const handleCollapse = () => {
        setIsExpanded(false);
        // Save state to localStorage
        localStorage.setItem(`infoMessage_${id}`, "collapsed");
    };

    // Handle expanding the message
    const handleExpand = () => {
        setIsExpanded(true);
        localStorage.setItem(`infoMessage_${id}`, "expanded");
    };

    return (
        <div className="leaflet-bottom leaflet-left">
            {isExpanded ? (
                // Expanded alert message
                <Paper
                    className="leaflet-control"
                    elevation={2}
                    sx={{
                        margin: '10px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        maxWidth: '300px'
                    }}
                >
                    <Alert
                        icon={<InfoIcon fontSize="small" />}
                        severity="info"
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={handleCollapse}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        }
                        sx={{
                            px: 2,
                            py: 1,
                            '& .MuiAlert-icon': {
                                color: 'info.main',
                                opacity: 0.9,
                                alignItems: 'center'
                            },
                            '& .MuiAlert-message': {
                                fontSize: '0.85rem',
                                padding: 0,
                                opacity: 0.9
                            }
                        }}
                    >
                        {message}
                    </Alert>
                </Paper>
            ) : (
                // Collapsed button to re-open
                <Paper
                    className="leaflet-control"
                    elevation={2}
                    sx={{
                        margin: '10px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        width: 'auto'
                    }}
                >
                    <Tooltip title="Show info">
                        <IconButton
                            color="info"
                            size="small"
                            onClick={handleExpand}
                            sx={{
                                m: '2px',
                                backgroundColor: theme => theme.palette.background.paper,
                                '&:hover': {
                                    backgroundColor: theme => theme.palette.action.hover
                                }
                            }}
                        >
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>
            )}
        </div>
    );
};