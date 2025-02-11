import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Button, Paper, Tooltip } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { debounce } from '../utils';
import TodayIcon from '@mui/icons-material/Today';

function SmallDatePicker(options){
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
    }} {...options}/> 
}


export default function GraphToolbar({ startInitialDate, endInitialDate, onSetDate }){
    const [ startDate, setStartDate ] = useState(startInitialDate)
    const [ endDate, setEndDate ] = useState(endInitialDate)
    const [ showApply, setShowApply ] = useState(false)
    useEffect(() => {
        setStartDate(startInitialDate)
        setEndDate(endInitialDate)
    }, [startInitialDate, endInitialDate])
    const debouncedShowApplyRef = useRef()

    debouncedShowApplyRef.current && debouncedShowApplyRef.current(startDate.isBefore(endDate) && !(
        startDate.isSame(startInitialDate) && endDate.isSame(endInitialDate)
    ))
    useEffect(() => {
      debouncedShowApplyRef.current = debounce((gonnaShow) => {
        setShowApply(gonnaShow)
      }, 1000, false)
    
      return () => {
        debouncedShowApplyRef.current.cancel()
      }
    }, []);

    return <>
        <Paper sx={{ backgroundColor: 'rgb(247, 247, 247)'}} elevation={0}>
            <div style={{margin: '.2rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignContent: 'center'}}>
                <div style={{margin: '.5rem', marginTop: '1rem', display: 'inline-flex', alignContent: 'center'}}>
                    <SmallDatePicker 
                        value={startDate} 
                        onChange={(value) => setStartDate(dayjs(value))} 
                        label="Start" 
                        disableFuture 
                        maxDateTime={endDate ?? null}
                    /> 
                    <span style={{fontSize: '1.5rem', margin: '0 .7rem'}}>-</span>
                    <SmallDatePicker 
                        label="End" 
                        value={endDate} 
                        onChange={(value) => setEndDate(dayjs(value))} 
                        disableFuture
                        minDateTime={startDate ?? null}
                    />
                    
                    {showApply && <Tooltip title="Select Date">
                            <Button 
                            variant="contained"  
                            onClick={() => {
                                onSetDate({start: startDate, end: endDate})
                                setShowApply(false)
                            }}
                            sx={{ minWidth: 30, padding: "8px", margin: '0 .5rem' }}
                            >
                                <ShowChartIcon sx={{fontSize: '1rem'}} />
                            </Button>
                        </Tooltip>
                    }
                    
                </div>
                <div style={{margin: 'auto .5rem'}}>
                    <Tooltip title="Today">
                        <Button 
                            variant="contained"  
                            onClick={() => {
                                const now = dayjs()
                                const yesterday = now.subtract(6, 'hours')
                                setStartDate(yesterday)
                                setEndDate(now)             
                                onSetDate({start: yesterday, end: now})
                                setShowApply(false)
                            }}
                            sx={{ minWidth: 30, padding: "8px", margin: '.5rem' }}
                            >
                                <TodayIcon sx={{fontSize: '1rem'}} />
                        </Button>
                    </Tooltip>
                </div>
            </div>
            
        </Paper>
    </>
}