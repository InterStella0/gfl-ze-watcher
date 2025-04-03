import { Avatar, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fetchServerUrl } from "../../utils.jsx";
import { ErrorBoundary } from "react-error-boundary";
import { Helmet } from "@dr.pogodin/react-helmet";
function PlayerAvatarDisplay({ uuid, name, helmet = false, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const [size, setSize] = useState(0);
  const avatarRef = useRef(null);
  const [playerImage, setPlayerImage] = useState(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
    );

    if (avatarRef.current) {
      observer.observe(avatarRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!avatarRef.current) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width);
    });

    resizeObserver.observe(avatarRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !playerImage) {
      fetchServerUrl(`/players/${uuid}/pfp`).then(setPlayerImage);
    }
  }, [isVisible, uuid, playerImage]);

  // Generate a stable color based on name for the avatar background
  // when no image is available
  const getAvatarColor = (name) => {
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

  // Get initial letter for the avatar fallback
  const getInitial = (name) => {
    return name.charAt(0).toUpperCase();
  };

  return (
      <>
        {helmet && (
            <Helmet>
              <meta property="og:image" content={playerImage?.full ?? '/favicon.png'} />
              <meta property="twitter:image" content={playerImage?.full ?? '/favicon.png'} />
            </Helmet>
        )}

        <Avatar
            slotProps={{
              img: {
                loading: "lazy",
                title: name
              }
            }}
            title={name}
            alt={`${name}'s profile picture`}
            ref={avatarRef}
            src={playerImage && (size > 100 ? playerImage.full : playerImage.medium)}
            sx={{
              bgcolor: !playerImage ? getAvatarColor(name) : undefined,
              color: !playerImage ? '#fff' : undefined,
              fontWeight: !playerImage ? 600 : undefined,
              ...(isDarkMode && !playerImage ? {
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
              } : {}),
              ...props.sx
            }}
            {...props}
        >
          {!playerImage && getInitial(name)}
        </Avatar>
      </>
  );
}

function PlayerErrorAvatar() {
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

export function PlayerAvatar(props) {
  return (
      <ErrorBoundary fallback={<PlayerErrorAvatar />}>
        <PlayerAvatarDisplay {...props} />
      </ErrorBoundary>
  );
}