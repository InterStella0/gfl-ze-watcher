import { useState, useEffect } from 'react';
import { fetchServerUrl } from "utils/generalUtils.ts";

export const useMutualSessions = (server_id, object_id, session_id, type) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mutualSessions, setMutualSessions] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();
        let url = ""
        switch (type) {
            case "player":
                url = `/players/${object_id}/sessions/${session_id}/might_friends`
                break
            case "map":
                url = `/sessions/${session_id}/players`
                break
            default:
                return
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const mutualData = await fetchServerUrl(server_id, url, {
                    signal: abortController.signal
                });

                setMutualSessions(mutualData);
                setLoading(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch mutual sessions data:', error);
                    setError(error.message);
                    setLoading(false);
                }
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
        mutualSessions
    };
};