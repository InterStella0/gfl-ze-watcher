import {CategoryScale, Chart as ChartJS, LinearScale, TimeScale, Title, Tooltip as TooltipChart} from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import {Chart} from "react-chartjs-2";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {color} from "chart.js/helpers";
import {useContext, useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import Box from "@mui/material/Box";
import {fetchServerUrl} from "../../utils.jsx";
import {MapContext} from "../../pages/MapPage.jsx";
import { REGION_COLORST} from "../graphs/ServerGraph.jsx";
import Typography from "@mui/material/Typography";
import {IconButton, Skeleton, Tooltip} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

ChartJS.register(MatrixController, MatrixElement,
    TimeScale, TooltipChart, CategoryScale, LinearScale, Title, MatrixController);

function MapHeatRegionDisplay(){
    const { name } = useContext(MapContext)
    const [ loading, setLoading ] = useState(true)
    const [ regions, setRegions ] = useState([])

    useEffect(() => {
        setLoading(true)
        fetchServerUrl(`/maps/${name}/heat-regions`)
            .then(resp => resp.map(e => {
                const dt = dayjs(e.date)
                const iso = dt.format("YYYY-MM-DD")
                return {
                    x: iso,
                    y: dt.format('ddd'),
                    d: iso,
                    v: e
                }
            })).then(setRegions).finally(() => setLoading(false))
    }, [name]);

    const options = useMemo(() => ({
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
            legend: false,
            tooltip: {
                displayColors: false,
                callbacks: {
                    title() {
                        return '';
                    },
                    label(context) {
                        const v = context.dataset.data[context.dataIndex];
                        return [v.d, ...v.v.regions.map(e => `${e.region_name}: ${(e.total_play_duration / 60).toFixed(2)}mins`)];
                    }
                }
            },
        },
        scales: {
            y: {
                type: 'category',
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                offset: true,
                reverse: false,
                position: 'right',
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    padding: 1,
                    font: {
                        size: 9
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false,
                    tickLength: 0
                }
            },
            x: {
                type: 'time',
                position: 'bottom',
                offset: true,
                time: {
                    unit: 'week',
                    round: 'week',
                    isoWeekday: 1,
                    displayFormats: {
                        week: 'MMM YY'
                    }
                },
                ticks: {
                    maxRotation: 0,
                    font: {
                        weight: 'bold',
                        size: 9
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false,
                    tickLength: 5,
                }
            }
        },
        layout: {
            padding: {
                top: 10
            }
        }
    }), [regions])

    const data = useMemo(() => ({
        datasets: [{
            type: 'matrix',
            data: regions.map(region => ({
                ...region,
                y: region.y
            })),
            backgroundColor(c) {
                const value = c.dataset.data[c.dataIndex].v;
                const valueObj = value.regions
                let hours = valueObj.reduce((a, b) => a + b.total_play_duration, 0) / 3600
                const alpha = (.01 + hours) / 3;
                valueObj.sort((a, b) =>  b.total_play_duration - a.total_play_duration)
                return color(REGION_COLORST[valueObj[0]?.region_name] ?? 'grey').alpha(alpha).rgbString();
            },
            borderColor(c) {
                const value = c.dataset.data[c.dataIndex].v;
                let hours = value.regions.reduce((a, b) => a + b.total_play_duration, 0) / 3600
                const alpha = (1 + hours) / 4;
                return color(REGION_COLORST[value.regions[0]?.region_name] ?? 'grey').alpha(alpha).rgbString();
            },
            borderWidth: 1,
            hoverBorderColor: 'grey',
            width(c) {
                const a = c.chart.chartArea;
                return (a.right - a.left) / 53 - 1;
            },
            height(c) {
                const a = c.chart.chartArea;
                return (a.bottom - a.top) / 7 - 1;
            }
        }]
    }), [regions])

    return <>
        <Box elevation={0} sx={{p: '1rem'}}>
            <Box display="flex" justifyContent="space-between">
                <Typography
                    variant="h5"
                    color="primary"
                    fontWeight={700}
                    component="h2"
                >
                    Region Distribution
                </Typography>
                <Box>
                    <Tooltip title="Region time of when a map is being played in a year.">
                        <IconButton size="small">
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Box sx={{p: "1rem"}} justifyContent={{md: "center", xs: 'flex-end', sm: 'flex-end'}} display="flex" alignItems="center" overflow="auto">
                {!loading && regions.length > 0 && <Chart data={data} options={options} width="1000px" />}
                {loading && <Skeleton width="100%" height={200} />}
            </Box>
        </Box>
    </>
}
export default function MapHeatRegion(){
    return <ErrorCatch>
        <MapHeatRegionDisplay />
    </ErrorCatch>
}