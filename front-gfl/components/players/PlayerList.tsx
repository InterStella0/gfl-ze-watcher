import {useDeferredValue, useEffect, useState} from "react";
import { fetchUrl } from "utils/generalUtils.ts";
import PlayerTableRow, {PlayerTableRowLoading} from "./PlayerTableRow.tsx";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import {Dayjs} from "dayjs";
import {BriefPlayers, ExtendedPlayerBrief} from "types/players.ts";
import {Card} from "components/ui/card.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "components/ui/table.tsx";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "components/ui/pagination.tsx";


function PlayerListDisplay({ dateDisplay }: { dateDisplay: StartEndDates }) {
    const [ currentPage, setPage ] = useState<number>(0)
    const pageDef = useDeferredValue(currentPage)
    const [ playersInfoResult, setPlayerInfo ] = useState<BriefPlayers | null>(null)
    const [ totalPlayers, setPlayerCount ] = useState<number>(0)
    const [ loading, setLoading ] = useState<boolean>(false)
    const { server } = useServerData()
    const server_id = server.id

    useEffect(() => {
        setPlayerInfo(null)
        setPlayerCount(0)
        setPage(0)
    }, [server_id])
    useEffect(() => {
      setPage(0)
    }, [dateDisplay])

    useEffect(() => {
        if (dateDisplay === null) return

        let { start, end } = dateDisplay
        if (!start.isBefore(end)) return
        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        const params = {
            start: start.toJSON(), 
            end: end.toJSON(),
            page: pageDef
        }

        fetchUrl(`/graph/${server_id}/players`, { params, signal })
            .then(data => {
                for (const p of data.players)
                    p.server_id = server_id
                setPlayerInfo(data)
                setPlayerCount(data.total_players)
                setLoading(false)
            })
            .catch(e => {
                if (e === "Value changed") return
                console.error(e)
                setLoading(false)
            })
        return () => {
            abortController.abort("Value changed")
        }
    }, [server_id, pageDef, dateDisplay])
    // @ts-ignore
    const playersInfo: ExtendedPlayerBrief[] = playersInfoResult?.players ?? []
    const absoluteLoad = pageDef === currentPage && !loading
    const totalPages = Math.ceil(totalPlayers / 70);

    return (
        <Card className="w-full my-2">
            <div className="max-h-[54vh] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="text-center" colSpan={3}>
                                <strong suppressHydrationWarning>
                                  Unique Players Within {dateDisplay?.start.format('lll')} - {dateDisplay?.end.format('lll')}
                                </strong>
                            </TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Total Play Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(loading || pageDef !== currentPage || playersInfoResult == null) && Array
                            .from({length: 70})
                            .map((_, index) => <PlayerTableRowLoading key={index}/>)
                        }
                        {absoluteLoad && playersInfo.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2}>No players in this list.</TableCell>
                            </TableRow>
                        )}
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing page {currentPage + 1} of {totalPages} ({totalPlayers} total players)
                </div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => {
                                    if (currentPage > 0) {
                                        setPage(currentPage - 1);
                                        setPlayerInfo(null);
                                    }
                                }}
                                className={currentPage === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i;
                            } else if (currentPage < 3) {
                                pageNum = i;
                            } else if (currentPage > totalPages - 3) {
                                pageNum = totalPages - 5 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <PaginationItem key={pageNum}>
                                    <PaginationLink
                                        onClick={() => {
                                            setPage(pageNum);
                                            setPlayerInfo(null);
                                        }}
                                        isActive={currentPage === pageNum}
                                        className="cursor-pointer"
                                    >
                                        {pageNum + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        })}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => {
                                    if (currentPage < totalPages - 1) {
                                        setPage(currentPage + 1);
                                        setPlayerInfo(null);
                                    }
                                }}
                                className={currentPage >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </Card>
      );
}
type StartEndDates = {
    start: Dayjs,
    end: Dayjs
} | null

export default function PlayerList({ dateDisplay }: { dateDisplay: StartEndDates }){
    return <ErrorCatch message="Couldn't load player list.">
        <PlayerListDisplay dateDisplay={dateDisplay} />
    </ErrorCatch>
}