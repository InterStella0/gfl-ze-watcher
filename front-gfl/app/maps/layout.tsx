import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import * as React from "react";
import getServerUser from "../getServerUser.ts";
import Footer from "components/ui/Footer.tsx";

export default async function Layout({ children }){
    const userPromise = getServerUser()
    return <>
        <ResponsiveAppBar userPromise={userPromise} server={null} setDisplayCommunity={null} />
            {children}
        <Footer />
    </>
}