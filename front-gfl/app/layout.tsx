import * as React from "react";
import {Metadata} from "next";
import {ThemeProvider} from "components/providers/theme-provider";
import {CommunityServerProvider} from "components/ui/ServerProvider";
import {getCommunity} from "./getCommunity";
import './globals.css'
import {DOMAIN} from "utils/generalUtils.ts";
import {Toaster} from "components/ui/sonner";
import {StarryBackground} from "components/effects/StarryBackground";
import {inter} from './fonts';
import {PostHogProvider} from "./providers.tsx";

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
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <meta name="theme-color" content="#f48fb1" />
                <meta name="twitter:creator" content="@queeniemella" />
            </head>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <StarryBackground />
                    <CommunityServerProvider promiseCommunities={communities}>
                        <PostHogProvider>
                            <div id="root">
                                <div className="body-before-footer">
                                    {children}
                                </div>
                            </div>
                            <Toaster />
                        </PostHogProvider>
                    </CommunityServerProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}