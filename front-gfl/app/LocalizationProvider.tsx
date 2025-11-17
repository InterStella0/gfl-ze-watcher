'use client'
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {ReactElement, ReactNode} from "react";

export default function Localization({ children }: { children: ReactNode }): ReactElement {
    return <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
    </LocalizationProvider>
}