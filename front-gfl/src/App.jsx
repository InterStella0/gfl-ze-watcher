import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/ui/Nav.jsx'

import { ThemeProvider, createTheme } from '@mui/material/styles';;
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {CssBaseline, responsiveFontSizes} from "@mui/material";
import ServerPage from "./pages/ServerPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerPage from "./pages/PlayerPage";
import NotExistPage from "./pages/NotExistPage.jsx";
import MapsPage from "./pages/MapsPage.jsx";
import MapPage from "./pages/MapPage.jsx";
import LiveServerTrackerPage from "./pages/LiveServerTrackerPage.jsx";
import RadarPage from "./pages/RadarPage.jsx";
import Footer from "./components/ui/Footer.jsx";
import Box from "@mui/material/Box";
import CommunitySelector from "./components/ui/CommunitySelector.jsx";
import ServerProvider from "./components/ui/ServerProvider.jsx";
import {useEffect, useState} from "react";
import {fetchUrl} from "./utils.jsx";
import CommunitiesPage from "./pages/CommunitiesPage.jsx";
import {LocalizationProvider} from "@mui/x-date-pickers";
import PlayerServerSessionPage from "./pages/PlayerServerSessionPage.jsx";

let theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': {
          width: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      },

    }
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#c2185b' },
        secondary: { main: '#f48fb1' },
        background: { default: '#ffffff', paper: '#f5f5f5' },
        text: { primary: '#333' },
        navLink: { default: '#444', hover: '#c2185b', active: '#ad1457' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#bb86fc' },
        secondary: { main: '#03dac6' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: { primary: '#e0e0e0' },
        navLink: { default: '#bbb', hover: '#ff66aa', active: '#ff4081' },
      },
    },

  },
})
theme = responsiveFontSizes(theme);


function App() {
  const [ openCommunityDrawer, setCommunityDrawer ] = useState(false)
  const [ communities, setCommunities ] = useState([])
  useEffect(() => {
    const fetchCommunities = () => {
      fetchUrl("/communities")
          .then(resp => {
            const comm = resp.map(e => ({
              id: e.id,
              name: e.name,
              players: e.servers.reduce((prev, curr) => prev + curr.player_count, 0),
              status: e.servers.reduce((prev, curr) => prev || curr.online, false),
              color: '#4A90E2',
              icon_url: e.icon_url,
              servers: e.servers.map(s => ({
                id: s.id,
                name: s.name,
                players: s.player_count,
                max_players: s.max_players,
                status: s.online,
                fullIp: `${s.ip}:${s.port}`
              }))
            }))

            comm.sort((a, b) => b.players - a.players)
            return comm
          })
          .then(setCommunities)
          .catch(console.error);
    };

    fetchCommunities();
    const interval = setInterval(fetchCommunities, 60000);

    return () => clearInterval(interval);
  }, []);


  return <>
    <ThemeProvider theme={theme}>
      <LocalizationProvider theme={theme} dateAdapter={AdapterDayjs}>
      <CssBaseline />
      <ServerProvider value={communities}>
      <BrowserRouter>
        <Box sx={{ display: 'flex' }}>
          <CommunitySelector openDrawer={openCommunityDrawer} onClose={() => setCommunityDrawer(false)} />
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
          >
            <Box sx={{minHeight: 'calc(100vh - 72px)'}}>
              <Routes>
                <Route path="/" element={<ResponsiveAppBar setCommunityDrawer={setCommunityDrawer} />}>
                  <Route index element={<CommunitiesPage />} />
                  <Route path=":server_id">
                    <Route index element={<ServerPage />} />
                    <Route path="players">
                      <Route index element={<PlayersPage />} />
                      <Route path=":player_id">
                        <Route index element={<PlayerPage />} />
                        <Route path="sessions/:session_id" element={<PlayerServerSessionPage />} />
                      </Route>
                    </Route>
                    <Route path="maps">
                      <Route index element={<MapsPage />} />
                      <Route path=":map_name" element={<MapPage />} />
                    </Route>
                    <Route path="radar" element={<RadarPage />} />
                  </Route>
                  <Route path="live" element={<LiveServerTrackerPage />} />
                  <Route path="*" element={<NotExistPage />} />
                </Route>
              </Routes>
            </Box>
            <Footer />
          </Box>
        </Box>
      </BrowserRouter>
      </ServerProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </>
}

export default App
