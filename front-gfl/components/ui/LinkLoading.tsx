"use client"
import { useLinkStatus } from 'next/link'
import {Progress} from "components/ui/progress.tsx";

export default function LinkLoading() {
    const { pending } = useLinkStatus();
    if (!pending) {
        return <></>
    }
    return <Progress className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
        <div className="w-1/2 bg-primary animate-[progress_1.5s_linear_infinite] h-full" />
    </Progress>
}