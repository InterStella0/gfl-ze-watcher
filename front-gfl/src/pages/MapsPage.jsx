import {
    Autocomplete,
    ButtonGroup,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid2 as Grid, Pagination,
    Radio,
    RadioGroup,
    TextField
} from "@mui/material";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import {useEffect, useMemo, useState} from "react";
import ErrorCatch from "../components/ErrorMessage.jsx";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import LastPlayedMapCard from "../components/LastPlayedMapCard.jsx";

function AutocompleteMap(){
    return <></>
    return <Autocomplete
            renderInput={<TextField />}
            options={['text']} />
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
    useEffect(() => {
        setLoading(true)
        fetchUrl(`/servers/${SERVER_WATCH}/maps/last/sessions`, { params: { page: page, sorted_by: sortedByMode }})
            .then(resp => {
                setMapData(resp)

                setLoading(false)
            })
    }, [page, sortedByMode]);

    return <Grid container spacing={2}>
        <Grid container size={12}>
            <Grid size={{md: 4, sm: 6, xs: 12}}>
                <AutocompleteMap />
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
                <LastPlayedMapCard detail={e} />
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
    return <ErrorCatch>
        <MapsIndexer />
    </ErrorCatch>
}