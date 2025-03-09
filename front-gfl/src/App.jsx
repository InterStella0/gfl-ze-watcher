import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from "@mui/material";
import ServerPage from "./pages/ServerPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerPage from "./pages/PlayerPage";
import NotExistPage from "./pages/NotExistPage.jsx";

const theme = createTheme({
  components: {
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
});


function App() {
  return <>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<>
            <ResponsiveAppBar />
            <ServerPage />
          </>} />
          <Route path="/players" element={<>
            <ResponsiveAppBar />
            <PlayersPage />
          </>} />
          <Route path="/players/:player_id" element={<>
            <ResponsiveAppBar />
            <PlayerPage />
          </>} />
          {/*<Route path="/maps" element={<Server />} />*/}
          <Route path="*" element={<>
              <ResponsiveAppBar />
              <NotExistPage />
              </>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </>
}

export default App
