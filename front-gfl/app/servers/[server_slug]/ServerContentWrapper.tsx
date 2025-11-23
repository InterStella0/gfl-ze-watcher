import { use } from 'react'
import { notFound } from 'next/navigation'
import ErrorCatch from "components/ui/ErrorMessage";
import {DateProvider} from "components/graphs/DateStateManager.tsx";
import ServerContent from "./ServerContent.tsx";
import {getServerSlug} from "./util";

export function ServerContentWrapper({ serverSlug }: { serverSlug: string }) {
    const server = use(getServerSlug(serverSlug))

    if (!server) throw notFound()

    return <>
        <ErrorCatch message="Server Page is broken.">
            <DateProvider>
                <ServerContent server={server} />
            </DateProvider>
        </ErrorCatch>
    </>
}
