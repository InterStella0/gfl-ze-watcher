import {ReactElement, useEffect, useRef, useState} from 'react';
import {fetchServerUrl } from "utils/generalUtils.ts";
import dayjs, {Dayjs} from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat"
import MapCard from "./MapCard.tsx";
import MapCardSkeleton from "./MapCardSkeleton.tsx";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import {ServerMapPlayed, ServerMapPlayedPaginated} from "types/maps.ts";
import { Button } from "components/ui/button";
dayjs.extend(LocalizedFormat)

export default function MapGraphList(
    { onDateChange }: { onDateChange: (newStart: Dayjs, newEnd: Dayjs) => void }
) {
    const [ page, setPage ] = useState<number>(0)
    const [ mapData, setMapData ] = useState<ServerMapPlayedPaginated | null>(null)
    const [ loading, setLoading ] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { server } = useServerData()
    const server_id = server.id

    useEffect(() => {
        const container = containerRef.current

        if (!container) return

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            container.scrollLeft += event.deltaY
        }

        container.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            container.removeEventListener("wheel", handleWheel);
        }
    }, [])
    useEffect(() => {setPage(0)}, [server_id])
    useEffect(() => {
        setLoading(true)
        fetchServerUrl(server_id, `/maps/all/sessions`, { params: { page }})
            .then(resp => {
                setMapData(resp)
                setLoading(false)
            })
        const container = containerRef.current
        if (!container) return
        container.scrollLeft = 0

    }, [server_id, page]);

    const handleMapClick = (detail: ServerMapPlayed) => {
        onDateChange(dayjs(detail.started_at), detail.ended_at != null? dayjs(detail.ended_at): dayjs())
    }

    const totalPages = Math.ceil((mapData?.total_sessions ?? 0) / 10);

    const SimplePagination = () => {
        const pages = [];
        const maxVisible = 3;
        let startPage = Math.max(1, (page + 1) - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                >
                    First
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                >
                    Prev
                </Button>
                {pages.map(p => (
                    <Button
                        key={p}
                        variant={p === (page + 1) ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(p - 1)}
                    >
                        {p}
                    </Button>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages - 1}
                >
                    Next
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages - 1)}
                    disabled={page === totalPages - 1}
                >
                    Last
                </Button>
            </div>
        );
    };

    return <>
        <div className="flex flex-col sm:flex-row justify-between items-center p-2 px-4">
            <h2 className="text-sm text-muted-foreground uppercase tracking-wide">
                Sessions
            </h2>
            <SimplePagination />
        </div>
        <div
            className="flex overflow-x-auto gap-3 p-4"
            ref={containerRef}
        >   {loading && Array.from({length: 10}).map((_, i) => <MapCardSkeleton key={i} />)}
            {!loading && mapData && mapData.maps.map((mapDetail) =>
                <MapCard key={mapDetail.time_id} detail={mapDetail} onClick={handleMapClick} server={server} />
            )}
        </div>
    </>
}
