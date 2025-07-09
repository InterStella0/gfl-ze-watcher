import { useState, useEffect } from 'react';
import { fetchServerUrl } from "../../utils/generalUtils.jsx";

export const usePlayerSession = (server_id, session_id, player_id) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [playerDetails, setPlayerDetails] = useState(null);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [sessionData, playerData] = await Promise.all([
                    fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/info`, {
                        signal: abortController.signal
                    }),
                    fetchServerUrl(server_id, `/players/${player_id}/detail`, {
                        signal: abortController.signal
                    })
                ]);

                setSessionInfo(sessionData);
                setPlayerDetails(playerData);
                setLoading(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch session data:', error);
                    setError(error.message);
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [server_id, session_id, player_id]);

    return {
        loading,
        error,
        sessionInfo,
        playerDetails
    };
};