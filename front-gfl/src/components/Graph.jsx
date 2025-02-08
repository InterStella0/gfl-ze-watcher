
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
  } from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import zoomPlugin from 'chartjs-plugin-zoom';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchUrl, SERVER_WATCH } from '../config'
import annotationPlugin from 'chartjs-plugin-annotation';
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin,
    annotationPlugin
  );
  function debounce(func, wait, immediate) {
    let timeout;
    const debounced = function() {
      const context = this;
      const args = arguments;
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  
    debounced.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
    };
  
    return debounced;
  }
  
export default function Graph({ onDateChange }){
    const now = dayjs()
    const [ startDate, setStartDate ] = useState(now.subtract(1, 'day'))
    const [ endDate, setEndDate ] = useState(now)
    const [ playerCounts, setPlayerCounts ] = useState([])
    const [ playerList, setPlayerList ] = useState([])
    const [ annotations, setAnnotations ] = useState([])

    useEffect(() => {
      onDateChange(startDate, endDate)
    }, [startDate, endDate])

    const debouncedSetDateRef = useRef();

    useEffect(() => {
      debouncedSetDateRef.current = debounce((xScale) => {
        setStartDate(dayjs(xScale.min))
        setEndDate(dayjs(xScale.max))
      }, 1000, false)
    
      return () => {
        debouncedSetDateRef.current.cancel()
      }
    }, []);

    const zoomComplete = useCallback(({ chart }) => {
      debouncedSetDateRef.current(chart.scales.x)
    }, [])
    const options = useMemo(() => ({
      animation: false,
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              minute: 'MMM DD, h:mm a', 
              hour: 'MMM DD, ha',       
              day: 'MMM DD',            
              week: 'MMM DD',           
              month: 'MMM YYYY',        
          }
          },
          ticks: {
              autoSkip: true,
              autoSkipPadding: 50,
              maxRotation: 0
          },
          title: {text: "Time", display: true}
        },
        y: {min: 0, max: 90}
      },
      plugins: {
        annotation: {
          annotations: annotations
        },
        legend: {
          position: 'top',
        },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
              onPanComplete: zoomComplete
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'x',
              onZoomComplete: zoomComplete
            }
          }
      },
    }), [annotations])
  
    useEffect(() => {
      if (!startDate.isBefore(endDate)) return

      const params = {start: startDate.toJSON(), end: endDate.toJSON()}
      fetchUrl(`/graph/${SERVER_WATCH}/unique_players`, { params })
      .then(data => data.map(e => ({x: e.bucket_time, y: e.player_count})))
      .then(data => setPlayerCounts(data))

      if (endDate.diff(startDate, "day") > 2){
        setAnnotations({})
      }
      fetchUrl(`/graph/${SERVER_WATCH}/maps`, { params })
      .then(data => data.map(e => ({
          type: 'box', 
          xMin: e.started_at,
          xMax: e.ended_at,
          yMin: -1,
          yMax: 100,
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 2,
          label: {
            backgroundColor: '#f75959',
            content: e.map,
            display: true,
            rotation: 270,
            position: 'end'
          }
        })))
      .then(anno => setAnnotations({...anno}))
    
    }, [startDate, endDate])
    const data = {
        datasets: [
          {
            label: 'Unique Player Count Per Minute',
            data: playerCounts,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            pointRadius: 0
          },
        ],
      }

      return <Line data={data} options={options} />;
}