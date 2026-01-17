'use client';

import { CommunityPlayerDetail } from "types/community";
import CommunityConnectionCard from "./CommunityConnectionCard";
import {useState, useCallback, useEffect, useOptimistic, startTransition, use} from "react";
import { fetchApiUrl } from "utils/generalUtils";
import { Separator } from "components/ui/separator";
import { Skeleton } from "components/ui/skeleton";

interface UserCommunityConnectionsProps {
    isCurrentUser?: boolean;
    communitiesPromise: Promise<CommunityPlayerDetail[]>
}

export interface UserAnonymization {
    user_id: number;
    community_id?: string;
    anonymized: boolean;
    hide_location: boolean;
}

export default function UserCommunityConnections({
    isCurrentUser = false,
    communitiesPromise
}: UserCommunityConnectionsProps)  {
    const communities = use(communitiesPromise)
    const [isLoading, setIsLoading] = useState(true);
    const [anonymizedCommunities, setAnonymizedCommunities] = useState<Map<string, UserAnonymization>>(new Map());
    const [anonymizedOptimisticCommunities, addOptimisticAnonymizedCommunities] = useOptimistic<Map<string, UserAnonymization>, UserAnonymization>(
        anonymizedCommunities,
        (currentState, optimisticValue) => {
            currentState.set(optimisticValue.community_id!, optimisticValue)
            return currentState;
        }
    );

    useEffect(() => {
        if (!isCurrentUser) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch anonymization settings
                const anonymizationData: UserAnonymization[] = await fetchApiUrl('/users/anonymize');
                const anonymizes = new Map<string, UserAnonymization>();
                anonymizationData.forEach(setting => {
                    anonymizes.set(setting.community_id!, setting)
                });
                setAnonymizedCommunities(anonymizes);
            } catch (error) {
                console.error('Failed to fetch community data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData().catch(console.error);
    }, [isCurrentUser]);

    const handleToggleAnonymize = useCallback(async (communityId: string | number, type: "location" | "anonymous", value: boolean, settings: UserAnonymization | null) => {
        try {
            let body: {community_id: string, anonymize?: boolean, hide_location?: boolean} = {
                community_id: communityId.toString(),
            }
            if (type === "location"){
                body["hide_location"] = value
                body["anonymize"] = settings?.anonymized ?? false
            }
            if (type === "anonymous"){
                body['anonymize'] = value
                if (value)
                    body["hide_location"] = value
                else
                    body["hide_location"] = settings?.hide_location ?? false
            }
            startTransition(() => {
                addOptimisticAnonymizedCommunities({
                    user_id: 0,
                    community_id: communityId.toString(),
                    anonymized: body.anonymize!,
                    hide_location: body.hide_location!
                })
            })
            const data: UserAnonymization = await fetchApiUrl('/users/anonymize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            startTransition(() => {
                setAnonymizedCommunities(prev => {
                    const newMap = new Map(prev);
                    newMap.set(data.community_id!, data)
                    return newMap;
                });
            })
        } catch (error) {
            console.error('Failed to update anonymization setting:', error);
        }
    }, [addOptimisticAnonymizedCommunities]);

    // Only show for current user
    if (!isCurrentUser) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 mt-8">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Community Connections
                    </h2>
                </div>
                <Separator className="mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (!communities || communities.length === 0) {
        return (
            <div className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 mt-8">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Community Connections
                    </h2>
                </div>
                <Separator className="mb-6" />
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        No community connections found.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 mt-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                    Community Connections
                </h2>
            </div>
            <Separator className="mb-6" />
            <div className="space-y-4">
                {communities.map((community) => {
                    const settings = anonymizedOptimisticCommunities.get(community.id)
                    return <CommunityConnectionCard
                        key={community.id}
                        community={community}
                        settings={settings ?? null}
                        onToggleAnonymize={handleToggleAnonymize}
                        showAnonymizeToggle={true}
                    />
                })}
            </div>
        </div>
    );
}
