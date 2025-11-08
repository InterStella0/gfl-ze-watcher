import { useState, useEffect } from 'react';
import { fetchServerUrl } from "../../utils/generalUtils.ts";
import {useParams} from "react-router";

export const useMapSession = () => {
    const { server_id, map_name, session_id} = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const sessionData = await fetchServerUrl(server_id, `/sessions/${session_id}/info`, {
                    signal: abortController.signal
                })

                setSessionInfo(sessionData);
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
    }, [server_id, session_id, map_name]);

    return {
        loading,
        error,
        sessionInfo
    };
};