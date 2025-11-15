import Box from "@mui/material/Box";
import LoginButton from "./LoginButton";
import {DiscordUser} from "types/users";
import {CommunityBase, Server} from "types/community";
import NavDrawerButton from "./NavDrawerButton";
import PagesNavigation from "./PagesNavigation";
import ServerIndicator from "./ServerIndicator";
import {Dispatch} from "react";


export default function WebAppBar(
    { user, server, setDisplayCommunity }
    : { server: Server | null, user: DiscordUser | null, setDisplayCommunity: Dispatch<boolean> }
) {
    const community: CommunityBase | null = server?.community

    return <>
        <Box component="nav" sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "15px 25px",
        }}>
            <Box
                sx={{
                    display: 'none',
                    '@media (min-width:750px) and (max-width:1199px)': {
                        display: 'flex'
                    }
                }}
            >
                <ServerIndicator server={server} community={community} setDisplayCommunity={setDisplayCommunity}  />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    '@media (max-width:1199px)': {
                        display: 'none'
                    }
                }}
            >
                <ServerIndicator server={server} community={community} setDisplayCommunity={null}  />
            </Box>

            <Box className="nav-links" sx={{
                '@media (min-width:750px)': {
                    display: 'flex'
                },
                '@media (max-width:750px)': {
                    display: 'none !important'
                }
            }}>
                <PagesNavigation server={server}/>
            </Box>

            <NavDrawerButton server={server} user={user} />

            <Box
                sx={{
                    '@media (min-width:750px)': {
                        display: 'none'
                    },
                    '@media (max-width:750px)': {
                        display: 'flex'
                    }, minWidth: 0, flex: 1, justifyContent: 'center'
                }}
                ml="3rem">
                <ServerIndicator server={server} community={community} setDisplayCommunity={setDisplayCommunity} />
            </Box>

            <Box className="nav-right"
                 sx={{
                     '@media (min-width:750px)': {
                         display: 'flex'
                     },
                     '@media (max-width:750px)': {
                         display: 'none'
                     }, alignItems: "center"
                 }}
            >
                <LoginButton user={user} />
            </Box>

            <Box sx={{ display: { sm: 'none', xs: 'flex' }, width: '48px' }}></Box>
        </Box>
    </>
}