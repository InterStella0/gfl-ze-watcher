import dayjs from "dayjs";

export const formatDuration = (start, end) => {
    if (!start || !end) return '0m';
    const duration = new Date(end) - new Date(start);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    return `${minutes}m`
};

export const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getServerPopRange = (serverGraph) => {
    if (serverGraph.length === 0) return '0-0';
    const min = Math.min(...serverGraph.map(d => d.player_count));
    const max = Math.max(...serverGraph.map(d => d.player_count));
    return `${min}-${max}`;
};

export const generateMatchScoreData = (maps) => {
    const data = [];
    let all_match = maps.map(data => data.match_data).flat(2).map(match => {
        match.timeAt = dayjs(match.occurred_at)
        return match
    })
    all_match.sort((a, b) => a.timeAt.isAfter(b.timeAt) ? 1 : -1)
    all_match.forEach(matchData => {
        data.push({
            x: matchData.occurred_at,
            humanScore: matchData.human_score,
            zombieScore: matchData.zombie_score
        });
    });
    return data;
};

export const getMapStartAnnotations = (maps) => {
    return maps.map(map => {
        let text = map.map;
        if (map.ended_at !== map.started_at) {
            text += ` (${formatDuration(map.started_at, map.ended_at)})`;
        }
        let date = dayjs(map.started_at).millisecond(0).toDate()
        return {
            type: 'line',
            xMin: date,
            xMax: date,
            borderColor: 'rgb(255,52,154)',
            label: {
                backgroundColor: '#00000000',
                content: text,
                display: true,
                rotation: 270,
                color: 'rgb(255, 105, 180)',
                position: 'start',
                xAdjust: 10,
            }
        }
    });
};

export const getServerPopChartData = (serverGraph, theme) => {
    const data = serverGraph.map(item => ({
        x: item.bucket_time,
        y: item.player_count
    }));
    return {
        datasets: [
            {
                label: 'Player Count',
                data,
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.primary.main + '20',
                borderWidth: 2,
                pointBackgroundColor: theme.palette.primary.main,
                pointRadius: 0,
                tension: 0.4,
                fill: true
            }
        ]
    };
};

export const getMatchScoreChartData = (maps, theme) => {
    const matchData = generateMatchScoreData(maps);

    return {
        datasets: [
            {
                label: 'Humans',
                data: matchData.map(item => ({ x: dayjs(item.x).millisecond(0).toDate(), y: item.humanScore })),
                borderColor: theme.palette.success.main,
                backgroundColor: theme.palette.success.main + '20',
                borderWidth: 2,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: 'Zombies',
                data: matchData.map(item => ({ x: dayjs(item.x).millisecond(0).toDate(), y: item.zombieScore })),
                borderColor: theme.palette.error.main,
                backgroundColor: theme.palette.error.main + '20',
                borderWidth: 2,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ]
    };
};

export const getChartOptionsWithAnnotations = (maps, sessionInfo, theme, showLegend = false, suggestedMax = undefined) => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: showLegend,
                labels: {
                    color: theme.palette.text.primary
                }
            },
            annotation: {
                annotations: getMapStartAnnotations(maps)
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: theme.palette.background.paper,
                titleColor: theme.palette.text.primary,
                bodyColor: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                borderWidth: 1
            }
        },
        scales: {
            x: {
                type: 'time',
                min: sessionInfo?.started_at,
                max: sessionInfo?.ended_at,
                time: {
                    displayFormats: {
                        minute: 'h:mm a',
                        hour: 'h:mm a'
                    }
                },
                grid: {
                    color: theme.palette.divider
                },
                ticks: {
                    color: theme.palette.text.secondary,
                    font: {
                        size: 12
                    }
                },
            },
            y: {
                grid: {
                    color: theme.palette.divider
                },
                ticks: {
                    color: theme.palette.text.secondary,
                    font: {
                        size: 12
                    },
                    stepSize: 1,
                },
                suggestedMax: suggestedMax,
                min: 0
            }
        }
    };
};