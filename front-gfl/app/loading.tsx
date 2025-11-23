import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import {Box, Container, Stack, Typography} from "@mui/material";
import Footer from "components/ui/Footer.tsx";
import {CommunityListLoading} from "./CommunityList.tsx";


export default async function Loading() {
    return <>
        <ResponsiveAppBar user={null} server={null} setDisplayCommunity={null} />
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
                    <CommunityListLoading />
                </Stack>
            </Container>
        </Box>
        <Footer />
    </>
}