import {
    Autocomplete,
    ButtonGroup,
    Grid2 as Grid, Pagination,
    TextField
} from "@mui/material";
import Button from "@mui/material/Button";
import {useEffect, useMemo, useRef, useState} from "react";
import ErrorCatch from "../components/ui/ErrorMessage.jsx";
import {fetchServerUrl, formatTitle} from "../utils.jsx";
import LastPlayedMapCard, {LastPlayedMapCardSkeleton} from "../components/maps/LastPlayedMapCard.jsx";
import Box from "@mui/material/Box";
import {useNavigate, useSearchParams} from "react-router";
import {Helmet} from "@dr.pogodin/react-helmet";

function AutocompleteMap({ initialValue, onChangeValue }){
    const [ options, setOptions ] = useState([])
    const [ inputValue, setInputValue ] = useState("")
    const [ value, setValue ] = useState(initialValue)
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
        fetchServerUrl(`/maps/autocomplete`, { params: {map: inputValue} })
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
    const [ searchParams, setSearchParams] = useSearchParams()
    const page = Number(searchParams.get("page")) || 1
    const sortedByMode = searchParams.get("sortBy") ?? "LastPlayed"
    const searchMap = searchParams.get("q") ?? ""
    const [ loading, setLoading ] = useState(false)
    const [ sortedData, setMapData ] = useState({ total_maps: 0, maps: [] })
    const navigate = useNavigate()
    useEffect(() => {
        const abort = new AbortController()
        setLoading(true)
        fetchServerUrl(`/maps/last/sessions`, { params: {
            page: page - 1, sorted_by: sortedByMode, search_map: searchMap
        }, signal: abort.signal})
            .then(resp => {
                setMapData(resp)
                setLoading(false)
            })
            .catch(e => {
                if (e === "Page change") return
                console.error(e)
                setLoading(false)
            })
        return () => {
            abort.abort("Page change")
        }
    }, [page, sortedByMode, searchMap]);

    const handleMapClick = detail => {
        navigate(`/maps/${detail.map}`)
    }

    return <>
        <Helmet prioritizeSeoTags>
            <title>{formatTitle("Maps")}</title>
            <link rel="canonical" href={`${window.location.origin}/maps`} />
            <meta name="description" content="Activities of maps in GFL Server." />
            <meta property="og:title" content={formatTitle("Maps")}/>
            <meta property="og:description" content="Activities of maps in GFL Server." />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={`${window.location.origin}/maps/`} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
        </Helmet>
        <Grid container spacing={2}>
        <Grid container size={12}>
            <Grid size={{md: 4, sm: 6, xs: 12}}>
                <Box sx={{ display: "flex", alignItems: 'center', m: '1rem'}}>
                    <AutocompleteMap initialValue={searchMap} onChangeValue={value => {
                        setSearchParams(params => {
                            const p = new URLSearchParams(params)
                            p.set("page", 1)
                            p.set("q", value)
                            return p
                        })
                    }} />
                </Box>
            </Grid>
            <Grid size={{md: 4, sm: 0, xs: 0}} sx={{justifyContent: 'center', alignItems: 'center', display: {md: 'flex', xs: 'none', sm: 'none'}}}>
                <Pagination
                    count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                    variant="outlined"
                    color="primary"
                    siblingCount={0}
                    page={page}
                    onChange={(_, e) =>
                        setSearchParams((params) => {
                            const p = new URLSearchParams(params)
                            p.set("page", e)
                            return p
                        })}
                />
            </Grid>
            <Grid container size={{md: 4, sm: 6, xs: 12}} sx={{ justifyContent: 'end'}}>
                <ButtonGroup  variant="outlined" sx={{m: '1rem'}}>
                    {Object.entries(sortedBy).map(([ value, label ]) => <Button
                        key={value} variant={value === sortedByMode? "contained": "outlined"}
                                    onClick={() => {
                                        setSearchParams((params) => {
                                            const p = new URLSearchParams(params)
                                            p.set("page", 1)
                                            p.set("sortBy", value)
                                            return p
                                        })
                                    }}>{label}</Button>
                    )}
                </ButtonGroup>
            </Grid>
            <Grid size={{md: 4, sm: 12, xs: 12}} sx={{justifyContent: 'center', alignItems: 'center',
                display: {md: 'none', xs: 'flex', sm: 'flex'}}}>
                <Pagination
                    count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                    variant="outlined"
                    color="primary"
                    siblingCount={0}
                    page={page}
                    onChange={(_, e) => setSearchParams((params) => {
                        const p = new URLSearchParams(params)
                        p.set("page", e)
                        return p
                    })} />
            </Grid>
        </Grid>
        <Grid container size={12} spacing={2} sx={{m: '1rem'}}>
            {loading && Array.from({length: 20}).map((_, index) =>
                <Grid  key={index} size={{xl: 3, md: 4, sm: 6, xs: 12}} sx={{px: 1}}>
                    <LastPlayedMapCardSkeleton />
                </Grid>
            )}
            {!loading && sortedData.maps.map(e => <Grid key={e.map} size={{xl: 3, md: 4, sm: 6, xs: 12}} sx={{px: 1}}>
                <LastPlayedMapCard detail={e} onClick={handleMapClick} />
            </Grid>)}
        </Grid>

        <Grid size={12} sx={{justifyContent: 'center', alignItems: 'center', display: 'flex', my: '1rem'}}>
            <Pagination
                count={Math.ceil((sortedData?.total_maps ?? 0) / 20)}
                variant="outlined"
                color="primary"
                siblingCount={0}
                page={page}
                onChange={(_, e) => setSearchParams((params) => {
                    const p = new URLSearchParams(params)
                    p.set("page", e)
                    return p
                })} />
        </Grid>
    </Grid>
    </>
}

export default function MapsPage(){
    return <ErrorCatch message="Couldn't display 'maps' page.">
        <MapsIndexer />
    </ErrorCatch>
}