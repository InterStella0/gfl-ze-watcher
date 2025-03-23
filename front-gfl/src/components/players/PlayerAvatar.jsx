import { Avatar } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {fetchServerUrl, URIServer} from "../../utils.jsx";
import {ErrorBoundary} from "react-error-boundary";
import {Helmet} from "@dr.pogodin/react-helmet";



function PlayerAvatarDisplay({ uuid, name, helmet=false, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const [size, setSize] = useState(0);
  const avatarRef = useRef(null)
  const [ playerImage, setPlayerImage ] = useState(null)

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
      fetchServerUrl(`/players/${uuid}/pfp`).then(setPlayerImage)
    }
  }, [isVisible, uuid, playerImage]);

  return <>
    {helmet && <Helmet>
      <meta property="og:image" content={playerImage?.full ?? '/favicon.png'}/>
      <meta property="twitter:image" content={playerImage?.full ?? '/favicon.png'}/>
    </Helmet>}
    <Avatar
      slotProps={{
        img: {
          loading: "lazy",
          title: name
        }
      }}
      title={name}
      alt={`${name}'s profile picture`}
      ref={avatarRef} src={playerImage && (size > 100 ? playerImage.full: playerImage.medium)} {...props}>
    {!playerImage && name.charAt(0)}
  </Avatar>
        </>
}

function PlayerErrorAvatar(){
  return <Avatar>E</Avatar>
}

export function PlayerAvatar(props){
  return <ErrorBoundary fallback={<PlayerErrorAvatar />}>
    <PlayerAvatarDisplay {...props} />
  </ErrorBoundary>
}