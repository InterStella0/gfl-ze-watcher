import { useState, useEffect } from 'react';
import {fetchServerUrl} from "../../utils/generalUtils.jsx";
import {useParams} from "react-router";

export const useMapData = (session_id) => {
    const { server_id, map_name } = useParams()
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [graphMatch, setGraphMatch] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const graphData = await fetchServerUrl(server_id, `/sessions/${session_id}/all-match`, {
                    signal: abortController.signal
                });

                setGraphMatch(graphData);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch server graph data:', error);
                    setError(error.message);
                }
            }finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [server_id, map_name, session_id]);

    return {
        loading,
        error,
        graphMatch
    };
};