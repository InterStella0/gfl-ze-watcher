import {
    Autocomplete,
    ButtonGroup,
    Grid2 as Grid, Pagination,
    TextField
} from "@mui/material";
import Button from "@mui/material/Button";
import {useEffect, useMemo, useRef, useState} from "react";
import ErrorCatch from "../components/ErrorMessage.jsx";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import LastPlayedMapCard from "../components/LastPlayedMapCard.jsx";
import Box from "@mui/material/Box";
import {useNavigate} from "react-router";

function AutocompleteMap({ onChangeValue }){
    const [ options, setOptions ] = useState([])
    const [ inputValue, setInputValue ] = useState("")
    const [ value, setValue ] = useState("")
    const timerRef = useRef(null)

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
        setValue(actualValue?.name ?? "")
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onChangeValue(actualValue?.name?.trim() ?? "")
        }, 100);
    }

    useEffect(() => {
        if (inputValue.trim() === "") return
        fetchUrl(`/servers/${SERVER_WATCH}/maps/autocomplete`, { params: {map: inputValue} })
            .then(data => setOptions([...data.map(e => e.map)]))
    }, [inputValue])
    return <Autocomplete
            size="small"
            freeSolo
            value={value}
            sx={{ width: '100%' }}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={handleChange}
            renderInput={(params) => <TextField size="small" {...params} label="Search for maps" />}
            options={options} />
}

function MapsIndexer(){
    const sortedBy = useMemo(() => ({
        LastPlayed: "Recently played",
        HighestHour: "Most hours played",
        FrequentlyPlayed: "Frequently played"
    }), [])
    const [ page, setPage ] = useState(0)
    const [ loading, setLoading ] = useState(false)
    const [ sortedData, setMapData ] = useState({ total_maps: 0, maps: [] })
    const [ sortedByMode, setSortedByMode ] = useState("LastPlayed")
    const [ searchMap, setSearchMap ] = useState("")
    const navigate = useNavigate()
    useEffect(() => {
        setLoading(true)
        fetchUrl(`/servers/${SERVER_WATCH}/maps/last/sessions`, { params: {
            page: page, sorted_by: sortedByMode, search_map: searchMap
        }})
            .then(resp => {
                setMapData(resp)

                setLoading(false)
            })
    }, [page, sortedByMode, searchMap]);

    const handleMapClick = detail => {
        navigate(`/maps/${detail.map}`)
    }

    return <Grid container spacing={2}>
        <Grid container size={12}>
            <Grid size={{md: 4, sm: 6, xs: 12}}>
                <Box sx={{ display: "flex", alignItems: 'center', m: '1rem'}}>
                    <AutocompleteMap onChangeValue={setSearchMap} />
                </Box>
            </Grid>
            <Grid size={{md: 4, sm: 0, xs: 0}} sx={{justifyContent: 'center', alignItems: 'center', display: {md: 'flex', xs: 'none', sm: 'none'}}}>
                <Pagination
                    count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                    variant="outlined"
                    color="primary"
                    siblingCount={0}
                    page={page + 1}
                    onChange={(_, e) => setPage(e - 1)} />
            </Grid>
            <Grid container size={{md: 4, sm: 6, xs: 12}} sx={{ justifyContent: 'end'}}>
                <ButtonGroup  variant="outlined" sx={{m: '1rem'}}>
                    {Object.entries(sortedBy).map(([ value, label ]) => <Button
                        key={value} variant={value === sortedByMode? "contained": "outlined"}
                                    onClick={() => {
                                        setSortedByMode(value)
                                        setPage(0)
                                    }}>{label}</Button>
                    )}
                </ButtonGroup>
            </Grid>
            <Grid size={{md: 4, sm: 12, xs: 12}} sx={{justifyContent: 'center', alignItems: 'center', display: {md: 'none', xs: 'flex', sm: 'flex'}}}>
                <Pagination
                    count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                    variant="outlined"
                    color="primary"
                    siblingCount={0}
                    page={page + 1}
                    onChange={(_, e) => setPage(e - 1)} />
            </Grid>
        </Grid>
        <Grid container size={12} spacing={2} sx={{m: '1rem'}}>
            {sortedData.maps.map(e => <Grid key={e.map} size={{xl: 3, md: 4, sm: 6, xs: 12}} sx={{px: 1}}>
                <LastPlayedMapCard detail={e} onClick={handleMapClick} />
            </Grid>)}
        </Grid>

        <Grid size={12} sx={{justifyContent: 'center', alignItems: 'center', display: 'flex', my: '1rem'}}>
            <Pagination
                count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                variant="outlined"
                color="primary"
                siblingCount={0}
                page={page + 1}
                onChange={(_, e) => setPage(e - 1)} />
        </Grid>
    </Grid>
}

export default function MapsPage(){
    return <ErrorCatch message="Couldn't display 'maps' page.">
        <MapsIndexer />
    </ErrorCatch>
}