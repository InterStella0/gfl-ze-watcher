import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Button } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { debounce } from '../config';

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
        <div style={{margin: '.2rem', width: '100%', display: 'flex', justifyContent: 'space-between'}}>
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
                 {showApply && <Button 
                    variant="contained"  
                    onClick={() => {
                        onSetDate({start: startDate, end: endDate})
                        setShowApply(false)
                    }}
                    sx={{ minWidth: 30, padding: "8px", margin: '0 .5rem' }}
                    >
                        <ShowChartIcon sx={{fontSize: '1rem'}} />
                    </Button>
                 }
                
            </div>
            <div>

            </div>
        </div>
    </>
}