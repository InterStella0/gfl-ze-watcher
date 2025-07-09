import {useState, useEffect, useRef, useCallback, createContext, useContext} from 'react';
import { useMap } from 'react-leaflet';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import L from 'leaflet'
import {
    Box,
    Slider,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Grid2,
    Paper,
    IconButton,
    useTheme,
    Tooltip
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    FiberManualRecord, NavigateNext
} from '@mui/icons-material';
import {getIntervalCallback} from "../../utils/generalUtils.jsx";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);


export const formatDateWMS = (date) => {
    // My data is in +08 and QGIS Server decided that it doesnt care about timezone.
    // https://github.com/qgis/QGIS/issues/58034
    // return date.utc().tz('Asia/Kuala_Lumpur').format("YYYY-MM-DD HH:mm:ss");
    return date.toISOString()
};

export const TemporalContext = createContext({})

export default function TemporalController({ wmsLayerRef, initialStartDate, initialEndDate,
                                               intervals = [
                                                   { label: '10 minutes', value: '10min' },
                                                   { label: '1 hour', value: '1hour' },
                                                   { label: '12 hours', value: '12hours' },
                                                   { label: '1 day', value: '1day' },
                                                   { label: '1 month', value: '1month' }
                                               ]
                                           }){
    const theme = useTheme();

    const rangeOptions = [
        { label: 'Entire History', value: 'all' },
        { label: '1 Year', value: '1year' },
        { label: '1 Month', value: '1month' },
        { label: '1 Week', value: '1week' },
        { label: '1 Day', value: '1day' },
        { label: '12 Hours', value: '12hours' },
        { label: '6 Hours', value: '6hours' }
    ];

    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const timeContext = useContext(TemporalContext)
    const currentTime = timeContext.data.cursor
    const timeContextSet = timeContext.set
    const setCurrentTime = time => {
        timeContextSet(prop => {
            const newTime = typeof time === 'function' ? time(prop.cursor) : time;
            prop.cursor = newTime;
            return { ...prop };
        });
    };
    const [sliderValue, setSliderValue] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState('10min');
    const [selectedRange, setSelectedRange] = useState('1month');
    const [isLive, setIsLive] = useState(true);
    const [availableIntervals, setAvailableIntervals] = useState(intervals);
    const containerRef = useRef(null)

    const animationTimerRef = useRef(null)
    const liveUpdateTimerRef = useRef(null)
    const debounceTimer = useRef(null)
    const map = useMap()
    useEffect(() => {
        timeContextSet(prop => ({...prop, isLive }))
    }, [isLive, timeContextSet])
    useEffect(() => {
        if (!(containerRef && containerRef.current)) return

        const container = containerRef.current
        L.DomEvent.on(container, 'click', L.DomEvent.preventDefault);
        const handleClick = (e) => {
            const isButton = e.target.closest('button');
            if (!isButton) {
                e.stopPropagation()
            }
        };

        container.addEventListener('click', handleClick);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'dblclick', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'touchstart', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'pointerdown', L.DomEvent.stopPropagation);
        L.DomEvent.on(container, 'contextmenu', L.DomEvent.stopPropagation);
        return () => {
            container.removeEventListener('click', handleClick);
        }
    }, [containerRef])

    const getTimeIncrement = useCallback(getIntervalCallback(selectedInterval), [selectedInterval])
    const formatDateDisplay = (date) => {
        return date.format('YYYY-MM-DD HH:mm:ss');
    };

    const getStepSizePercent = () => {
        const totalRange = endDate.diff(startDate);

        const stepMap = {
            '10min': 10 * 60 * 1000,
            '30min': 30 * 60 * 1000,
            '1hour': 60 * 60 * 1000,
            '6hours': 6 * 60 * 60 * 1000,
            '12hours': 12 * 60 * 60 * 1000,
            '1day': 24 * 60 * 60 * 1000,
            '1week': 7 * 24 * 60 * 60 * 1000,
            '1month': 30 * 24 * 60 * 60 * 1000,
        };

        const stepMs = stepMap[selectedInterval] || 60 * 60 * 1000; // default to 1 hour

        return (stepMs / totalRange) * 100;
    };

    const rawUpdateWMSLayer = useCallback((start) => {
        if (!wmsLayerRef.current?.length) return;

        const startStr = formatDateWMS(start);
        const endStr = formatDateWMS(getTimeIncrement(start));
        wmsLayerRef.current.forEach(ref => {
            ref.setParams({
                ...ref.options,
                TIME: `${startStr}/${endStr}`,
            });
        });
    }, [wmsLayerRef, getTimeIncrement]);

    const updateWMSLayer = useCallback((start) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            rawUpdateWMSLayer(start);
        }, 120);
    }, [rawUpdateWMSLayer]);

    useEffect(() => {
        if (selectedInterval != null) {
            updateWMSLayer(currentTime);
        }
    }, [selectedInterval, updateWMSLayer, currentTime]);
    const setChangeInterval = useCallback((state) => {
        setSelectedInterval(state);
        timeContextSet(props => {
            props.interval = state
            return {...props}
        })
    }, [timeContextSet])

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    const updateTimeFromSlider = (sliderPos) => {
        if (isLive) {
            setIsLive(false);
            clearInterval(liveUpdateTimerRef.current);
        }

        const totalDuration = endDate.diff(startDate);
        const currentOffset = totalDuration * (sliderPos / 100);
        const newTime = startDate.add(currentOffset, 'millisecond');
        const absoluteTime = newTime.second(0)
        setCurrentTime(absoluteTime);
        updateWMSLayer(absoluteTime);
    };

    const handleSliderChange = (event, newValue) => {
        event.preventDefault()
        event.stopPropagation();

        const stepSize = getStepSizePercent();
        const roundedValue = Math.round(newValue / stepSize) * stepSize;

        setSliderValue(roundedValue);
        updateTimeFromSlider(roundedValue);
    };

    const handleSliderMouseDown = (event) => {
        event.stopPropagation();
        if (map) {
            map.dragging.disable();
        }
    };

    // Re-enable map interaction on slider mouse up
    const handleSliderMouseUp = (event) => {
        event.stopPropagation();
        if (map) {
            map.dragging.enable();
        }
    };

    const animate = () => {
        setCurrentTime(prevTime => {
            const nextTime = getTimeIncrement(prevTime);

            if (nextTime.isAfter(endDate)) {
                setIsPlaying(false);
                return prevTime;
            }

            const totalTime = endDate.diff(startDate);
            const elapsedTime = nextTime.diff(startDate);
            const percentage = Math.min(100, (elapsedTime / totalTime) * 100);
            setSliderValue(percentage);

            updateWMSLayer(nextTime);
            return nextTime;
        });
    };

    const updateToLive = () => {
        const now = dayjs();

        if (now.isAfter(endDate)) {
            const range = endDate.diff(startDate);
            const newEnd = now;
            const newStart = now.subtract(range, 'millisecond');

            setStartDate(newStart);
            setEndDate(newEnd);
        }

        setCurrentTime(now);

        const totalTime = endDate.diff(startDate);
        const elapsedTime = now.diff(startDate);
        const percentage = Math.min(100, (elapsedTime / totalTime) * 100);
        setSliderValue(percentage);

        updateWMSLayer(now);
    };

    const updateDateRange = (rangeValue) => {
        const now = dayjs();
        let newStartDate;
        let newEndDate = now;

        switch(rangeValue) {
            case 'all':
                newStartDate = dayjs(initialStartDate);
                break;
            case '1year':
                newStartDate = now.subtract(1, 'year');
                break;
            case '1month':
                newStartDate = now.subtract(1, 'month');
                break;
            case '1week':
                newStartDate = now.subtract(1, 'week');
                break;
            case '1day':
                newStartDate = now.subtract(1, 'day');
                break;
            case '12hours':
                newStartDate = now.subtract(12, 'hour');
                break;
            case '6hours':
                newStartDate = now.subtract(6, 'hour');
                break;
            default:
                newStartDate = now.subtract(1, 'month'); // Default to 1 month
        }

        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setCurrentTime(currentTime < newStartDate ? newStartDate : currentTime.add(0, 'ms'))
    };

    // Function to get appropriate interval options based on selected range
    const getIntervalOptionsForRange = (rangeValue) => {
        // Define which intervals are appropriate for each range
        const intervalMap = {
            'all': ['1month', '1week', '1day', '12hours', '6hours', '1hour', '30min', '10min'],
            '1year': ['1month', '1week', '1day', '12hours', '6hours', '1hour', '30min', '10min'],
            '1month': ['1week', '1day', '12hours', '6hours', '1hour', '30min', '10min'],
            '1week': ['1day', '12hours', '6hours', '1hour'],
            '1day': ['6hours', '1hour', '30min', '10min'],
            '12hours': ['1hour', '30min', '10min'],
            '6hours': ['1hour', '30min', '10min']
        };

        // Get list of valid interval values for this range
        const validIntervalValues = intervalMap[rangeValue] || ['1hour'];

        // Filter the full intervals array to only include valid ones
        return [
            { label: '10 minutes', value: '10min' },
            { label: '30 minutes', value: '30min' },
            { label: '1 hour', value: '1hour' },
            { label: '6 hours', value: '6hours' },
            { label: '12 hours', value: '12hours' },
            { label: '1 day', value: '1day' },
            { label: '1 week', value: '1week' },
            { label: '1 month', value: '1month' }
        ].filter(interval => validIntervalValues.includes(interval.value));
    };

    const handleRangeChange = (event) => {
        const newRange = event.target.value;
        setSelectedRange(newRange);
        updateDateRange(newRange);

        const newIntervals = getIntervalOptionsForRange(newRange);
        setAvailableIntervals(newIntervals);

        if (!newIntervals.some(interval => interval.value === selectedInterval)) {
            setChangeInterval(newIntervals[0].value);
        }
    };

    // Start/stop animation
    useEffect(() => {
        if (isPlaying) {
            if (isLive) {
                setIsLive(false);
                clearInterval(liveUpdateTimerRef.current);
            }

            animationTimerRef.current = setInterval(animate, 1000);
        } else {
            clearInterval(animationTimerRef.current);
        }

        return () => {
            clearInterval(animationTimerRef.current);
        };
    }, [isPlaying]);

    // Handle live mode
    useEffect(() => {
        if (isLive) {
            if (isPlaying) {
                setIsPlaying(false);
                clearInterval(animationTimerRef.current);
            }
            updateToLive();
            liveUpdateTimerRef.current = setInterval(updateToLive, 60000);
        } else {
            clearInterval(liveUpdateTimerRef.current);
        }

        return () => {
            clearInterval(liveUpdateTimerRef.current);
        };
    }, [isLive]);

    useEffect(() => {
        if (isLive)
            updateWMSLayer(currentTime);
    }, [startDate, endDate]);

    // Update slider position when current time changes
    useEffect(() => {
        const totalTime = endDate.diff(startDate);
        const elapsedTime = currentTime.diff(startDate);
        const percentage = Math.min(100, (elapsedTime / totalTime) * 100);
        setSliderValue(percentage);
    }, [currentTime]);

    // Initialize available intervals based on default range
    useEffect(() => {
        const initialIntervals = getIntervalOptionsForRange(selectedRange)
        setAvailableIntervals(initialIntervals)
        updateDateRange(initialIntervals)
    }, []);

    // Handle interval change
    const handleIntervalChange = (event) => {
        setChangeInterval(event.target.value);
        updateWMSLayer(currentTime);
    };

    // Toggle live mode - shows current time
    const toggleLiveMode = (e) => {
        e.stopPropagation(); // Native DOM method
        e.preventDefault();
        setIsLive(!isLive);
        if (!isLive) {
            setChangeInterval('10min');
            if (isPlaying) {
                setIsPlaying(false);
            }
        }
    };
    const handleMouseDown = () => {
        timeContext.query.current = true
    }
    const handleMouseUp = () => {
        setTimeout(() => {
            timeContext.query.current = false
        }, 100)
    }
    return (
        <Paper
            elevation={3}
            sx={{
                position: 'absolute',
                bottom: '20px', // More margin from bottom
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                p: 2.5,
                borderRadius: 1.5,
                width: '80vw',
                bgcolor: theme.palette.background.paper,
                mx: 3,
                cursor: 'default'
            }}
            className="slider-container"
            onMouseDown={handleSliderMouseDown}
            onMouseUp={handleSliderMouseUp}
            ref={containerRef}
        >
            <Grid2 container spacing={2} alignItems="center">
                <Grid2 >
                    <Box display="flex" alignItems="center" gap={1}>
                        {/* Step Backward Button */}
                        <Tooltip title="Step backward one interval">
                            <IconButton
                                size="small"
                                onMouseUp={handleMouseUp}
                                onMouseDown={handleMouseDown}
                                onClick={(e) => {
                                    if (isLive) {
                                        setIsLive(false);
                                        clearInterval(liveUpdateTimerRef.current);
                                    }

                                    if (isPlaying) {
                                        setIsPlaying(false);
                                    }

                                    const intervalMap = {
                                        '10min': { amount: 10, unit: 'minute' },
                                        '30min': { amount: 30, unit: 'minute' },
                                        '1hour': { amount: 1, unit: 'hour' },
                                        '6hours': { amount: 6, unit: 'hour' },
                                        '12hours': { amount: 12, unit: 'hour' },
                                        '1day': { amount: 1, unit: 'day' },
                                        '1week': { amount: 1, unit: 'week' },
                                        '1month': { amount: 1, unit: 'month' }
                                    };

                                    const { amount, unit } = intervalMap[selectedInterval] || { amount: 1, unit: 'hour' };
                                    const prevTime = currentTime.subtract(amount, unit);


                                    // Don't go before start date
                                    if (prevTime.isBefore(startDate)) {
                                        setCurrentTime(startDate);
                                        updateWMSLayer(startDate);
                                    } else {
                                        setCurrentTime(prevTime);
                                        updateWMSLayer(prevTime);
                                    }
                                }}
                                color="primary"
                                disabled={currentTime?.isSame(startDate) || isPlaying}
                                sx={{
                                    p: 0.5,
                                    bgcolor: theme.palette.action.hover,
                                    '&:hover': { bgcolor: theme.palette.action.selected },
                                    '&.Mui-disabled': {
                                        opacity: 0.5,
                                        color: theme.palette.action.disabled
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', transform: 'rotate(180deg)' }}>
                                    <NavigateNext sx={{ fontSize: '1rem' }} />
                                </Box>
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={isPlaying ? "Pause" : "Play"}>
                            <IconButton
                                size="small"
                                onMouseUp={handleMouseUp}
                                onMouseDown={handleMouseDown}
                                onClick={(e) => {
                                    L.DomEvent.stop(e)
                                    L.DomEvent.stopPropagation(e)
                                    setIsPlaying(!isPlaying)
                                }}
                                color="primary"
                                sx={{
                                    p: 0.5,
                                    bgcolor: theme.palette.action.hover,
                                    '&:hover': { bgcolor: theme.palette.action.selected },
                                }}
                            >
                                {isPlaying ?
                                    <Pause sx={{ fontSize: '1.1rem' }} /> :
                                    <PlayArrow sx={{ fontSize: '1.1rem' }} />
                                }
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Step forward one interval">
                            <IconButton
                                size="small"
                                onMouseUp={handleMouseUp}
                                onMouseDown={handleMouseDown}
                                onClick={() => {
                                    if (isLive) {
                                        setIsLive(false);
                                        clearInterval(liveUpdateTimerRef.current);
                                    }

                                    if (isPlaying) {
                                        setIsPlaying(false);
                                    }

                                    const nextTime = getTimeIncrement(currentTime);

                                    if (nextTime.isAfter(endDate)) {
                                        setCurrentTime(endDate);
                                        updateWMSLayer(endDate);
                                    } else {
                                        setCurrentTime(nextTime);
                                        updateWMSLayer(nextTime);
                                    }
                                }}
                                color="primary"
                                disabled={currentTime?.isSame(endDate) || isPlaying}
                                sx={{
                                    p: 0.5,
                                    bgcolor: theme.palette.action.hover,
                                    '&:hover': { bgcolor: theme.palette.action.selected },
                                    '&.Mui-disabled': {
                                        opacity: 0.5,
                                        color: theme.palette.action.disabled
                                    }
                                }}
                            >
                                <NavigateNext sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Grid2>

                <Grid2 >
                    <Box display="flex" alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                            Range:
                        </Typography>
                        <FormControl size="small" fullWidth variant="outlined" sx={{ minWidth: 80 }}>
                            <Select
                                value={selectedRange}
                                onChange={handleRangeChange}
                                sx={{
                                    fontSize: '0.75rem',
                                    '.MuiSelect-select': { py: 0.5, px: 1 },
                                    height: '28px'
                                }}
                            >
                                {rangeOptions.map(range => (
                                    <MenuItem key={range.value} value={range.value} sx={{ fontSize: '0.75rem' }}>
                                        {range.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Grid2>
                <Grid2>
                    <Box display="flex" alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                            Interval:
                        </Typography>
                        <FormControl size="small" fullWidth variant="outlined" sx={{ minWidth: 80 }}>
                            <Select
                                disabled={isLive}
                                value={selectedInterval}
                                onChange={handleIntervalChange}
                                sx={{
                                    fontSize: '0.75rem',
                                    '.MuiSelect-select': { py: 0.5, px: 1 },
                                    height: '28px'
                                }}
                            >
                                {availableIntervals.map(interval => (
                                    <MenuItem key={interval.value} value={interval.value} sx={{ fontSize: '0.75rem' }}>
                                        {interval.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Grid2>

                <Grid2 >
                    <Tooltip title={isLive ? "Exit live mode" : "Switch to live mode"}>
                        <IconButton
                            size="small"
                            onClick={toggleLiveMode}
                            onMouseUp={handleMouseUp}
                            onMouseDown={handleMouseDown}
                            color={isLive ? "error" : "primary"}
                            sx={{
                                p: 0.5,
                                bgcolor: isLive ? `${theme.palette.error.main}15` : theme.palette.action.hover,
                                border: isLive ? 'none' : `1px solid ${theme.palette.primary.main}`,
                                position: 'relative',
                                '&:hover': {
                                    bgcolor: isLive
                                        ? `${theme.palette.error.main}30`
                                        : theme.palette.action.selected
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    color: isLive ? 'transparent' : theme.palette.primary.main,
                                    zIndex: 1
                                }}
                            >
                                LIVE
                            </Box>
                            <FiberManualRecord
                                sx={{
                                    fontSize: '1.1rem',
                                    color: isLive ? theme.palette.error.main : 'transparent',
                                    animation: isLive ? 'pulse 2s infinite' : 'none',
                                    position: 'relative',
                                    zIndex: isLive ? 2 : 0,
                                    '@keyframes pulse': {
                                        '0%': {
                                            opacity: 1
                                        },
                                        '50%': {
                                            opacity: 0.5
                                        },
                                        '100%': {
                                            opacity: 1
                                        }
                                    }
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                </Grid2>
                <Grid2 size={{xl: "grow", lg: "grow", md: 12, sm: 12, xs: 12}} >
                    <Box
                        sx={{
                            position: 'relative',
                            height: '30px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            mt: '.5rem'
                        }}
                    >
                        {/* Time Display */}
                        <Typography
                            variant="caption"
                            align="center"
                            fontWeight="bold"
                            sx={{
                                position: 'absolute',
                                top: -18,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isLive ? 'LIVE: ' : ''}{formatDateDisplay(currentTime)}{!isLive ? ` - ${formatDateDisplay(getTimeIncrement(currentTime))}` : ''}
                        </Typography>

                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 4,
                            right: 4,
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            pointerEvents: 'none',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: '14px',
                                left: 0,
                                right: 0,
                                height: '2px',
                                backgroundColor: theme.palette.divider,
                                zIndex: 0
                            }
                        }}>
                            {[0, 4].map((mark) => (
                                <Box
                                    key={mark}
                                    sx={{
                                        height: mark % 2 === 0 ? '10px' : '6px',
                                        width: '1px',
                                        backgroundColor: mark % 2 === 0 ? theme.palette.text.primary : theme.palette.text.secondary,
                                        mt: '10px',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                />
                            ))}
                        </Box>

                        <Slider
                            value={sliderValue}
                            onChange={handleSliderChange}
                            onMouseDown={handleSliderMouseDown}
                            onMouseUp={handleSliderMouseUp}
                            aria-label="Time slider"
                            step={getStepSizePercent()}
                            size="small"
                            sx={{
                                color: theme.palette.primary.main,
                                height: 4,
                                width: '100%', // Ensure full width
                                '& .MuiSlider-thumb': {
                                    height: 14,
                                    width: 14,
                                    backgroundColor: theme.palette.primary.main,
                                    '&:focus, &:hover, &.Mui-active': {
                                        boxShadow: `0 0 0 8px ${theme.palette.primary.main}24`,
                                    },
                                },
                                '& .MuiSlider-track': {
                                    height: 4,
                                },
                                '& .MuiSlider-rail': {
                                    height: 4,
                                    opacity: 0.5,
                                }
                            }}
                        />

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            sx={{
                                position: 'absolute',
                                bottom: -18,
                                left: 0,
                                right: 0,
                                px: 0.5
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
                                {formatDateDisplay(startDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
                                {formatDateDisplay(endDate)}
                            </Typography>
                        </Box>
                    </Box>
                </Grid2>

            </Grid2>
        </Paper>
    );
};