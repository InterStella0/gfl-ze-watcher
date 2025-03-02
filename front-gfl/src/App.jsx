import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from "@mui/material";
import ServerPage from "./pages/ServerPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerPage from "./pages/Player";

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
        primary: { main: '#df3cff' },
        secondary: { main: '#f8cdff' },
        background: { default: '#ffffff', paper: '#fafafa' },
        text: { primary: '#555' },
        navLink: { default: '#555', hover: '#ff66aa', active: '#ff66aa' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#5e3e55' },
        background: { default: '#000000', paper: '#171717' },
        text: { primary: '#bbb' },
        navLink: { default: '#bbb', hover: '#ff80bf', active: '#ff80bf' },
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
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </>
}

export default App
