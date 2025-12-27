'use client'

import { use, useState, useEffect } from 'react';
import { Guide } from 'types/guides';
import { Card } from 'components/ui/card';
import { Skeleton } from 'components/ui/skeleton';
import { AlertTriangle, BookOpen } from 'lucide-react';
import PaginationPage from 'components/ui/PaginationPage';
import ServerGuideCard from './ServerGuideCard';
import ErrorCatch from 'components/ui/ErrorMessage';
import { fetchApiServerUrl } from 'utils/generalUtils';
import { Server } from 'types/community';

interface ServerGuidesListDisplayProps {
    serverPromise: Promise<Server>;
    sessionPromise: Promise<any>;
}

function ServerGuidesListDisplay({ serverPromise, sessionPromise }: ServerGuidesListDisplayProps) {
    const server = use(serverPromise);
    const session = use(sessionPromise);

    const [guides, setGuides] = useState<Guide[]>([]);
    const [totalGuides, setTotalGuides] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch guides
    useEffect(() => {
        const abortController = new AbortController();
        setLoading(true);
        setError(null);

        fetchApiServerUrl(server.id, `/guides`, {
            params: { page: page.toString() },
            signal: abortController.signal
        })
            .then(data => {
                setGuides(data.guides);
                setTotalGuides(data.total_guides);
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    setError(err.message || 'Failed to load guides');
                }
            })
            .finally(() => setLoading(false));

        return () => abortController.abort();
    }, [server.id, page]);

    const totalPages = Math.ceil(totalGuides / 10);

    return (
        <div className="container max-w-screen-xl mx-auto px-4">
            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-5/6 mb-4" />
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Error State */}
            {!loading && error && (
                <Card className="p-6">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {!loading && !error && guides.length === 0 && (
                <Card className="p-12">
                    <div className="text-center">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No guides yet</h3>
                        <p className="text-muted-foreground">
                            No guides have been created for this server's maps yet.
                        </p>
                    </div>
                </Card>
            )}

            {/* Guides Grid */}
            {!loading && !error && guides.length > 0 && (
                <>
                    {totalPages > 1 && (
                        <div className="mb-6">
                            <PaginationPage
                                page={page}
                                setPage={setPage}
                                totalPages={totalPages}
                                compact
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {guides.map((guide) => (
                            <ServerGuideCard
                                key={guide.id}
                                guide={guide}
                                serverId={server.id}
                                serverGotoLink={server.gotoLink}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <PaginationPage
                            page={page}
                            setPage={setPage}
                            totalPages={totalPages}
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default function ServerGuidesList(props: ServerGuidesListDisplayProps) {
    return (
        <ErrorCatch message="Could not load guides">
            <ServerGuidesListDisplay {...props} />
        </ErrorCatch>
    );
}
