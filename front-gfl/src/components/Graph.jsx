
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import zoomPlugin from 'chartjs-plugin-zoom';
import humanizeDuration from 'humanize-duration'
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchUrl, SERVER_WATCH } from '../config'
import annotationPlugin from 'chartjs-plugin-annotation';
import GraphToolbar from './GraphToolbar';
import { debounce } from '../config';

dayjs.extend(utc);
dayjs.extend(timezone);
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

const REGION_COLORS = {
  "Asia + EU": "rgba(255, 99, 132, 0.3)",
  "EU + NA": "rgba(54, 162, 235, 0.3)",
  "NA + EU": "rgba(75, 192, 192, 0.3)",
  "NA + Asia": "rgba(255, 206, 86, 0.3)",
};

// I do not care, i define this myself, based on my experience, get mad
const TIMEZONE_CHOSEN_FROM = "Asia/Kuala_Lumpur"
const REGION_MAPPING = [
  { start: 18, end: 24, label: "Asia + EU" },  // 6 PM - 12 AM
  { start: 0, end: 6, label: "EU + NA" },   // 12 AM - 6 AM
  { start: 6, end: 12, label: "NA + EU" },    // 6 AM - 12 PM
  { start: 12, end: 18, label: "NA + Asia" }, // 12 PM - 6 PM
];

function generateAnnotations(startDate, endDate) {
  const start = startDate.tz(TIMEZONE_CHOSEN_FROM)
  const end = endDate.tz(TIMEZONE_CHOSEN_FROM)
  let annotations = []

  let current = start;
  while (current.isBefore(end)) {
    const startX = current;
    const hour = startX.hour();
    const region = REGION_MAPPING.find((r) => hour >= r.start && hour < r.end);
    if (!region){
      console.warn("REGION NOT FOUND FOR HOUR", hour)
      return []
    }
    const delta = region.end - hour
    let endX = current.add(delta, "hours");
    endX = endX.startOf('hour')
    endX = endX.isBefore(end)? endX: end
    current = endX
      annotations.push({
        drawTime: "beforeDatasetsDraw",
        type: "box",
        xMin: startX.toISOString(),
        xMax: endX.toISOString(),
        yMax: 201,
        yMin: -1,
        backgroundColor: REGION_COLORS[region.label],
        label: {
          content: region.label,
          display: true,
          position: "center",
        },
      });
  }

  return annotations;
}

  
export default function Graph({ onDateChange, dateDisplay, setLoading }){
    const defaultMax = 150
    const now = dayjs()
    const [ startDate, setStartDate ] = useState(dateDisplay?.start ?? now.subtract(1, 'day'))
    const [ endDate, setEndDate ] = useState(dateDisplay?.end ?? now)
    const [ playerCounts, setPlayerCounts ] = useState([])
    const [ annotations, setAnnotations ] = useState([])
    const annoRefs = useRef({ annotations: annotations })
    
    // updating minMax seems to be unstable as of now. Figure out later.
    const minMax = {min: 0, max: defaultMax}

    const chartRef = useRef()
    useEffect(() => {
      if (!startDate.isBefore(endDate) || endDate.diff(startDate, "day") > 6){
        annoRefs.current.annotations = []
        return
      }
      const annotateRegion = generateAnnotations(startDate, endDate)

      annoRefs.current.annotations = [
        ...annotateRegion, 
        ...annotations
      ]
    }, [annotations, startDate, endDate])


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
      maintainAspectRatio: false,
      tooltip: {
          position: 'average'
      },
      interaction: {
        mode: 'index',
        intersect: false,
    },
      onHover: function(e) {
        if (e.native.target.className != 'chart-interaction')
          e.native.target.className = 'chart-interaction';
      },
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
        y: minMax
      },
      plugins: {
        annotation: annoRefs.current,
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
    }), [annoRefs])
  
    useEffect(() => {
      if (!startDate.isBefore(endDate)) return

      const params = {start: startDate.toJSON(), end: endDate.toJSON()}
      setLoading(true)
      let promise = fetchUrl(`/graph/${SERVER_WATCH}/unique_players`, { params })
      .then(data => data.map(e => ({x: e.bucket_time, y: e.player_count})))
      .then(data => setPlayerCounts(data))

      if (endDate.diff(startDate, "day") > 2){
        setAnnotations([])
        promise.then(() => setLoading(false))
        return;
      }
      fetchUrl(`/graph/${SERVER_WATCH}/maps`, { params })
      .then(data => data.map(e => {
            let text = e.map
            if (e.ended_at != e.started_at){
              let delta = dayjs(e.ended_at).diff(dayjs(e.started_at))
              text += ` (${humanizeDuration(delta, {units: ['h', 'm'], maxDecimalPoints: 2})})`
            }

            return {
            type: 'line', 
            xMin: e.started_at,
            xMax: e.started_at,
            borderColor: 'rgb(255, 99, 132)',
            label: {
              backgroundColor: '#00000000',
              content: text,
              display: true,
              rotation: 270,
              color: 'rgb(36, 0, 168)',
              position: 'start',
              xAdjust: 10,
            }
          }
        }
      ))
      .then(anno => setAnnotations(anno))
      .catch(e => setAnnotations([]))
      .then(() => setLoading(false))
    
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
    console.log("PLAYER COUNT", playerCounts.length)
      return <>
        <GraphToolbar startInitialDate={startDate} endInitialDate={endDate} onSetDate={
          date => {
            console.log("SETTING", date)
            setStartDate(date.start)
            setEndDate(date.end)
          }
        } />
        <div className="chart-wrapper">
          <div className='chart-container'>
              <Line ref={chartRef} data={data} options={options} />
          </div>
        </div>
      </>
}