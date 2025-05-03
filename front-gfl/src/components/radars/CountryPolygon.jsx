// components/CountryPolygon.jsx
import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useTheme } from '@mui/material';

const CountryPolygon = ({ geoJsonData }) => {
    const theme = useTheme();

    const geoJsonStyle = useMemo(() => ({
        fillColor: theme.palette.primary.light,
        weight: 2,
        opacity: 1,
        color: theme.palette.primary.main,
        fillOpacity: 0.3
    }), [theme]);

    const geoJsonOptions = useMemo(() => ({
        style: geoJsonStyle,
        interactive: false, // Make the polygon non-interactive/unclickable
        bubblingMouseEvents: true // Ensure events bubble up to the map
    }), [geoJsonStyle]);

    if (!geoJsonData) {
        return null;
    }

    return (
        <GeoJSON
            data={geoJsonData}
            pathOptions={geoJsonOptions}
        />
    );
};

export default CountryPolygon;