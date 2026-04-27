"use client";

import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Badge } from "components/ui/badge";
import { Card } from "components/ui/card";
import { Separator } from "components/ui/separator";
import { Skeleton } from "components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "components/ui/tooltip";
import { FetchStatusEntry } from "types/fetchStatus";
import {fetchUrl} from "utils/generalUtils.ts";

dayjs.extend(relativeTime);

const POLL_INTERVAL = 10_000;
const BUCKET_COUNT = 90;
const BUCKET_MINUTES = 24 * 60 / BUCKET_COUNT; // ~16 min each

interface Bucket {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
    ok: number;
    error: number;
    firstError: string | null;
}

interface Track {
    label: string;
    buckets: Bucket[];
    totalOk: number;
    totalFetches: number;
}

interface ServerGroup {
    serverId: string;
    serverName: string;
    tracks: Track[];
    hasError: boolean;
    hasOutage: boolean;
    hasData: boolean;
}

interface CommunityGroup {
    communityId: string;
    communityName: string;
    servers: ServerGroup[];
}

function buildBuckets(entries: FetchStatusEntry[]): Bucket[] {
    const now = dayjs();
    const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => {
        const minutesFromEnd = (BUCKET_COUNT - 1 - i) * BUCKET_MINUTES;
        const end = now.subtract(minutesFromEnd, "minute");
        const start = end.subtract(BUCKET_MINUTES, "minute");
        return { start, end, ok: 0, error: 0, firstError: null };
    });

    for (const e of entries) {
        const t = dayjs(e.fetched_at);
        const minutesAgo = now.diff(t, "minute");
        const idx = BUCKET_COUNT - 1 - Math.floor(minutesAgo / BUCKET_MINUTES);
        if (idx < 0 || idx >= BUCKET_COUNT) continue;
        if (e.ok) {
            buckets[idx].ok++;
        } else {
            buckets[idx].error++;
            if (!buckets[idx].firstError && e.error) {
                buckets[idx].firstError = e.error;
            }
        }
    }

    return buckets;
}

function groupEntries(entries: FetchStatusEntry[]): CommunityGroup[] {
    const communityMap = new Map<string, { name: string; servers: Map<string, { name: string; tracks: Map<string, FetchStatusEntry[]> }> }>();

    for (const e of entries) {
        if (!communityMap.has(e.community_id)) {
            communityMap.set(e.community_id, { name: e.community_name, servers: new Map() });
        }
        const community = communityMap.get(e.community_id)!;

        if (!community.servers.has(e.server_id)) {
            community.servers.set(e.server_id, { name: e.server_name, tracks: new Map() });
        }
        const server = community.servers.get(e.server_id)!;

        const key = `${e.op_name} · ${e.source_name}`;
        if (!server.tracks.has(key)) server.tracks.set(key, []);
        server.tracks.get(key)!.push(e);
    }

    const communities: CommunityGroup[] = [];
    for (const [communityId, { name: communityName, servers }] of communityMap) {
        const serverGroups: ServerGroup[] = [];

        for (const [serverId, { name: serverName, tracks: trackMap }] of servers) {
            const tracks: Track[] = [];
            let serverHasError = false;

            let serverHasOutage = false;

            for (const [label, trackEntries] of trackMap) {
                const buckets = buildBuckets(trackEntries);
                const totalOk = trackEntries.filter((e) => e.ok).length;
                const totalFetches = trackEntries.length;
                const errorRate = totalFetches > 0 ? (totalFetches - totalOk) / totalFetches : 0;
                if (errorRate >= 0.5) serverHasError = true;
                if (errorRate >= 0.9) serverHasOutage = true;
                tracks.push({ label, buckets, totalOk, totalFetches });
            }

            serverGroups.push({
                serverId,
                serverName,
                tracks,
                hasError: serverHasError,
                hasOutage: serverHasOutage,
                hasData: tracks.some((t) => t.totalFetches > 0),
            });
        }

        communities.push({ communityId, communityName, servers: serverGroups });
    }

    return communities;
}

function computeOverallStatus(communities: CommunityGroup[]): "operational" | "degraded" | "outage" {
    const servers = communities.flatMap((c) => c.servers);
    if (servers.length === 0) return "operational";
    if (servers.some((g) => g.hasData && g.hasOutage)) return "outage";
    if (servers.some((g) => g.hasError)) return "degraded";
    return "operational";
}

