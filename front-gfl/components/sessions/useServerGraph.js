import { useState, useEffect } from 'react';
import { fetchUrl } from "../../utils/generalUtils.ts";

export const useServerGraph = (server_id, object_id, session_id, type) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [serverGraph, setServerGraph] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();
        let url = ""
        switch(type) {
            case "player":
                url = `/graph/${server_id}/unique_players/players/${object_id}/sessions/${session_id}`
                break
            case "map":
                url = `/graph/${server_id}/unique_players/maps/${object_id}/sessions/${session_id}`
                break
            default:
                return
        }
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const graphData = await fetchUrl(url, {
                    signal: abortController.signal
                });

                setServerGraph(graphData);
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
    }, [server_id, object_id, session_id, type]);

    return {
        loading,
        error,
        serverGraph
    };
};