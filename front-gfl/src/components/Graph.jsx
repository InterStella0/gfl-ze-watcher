
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
import { useCallback, useEffect, useRef, useState } from 'react';
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
  return function() {
      const context = this;
      const args = arguments;
      const later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
  };
}
export default function Graph(){
    const now = dayjs()
    const [ startDate, setStartDate ] = useState(now.subtract(1, 'day'))
    const [ endDate, setEndDate ] = useState(now)
    const [ playerCounts, setPlayerCounts ] = useState([])
    const [ annotations, setAnnotations ] = useState([])
    const setDateCallback = useCallback(debounce((xScale) => {
      setStartDate(dayjs(xScale.min))
      setEndDate(dayjs(xScale.max))
      console.log('X Min:', dayjs(xScale.min), 'X Max:', dayjs(xScale.max));
    }, 1000, false), [])

    const zoomComplete = useCallback(({ chart }) => {
      setDateCallback(chart.scales.x)
    }, [])
    const options = {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
              displayFormats: {
                  minute: 'MMM d, h:mm a',
                  hour: 'MMM d, h:mm a',
                  day: 'MMM d'
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
    }
    console.log("ANNO", annotations)
  
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
          type: 'line', 
          xMin: e.started_at,
          xMax: e.started_at,
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 2,
          label: {
            backgroundColor: '#f75959',
            content: e.map,
            display: true,
            rotation: 270,
            position: 'start'
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