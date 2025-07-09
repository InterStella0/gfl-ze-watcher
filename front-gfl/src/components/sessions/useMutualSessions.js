import { useState, useEffect } from 'react';
import { fetchServerUrl } from "../../utils/generalUtils.jsx";

export const useMutualSessions = (server_id, player_id, session_id) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mutualSessions, setMutualSessions] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const mutualData = await fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/might_friends`, {
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
    }, [server_id, player_id, session_id]);

    return {
        loading,
        error,
        mutualSessions
    };
};