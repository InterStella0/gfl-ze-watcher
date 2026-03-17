import { use } from 'react'
import { notFound } from 'next/navigation'
import ErrorCatch from "components/ui/ErrorMessage.tsx";
import {DateProvider} from "components/graphs/DateStateManager.tsx";
import ServerContent from "./ServerContent.tsx";
import {createServerDescription} from "./page.tsx";
import {Server} from "types/community.ts";


export function ServerContentWrapper({ serverPromise }: { serverPromise: Promise<Server> }) {
    const server = use(serverPromise)
    const description = use(createServerDescription(server))

    if (!server) throw notFound()

    return <>
        <ErrorCatch message="Server Page is broken.">
            <DateProvider>
                <ServerContent server={server} description={description} />
            </DateProvider>
        </ErrorCatch>
    </>
}
