import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/ui/Nav.jsx'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import {CssBaseline, responsiveFontSizes} from "@mui/material";
import ServerPage from "./pages/ServerPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerPage from "./pages/PlayerPage";
import NotExistPage from "./pages/NotExistPage.jsx";
import MapsPage from "./pages/MapsPage.jsx";
import MapPage from "./pages/MapPage.jsx";

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
  return <>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <ResponsiveAppBar />
        <Routes>
          <Route path="/" element={<ServerPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:player_id" element={<PlayerPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/maps/:map_name" element={<MapPage />} />
          <Route path="*" element={<NotExistPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </>
}

export default App
