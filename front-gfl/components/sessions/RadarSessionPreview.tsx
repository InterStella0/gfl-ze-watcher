'use client'
import dynamic from "next/dynamic";
import dayjs from "dayjs";
const RadarMap = dynamic(() => import("components/radars/RadarMap"), {
    ssr: false,
});

export default function RadarSessionPreview({ start, end }: { start: string; end: string }) {
    const started = dayjs(start)
    const ended = dayjs(end)
    return <>
        <RadarMap dateDisplay={{ start: started, end: ended }} height="50vh" />
    </>
}