function UptimeBar({ buckets }: { buckets: Bucket[] }) {
    return (
        <div className="flex gap-px flex-1">
            {buckets.map((b, i) => {
                const total = b.ok + b.error;
                const bucketErrorRate = total > 0 ? b.error / total : 0;
                const color =
                    total === 0
                        ? "bg-muted"
                        : bucketErrorRate >= 0.5
                        ? "bg-red-500"
                        : b.error > 0
                        ? "bg-yellow-500"
                        : "bg-green-500";

                const label =
                    total === 0
                        ? "No data"
                        : b.error > 0
                        ? `${b.error} error${b.error > 1 ? "s" : ""}, ${b.ok} ok`
                        : `${b.ok} ok`;

                return (
                    <Tooltip key={i}>
                        <TooltipTrigger asChild>
                            <div
                                className={`h-8 flex-1 rounded-sm ${color} cursor-default transition-opacity hover:opacity-70`}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-60">
                            <p className="font-medium">
                                {b.start.format("MMM D, HH:mm")} – {b.end.format("HH:mm")}
                            </p>
                            <p>{label}</p>
                            {b.firstError && (
                                <p className="mt-1 truncate text-red-300">{b.firstError}</p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}

function StatusBanner({
    status,
    lastUpdated,
}: {
    status: "operational" | "degraded" | "outage";
    lastUpdated: dayjs.Dayjs | null;
}) {
    const config = {
        operational: {
            bg: "bg-green-500/10 border-green-500/30",
            dot: "bg-green-500",
            text: "text-green-600 dark:text-green-400",
            label: "All Systems Operational",
        },
        degraded: {
            bg: "bg-yellow-500/10 border-yellow-500/30",
            dot: "bg-yellow-500",
            text: "text-yellow-600 dark:text-yellow-400",
            label: "Degraded Performance",
        },
        outage: {
            bg: "bg-red-500/10 border-red-500/30",
            dot: "bg-red-500",
            text: "text-red-600 dark:text-red-400",
            label: "Partial Outage",
        },
    }[status];

    return (
        <div className={`rounded-xl border px-5 py-4 ${config.bg}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={`size-3 rounded-full ${config.dot} shrink-0`} />
                    <span className={`text-lg font-semibold ${config.text}`}>
                        {config.label}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {lastUpdated ? `Updated ${lastUpdated.fromNow()}` : "Loading…"}
                </span>
            </div>
        </div>
    );
}

function ServerCard({ group }: { group: ServerGroup }) {
    const statusLabel = !group.hasData
        ? "No Data"
        : group.hasError
        ? "Degraded"
        : "Operational";
    const statusVariant: "default" | "destructive" | "outline" = !group.hasData
        ? "outline"
        : group.hasError
        ? "destructive"
        : "default";

    return (
        <Card className="gap-0 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
                <span className="font-semibold">{group.serverName}</span>
                <Badge variant={statusVariant} className="text-xs">
                    {statusLabel}
                </Badge>
            </div>
            <Separator />
            <div className="px-5 py-4 flex flex-col gap-3">
                {group.tracks.map((track) => {
                    const uptime =
                        track.totalFetches === 0
                            ? null
                            : Math.round((track.totalOk / track.totalFetches) * 100);

                    return (
                        <div key={track.label} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-48 shrink-0 truncate font-mono">
                                {track.label}
                            </span>
                            <UptimeBar buckets={track.buckets} />
                            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                                {uptime === null ? "–" : `${uptime}%`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

function StatusSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            {[1, 2, 3].map((i) => (
                <Card key={i} className="gap-0 p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Separator />
                    <div className="px-5 py-4 flex flex-col gap-3">
                        {[1, 2].map((j) => (
                            <div key={j} className="flex items-center gap-3">
                                <Skeleton className="h-4 w-48 shrink-0" />
                                <Skeleton className="h-8 flex-1" />
                                <Skeleton className="h-4 w-10 shrink-0" />
                            </div>
                        ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}

export default function FetchStatusTable() {
    const [entries, setEntries] = useState<FetchStatusEntry[] | null>(null);
    const [lastUpdated, setLastUpdated] = useState<dayjs.Dayjs | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const data = await fetchUrl("/fetch-status", { next: { revalidate: 60 } });
            setEntries(data);
            setLastUpdated(dayjs());
        } catch {}
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, POLL_INTERVAL);
        return () => clearInterval(id);
    }, [fetchData]);

    if (entries === null) return <StatusSkeleton />;

    const communities = groupEntries(entries);
    const overallStatus = computeOverallStatus(communities);

    return (
        <div className="flex flex-col gap-4">
            <StatusBanner status={overallStatus} lastUpdated={lastUpdated} />

            {communities.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                    No fetch data in the last 24 hours.
                </p>
            ) : (
                <>
                    {communities.map((community) => (
                        <div key={community.communityId} className="flex flex-col gap-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                {community.communityName}
                            </h2>
                            {community.servers.map((g) => (
                                <ServerCard key={g.serverId} group={g} />
                            ))}
                        </div>
                    ))}

                    <div className="flex justify-between text-xs text-muted-foreground px-1 mt-1">
                        <span>24 hours ago</span>
                        <span>Now</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-sm bg-green-500 inline-block" />
                            Operational
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-sm bg-yellow-500 inline-block" />
                            Minor errors (&lt;50%)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-sm bg-red-500 inline-block" />
                            Degraded
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-3 rounded-sm bg-muted inline-block border" />
                            No data
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
