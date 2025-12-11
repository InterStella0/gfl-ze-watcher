'use client'
import {DateTimePicker} from '@mui/x-date-pickers/DateTimePicker';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {Box, Button, Grid2 as Grid, Paper, Tooltip} from '@mui/material';
import {Dispatch, ReactElement, SetStateAction, useEffect, useRef, useState} from 'react';
import dayjs from 'dayjs';
import {debounce} from 'utils/generalUtils';
import TodayIcon from '@mui/icons-material/Today';
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {DateSources, useDateState} from './DateStateManager';
import PeopleIcon from '@mui/icons-material/People';

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

function GraphToolbarControl({ setShowPlayersAction }: { setShowPlayersAction: Dispatch<SetStateAction<boolean>>}): ReactElement {
    const { start: globalStart, end: globalEnd, setDates, source: lastSource, timestamp } = useDateState();

    const [localStart, setLocalStart] = useState(globalStart);
    const [localEnd, setLocalEnd] = useState(globalEnd);
    const [showApply, setShowApply] = useState(false);
    const debouncedShowApplyRef = useRef<DebouncedFunction<(shouldShow: boolean) => void> | null>();

    useEffect(() => {
        if (lastSource !== DateSources.TOOLBAR) {
            setLocalStart(globalStart);
            setLocalEnd(globalEnd);
            setShowApply(false);
        }
    }, [globalStart, globalEnd, lastSource, timestamp]);

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
        setDates(localStart, localEnd, DateSources.TOOLBAR);
        setShowApply(false);
    };

    const handleToday = () => {
        const now = dayjs();
        const yesterday = now.subtract(6, 'hours');
        setLocalStart(yesterday);
        setLocalEnd(now);
        setDates(yesterday, now, DateSources.TOOLBAR);
        setShowApply(false);
    };

    return (
        <Box p="1rem">
            <Box gap="1rem" display="flex" justifyContent="space-between">
                <Box>
                    <Box display="flex" sx={{ flexDirection: {lg: 'row', md: 'row', sm: 'row', xs: 'column'}}}>
                        <SmallDatePicker
                            value={localStart}
                            onChange={(value) => setLocalStart(dayjs(value))}
                            label="Start"
                            disableFuture
                            maxDateTime={localEnd ?? null}
                        />
                        <Box display={{ sm: 'inline-block', xs: 'none'}}><span style={{ fontSize: '1.5rem', margin: '0 .7rem' }}>-</span></Box>
                        <Box my="1rem">
                            <SmallDatePicker
                                label="End"
                                value={localEnd}
                                onChange={(value) => setLocalEnd(dayjs(value))}
                                disableFuture
                                minDateTime={localStart ?? null}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box display="flex">
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
                    <Box>
                        <Tooltip title="Today">
                            <Button
                                variant="contained"
                                onClick={handleToday}
                                sx={{ minWidth: 30, padding: "8px", margin: '.5rem' }}
                            >
                                <TodayIcon sx={{ fontSize: '1rem' }} />
                            </Button>
                        </Tooltip>

                        <Tooltip title="Show Players">
                            <Button
                                variant="contained"
                                onClick={() => setShowPlayersAction((e: boolean) => !e)}
                                sx={{ minWidth: 30, padding: "8px", margin: '.5rem' }}
                            >
                                <PeopleIcon sx={{ fontSize: '1rem' }} />
                            </Button>
                        </Tooltip>
                    </Box>
                </Box>


            </Box>
        </Box>
    );
}

export default function GraphToolbar({ setShowPlayersAction }: { setShowPlayersAction: Dispatch<boolean>}): ReactElement {
    return (
        <Paper color="primary" elevation={0}>
            <ErrorCatch message="Graph toolbar couldn't be loaded.">
                <GraphToolbarControl setShowPlayersAction={setShowPlayersAction} />
            </ErrorCatch>
        </Paper>
    );
}