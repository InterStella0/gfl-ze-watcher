import * as React from "react";
import {Metadata} from "next";
import {AppRouterCacheProvider} from "@mui/material-nextjs/v15-appRouter";
import {ThemeProvider} from "@mui/material/styles";
import theme from "../theme";
import Footer from "../components/ui/Footer";
import {CommunityServerProvider} from "../components/ui/ServerProvider";
import {getCommunity, getCommunityData} from "./getCommunity";
import {AuthProvider} from "../utils/auth";
import {cookies} from "next/headers";
import getServerUser from "./getServerUser";
import Localization from "./LocalizationProvider";
import './globals.css'
import {Box} from "@mui/material";

export const metadata: Metadata = {
    title: 'ZE Graph',
    description: 'Shows ZE player activities on the server.',
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
                <link rel="alternate" type="application/json+oembed"
                    href="{{__CURRENT_HOST_URL__}}/api/oembed?url={{__CURRENT_URL__}}"
                    title="oEmbed" />
                <meta content="{{__CURRENT_HOST_URL__}}/api/meta_thumbnails?url={{__META_THUMBNAIL_URL__}}" property='og:image'/>
                <meta name="theme-color" content="#f48fb1" />
                <link rel="canonical" content="/" data-rh="true" />
                <meta name="twitter:creator" content="@queeniemella" />
            </head>
            <body>
                <AppRouterCacheProvider  options={{ enableCssLayer: true }}>
                    <ThemeProvider theme={theme}>
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