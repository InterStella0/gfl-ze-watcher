import {Avatar, LinearProgress} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fetchUrl } from "../config";



export function PlayerAvatar({ uuid, name, ...props }) {
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
      fetchUrl(`/players/${uuid}/pfp.png`).then((resp) => setUrl(resp.url));
    }
  }, [isVisible]);

  return (
    <div ref={avatarRef}>
      <Avatar src={url} {...props}>{!url && name.charAt(0)}</Avatar>
    </div>
  );
}