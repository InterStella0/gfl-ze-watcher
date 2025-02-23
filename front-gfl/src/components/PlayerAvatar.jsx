import { Avatar } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fetchUrl } from "../utils";
import {ErrorBoundary} from "react-error-boundary";



function PlayerAvatarDisplay({ uuid, name, ...props }) {
  const [url, setUrl] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const avatarRef = useRef(null);

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
    if (isVisible && !url) {
      fetchUrl(`/players/${uuid}/pfp`).then((resp) => setUrl(resp.url));
    }
  }, [isVisible]);

  return (
      <Avatar ref={avatarRef} src={url} {...props}>{!url && name.charAt(0)}</Avatar>
  );
}

function PlayerErrorAvatar(){
  return <Avatar>E</Avatar>
}

export function PlayerAvatar(props){
  return <ErrorBoundary fallback={<PlayerErrorAvatar />}>
    <PlayerAvatarDisplay {...props} />
  </ErrorBoundary>
}