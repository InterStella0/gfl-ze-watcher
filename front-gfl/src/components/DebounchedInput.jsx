import { Autocomplete, Box, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { fetchUrl } from "../utils.jsx";

function DebounceInput(props) {
  const { handleDebounce, debounceTimeout, ...other } = props;
  const [ value, setValue ] = useState({name: ""})
  const [ inputValue, setInputValue ] = useState("")
  const [ options, setOptions ] = useState([])
  const timerRef = useRef(undefined);

  const handleChange = (event, newValue) => {
    let actualValue = ""
    if (typeof newValue === 'string') {
      actualValue ={
        name: newValue,
      }
    } else if (newValue && newValue.inputValue) {
      actualValue = {
        name: newValue.inputValue,
      }
    } else {
      actualValue = newValue
    }
    setValue(actualValue);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (actualValue && actualValue.name.trim() === "")
        return
      handleDebounce(actualValue.name.trim());
    }, debounceTimeout);
  }

  useEffect(() => {
    if (inputValue.trim() === "") return
    fetchUrl("/players/autocomplete", { params: {player_name: inputValue}})
        .then(e => setOptions(() => e))
  }, [inputValue]);
  return <Autocomplete
      {...other} value={value} onChange={handleChange}
      options={options}
    renderOption={(props, option) => {
      const { key, ...optionProps } = props;
      return (
          <li key={option.id} {...optionProps}>
            {option.name}
          </li>
      );
    }}
      getOptionLabel={(option) => {
        // Value selected with enter, right from the input
        if (typeof option === 'string') {
          return option;
        }
        if (option.inputValue) {
          return option.inputValue;
        }
        return option.name;
      }}

      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      freeSolo
      selectOnFocus
      handleHomeEndKeys
      renderInput={(params) => (
          <TextField {...params} placeholder="Search a player name or steam id..."/>
      )}

  />;
}

export default function DebouncedInput({ onChangeValue, timeout, ...other }) {
  const handleDebounce = (value) => {
    onChangeValue(value);
  };
  return (
    <Box sx={{ width: '85%'}}>
      <DebounceInput
        {...other}
        debounceTimeout={timeout}
        handleDebounce={handleDebounce}
      />
    </Box>
  );
}
