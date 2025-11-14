import {Container} from "@mui/material";
import CurrentMatch from "../../../../components/maps/CurrentMatch";
import {getMapImage} from "../../../../utils/generalUtils";
import {getServerSlug} from "../util";
import MapsSearchIndex from "./MapsSearchIndex";
import getServerUser from "../../../getServerUser";
import {cookies} from "next/headers";
import {getMatchNow} from "./util";

export default async function Page({ params }){
    const { server_slug } = await params;
    const server = await getServerSlug(server_slug)
    const currentMatch = await getMatchNow(server.id)
    const image = await getMapImage(server.id, currentMatch.map)
    const user = await getServerUser(cookies());

    return <Container maxWidth="xl" sx={{ py: 3 }}>
        <CurrentMatch server={server} currentMatchData={currentMatch} currentMapImage={image} />

        <MapsSearchIndex server={server} user={user} />
    </Container>
}