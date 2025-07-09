import { useState, useEffect } from 'react';
import { fetchUrl } from "../../utils/generalUtils.jsx";

export const useServerGraph = (server_id, player_id, session_id) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [serverGraph, setServerGraph] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const graphData = await fetchUrl(`/graph/${server_id}/unique_players/players/${player_id}/sessions/${session_id}`, {
                    signal: abortController.signal
                });

                setServerGraph(graphData);
                setLoading(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch server graph data:', error);
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
        serverGraph
    };
};