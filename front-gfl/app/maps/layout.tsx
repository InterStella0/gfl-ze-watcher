import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import * as React from "react";
import {Footer} from "react-day-picker";
import getServerUser from "../getServerUser.ts";

export default async function Layout({ children }){
    const userPromise = getServerUser()
    return <>
        <ResponsiveAppBar userPromise={userPromise} server={null} setDisplayCommunity={null} />
            {children}
        <Footer />
    </>
}