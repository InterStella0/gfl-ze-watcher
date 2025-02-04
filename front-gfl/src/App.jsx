import { useState } from 'react'
import Graph from './components/Graph'
import './App.css'

function App() {


  return (
    <div style={{width: '100vw'}}>
      <div className='chart-container'>
        <Graph />
      </div>
    </div>
  )
}

export default App
