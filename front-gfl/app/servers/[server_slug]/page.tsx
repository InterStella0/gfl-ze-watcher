import {getCommunityData} from "../../getCommunity";
import ErrorCatch from "../../../components/ui/ErrorMessage";
import {DateProvider} from "../../../components/graphs/DateStateManager";
import ServerContent from "./ServerContent";
import {getServerSlug} from "./util";


export interface ServerPageProps {
    params: Promise<{ server_slug: string }>;
}
export default async function Page({ params }: ServerPageProps){
    const { server_slug } = await params
    const server = await getServerSlug(server_slug)
    if (!server)
        return <>Not found</>

    return <>
        <ErrorCatch message="Server Page is broken.">
            <DateProvider>
                <ServerContent server={server} />
            </DateProvider>
        </ErrorCatch>
    </>
}