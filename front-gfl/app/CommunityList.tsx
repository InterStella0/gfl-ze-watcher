'use client';

import {ReactElement} from 'react';
import { Box, Typography, Grid2 as Grid } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CommunityCard from "components/communities/CommunityCard";
import {Community} from "types/community";

export default function CommunityList({ communities }: { communities: Community[]}): ReactElement {
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
