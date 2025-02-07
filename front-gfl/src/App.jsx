import { useState } from 'react'
import Graph from './components/Graph'
import './App.css'
import PlayerList from './components/PlayerList'

function App() {
  const [ dateDisplay, setDateDisplay ] = useState(null)
  function onDateChange(start, end){
    setDateDisplay({start, end})
  }


  return (
    <>
      <div style={{width: '100vw'}}>
        <div className='chart-container'>
              <Graph onDateChange={onDateChange} />
        </div>
      </div>
      <PlayerList dateDisplay={dateDisplay} />
    </>
  )
}

export default App
