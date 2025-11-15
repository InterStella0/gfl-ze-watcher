import {Box, Container, Stack, Typography} from "@mui/material";
import CommunityList from "./CommunityList";
import {getCommunityData} from "./getCommunity";
import ResponsiveAppBar from "../components/ui/ResponsiveAppBar";
import * as React from "react";
import getServerUser from "./getServerUser";
import {cookies} from "next/headers";
import Footer from "../components/ui/Footer";

export default async function Page() {
    const {communities} = await getCommunityData();
    const user = await getServerUser(cookies());
    return <>
        <ResponsiveAppBar user={user} server={null} />
            <Box
            sx={{
                minHeight: '100vh',
                py: { xs: 2, sm: 4 },
            }}
        >
            <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 3 } }}>
                <Stack spacing={{ xs: 3, sm: 4 }}>
                    <Box textAlign="center" sx={{ px: { xs: 1, sm: 0 } }}>
                        <Typography
                            variant="h2"
                            component="h1"
                            fontWeight={700}
                            sx={{
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 2,
                                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                                wordBreak: 'break-word',
                            }}
                        >
                            Communities
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                                wordBreak: 'break-word',
                            }}
                        >
                            CS2 Zombie Escape communities that I track &gt;:3
                        </Typography>
                    </Box>
                    <CommunityList communities={communities} />
                </Stack>
            </Container>
        </Box>
        <Footer />
    </>
}