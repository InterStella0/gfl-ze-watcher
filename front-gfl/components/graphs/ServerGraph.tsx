'use client'
// @ts-nocheck
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    TimeScale,
    Title,
    Tooltip
} from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import humanizeDuration from 'humanize-duration'
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';
import {Chart} from 'react-chartjs-2';
import {fetchUrl, REGION_COLORS} from 'utils/generalUtils'
import GraphToolbar from './GraphToolbar';
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {DateSources, useDateState} from './DateStateManager';
import {GraphServerState} from "types/graphServers";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";

dayjs.extend(utc);
dayjs.extend(timezone);
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, LineController,
    Title, Tooltip, Legend, TimeScale, zoomPlugin, annotationPlugin, BarElement,
);

const TIMEZONE_CHOSEN_FROM = "Asia/Kuala_Lumpur"
const REGION_MAPPING = [
    { start: 18, end: 24, label: "Asia + EU" },
    { start: 0, end: 6, label: "EU + NA" },
    { start: 6, end: 12, label: "NA + EU" },
    { start: 12, end: 18, label: "NA + Asia" },
];

function generateAnnotations(startDate: dayjs.Dayjs, endDate:dayjs.Dayjs): AnnotationOptions<"box">[] {
    const start = startDate.tz(TIMEZONE_CHOSEN_FROM)
    const end = endDate.tz(TIMEZONE_CHOSEN_FROM)
    let annotations: AnnotationOptions<"box">[] = []

    let current = start;
    while (current.isBefore(end)) {
        const hour = current.hour();
        const region = REGION_MAPPING.find((r) => hour >= r.start && hour < r.end);
        if (!region) {
            console.warn("REGION NOT FOUND FOR HOUR", hour)
            return []
        }
        const delta = region.end - hour
        let endX = current.add(delta, "hours").startOf('hour');
        endX = endX.isBefore(end) ? endX : end

        annotations.push({
            drawTime: "beforeDatasetsDraw",
            type: "box",
            xMin: current.toISOString(),
            xMax: endX.toISOString(),
            yMax: 81,
            yMin: -1,
            backgroundColor: REGION_COLORS[region.label],
            label: {
                content: region.label,
                display: true,
                position: "center",
            },
        });
        current = endX;
    }
    return annotations;
}

const initialState: GraphServerState = {
    data: {
        playerCounts: [],
        joinCounts: [],
        leaveCounts: [],
        mapAnnotations: []
    },
    loading: false,
    maxPlayers: 64,
};

const ActionGraph = {
    START_LOADING: 'START_LOADING',
    LOAD_SUCCESS: 'LOAD_SUCCESS',
    LOAD_ERROR: 'LOAD_ERROR',
    SET_MAX_PLAYERS: 'SET_MAX_PLAYERS',
}

function graphReducer(state, action): GraphServerState {
    switch (action.type) {
        case ActionGraph.START_LOADING:
            return {
                ...state,
                loading: true,
            };

        case ActionGraph.LOAD_SUCCESS:
            return {
                ...state,
                loading: false,
                data: action.payload,
            };

        case ActionGraph.LOAD_ERROR:
            return {
                ...state,
                loading: false,
            };

        case ActionGraph.SET_MAX_PLAYERS:
            return {
                ...state,
                maxPlayers: action.payload
            };

        default:
            return state;
    }
}

