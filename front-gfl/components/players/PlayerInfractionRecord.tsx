'use client'
import {use, useEffect, useState} from "react";
import {
    fetchApiServerUrl,
    formatFlagName,
    ICE_FILE_ENDPOINT,
    InfractionFlags,
    InfractionInt, StillCalculate
} from "utils/generalUtils";
import { Card, CardContent } from "components/ui/card";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Alert, AlertDescription } from "components/ui/alert";
import {
    Dialog,
    DialogContent,
} from "components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "components/ui/tooltip";
import dayjs from "dayjs";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import { X, Ban, RefreshCw, Loader2 } from "lucide-react";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";
import {PlayerInfraction, PlayerInfractionUpdate} from "types/players.ts";
import Image from "next/image";
import {Server} from "types/community.ts";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/util.ts";
import { useTheme } from "next-themes";

function ModalInfraction({ infraction, onClose }){
    return (
        <Dialog open={infraction !== null} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] p-0">
                {infraction !== null && (
                    <div className="flex flex-col h-full">
                        <Alert className="m-4">
                            <AlertDescription>
                                I'm showing you infraction from {infraction.source?.replace("https://", "")} because I got lazy half way.
                            </AlertDescription>
                        </Alert>
                        <div className="flex-1 relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 z-10"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <iframe
                                className="w-full h-full"
                                src={`${infraction.source}/infractions/${infraction?.id}/`}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}


function PlayerInfractionRecordBody({ updatedData, player, server }:
                                    { updatedData: PlayerInfraction[], player: PlayerInfo | StillCalculate, server: Server }) {
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const server_id = server.id;
    const [infractions, setInfractions] = useState([]);
    const [viewInfraction, setViewInfraction] = useState(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!playerId) return

        fetchApiServerUrl(server_id, `/players/${playerId}/infractions`)
            .then((infras) => infras.map(e => {
                if (!(e.flags instanceof InfractionInt))
                    e.flags = new InfractionInt(e.flags);
                return e;
            }))
            .then(e => setInfractions(e));
    }, [server_id, playerId]);

    useEffect(() => {
        if (updatedData === null) return;
        setInfractions(updatedData);
    }, [updatedData]);

    const handleOnClick = (row) => {
        setViewInfraction(row);
    };

    if (infractions.length === 0) {
        return (
            <div className="flex justify-center items-center h-[250px] text-muted-foreground flex-col gap-2">
                <Ban className="w-8 h-8 opacity-50" />
                <h3 className="text-xl font-semibold">
                    No Records
                </h3>
            </div>
        );
    }

    return (
        <>
            <ModalInfraction infraction={viewInfraction} onClose={() => setViewInfraction(null)} />

            <div className="max-h-[380px] overflow-y-auto pt-2">
                {infractions.map(row => {
                    const flag = row.flags;
                    const by = flag.hasFlag(InfractionFlags.SYSTEM) ? 'System' : row.by;
                    const restrictions = row.flags.getAllRestrictedFlags();

                    return (
                        <Card
                            key={row.id}
                            className="mb-3 cursor-pointer border transition-all hover:border-primary hover:bg-accent hover:-translate-y-0.5 hover:shadow-md"
                            onClick={() => handleOnClick(row)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center mb-3">
                                    {row.admin_avatar &&
                                        <Image
                                            src={ICE_FILE_ENDPOINT.replace('{}', row.admin_avatar)}
                                            title={`${row.by}'s Avatar`}
                                            alt={row.by}
                                            width={28}
                                            height={28}
                                            className="w-7 h-7 mr-4 rounded-full"
                                        />
                                    }
                                    <p className="text-sm font-semibold">
                                        {by}
                                    </p>
                                </div>

                                <p className={`text-sm ${row.reason ? '' : 'italic text-muted-foreground'}`}>
                                    {row.reason || 'No reason provided'}
                                </p>

                                <div className="flex justify-between items-center flex-wrap mt-2 gap-2">
                                    <div className="flex flex-wrap gap-1">
                                        {restrictions.length > 0 ? restrictions.map((flagName: string) => (
                                            <Badge
                                                key={flagName}
                                                variant="destructive"
                                                className="text-xs h-6"
                                            >
                                                {formatFlagName(flagName)}
                                            </Badge>
                                        )) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                No restrictions
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                        {dayjs(row.infraction_time).format('lll')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </>
    );
}

function PlayerInfractionRecordDisplay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}) {
    const {server, player} = use(serverPlayerPromise);
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const [updatedData, setUpdatedData] = useState<PlayerInfraction[] | null>(null);
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const server_id = server.id
    const updateData = () => {
        setLoading(true);
        fetchApiServerUrl(server_id, `/players/${playerId}/infraction_update`)
            .then((resp: PlayerInfractionUpdate) => {
                const infractions: PlayerInfraction[] = resp.infractions.map(e => {
                    if (!(e.flags instanceof InfractionInt))
                        e.flags = new InfractionInt(e.flags);
                    return e;
                });
                infractions.sort((a, b) => dayjs(b.infraction_time).diff(dayjs(a.infraction_time)));
                setUpdatedData(infractions);
            })
            .finally(() => setLoading(false));
    };

    return (
        <Card className="min-h-[460px] p-4">
            <div className="flex flex-row justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                    Infractions
                </h2>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={updateData}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-5 w-5" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Update infractions</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <PlayerInfractionRecordBody updatedData={updatedData} player={player} server={server} />
        </Card>
    );
}
export default function PlayerInfractionRecord({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    return  <ErrorCatch message="Infraction couldn't be loaded">
        <PlayerInfractionRecordDisplay serverPlayerPromise={serverPlayerPromise}  />
    </ErrorCatch>
}
