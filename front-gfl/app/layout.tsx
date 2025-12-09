import * as React from "react";
import {Metadata} from "next";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v15-appRouter";
import {ThemeProvider} from "@mui/material/styles";
import theme from "../theme";
import {CommunityServerProvider} from "components/ui/ServerProvider";
import {getCommunity} from "./getCommunity";
import Localization from "./LocalizationProvider";
import './globals.css'
import {Box, CssBaseline} from "@mui/material";
import {DOMAIN} from "utils/generalUtils.ts";
import InitColorSchemeScript from "@mui/system/InitColorSchemeScript";

export const metadata: Metadata = {
    title: 'ZE Graph',
    description: 'Shows Zombie Escape (ZE) player activities on many western servers. ' +
        'Popular servers like GFL, Mapeadores, RSS, PSE, Net4All, Cola-Team and many more are tracked!',
    metadataBase: new URL(DOMAIN),
    alternates: {
        canonical: '/'
    }
}


export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const communities = getCommunity();
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <meta name="theme-color" content="#f48fb1" />
                <meta name="twitter:creator" content="@queeniemella" />
                <title>ZE Graph</title>
            </head>
            <body>
                <InitColorSchemeScript attribute="class" />
                <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <Localization>
                            <CommunityServerProvider promiseCommunities={communities}>
                                <div id="root">
                                    <Box className="body-before-footer">
                                        {children}
                                    </Box>
                                </div>
                            </CommunityServerProvider>
                        </Localization>
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}