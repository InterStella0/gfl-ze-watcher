import Server from './pages/Server'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'
import Players from './pages/Players';
import Player from './pages/Player';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from "@mui/material";

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
        primary: {
          main: '#df3cff',
        },
        secondary: {
          main: '#f8cdff'
        },
        background: {
          default: '#ffffff',
          paper: '#fafafa',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#5e3e55',
        },
        background: {
          default: '#000000',
          paper: '#171717',
        },
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
            <Server />
          </>} />
          <Route path="/players" element={<>
            <ResponsiveAppBar />
            <Players />
          </>} />
          <Route path="/players/:player_id" element={<>
            <ResponsiveAppBar />
            <Player />
          </>} />
          {/*<Route path="/maps" element={<Server />} />*/}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </>
}

export default App
