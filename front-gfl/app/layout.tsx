import * as React from "react";
import {Metadata} from "next";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v15-appRouter";
import {ThemeProvider} from "@mui/material/styles";
import theme from "../theme";
import {CommunityServerProvider} from "components/ui/ServerProvider";
import {getCommunity} from "./getCommunity";
import {AuthProvider} from "utils/auth";
import {cookies} from "next/headers";
import getServerUser from "./getServerUser";
import Localization from "./LocalizationProvider";
import './globals.css'
import {Box, CssBaseline} from "@mui/material";
import {DOMAIN} from "utils/generalUtils.ts";
import InitColorSchemeScript from "@mui/system/InitColorSchemeScript";

export const metadata: Metadata = {
    title: 'ZE Graph',
    description: 'Shows ZE player activities on the server.',
    // metadataBase: new URL(DOMAIN),
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getServerUser(cookies());
    const communities = await getCommunity();
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <meta name="theme-color" content="#f48fb1" />
                <link rel="canonical" content="/" data-rh="true" />
                <meta name="twitter:creator" content="@queeniemella" />
            </head>
            <body>
                <InitColorSchemeScript attribute="class" />
                <AppRouterCacheProvider  options={{ enableCssLayer: true }}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <Localization>
                            <AuthProvider initialUser={user}>
                                <CommunityServerProvider initialData={communities}>
                                    <div id="root">
                                        <Box className="body-before-footer">
                                            {children}
                                        </Box>
                                    </div>
                                </CommunityServerProvider>
                            </AuthProvider>
                        </Localization>
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}