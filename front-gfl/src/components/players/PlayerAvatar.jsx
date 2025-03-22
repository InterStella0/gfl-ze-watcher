import { Avatar } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fetchUrl } from "../../utils.jsx";
import {ErrorBoundary} from "react-error-boundary";



function PlayerAvatarDisplay({ uuid, name, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const [size, setSize] = useState(0);
  const avatarRef = useRef(null)
  const [ playerImage, setPlayerImage ] = useState(null)

  // Intersection Observer for visibility detection
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

  // Resize Observer to detect avatar size
  useEffect(() => {
    if (!avatarRef.current) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width);
    });

    resizeObserver.observe(avatarRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch the appropriate image based on avatar size
  useEffect(() => {
    if (isVisible && !playerImage) {
      fetchUrl(`/players/${uuid}/pfp`).then(setPlayerImage)
    }
  }, [isVisible, uuid, playerImage]);

  return <Avatar ref={avatarRef} src={playerImage && (size > 100 ? playerImage.full: playerImage.medium)} {...props}>
    {!playerImage && name.charAt(0)}
  </Avatar>
}

function PlayerErrorAvatar(){
  return <Avatar>E</Avatar>
}

export function PlayerAvatar(props){
  return <ErrorBoundary fallback={<PlayerErrorAvatar />}>
    <PlayerAvatarDisplay {...props} />
  </ErrorBoundary>
}