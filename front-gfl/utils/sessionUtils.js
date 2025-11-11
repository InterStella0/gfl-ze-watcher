import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);
export const formatDuration = (start, end) => {
    if (!start || !end) return '0m';
    const duration = dayjs(end).diff(dayjs(start), "seconds");
    const dur = dayjs.duration(duration, 'seconds');
    const hours = dur.hours();
    const minutes = dur.minutes();
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

export const getServerPopChartData = (serverGraph) => {
    const data = serverGraph.map(item => ({
        x: item.bucket_time,
        y: item.player_count
    }));
    return {
        datasets: [
            {
                label: 'Player Count',
                data,
                borderColor: 'var(--mui-palette-primary-main)',
                backgroundColor: 'rgba(var(--mui-palette-primary-main), 20)',
                borderWidth: 2,
                pointBackgroundColor: 'var(--mui-palette-primary-main)',
                pointRadius: 0,
                tension: 0.4,
                fill: true
            }
        ]
    };
};

export const getMatchScoreChartData = (data, type) => {
    let matchData;
    switch (type) {
        case "player":
            matchData = generateMatchScoreData(data);
            break;
        case "map":
            matchData = data?.map(matchData => ({
                x: matchData.occurred_at,
                humanScore: matchData.human_score,
                zombieScore: matchData.zombie_score
            })) ?? [];
            break;
        default:
            return { datasets: [] };
    }

    return {
        datasets: [
            {
                label: 'Humans',
                data: matchData.map(item => ({
                    x: dayjs(item.x).millisecond(0).toDate(),
                    y: item.humanScore
                })),
                borderColor: 'var(--mui-palette-success-main)',
                backgroundColor: 'color-mix(in srgb, var(--mui-palette-success-main) 20%, transparent)',
                borderWidth: 2,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: 'Zombies',
                data: matchData.map(item => ({
                    x: dayjs(item.x).millisecond(0).toDate(),
                    y: item.zombieScore
                })),
                borderColor: 'var(--mui-palette-error-main)',
                backgroundColor: 'color-mix(in srgb, var(--mui-palette-error-main) 20%, transparent)',
                borderWidth: 2,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ]
    };
};

export const getChartOptionsWithAnnotations = (maps, sessionInfo, showLegend = false, suggestedMax = undefined) => {
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
                    color: 'var(--mui-palette-text-primary)',
                },
            },
            annotation: {
                annotations: maps ? getMapStartAnnotations(maps) : null,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'var(--mui-palette-background-paper)',
                titleColor: 'var(--mui-palette-text-primary)',
                bodyColor: 'var(--mui-palette-text-primary)',
                borderColor: 'var(--mui-palette-divider)',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                type: 'time',
                min: sessionInfo?.started_at,
                max: sessionInfo?.ended_at,
                time: {
                    displayFormats: {
                        minute: 'h:mm a',
                        hour: 'h:mm a',
                    },
                },
                grid: {
                    color: 'var(--mui-palette-divider)',
                },
                ticks: {
                    color: 'var(--mui-palette-text-secondary)',
                    font: {
                        size: 12,
                    },
                },
            },
            y: {
                grid: {
                    color: 'var(--mui-palette-divider)',
                },
                ticks: {
                    color: 'var(--mui-palette-text-secondary)',
                    font: {
                        size: 12,
                    },
                    stepSize: 1,
                },
                suggestedMax: suggestedMax,
                min: 0,
            },
        },
    };
};