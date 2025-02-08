import { useState } from 'react'
import Graph from './components/Graph'
import Server from './pages/Server'
import './App.css'
import PlayerList from './components/PlayerList'
import { useSearchParams } from 'react-router'
import { BrowserRouter, Routes, Route } from "react-router";
import ResponsiveAppBar from './components/Nav'

function App() {
  return <>
    <ResponsiveAppBar />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Server />} />
        <Route path="/players" element={<Server />} />
      </Routes>
    </BrowserRouter>
  </>
}

export default App
