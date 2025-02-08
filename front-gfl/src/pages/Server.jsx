import { useSearchParams } from "react-router";
import { useState } from "react";
import Graph from "../components/Graph";
import PlayerList from "../components/PlayerList";
import dayjs from "dayjs";

export default function Server() {
    let [ searchParams, setSearchParams ] = useSearchParams();
    let givenDate = null

    if (searchParams && searchParams.get('start') && searchParams.get('end'))
        givenDate = {start: dayjs(searchParams.get('start')), end: dayjs(searchParams.get('end'))}

    const [ dateDisplay, setDateDisplay ] = useState(givenDate)
    function onDateChange(start, end){
        setSearchParams({start, end})
        setDateDisplay({start, end})
    }
  
    return (
      <>
        <div style={{width: '100vw'}}>
          <div className='chart-container'>
                <Graph onDateChange={onDateChange} dateDisplay={dateDisplay} />
          </div>
        </div>
        <PlayerList dateDisplay={dateDisplay} />
      </>
    )
  }