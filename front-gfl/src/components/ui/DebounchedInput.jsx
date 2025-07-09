import { Autocomplete, Box, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { fetchServerUrl } from "../../utils/generalUtils.jsx";
import {useParams} from "react-router";

function DebounceInput(props) {
  const { initialValue, handleDebounce, debounceTimeout, ...other } = props;
  const [value, setValue] = useState({ name: initialValue });
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const timerRef = useRef(undefined);
  const {server_id} = useParams()

  const handleChange = (event, newValue) => {
    let actualValue = "";
    if (typeof newValue === 'string') {
      actualValue = {
        name: newValue,
      };
    } else if (newValue && newValue.inputValue) {
      actualValue = {
        name: newValue.inputValue,
      };
    } else {
      actualValue = newValue;
    }
    setValue(actualValue);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (actualValue && actualValue.name.trim() === "")
        return;
      handleDebounce(actualValue.name.trim());
    }, debounceTimeout);
  };

  useEffect(() => {
    if (inputValue.trim() === "") return;
    fetchServerUrl(server_id, "/players/autocomplete", { params: { player_name: inputValue } })
        .then(e => setOptions(() => e));
  }, [server_id, inputValue]);

  return (
      <Autocomplete
          {...other}
          value={value}
          onChange={handleChange}
          options={options}
          fullWidth
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
              <TextField
                  {...params}
                  fullWidth
                  placeholder="Search a player name or steam id..."
              />
          )}
      />
  );
}

export default function DebouncedInput({ initialValue, onChangeValue, timeout, ...other }) {
  const handleDebounce = (value) => {
    onChangeValue(value);
  };

  return (
      <Box sx={{ width: '100%' }}>
        <DebounceInput
            {...other}
            fullWidth
            initialValue={initialValue}
            debounceTimeout={timeout}
            handleDebounce={handleDebounce}
        />
      </Box>
  );
}