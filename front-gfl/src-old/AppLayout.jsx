import {useTheme} from "@mui/material";
import {useState} from "react";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import CommunitySelectorDisplay from "../components/ui/CommunitySelector.tsx";
import {Outlet} from "react-router";
import Footer from "../components/ui/Footer.tsx";
import ResponsiveAppBar, {Announcement} from "../components/ui/ResponsiveAppBar.tsx";

export default function AppLayout(){
    const theme = useTheme();
    const [ openCommunityDrawer, setCommunityDrawer ] = useState(false)
    return <ErrorCatch message="App bar is broken.">
        <Box sx={{ display: 'flex' }}>
            <CommunitySelectorDisplay
                openDrawer={openCommunityDrawer}
                onClose={() => setCommunityDrawer(false)}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    transition: theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >   <Box sx={{minHeight: 'calc(100vh - 72px)'}}>
                <ResponsiveAppBar setCommunityDrawer={setCommunityDrawer} />
                <Announcement />
                <Outlet />
            </Box>
                <Footer />
            </Box>
        </Box>
    </ErrorCatch>
}