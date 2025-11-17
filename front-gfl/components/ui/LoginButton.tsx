'use client'
import {Avatar, Button, Divider, IconButton, Menu, MenuItem} from "@mui/material";
import {DiscordUser} from "types/users";
import {useAuth} from "utils/auth";
import {useState} from "react";
import Typography from "@mui/material/Typography";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginDialog from "./LoginDialog";

function UserMenu() {
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
    };

    const getAvatarSrc = () => {
        if (user?.avatar && user?.id) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        }
        return null;
    };

    return (
        <>
            <IconButton onClick={handleClick}>
                <Avatar
                    sx={{ width: 32, height: 32 }}
                    src={getAvatarSrc()}
                >
                    {user?.global_name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                        {user?.global_name}
                    </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                    Logout
                </MenuItem>
            </Menu>
        </>
    );
}

export default function LoginButton({user}: { user: DiscordUser | null}){
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

    const handleLoginClick = () => {
        setLoginDialogOpen(true);
    };
    return <>
        {
        user ? (
        <UserMenu />
    ) : (
        <Button
            onClick={handleLoginClick}
            variant="outlined"
            size="small"
        >
            Login
        </Button>
    )}
        <LoginDialog
            open={loginDialogOpen}
            onClose={() => setLoginDialogOpen(false)}
        />
    </>
}