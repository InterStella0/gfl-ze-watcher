"use client"
import {LinearProgress} from "@mui/material";
import { useLinkStatus } from 'next/link'

export default function LinkLoading() {
    const { pending } = useLinkStatus();
    if (!pending) {
        return <></>
    }
    return <LinearProgress variant="indeterminate" />
}