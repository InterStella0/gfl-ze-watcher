import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {fetchUrl} from "./generalUtils.jsx";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const refreshTimeoutRef = useRef(null);
    const isRefreshingRef = useRef(false);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const makeRequest = async (isRetry = false) => {
            try {
                const response = await fetchUrl(url, {
                    credentials: 'include',
                    ...options
                });
                return response;
            } catch (error) {
                // If we get 401 and haven't already retried, try to refresh token
                if (error.status === 401 && !isRetry && !isRefreshingRef.current) {
                    const refreshSuccess = await refreshToken();
                    if (refreshSuccess) {
                        return makeRequest(true); // Retry once after refresh
                    }
                }
                throw error;
            }
        };

        return makeRequest();
    }, []);

    const refreshToken = useCallback(async () => {
        if (isRefreshingRef.current) {
            return false;
        }

        isRefreshingRef.current = true;

        try {
            await fetchUrl('/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            scheduleTokenRefresh();
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            setUser(null);
            clearRefreshTimeout();
            return false;
        } finally {
            isRefreshingRef.current = false;
        }
    }, []);

    const scheduleTokenRefresh = useCallback(() => {
        clearRefreshTimeout();
        const refreshTime = 14 * 60 * 1000;

        refreshTimeoutRef.current = setTimeout(() => {
            refreshToken();
        }, refreshTime);
    }, [refreshToken]);

    const clearRefreshTimeout = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetchUrl('/accounts/me', {
                credentials: 'include'
            });
            setUser(response);
            scheduleTokenRefresh(); // Start refresh cycle
        } catch (error) {
            console.log('No active session');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [scheduleTokenRefresh]);

    useEffect(() => {
        checkAuth();

        return () => {
            clearRefreshTimeout();
        };
    }, [checkAuth, clearRefreshTimeout]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user && !isRefreshingRef.current) {
                // Tab became visible, check if we need to refresh
                refreshToken();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, refreshToken]);

    const loginDiscord = useCallback(() => {
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;
        const scope = 'identify';
        const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
        window.location.href = discordUrl;
    }, []);

    const logout = useCallback(async () => {
        clearRefreshTimeout();

        try {
            await fetchUrl('/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        setUser(null);
    }, [clearRefreshTimeout]);

    const contextValue = useMemo(() => ({
        user,
        loginDiscord,
        logout,
        loading,
        checkAuth,
        authenticatedFetch,
    }), [user, loginDiscord, logout, loading, checkAuth, authenticatedFetch]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};