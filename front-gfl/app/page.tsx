import {Box, Container, Stack, Typography} from "@mui/material";
import CommunityList, {CommunityListLoading} from "./CommunityList";
import {getCommunity} from "./getCommunity";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar";
import * as React from "react";
import getServerUser from "./getServerUser";
import Footer from "components/ui/Footer";
import {Suspense} from "react";

export default async function Page() {
    const communitiesDataPromise = getCommunity();
    const user = await getServerUser(null);

    return <>
        <ResponsiveAppBar user={user} server={null} setDisplayCommunity={null} />
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
                            color="primary"
                            sx={{
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
                    <Suspense fallback={<CommunityListLoading />}>
                        <CommunityList communitiesDataPromise={communitiesDataPromise} />
                    </Suspense>
                </Stack>
            </Container>
        </Box>
        <Footer />
    </>
}