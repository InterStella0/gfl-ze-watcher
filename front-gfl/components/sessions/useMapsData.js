import { useState, useEffect } from 'react';
import { fetchServerUrl, getMapImage } from "../../utils/generalUtils.ts";

export const useMapsData = (server_id, player_id, session_id) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [maps, setMaps] = useState([]);
    const [mapImages, setMapImages] = useState({});

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const mapsData = await fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/maps`, {
                    signal: abortController.signal
                });

                setMaps(mapsData);

                const imagePromises = mapsData.map(async (map) => {
                    try {
                        const imageData = await getMapImage(server_id, map.map);
                        return { [map.map]: imageData?.extra_large || null };
                    } catch (error) {
                        console.error(`Failed to load image for ${map.map}:`, error);
                        return { [map.map]: null };
                    }
                });

                const imageResults = await Promise.all(imagePromises);
                const imageMap = imageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                setMapImages(imageMap);

                setLoading(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch maps data:', error);
                    setError(error.message);
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [server_id, player_id, session_id]);

    return {
        loading,
        error,
        maps,
        mapImages
    };
};