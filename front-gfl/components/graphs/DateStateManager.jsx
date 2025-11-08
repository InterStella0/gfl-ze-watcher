import { createContext, useContext, useReducer, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';

// Date change sources
const DATE_SOURCES = {
    URL: 'URL',
    TOOLBAR: 'TOOLBAR',
    ZOOM: 'ZOOM',
    EXTERNAL: 'EXTERNAL' // Date Insert Source
};

const dateReducer = (state, action) => {
    switch (action.type) {
        case 'SET_DATES':
            return {
                ...state,
                start: action.start,
                end: action.end,
                source: action.source,
                timestamp: Date.now()
            };
        default:
            return state;
    }
};

const DateContext = createContext();

export function DateProvider({ children }) {
    const [searchParams, setSearchParams] = useSearchParams();

    const getInitialDates = () => {
        if (searchParams.get('start') && searchParams.get('end')) {
            return {
                start: dayjs(searchParams.get('start')),
                end: dayjs(searchParams.get('end')),
                source: DATE_SOURCES.URL,
                timestamp: Date.now()
            };
        }
        const now = dayjs();
        return {
            start: now.subtract(6, 'hours'),
            end: now,
            source: DATE_SOURCES.URL,
            timestamp: Date.now()
        };
    };

    const [dateState, dispatch] = useReducer(dateReducer, getInitialDates());

    const setDates = useCallback((start, end, source) => {
        dispatch({ type: 'SET_DATES', start, end, source });

        // Only update URL for non-zoom sources
        if (source !== DATE_SOURCES.ZOOM) {
            setSearchParams({
                start: start.toISOString(),
                end: end.toISOString()
            });
        }
    }, [setSearchParams]);

    const value = {
        ...dateState,
        setDates,
        sources: DATE_SOURCES
    };
    return (
        <DateContext.Provider value={value}>
            {children}
        </DateContext.Provider>
    );
}

export const useDateState = () => {
    const context = useContext(DateContext);
    if (!context) {
        throw new Error('useDateState must be used within DateProvider');
    }
    return context;
};