function ServerGraphDisplay({ setLoading, customDataSet = [], showFlags = { join: true, leave: true, toolbar: true } }) {
    const { start, end, setDates, source: lastSource, timestamp } = useDateState();
    const { server } = useServerData()
    const server_id = server.id
    const [state, dispatch] = useReducer(graphReducer, initialState);
    const toolBarUse = useRef<boolean>(false)
    const chartRef = useRef<ChartJS | null>(null);
    const abortControllerRef = useRef<AbortController | null>();
    const annotationRef = useRef<{annotations: AnnotationOptions<"box" | "line">[]}>({ annotations: [] });
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>();

    useEffect(() => {
        toolBarUse.current = lastSource === DateSources.TOOLBAR || lastSource === DateSources.URL
    }, [lastSource]);
    useEffect(() => {
        if (server?.max_players !== undefined) {
            const newMax = server.max_players === 0 ? 64 : server.max_players;
            dispatch({ type: ActionGraph.SET_MAX_PLAYERS, payload: newMax });
        }
    }, [server?.max_players]);

    // Notify parent of loading state
    useEffect(() => {
        setLoading(state.loading);
    }, [state.loading, setLoading]);

    // Reset chart zoom when dates change from external sources
    useEffect(() => {
        if (lastSource !== DateSources.ZOOM && chartRef.current) {
            // Clear any pending zoom timeouts to prevent race conditions
            clearTimeout(zoomTimeoutRef.current);
            chartRef.current.resetZoom();
        }
    }, [timestamp, lastSource]);

    // Data fetching effect
    useEffect(() => {
        if (!start.isBefore(end) || !server_id) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        dispatch({ type: ActionGraph.START_LOADING });

        const params = { start: start.toJSON(), end: end.toJSON() };

        const fetchData = async () => {
            try {
                const promises = [
                    fetchUrl(`/graph/${server_id}/unique_players`, { params, signal })
                        .then(data => data.map(e => ({ x: e.bucket_time, y: e.player_count }))),

                    fetchUrl(`/graph/${server_id}/event_count`, {
                        params: { event_type: 'Join', ...params },
                        signal
                    }).then(data => data.map(e => ({ x: e.bucket_time, y: e.player_count }))),

                    fetchUrl(`/graph/${server_id}/event_count`, {
                        params: { event_type: 'Leave', ...params },
                        signal
                    }).then(data => data.map(e => ({ x: e.bucket_time, y: e.player_count })))
                ];

                // Only fetch maps if date range is small enough
                if (end.diff(start, "day") <= 2) {
                    promises.push(
                        fetchUrl(`/graph/${server_id}/maps`, { params, signal })
                            .then(data => data.map(e => {
                                let text = e.map;
                                if (e.ended_at !== e.started_at) {
                                    let delta = dayjs(e.ended_at).diff(dayjs(e.started_at));
                                    text += ` (${humanizeDuration(delta, { units: ['h', 'm'], maxDecimalPoints: 2 })})`;
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
                                };
                            }))
                            .catch(() => [])
                    );
                } else {
                    promises.push(Promise.resolve([]));
                }

                const [playerCounts, joinCounts, leaveCounts, mapAnnotations] = await Promise.all(promises);
                if (!signal.aborted) {
                    dispatch({
                        type: ActionGraph.LOAD_SUCCESS,
                        payload: { playerCounts, joinCounts, leaveCounts, mapAnnotations }
                    });
                }
            } catch (error) {
                if (!signal.aborted) {
                    console.error('Failed to fetch graph data:', error);
                    dispatch({ type: ActionGraph.LOAD_ERROR });
                }
            }
        };

        fetchData();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [start, end, server_id]);

    const handleZoomChange = useCallback((xScale) => {
        const newStart = dayjs(xScale.min);
        const newEnd = dayjs(xScale.max);

        // Debounce zoom updates
        clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => {
            if (toolBarUse.current) {
                // Race condition where newStart/newEnd become stale on clicking 'Today'
                toolBarUse.current = false
                return
            }
            setDates(newStart, newEnd, DateSources.ZOOM);
        }, 500);
    }, [setDates, toolBarUse]);

    const zoomComplete = useCallback(({ chart }) => {
        handleZoomChange(chart.scales.x);
    }, [handleZoomChange]);

    // Update annotations
    useEffect(() => {
        if (!start.isBefore(end) || end.diff(start, "day") > 6) {
            annotationRef.current.annotations = state.data.mapAnnotations;
        } else {
            annotationRef.current.annotations = [...generateAnnotations(start, end), ...state.data.mapAnnotations];
        }
        chartRef.current?.update()
    }, [start, end, state.data.mapAnnotations]);

    const options = useMemo(() => ({
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        tooltip: { position: 'nearest' },
        interaction: { mode: 'x', intersect: false },
        onHover: function (e) {
            if (e.native.target.className !== 'chart-interaction')
                e.native.target.className = 'chart-interaction';
        },
        scales: {
            x: {
                type: 'time',
                stacked: true,
                time: {
                    displayFormats: {
                        minute: 'MMM DD, h:mm a',
                        hour: 'MMM DD, ha',
                        day: 'MMM DD',
                        week: 'MMM DD',
                        month: 'MMM YYYY',
                    }
                },
                ticks: { autoSkip: true, autoSkipPadding: 50, maxRotation: 0 },
                title: { text: "Time", display: true }
            },
            y: {
                min: 0, max: state.maxPlayers,
                grid: {
                    display: true,
                    color: 'rgba(200, 200, 200, 0.2)'
                }
            }
        },
        plugins: {
            annotation: annotationRef.current,
            legend: { position: 'top' },
            zoom: {
                pan: { enabled: true, mode: 'x', onPanComplete: zoomComplete },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x',
                    onZoomComplete: zoomComplete
                }
            }
        },
    }), [zoomComplete, annotationRef, state.maxPlayers])

    const datasets = [...customDataSet]

    if (showFlags.join) {
        datasets.push({
            type: 'bar',
            label: 'Join Count',
            data: state.data.joinCounts,
            borderColor: 'rgb(53, 235, 135)',
            backgroundColor: 'rgba(53, 235, 135, 0.6)',
            fill: true,
            order: 3
        });
    }

    if (showFlags.leave) {
        datasets.push({
            type: 'bar',
            label: 'Leave Count',
            data: state.data.leaveCounts,
            borderColor: 'rgb(235, 53, 235)',
            backgroundColor: 'rgba(235, 53, 235, 0.6)',
            fill: true,
            order: 2
        });
    }

    datasets.push(
        {
            type: 'line',
            label: 'Player Count',
            data: state.data.playerCounts,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.1)',
            pointRadius: 0,
            tension: .2,
            fill: true,
            order: 1,
        }
    )

    return (
        <>
            {showFlags.toolbar && <GraphToolbar />}
            <div className="chart-wrapper">
                <div className='chart-container'>
                    <Chart ref={chartRef} data={{ datasets }} options={options} />
                </div>
            </div>
        </>
    );
}

export default function ServerGraph(props) {
    return (
        <ErrorCatch message="Couldn't load server graph.">
            <ServerGraphDisplay {...props} />
        </ErrorCatch>
    );
}