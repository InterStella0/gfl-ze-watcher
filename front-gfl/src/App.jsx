import Server from './pages/Server'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'

function App() {
  return <>
    <ResponsiveAppBar />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Server />} />
        <Route path="/players" element={<Server />} />
        <Route path="/maps" element={<Server />} />
      </Routes>
    </BrowserRouter>
  </>
}

export default App
