'use client';

import {ReactElement, Suspense, use, useEffect, useState} from 'react';
import {Box, Typography, Grid2 as Grid, Skeleton} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CommunityCard from "components/communities/CommunityCard";
import {simpleRandom} from "utils/generalUtils.ts";
import {Community} from "types/community.ts";

export function CommunityListLoading() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    })
    const amount = simpleRandom(4, 8, isClient)
    return <Grid container spacing={{ xs: 2, sm: 3 }}>
        {Array.from({length: amount}).map((_, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
                <Skeleton variant="rounded" height="258px" width="100%" />
            </Grid>
        ))}
    </Grid>
}


export default function CommunityList({ communitiesDataPromise }: { communitiesDataPromise: Promise<Community[]>}): ReactElement {
    const communities = use(communitiesDataPromise);
    return <>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
            {communities.map((community) => (
                <Grid size={{ xs: 12, md: 6 }} key={community.id}>
                    <CommunityCard community={community} />
                </Grid>
            ))}
        </Grid>

        {communities.length === 0 && (
            <Box textAlign="center" py={8}>
                <SportsEsportsIcon
                    sx={{
                        fontSize: { xs: 48, sm: 64 },
                        mb: 2,
                    }}
                />
                <Typography
                    variant="h5"
                    gutterBottom
                    sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                >
                    No communities found
                </Typography>
                <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                >
                    Looks like all the gamers are taking a break! 🎮
                </Typography>
            </Box>
        )}
    </>
}
export function CommunityListWrapper({ communitiesDataPromise }: { communitiesDataPromise: Promise<Community[]>}): ReactElement {
    return <Suspense fallback={<CommunityListLoading />}>
        <CommunityList communitiesDataPromise={communitiesDataPromise} />
    </Suspense>
}