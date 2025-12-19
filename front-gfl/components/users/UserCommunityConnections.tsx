'use client';

import { Box, Typography, Stack, FormControlLabel, Switch, Divider } from "@mui/material";
import { Community } from "types/community";
import CommunityConnectionCard from "./CommunityConnectionCard";
import {use, useState, useCallback, useEffect, useOptimistic, startTransition} from "react";
import { fetchApiUrl } from "utils/generalUtils";

interface UserCommunityConnectionsProps {
    communitiesPromise: Promise<Community[]>;
    userIdPromise: Promise<string>;
    isCurrentUser?: boolean;
}

export interface UserAnonymization {
    user_id: number;
    community_id?: string;
    anonymized: boolean;
    hide_location: boolean;
}

export default function UserCommunityConnections({
    communitiesPromise,
    userIdPromise,
    isCurrentUser = false,
}: UserCommunityConnectionsProps) {
    const communities = use(communitiesPromise);
    const userId = use(userIdPromise);
    const [anonymizedCommunities, setAnonymizedCommunities] = useState<Map<string, UserAnonymization>>(new Map());
    const [anonymizedOptimisticCommunities, addOptimisticAnonymizedCommunities] = useOptimistic<Map<string, UserAnonymization>, UserAnonymization>(
        anonymizedCommunities,
        (currentState, optimisticValue) => {

            currentState.set(optimisticValue.community_id, optimisticValue)
            return currentState;
        }
    );
    const [isLoading, setIsLoading] = useState(true);

    // Fetch anonymization settings on mount
    useEffect(() => {
        if (!isCurrentUser) {
            setIsLoading(false);
            return;
        }

        const fetchAnonymizationSettings = async () => {
            try {
                const data: UserAnonymization[] = await fetchApiUrl('/users/anonymize');

                const anonymizes = new Map<string, UserAnonymization>();
                data.forEach(setting => {
                    anonymizes[setting.community_id] = setting
                });

                setAnonymizedCommunities(anonymizes);
            } catch (error) {
                console.error('Failed to fetch anonymization settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnonymizationSettings();
    }, [isCurrentUser, communities]);

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
                    anonymized: body.anonymize,
                    hide_location: body.hide_location
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
                    newMap.set(data.community_id, data)
                    return newMap;
                });
            })
        } catch (error) {
            console.error('Failed to update anonymization setting:', error);
        }
    }, []);

    if (!communities || communities.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    No communities available.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%" }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 3, mt: 4 }}
            >
                <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                        fontWeight: 600,
                    }}
                >
                    Community Connections
                </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Stack spacing={3}>
                {communities.map((community) => (
                    <CommunityConnectionCard
                        key={community.id}
                        community={community}
                        userId={userId}
                        settings={anonymizedOptimisticCommunities.get(community.id)}
                        onToggleAnonymize={handleToggleAnonymize}
                        showAnonymizeToggle={isCurrentUser}
                    />
                ))}
            </Stack>
        </Box>
    );
}
