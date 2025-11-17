'use client'
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {fetchUrl} from "./generalUtils.ts";

const AuthContext = createContext(null);

export const AuthProvider = ({ children, initialUser = null }) => {
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(!initialUser);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchUrl('/accounts/me', { credentials: 'include' });
            setUser(response);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const loginDiscord = useCallback(() => {
        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
        const scope = 'identify';
        const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&response_type=code&scope=${scope}`;
        window.location.href = discordUrl;
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetchUrl('/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        // Only check auth if no user from SSR
        if (!initialUser) checkAuth();
    }, [initialUser, checkAuth]);

    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden) checkAuth(); // refresh user if tab refocused
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [checkAuth]);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const res = await fetchUrl(url, { credentials: 'include', ...options });
        if (res.status === 401) {
            // optional: trigger recheck or redirect
            await checkAuth();
        }
        return res;
    }, [checkAuth]);

    const value = useMemo(
        () => ({ user, loading, loginDiscord, logout, authenticatedFetch, checkAuth }),
        [user, loading, loginDiscord, logout, authenticatedFetch, checkAuth]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};