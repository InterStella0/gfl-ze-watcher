import { Box, Input } from '@mui/material';
import { useRef } from 'react';

function DebounceInput(props) {
  const { handleDebounce, debounceTimeout, ...other } = props;

  const timerRef = useRef(undefined);

  const handleChange = (event) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      handleDebounce(event.target.value);
    }, debounceTimeout);
  };

  return <Input {...other} onChange={handleChange} />;
}

export default function DebouncedInput({ onChangeValue, timeout, ...other }) {
  const handleDebounce = (value) => {
    onChangeValue(value);
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <DebounceInput
        {...other}
        debounceTimeout={timeout}
        handleDebounce={handleDebounce}
      />
    </Box>
  );
}
