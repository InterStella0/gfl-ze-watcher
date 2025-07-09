import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Button, Paper, Tooltip } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { debounce } from '../../utils/generalUtils.jsx';
import TodayIcon from '@mui/icons-material/Today';
import ErrorCatch from "../ui/ErrorMessage.jsx";
import { useDateState } from './DateStateManager.jsx';

function SmallDatePicker(options) {
    return <DateTimePicker
        slotProps={{
            textField: {
                sx: {
                    "& .MuiInputBase-input": { fontSize: 13, height: '1.5em', padding: '5px' },
                    "& .MuiFormLabel-root": {
                        fontSize: '0.75rem',
                        transform: "translate(14px, 8px) scale(1)",
                        transition: "all 0.2s ease-out",
                    },
                    "& .MuiInputLabel-shrink": {
                        transform: "translate(14px, -9px) scale(0.75)",
                    }
                }
            }
        }} {...options} />
}

function GraphToolbarControl() {
    const { start: globalStart, end: globalEnd, setDates, sources, source: lastSource, timestamp } = useDateState();

    const [localStart, setLocalStart] = useState(globalStart);
    const [localEnd, setLocalEnd] = useState(globalEnd);
    const [showApply, setShowApply] = useState(false);
    const debouncedShowApplyRef = useRef();

    useEffect(() => {
        if (lastSource !== sources.TOOLBAR) {
            setLocalStart(globalStart);
            setLocalEnd(globalEnd);
            setShowApply(false);
        }
    }, [globalStart, globalEnd, lastSource, sources.TOOLBAR, timestamp]);

    useEffect(() => {
        debouncedShowApplyRef.current = debounce((shouldShow) => {
            setShowApply(shouldShow);
        }, 1000, false);

        return () => {
            debouncedShowApplyRef.current?.cancel();
        };
    }, []);

    // Check if apply button should show
    useEffect(() => {
        const shouldShow = localStart.isBefore(localEnd) &&
            !(localStart.isSame(globalStart) && localEnd.isSame(globalEnd));
        debouncedShowApplyRef.current?.(shouldShow);
    }, [localStart, localEnd, globalStart, globalEnd]);

    const handleApply = () => {
        setDates(localStart, localEnd, sources.TOOLBAR);
        setShowApply(false);
    };

    const handleToday = () => {
        const now = dayjs();
        const yesterday = now.subtract(6, 'hours');
        setLocalStart(yesterday);
        setLocalEnd(now);
        setDates(yesterday, now, sources.TOOLBAR);
        setShowApply(false);
    };

    return (
        <div style={{ margin: '.2rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignContent: 'center' }}>
            <div style={{ margin: '.5rem', marginTop: '1rem', display: 'inline-flex', alignContent: 'center' }}>
                <SmallDatePicker
                    value={localStart}
                    onChange={(value) => setLocalStart(dayjs(value))}
                    label="Start"
                    disableFuture
                    maxDateTime={localEnd ?? null}
                />
                <span style={{ fontSize: '1.5rem', margin: '0 .7rem' }}>-</span>
                <SmallDatePicker
                    label="End"
                    value={localEnd}
                    onChange={(value) => setLocalEnd(dayjs(value))}
                    disableFuture
                    minDateTime={localStart ?? null}
                />

                {showApply && (
                    <Tooltip title="Select Date">
                        <Button
                            variant="contained"
                            onClick={handleApply}
                            sx={{ minWidth: 30, padding: "8px", margin: '0 .5rem' }}
                        >
                            <ShowChartIcon sx={{ fontSize: '1rem' }} />
                        </Button>
                    </Tooltip>
                )}
            </div>
            <div style={{ margin: 'auto .5rem' }}>
                <Tooltip title="Today">
                    <Button
                        variant="contained"
                        onClick={handleToday}
                        sx={{ minWidth: 30, padding: "8px", margin: '.5rem' }}
                    >
                        <TodayIcon sx={{ fontSize: '1rem' }} />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}

export default function GraphToolbar() {
    return (
        <Paper color="primary" elevation={0}>
            <ErrorCatch message="Graph toolbar couldn't be loaded.">
                <GraphToolbarControl />
            </ErrorCatch>
        </Paper>
    );
}