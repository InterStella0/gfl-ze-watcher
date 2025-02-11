import Server from './pages/Server'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'
import Players from './pages/Players';

function App() {
  return <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<>
          <ResponsiveAppBar />
          <Server />
        </>} />
        <Route path="/players" element={<>
          <ResponsiveAppBar />
          <Players />
        </>}  />
        <Route path="/maps" element={<Server />} />
      </Routes>
    </BrowserRouter>
  </>
}

export default App
