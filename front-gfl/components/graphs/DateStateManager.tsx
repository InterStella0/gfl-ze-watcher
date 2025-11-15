'use client'
import { createContext, useContext, useReducer, useCallback } from 'react';
import dayjs from 'dayjs';
import {DateState, DateStateProvider} from "types/graphServers";

export enum DateSources {
    URL,
    TOOLBAR,
    ZOOM,
    EXTERNAL
}

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
const getInitialDates = () => {
    const now = dayjs();
    return {
        start: now.subtract(6, 'hours'),
        end: now,
        source: DateSources.URL,
        timestamp: dayjs(),
        setDates: () => {}
    };
};
const DateContext = createContext<DateStateProvider>(getInitialDates());

export function DateProvider({ children }) {
    const [dateState, dispatch] = useReducer(dateReducer, getInitialDates());

    const setDates = useCallback((start: dayjs.Dayjs, end: dayjs.Dayjs, source: DateSources) => {
        dispatch({ type: 'SET_DATES', start, end, source });

        // Only update URL for non-zoom sources
        if (source !== DateSources.ZOOM) {
            // setSearchParams({
            //     start: start.toISOString(),
            //     end: end.toISOString()
            // });
        }
    }, [
        // setSearchParams
    ]);

    const value = {
        ...dateState,
        setDates
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