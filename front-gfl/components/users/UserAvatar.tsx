'use client'
import { Avatar, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchUrl } from "utils/generalUtils";
import { ErrorBoundary } from "react-error-boundary";
import Image from "next/image";

function UserAvatarDisplay({ userId, name, avatarUrl, width = 120, height = 120, ...props }) {
    const [playerImage, setPlayerImage] = useState(null);

    useEffect(() => {
        if (avatarUrl) {
            // If we have a direct avatar URL (from Discord/Steam), use it
            setPlayerImage({ full: avatarUrl });
        } else if (userId && !playerImage) {
            // Otherwise try to fetch from backend
            fetchUrl(`/players/${userId}/pfp`)
                .then(image => {
                    setPlayerImage(image);
                })
                .catch(error => {
                    if (error.code !== 404)
                        console.error(`Failed to fetch avatar for user ${userId}:`, error);
                    setPlayerImage(null);
                });
        }
    }, [userId, avatarUrl]);

    const getAvatarColor = (name: string) => {
        if (!name) return '#757575';

        const colors = [
            '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
            '#FF9800', '#3F51B5', '#00BCD4', '#E91E63'
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    };

    const avatarKey = `avatar-${userId || 'user'}`;

    // If no image available, show initials
    if (!playerImage || !playerImage.full) {
        return <Avatar
            key={avatarKey}
            sx={{
                bgcolor: getAvatarColor(name),
                color: '#fff',
                fontWeight: 600,
                width: `${width}px`,
                height: `${height}px`,
                fontSize: `${width / 3}px`,
            }}
            {...props}
        >
            {name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'}
        </Avatar>
    }

    const style = { borderRadius: "50%", ...props.style }

    return <Image
        key={avatarKey}
        loading="lazy"
        title={name}
        alt={`${name}'s profile picture`}
        src={playerImage.full}
        width={width}
        height={height}
        style={style}
        {...props}
    />
}

function UserErrorAvatar() {
    const theme = useTheme();

    return (
        <Avatar
            sx={{
                bgcolor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
            }}
        >
            !
        </Avatar>
    );
}

export function UserAvatar(props) {
    return (
        <ErrorBoundary fallback={<UserErrorAvatar />}>
            <UserAvatarDisplay {...props} />
        </ErrorBoundary>
    );
}
